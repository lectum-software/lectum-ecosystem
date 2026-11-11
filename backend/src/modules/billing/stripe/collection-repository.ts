import { randomUUID } from "node:crypto";
import type { billing_operation, Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity } from "../payment-gateway/stripe-types";
import { CREDIT_COLLECTION_POLICY, collectionRequestKey } from "./collection-policy";
import { StripeBillingError } from "./policy";

const scope = (identity: StripeIdentity) => ({
  gateway: "stripe",
  mode: identity.mode,
  account_id: identity.accountId,
});

export class StripeCollectionRepository {
  async target(localSubscriptionId: string, identity: StripeIdentity, userId?: string) {
    const local = await prisma.professional_subscription.findFirst({
      where: {
        id: localSubscriptionId,
        gateway: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        collection_policy: CREDIT_COLLECTION_POLICY,
        status: { in: ["ativa", "inativa", "inadimplente"] },
        deleted: false,
        psychologist: {
          deleted: false,
          ...(userId ? { user_id: userId } : {}),
          user: { active: true, deleted: false },
        },
      },
      include: { psychologist: { select: { user_id: true } } },
    });
    if (!local?.gateway_subscription_id || !local.price_version_id)
      throw new StripeBillingError("billing_collection_unavailable");
    const [customer, price] = await Promise.all([
      prisma.billing_customer.findFirst({
        where: { user_id: local.psychologist.user_id, ...scope(identity), state: "ready" },
      }),
      prisma.billing_price_version.findFirst({
        where: { id: local.price_version_id, ...scope(identity) },
      }),
    ]);
    if (
      !customer?.external_customer_id ||
      !price ||
      price.plan_id !== local.plan_id ||
      price.amount_cents !== local.contracted_amount_cents ||
      price.currency !== "BRL" ||
      local.contracted_currency !== "BRL" ||
      price.interval !== "month" ||
      price.interval_count !== 1 ||
      local.contracted_interval !== "month" ||
      local.contracted_interval_count !== 1
    )
      throw new StripeBillingError("billing_collection_unavailable");
    return {
      local,
      customer,
      price,
      userId: local.psychologist.user_id,
      provider: {
        localSubscriptionId: local.id,
        subscriptionId: local.gateway_subscription_id,
        customerId: customer.external_customer_id,
        priceId: price.external_price_id,
        amountCents: price.amount_cents,
      },
    };
  }

  async reserve(input: {
    target: Awaited<ReturnType<StripeCollectionRepository["target"]>>;
    identity: StripeIdentity;
    invoiceId: string;
    paymentMethodId: string;
    parentOperationId?: string;
    initialInvoice: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const { target, identity } = input;
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM professional_subscriptions
        WHERE id = ${target.local.id} AND deleted = false
        AND status IN ('ativa', 'inativa', 'inadimplente')
        AND collection_policy = ${CREDIT_COLLECTION_POLICY} FOR UPDATE`;
      if (locked.length !== 1) throw new StripeBillingError("billing_collection_unavailable");
      const parents = await tx.billing_operation.findMany({
        where: {
          user_id: target.userId,
          subscription_id: target.local.id,
          provider_subscription_id: target.provider.subscriptionId,
          ...scope(identity),
          kind: "checkout",
          intent: input.initialInvoice
            ? "subscription"
            : { in: ["subscription", "courtesy_renewal"] },
          state: input.initialInvoice ? { not: "failed" } : "complete",
        },
        take: 2,
      });
      // Renewals require a durably completed paid checkout or explicitly scheduled courtesy.
      // A default assigned before a crashed enrollment is never authorization to start billing.
      if (parents.length !== 1) throw new StripeBillingError("billing_operation_pending");
      const parent = input.initialInvoice ? parents[0] : null;
      if (
        (input.initialInvoice && !parent) ||
        (input.parentOperationId && parent?.id !== input.parentOperationId)
      )
        throw new StripeBillingError("billing_operation_conflict");
      const key = {
        user_id: target.userId,
        ...scope(identity),
        request_key: collectionRequestKey(input.invoiceId),
      };
      const existing = await tx.billing_operation.findUnique({
        where: { user_id_gateway_mode_account_id_request_key: key },
      });
      if (existing) {
        if (
          existing.kind !== "collection" ||
          existing.subscription_id !== target.local.id ||
          existing.provider_invoice_id !== input.invoiceId ||
          existing.parent_operation_id !== (parent?.id ?? null)
        )
          throw new StripeBillingError("billing_operation_conflict");
        return existing;
      }
      return tx.billing_operation.create({
        data: {
          ...key,
          psychologist_id: target.local.psychologist_id,
          subscription_id: target.local.id,
          customer_id: target.customer.id,
          price_version_id: target.price.id,
          kind: "collection",
          intent_kind: "payment",
          parent_operation_id: parent?.id ?? null,
          provider_subscription_id: target.provider.subscriptionId,
          provider_invoice_id: input.invoiceId,
          provider_payment_method_id: input.paymentMethodId,
        },
      });
    });
  }

  read(id: string) {
    return prisma.billing_operation.findUnique({ where: { id } });
  }

  async claim(operation: billing_operation) {
    if (["complete", "failed"].includes(operation.state)) return null;
    return prisma.$transaction(async (tx) => {
      if (!(await this.lockEligibleContract(tx, operation))) return null;
      const lease = {
        lease_token: randomUUID(),
        lease_until: new Date(Date.now() + 120_000),
      };
      const result = await tx.billing_operation.updateMany({
        where: {
          id: operation.id,
          kind: "collection",
          updated_at: operation.updated_at,
          state: { notIn: ["complete", "failed"] },
          OR: [{ lease_until: null }, { lease_until: { lte: new Date() } }],
        },
        data: { ...lease, attempts: { increment: 1 } },
      });
      return result.count ? { ...operation, ...lease, attempts: operation.attempts + 1 } : null;
    });
  }

  private async lockEligibleContract(tx: Prisma.TransactionClient, operation: billing_operation) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s.id FROM professional_subscriptions s
      JOIN psychologist_profiles p ON p.id = s.psychologist_id
      JOIN users u ON u.id = p.user_id
      WHERE s.id = ${operation.subscription_id} AND s.deleted = false
      AND s.gateway = 'stripe' AND s.gateway_mode = ${operation.mode}
      AND s.gateway_account_id = ${operation.account_id}
      AND s.collection_policy = ${CREDIT_COLLECTION_POLICY}
      AND s.status IN ('ativa', 'inativa', 'inadimplente')
      AND p.deleted = false AND u.deleted = false AND u.active = true
      AND u.id = ${operation.user_id} FOR UPDATE OF s`;
    return rows.length === 1;
  }

  async renew(operation: billing_operation, token: string) {
    return prisma.$transaction(async (tx) => {
      if (!(await this.lockEligibleContract(tx, operation))) return false;
      const result = await tx.billing_operation.updateMany({
        where: { id: operation.id, lease_token: token, lease_until: { gt: new Date() } },
        data: { lease_until: new Date(Date.now() + 120_000) },
      });
      return result.count === 1;
    });
  }

  async checkpoint(operation: billing_operation, token: string, fingerprint: string) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        lease_until: { gt: new Date() },
        OR: [{ request_fingerprint: null }, { request_fingerprint: fingerprint }],
      },
      data: { request_fingerprint: fingerprint, state: "creating" },
    });
  }

  pinIntent(id: string, token: string, intentId: string) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.billing_operation.findUnique({ where: { id } });
      if (!row || row.lease_token !== token || !row.lease_until || row.lease_until <= new Date())
        return { count: 0 };
      const pinned = await tx.billing_operation.updateMany({
        where: {
          id,
          lease_token: token,
          lease_until: { gt: new Date() },
          OR: [{ provider_intent_id: null }, { provider_intent_id: intentId }],
        },
        data: { provider_intent_id: intentId, intent_kind: "payment", state: "processing" },
      });
      if (!pinned.count) return pinned;
      if (row.parent_operation_id) {
        const parent = await tx.billing_operation.updateMany({
          where: {
            id: row.parent_operation_id,
            kind: "checkout",
            intent: "subscription",
            user_id: row.user_id,
            subscription_id: row.subscription_id,
            gateway: row.gateway,
            mode: row.mode,
            account_id: row.account_id,
            state: { notIn: ["complete", "failed"] },
            OR: [{ provider_intent_id: null }, { provider_intent_id: intentId }],
          },
          data: { provider_intent_id: intentId, intent_kind: "payment" },
        });
        if (!parent.count) throw new StripeBillingError("billing_operation_conflict");
      }
      return pinned;
    });
  }

  checkpointConfirmation(input: {
    operation: billing_operation;
    token: string;
    paymentMethodId: string;
    sequence: number;
    fingerprint: string;
    offSession?: boolean;
  }) {
    return prisma.billing_operation.updateMany({
      where: {
        id: input.operation.id,
        lease_token: input.token,
        lease_until: { gt: new Date() },
        confirmation_sequence: input.operation.confirmation_sequence,
        confirmation_fingerprint: input.operation.confirmation_fingerprint,
      },
      data: {
        provider_payment_method_id: input.paymentMethodId,
        confirmation_sequence: input.sequence,
        confirmation_fingerprint: input.fingerprint,
        intent: input.offSession === true ? "off_session" : "on_session",
        last_error_code: "confirmation_pending",
        state: "processing",
      },
    });
  }

  selectUnconfirmedMethod(operation: billing_operation, token: string, paymentMethodId: string) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        lease_until: { gt: new Date() },
        provider_intent_id: null,
        confirmation_sequence: 0,
        confirmation_fingerprint: null,
        provider_payment_method_id: operation.provider_payment_method_id,
      },
      // Intent creation has no PM in its body. Changing the selected PM never changes its key/body.
      data: { provider_payment_method_id: paymentMethodId },
    });
  }

  finish(id: string, token: string, data: Prisma.billing_operationUpdateManyMutationInput) {
    const recovered =
      data.last_error_code === null ||
      ["payment_method_required", "authentication_required", "card_credit_required"].includes(
        typeof data.last_error_code === "string" ? data.last_error_code : "",
      );
    return prisma.billing_operation.updateMany({
      where: { id, lease_token: token },
      // Successful polling/SCA reads do not consume the consecutive failure budget.
      // Ambiguous confirmation proof and unresolved transport errors never reset it.
      data: {
        ...data,
        ...(recovered ? { attempts: 0 } : {}),
        lease_token: null,
        lease_until: null,
      },
    });
  }

  due(identity: StripeIdentity, subscriptionIds?: string[]) {
    return prisma.billing_operation.findMany({
      where: {
        ...scope(identity),
        kind: "collection",
        ...(subscriptionIds ? { subscription_id: { in: subscriptionIds } } : {}),
        state: { in: ["reserved", "creating", "processing"] },
        next_attempt_at: { lte: new Date() },
        OR: [{ lease_until: null }, { lease_until: { lte: new Date() } }],
      },
      orderBy: { next_attempt_at: "asc" },
      take: 10,
    });
  }

  contracts(identity: StripeIdentity, afterId?: string, subscriptionIds?: string[]) {
    return prisma.professional_subscription.findMany({
      where: {
        gateway: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        collection_policy: CREDIT_COLLECTION_POLICY,
        ...(subscriptionIds ? { id: { in: subscriptionIds } } : {}),
        status: { in: ["ativa", "inativa", "inadimplente"] },
        deleted: false,
        psychologist: { deleted: false, user: { active: true, deleted: false } },
        ...(afterId ? { id: { gt: afterId } } : {}),
      },
      orderBy: { id: "asc" },
      take: 10,
    });
  }
}
