import { createHash } from "node:crypto";
import type {
  billing_stripe_balance_fact,
  billing_stripe_fee_observation,
} from "@/external/generated/prisma/client";
import type {
  FeeDiagnostic,
  StripeBalanceFact,
  StripeBalancePage,
  StripeBalanceTarget,
} from "../../payment-gateway/stripe-balance-types";
import { StripeGatewayError } from "../../payment-gateway/stripe-error";
export class FeeObservationError extends Error {
  constructor(
    readonly code: FeeDiagnostic | "actor_invalid" | "invalid_arguments" | "receipt_not_found",
  ) {
    super("STRIPE_FEE_OBSERVATION_UNAVAILABLE");
    this.name = "FeeObservationError";
  }
}
export const feeDiagnostic = (cause: unknown): FeeDiagnostic => {
  if (cause instanceof FeeObservationError)
    return ["actor_invalid", "invalid_arguments", "receipt_not_found"].includes(cause.code)
      ? "invalid_receipt"
      : (cause.code as FeeDiagnostic);
  if (cause instanceof StripeGatewayError) {
    if (cause.details.status === 401 || cause.details.status === 403) return "read_access_denied";
    if (["resource_mismatch", "account_mismatch"].includes(cause.kind)) return "scope_mismatch";
    if (["contract_invalid", "resource_invalid", "operation_unsupported"].includes(cause.kind))
      return "unsupported_balance";
  }
  return "provider_unavailable";
};
export const balanceFactHash = (
  target: Pick<StripeBalanceTarget, "accountId" | "mode" | "receiptId" | "receiptHash">,
  fact: StripeBalanceFact,
) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        "lectum.stripe.balance.v1",
        target.accountId,
        target.mode,
        target.receiptId,
        target.receiptHash,
        fact.providerTransactionId,
        fact.kind,
        fact.sourceId,
        fact.chargeId,
        fact.currency,
        fact.amountCents.toString(),
        fact.feeCents.toString(),
        fact.netCents.toString(),
        fact.providerCreatedAt.toISOString(),
      ]),
    )
    .digest("hex");
export const storedBalanceFactHash = (row: billing_stripe_balance_fact) =>
  balanceFactHash(
    {
      accountId: row.account_id,
      mode: row.mode as "test" | "live",
      receiptId: row.receipt_id,
      receiptHash: row.receipt_immutable_hash,
    },
    {
      providerTransactionId: row.provider_transaction_id,
      kind: row.kind as StripeBalanceFact["kind"],
      sourceId: row.source_id,
      chargeId: row.charge_id,
      currency: row.currency as "BRL",
      amountCents: row.amount_cents,
      feeCents: row.fee_cents,
      netCents: row.net_cents,
      providerCreatedAt: row.provider_created_at,
      status: row.status as StripeBalanceFact["status"],
      availableOn: row.available_on,
    },
  );
export const safeFeeNumber = (value: bigint) => {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};
export const observationHasMore = (row: billing_stripe_fee_observation) =>
  row.state !== "conflict" && row.stage !== "complete";
export const feeScope = (target: StripeBalanceTarget) => ({
  gateway: "stripe",
  mode: target.mode,
  account_id: target.accountId,
});

export function assertBalancePage(
  target: StripeBalanceTarget,
  stage: string,
  page: StripeBalancePage,
) {
  if (stage === "capture" && (page.gap || !page.facts.length))
    throw new FeeObservationError("balance_missing");
  const roles: Record<string, string[]> = {
    capture: ["capture"],
    refunds: ["refund", "refund_reversal"],
    disputes: ["dispute"],
  };
  if (
    !roles[stage] ||
    !Number.isInteger(page.requests) ||
    page.requests < 2 ||
    page.requests > 8 ||
    page.facts.length > 6 ||
    (stage === "capture" &&
      (page.facts.length !== 1 || page.hasMore || page.nextCursor !== null)) ||
    Boolean(page.nextCursor) !== page.hasMore
  )
    throw new FeeObservationError("unsupported_balance");
  const seen = new Set<string>();
  for (const fact of page.facts) {
    if (
      !roles[stage].includes(fact.kind) ||
      fact.chargeId !== target.chargeId ||
      fact.currency !== "BRL" ||
      fact.netCents !== fact.amountCents - fact.feeCents ||
      ![fact.amountCents, fact.feeCents, fact.netCents].every(
        (value) => safeFeeNumber(value) !== null,
      ) ||
      !["pending", "available"].includes(fact.status) ||
      !/^txn_[A-Za-z0-9]{1,100}$/.test(fact.providerTransactionId) ||
      seen.has(fact.providerTransactionId)
    )
      throw new FeeObservationError("unsupported_balance");
    if (
      fact.kind === "capture" &&
      (fact.amountCents !== BigInt(target.amountCents) || fact.sourceId !== target.chargeId)
    )
      throw new FeeObservationError("scope_mismatch");
    if (
      fact.kind === "refund" &&
      (!/^re_[A-Za-z0-9]{1,100}$/.test(fact.sourceId) || fact.amountCents >= 0n)
    )
      throw new FeeObservationError("unsupported_balance");
    if (
      fact.kind === "refund_reversal" &&
      (!/^re_[A-Za-z0-9]{1,100}$/.test(fact.sourceId) || fact.amountCents <= 0n)
    )
      throw new FeeObservationError("unsupported_balance");
    if (fact.kind === "dispute" && !/^(dp|du)_[A-Za-z0-9]{1,100}$/.test(fact.sourceId))
      throw new FeeObservationError("unsupported_balance");
    seen.add(fact.providerTransactionId);
  }
}
