import type {
  billing_stripe_balance_fact,
  billing_stripe_fee_observation,
} from "@/external/generated/prisma/client";
import {
  financeNow,
  financePaidAt,
  financeSnapshot,
} from "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-fixtures";
import { projectFinanceStripeLedger } from "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-projection";
import type { StripeFeesSnapshot } from "@/modules/api/admin/private/finance/fees/repositories/AdminStripeFeesRepository";
import type {
  StripeBalanceFact,
  StripeBalanceTarget,
} from "../../payment-gateway/stripe-balance-types";
import { balanceFactHash, storedBalanceFactHash } from "./policy";
export const feeNow = financeNow;
export const feeTarget: StripeBalanceTarget = {
  accountId: "acct_localfinance",
  mode: "test",
  receiptId: "receipt-local",
  receiptHash: financeSnapshot().receipts[0].immutable_hash,
  chargeId: "ch_localfinance",
  paymentIntentId: "pi_localfinance",
  customerId: "cus_localfinance",
  amountCents: 2990,
};
export const remoteFact = (change: Partial<StripeBalanceFact> = {}): StripeBalanceFact => ({
  providerTransactionId: "txn_localfinance",
  kind: "capture",
  sourceId: feeTarget.chargeId,
  chargeId: feeTarget.chargeId,
  currency: "BRL",
  amountCents: 2990n,
  feeCents: 158n,
  netCents: 2832n,
  providerCreatedAt: financePaidAt,
  status: "available",
  availableOn: financeNow,
  ...change,
});
export function storedFact(
  change: Partial<billing_stripe_balance_fact> = {},
): billing_stripe_balance_fact {
  const fact = remoteFact();
  const row: billing_stripe_balance_fact = {
    id: "fact-local",
    gateway: "stripe",
    mode: "test",
    account_id: feeTarget.accountId,
    receipt_id: feeTarget.receiptId,
    receipt_immutable_hash: feeTarget.receiptHash,
    provider_transaction_id: fact.providerTransactionId,
    kind: fact.kind,
    source_id: fact.sourceId,
    charge_id: fact.chargeId,
    currency: fact.currency,
    amount_cents: fact.amountCents,
    fee_cents: fact.feeCents,
    net_cents: fact.netCents,
    provider_created_at: fact.providerCreatedAt,
    status: fact.status,
    available_on: fact.availableOn,
    immutable_hash: balanceFactHash(feeTarget, fact),
    observed_at: feeNow,
    created_at: feeNow,
    updated_at: feeNow,
    ...change,
  };
  row.immutable_hash = storedBalanceFactHash(row);
  return row;
}
export const storedObservation = (
  change: Partial<billing_stripe_fee_observation> = {},
): billing_stripe_fee_observation => ({
  id: "observation-local",
  gateway: "stripe",
  mode: "test",
  account_id: feeTarget.accountId,
  receipt_id: feeTarget.receiptId,
  receipt_hash: feeTarget.receiptHash,
  state: "observed",
  stage: "complete",
  revision: 4,
  lease_token: null,
  lease_until: null,
  cutoff: feeNow,
  capture_verified: true,
  refunds_cursor: null,
  disputes_cursor: null,
  refunds_scanned: true,
  disputes_scanned: true,
  refunds_gap: false,
  disputes_gap: false,
  last_error_code: null,
  observed_at: feeNow,
  created_at: feeNow,
  updated_at: feeNow,
  ...change,
});
export const feesSnapshot = (change: Partial<StripeFeesSnapshot> = {}): StripeFeesSnapshot => ({
  now: feeNow,
  mode: "test",
  receipts: projectFinanceStripeLedger(financeSnapshot()).valid,
  facts: [],
  observations: [],
  ...change,
});
