import { createHash, randomUUID } from "node:crypto";
import type { billing_catalog_operation } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { getStripeGateway } from "../payment-gateway";
import { StripeGatewayError, stripeFailureObservation } from "../payment-gateway/stripe-error";
import { assertImmutableStripePrice } from "./offer-policy";
import {
  CatalogError,
  canReplayCatalogCreate,
  catalogFingerprint,
  catalogProviderInput,
  catalogScope,
  safeCatalogOperation,
  safeCatalogVersion,
  validCatalogAmount,
} from "./policy";
import { catalogActor, catalogAudit, catalogContext } from "./repository";

export async function reserveCatalogPriceOperation(
  actorId: string,
  amountCents: number,
  requestKey: string,
) {
  if (
    !validCatalogAmount(amountCents) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)
  )
    throw new CatalogError("catalog_invalid_input");
  const scope = catalogScope();
  return withSerializableTransaction(async (tx) => {
    await catalogActor(tx, actorId);
    const context = await catalogContext(tx, scope, true);
    const fingerprint = catalogFingerprint({
      actorId,
      planId: context.plan.id,
      productId: context.current.external_product_id,
      accountId: scope.account_id,
      mode: scope.mode,
      amountCents,
    });
    const existing = await tx.billing_catalog_operation.findUnique({
      where: { actor_admin_id_request_key: { actor_admin_id: actorId, request_key: requestKey } },
    });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new CatalogError("catalog_conflict");
      return existing;
    }
    const id = randomUUID();
    const operation = await tx.billing_catalog_operation.create({
      data: {
        id,
        ...scope,
        plan_id: context.plan.id,
        product_id: context.current.external_product_id,
        actor_admin_id: actorId,
        request_key: requestKey,
        fingerprint,
        amount_cents: amountCents,
        lookup_key: `lectum_catalog_${id}`,
        provider_idempotency_key: `lectum:catalog-price:v1:${id}`,
      },
    });
    await catalogAudit(tx, {
      actorId,
      targetType: "billing_catalog_operation",
      targetId: id,
      action: "stripe_catalog_operation_reserved",
      after: { status: "pending", amount_cents: amountCents, mode: scope.mode },
    });
    return operation;
  });
}
export async function claimCatalogPriceOperation(id: string, actorId: string) {
  const scope = catalogScope();
  return withSerializableTransaction(async (tx) => {
    await catalogActor(tx, actorId);
    const operation = await tx.billing_catalog_operation.findFirst({
      where: { id, actor_admin_id: actorId, ...scope },
    });
    if (!operation) throw new CatalogError("catalog_operation_not_found");
    const now = new Date();
    const fingerprint = catalogFingerprint({
      actorId: operation.actor_admin_id,
      planId: operation.plan_id,
      productId: operation.product_id,
      accountId: operation.account_id,
      mode: operation.mode,
      amountCents: operation.amount_cents,
    });
    if (
      !validCatalogAmount(operation.amount_cents) ||
      operation.fingerprint !== fingerprint ||
      operation.currency !== "BRL" ||
      operation.interval !== "month" ||
      operation.interval_count !== 1 ||
      operation.lookup_key !== `lectum_catalog_${operation.id}` ||
      operation.provider_idempotency_key !== `lectum:catalog-price:v1:${operation.id}`
    )
      throw new CatalogError("catalog_conflict");
    const recoverable =
      operation.status === "manual_review" &&
      operation.last_error_code === "catalog_recovery_required";
    if (
      (!["pending", "processing"].includes(operation.status) && !recoverable) ||
      (operation.lease_until && operation.lease_until > now)
    )
      return { operation, claimed: false };
    const token = randomUUID();
    const changed = await tx.billing_catalog_operation.updateMany({
      where: {
        id,
        status: operation.status,
        OR: [{ lease_until: null }, { lease_until: { lte: now } }],
      },
      data: {
        status: "processing",
        lease_token: token,
        lease_until: new Date(now.getTime() + 90_000),
        attempts: { increment: 1 },
        first_attempt_at: operation.first_attempt_at ?? now,
        last_error_code: null,
      },
    });
    if (changed.count !== 1) throw new CatalogError("catalog_conflict");
    return {
      operation: await tx.billing_catalog_operation.findUniqueOrThrow({ where: { id } }),
      claimed: true,
    };
  });
}
async function finishFailure(
  operation: billing_catalog_operation,
  code: string,
  status = "pending",
) {
  return withSerializableTransaction(async (tx) => {
    const changed = await tx.billing_catalog_operation.updateMany({
      where: { id: operation.id, lease_token: operation.lease_token },
      data: { status, last_error_code: code, lease_token: null, lease_until: null },
    });
    if (changed.count === 1)
      await catalogAudit(tx, {
        actorId: operation.actor_admin_id,
        targetType: "billing_catalog_operation",
        targetId: operation.id,
        action: "stripe_catalog_operation_deferred",
        before: { status: operation.status },
        after: { status, last_error_code: code },
      });
    return tx.billing_catalog_operation.findUniqueOrThrow({ where: { id: operation.id } });
  });
}
async function result(operation: billing_catalog_operation, actorId: string) {
  const version = operation.version_id
    ? await prisma.billing_price_version.findUnique({ where: { id: operation.version_id } })
    : null;
  if (
    operation.status === "completed" &&
    (!version ||
      version.plan_id !== operation.plan_id ||
      version.gateway !== "stripe" ||
      version.account_id !== operation.account_id ||
      version.mode !== operation.mode ||
      version.amount_cents !== operation.amount_cents ||
      version.external_product_id !== operation.product_id ||
      version.external_price_id !== operation.external_price_id ||
      version.currency !== operation.currency ||
      version.interval !== operation.interval ||
      version.interval_count !== operation.interval_count)
  )
    throw new CatalogError("catalog_conflict");
  return {
    operation: safeCatalogOperation(operation, actorId),
    version: version ? safeCatalogVersion(version) : null,
    offer_changed: false as const,
    existing_contracts_changed: false as const,
  };
}
/** The durable reservation and lease commit BEFORE SDK calls. No database transaction surrounds a network call. */
export async function resumeCatalogPrice(id: string, actorId: string) {
  const claimed = await claimCatalogPriceOperation(id, actorId);
  const operation = claimed.operation;
  if (!claimed.claimed) return result(operation, actorId);
  try {
    const gateway = getStripeGateway();
    if (
      gateway.identity.accountId !== operation.account_id ||
      gateway.identity.mode !== operation.mode
    )
      throw new CatalogError("catalog_not_configured");
    const input = catalogProviderInput(operation);
    let price = await gateway.findStripeCatalogPrice(input);
    if (!price) {
      if (!canReplayCatalogCreate(operation, new Date()))
        return result(
          await finishFailure(operation, "catalog_recovery_required", "manual_review"),
          actorId,
        );
      price = await gateway.createStripeCatalogPrice(input);
    }
    const saved = await withSerializableTransaction(async (tx) => {
      await catalogActor(tx, actorId);
      const current = await tx.billing_catalog_operation.findFirst({
        where: { id: operation.id, lease_token: operation.lease_token, status: "processing" },
      });
      if (!current)
        return tx.billing_catalog_operation.findUniqueOrThrow({ where: { id: operation.id } });
      if (
        price.accountId !== operation.account_id ||
        price.mode !== operation.mode ||
        price.productId !== operation.product_id ||
        price.amountCents !== operation.amount_cents
      )
        throw new CatalogError("catalog_conflict");
      let version = await tx.billing_price_version.findUnique({
        where: {
          gateway_mode_account_id_external_price_id: {
            gateway: "stripe",
            mode: operation.mode,
            account_id: operation.account_id,
            external_price_id: price.priceId,
          },
        },
      });
      if (version) assertImmutableStripePrice(version, operation.plan_id, price);
      else
        version = await tx.billing_price_version.create({
          data: {
            plan_id: operation.plan_id,
            gateway: "stripe",
            mode: operation.mode,
            account_id: operation.account_id,
            external_product_id: price.productId,
            external_price_id: price.priceId,
            amount_cents: price.amountCents,
            currency: price.currency,
            interval: price.interval,
            interval_count: price.intervalCount,
          },
        });
      const updated = await tx.billing_catalog_operation.update({
        where: { id: current.id },
        data: {
          status: "completed",
          version_id: version.id,
          external_price_id: price.priceId,
          lease_token: null,
          lease_until: null,
          last_error_code: null,
        },
      });
      await catalogAudit(tx, {
        actorId,
        targetType: "billing_price_version",
        targetId: version.id,
        action: "stripe_catalog_price_created",
        after: {
          amount_cents: price.amountCents,
          currency: price.currency,
          interval: price.interval,
          operation_id: operation.id,
          offer_changed: false,
        },
      });
      return updated;
    });
    return result(saved, actorId);
  } catch (cause) {
    const observation = stripeFailureObservation(cause);
    const fatal =
      cause instanceof CatalogError ||
      (cause instanceof StripeGatewayError &&
        ["contract_invalid", "resource_mismatch", "resource_invalid", "account_mismatch"].includes(
          cause.kind,
        ));
    const code = fatal
      ? "catalog_integrity_failure"
      : observation.failure_diagnostic === "access_denied"
        ? "catalog_access_denied"
        : "catalog_provider_unavailable";
    console.warn("[BILLING] Operação de catálogo pendente.", {
      operation: "create_catalog_price",
      operation_ref: createHash("sha256").update(operation.id).digest("hex").slice(0, 24),
      ...observation,
      result: fatal ? "manual_review" : "pending",
    });
    return result(
      await finishFailure(operation, code, fatal ? "manual_review" : "pending"),
      actorId,
    );
  }
}
export async function createCatalogPrice(actorId: string, amountCents: number, requestKey: string) {
  const operation = await reserveCatalogPriceOperation(actorId, amountCents, requestKey);
  return resumeCatalogPrice(operation.id, actorId);
}
