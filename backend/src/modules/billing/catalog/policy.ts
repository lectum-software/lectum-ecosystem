import { createHash } from "node:crypto";
import type { billing_catalog_operation } from "@/external/generated/prisma/client";
import { invoiceGatewayScopes } from "../invoices/gateway-scope";
import type { StripeCatalogPriceInput } from "../payment-gateway/stripe-catalog";

export type CatalogErrorCode =
  | "catalog_invalid_input"
  | "catalog_not_configured"
  | "catalog_conflict"
  | "catalog_operation_not_found"
  | "catalog_actor_invalid"
  | "catalog_publication_blocked";
export class CatalogError extends Error {
  constructor(readonly code: CatalogErrorCode) {
    super("CATALOG_OPERATION_BLOCKED");
    this.name = "CatalogError";
  }
}
export const catalogScope = (env = process.env) => {
  const mode = env.STRIPE_ENV;
  const scope =
    mode === "test" || mode === "live"
      ? invoiceGatewayScopes(mode, env).find((item) => item.gateway === "stripe")
      : null;
  if (scope?.gateway !== "stripe") throw new CatalogError("catalog_not_configured");
  return { gateway: "stripe" as const, mode: scope.mode, account_id: scope.accountId };
};
export const validCatalogAmount = (amount: unknown): amount is number =>
  Number.isSafeInteger(amount) && Number(amount) >= 50 && Number(amount) <= 99999999;
export const catalogFingerprint = (input: {
  actorId: string;
  planId: string;
  productId: string;
  accountId: string;
  mode: string;
  amountCents: number;
}) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        "lectum.catalog.price.v1",
        input.actorId,
        input.planId,
        input.productId,
        input.accountId,
        input.mode,
        input.amountCents,
        "BRL",
        "month",
        1,
      ]),
    )
    .digest("hex");
export const canReplayCatalogCreate = (
  operation: Pick<billing_catalog_operation, "first_attempt_at">,
  now: Date,
) =>
  Boolean(
    operation.first_attempt_at &&
      now >= operation.first_attempt_at &&
      now.getTime() - operation.first_attempt_at.getTime() < 23 * 60 * 60 * 1000,
  );
export const catalogProviderInput = (row: billing_catalog_operation): StripeCatalogPriceInput => ({
  operationId: row.id,
  fingerprint: row.fingerprint,
  productId: row.product_id,
  amountCents: row.amount_cents,
  lookupKey: row.lookup_key,
  idempotencyKey: row.provider_idempotency_key,
});
export const safeCatalogOperation = (
  row: billing_catalog_operation,
  actorId: string,
  now = new Date(),
) => ({
  id: row.id,
  amount_cents: row.amount_cents,
  status: ["pending", "processing", "completed", "failed", "manual_review"].includes(row.status)
    ? row.status
    : "manual_review",
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
  version_id: row.version_id,
  can_resume:
    row.actor_admin_id === actorId &&
    (["pending", "processing"].includes(row.status) ||
      (row.status === "manual_review" && row.last_error_code === "catalog_recovery_required")) &&
    (!row.lease_until || row.lease_until <= now),
  last_error_code:
    row.last_error_code &&
    [
      "catalog_recovery_required",
      "catalog_integrity_failure",
      "catalog_access_denied",
      "catalog_provider_unavailable",
    ].includes(row.last_error_code)
      ? row.last_error_code
      : null,
});
export const safeCatalogVersion = (
  row: {
    id: string;
    amount_cents: number;
    currency: string;
    interval: string;
    interval_count: number;
    created_at: Date;
  },
  currentId?: string | null,
) => ({
  id: row.id,
  amount_cents: row.amount_cents,
  currency: row.currency,
  interval: row.interval,
  interval_count: row.interval_count,
  created_at: row.created_at.toISOString(),
  is_current: row.id === currentId,
});
