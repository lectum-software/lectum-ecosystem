import type { StripeIdentity } from "./stripe-types";
export type FeeState =
  | "not_observed"
  | "processing"
  | "partial"
  | "observed"
  | "unavailable"
  | "conflict";
export type FeeDiagnostic =
  | "read_access_denied"
  | "provider_unavailable"
  | "scope_mismatch"
  | "invalid_receipt"
  | "balance_missing"
  | "unsupported_balance"
  | "fact_conflict"
  | "lease_unavailable"
  | "live_not_authorized";
export type BalanceFactKind = "capture" | "refund" | "refund_reversal" | "dispute";
export type BalanceStatus = "pending" | "available";
export type BalanceStage = "capture" | "refunds" | "disputes";
export type StripeBalanceTarget = StripeIdentity & {
  receiptId: string;
  receiptHash: string;
  chargeId: string;
  paymentIntentId: string;
  customerId: string;
  amountCents: number;
};
export type StripeBalanceFact = {
  providerTransactionId: string;
  kind: BalanceFactKind;
  sourceId: string;
  chargeId: string;
  currency: "BRL";
  amountCents: bigint;
  feeCents: bigint;
  netCents: bigint;
  providerCreatedAt: Date;
  status: BalanceStatus;
  availableOn: Date;
};
export type StripeBalancePage = {
  facts: StripeBalanceFact[];
  nextCursor: string | null;
  hasMore: boolean;
  gap: boolean;
  requests: number;
};
