import type { billing_financial_receipt } from "@/external/generated/prisma/client";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import type { SubscriptionHistorySnapshot } from "@/utils/professional-plan-history";
import type {
  FinanceStripeContract,
  FinanceStripeSnapshot,
} from "../../repositories/AdminFinanceStripeLedgerRepository";

// Disposable policy fixtures only; never imported by application handlers or used as settlement evidence.
export const financeNow = new Date("2026-11-11T15:00:00.000Z");
export const financePaidAt = new Date("2026-11-10T12:00:00.000Z");
export const financeContract: FinanceStripeContract = {
  id: "subscription-local",
  internal_id: 1,
  psychologist_id: "profile-local",
  plan_id: "plan-local",
  price_version_id: "version-local",
  gateway: "stripe",
  source: "stripe",
  gateway_mode: "test",
  gateway_account_id: "acct_localfinance",
  gateway_subscription_id: "sub_localfinance",
  createdAt: new Date("2026-11-09T12:00:00.000Z"),
  updatedAt: financePaidAt,
  current_period_end: new Date("2026-12-10T12:00:00.000Z"),
  status: "ativa",
  contracted_amount_cents: 2990,
  contracted_currency: "BRL",
  contracted_interval: "month",
  contracted_interval_count: 1,
  plan: {
    id: "plan-local",
    name: "Profissional",
    slug: "profissional",
    price_cents: 9990,
    interval: "month",
  },
  psychologist: {
    id: "profile-local",
    crp: null,
    user: {
      id: "user-local",
      name: "Local fixture",
      email: "local@example.invalid",
      payment_methods: [],
    },
  },
};
export function financeReceipt(
  change: Partial<billing_financial_receipt> = {},
): billing_financial_receipt {
  const row: billing_financial_receipt = {
    id: "receipt-local",
    gateway: "stripe",
    mode: "test",
    account_id: "acct_localfinance",
    subscription_id: financeContract.id,
    psychologist_id: "profile-local",
    provider_subscription_id: "sub_localfinance",
    invoice_id: "in_localfinance",
    invoice_payment_id: "inpay_localfinance",
    payment_intent_id: "pi_localfinance",
    charge_id: "ch_localfinance",
    price_id: "price_localfinance",
    price_version_id: "version-local",
    currency: "BRL",
    amount_paid_cents: 2990,
    paid_at: financePaidAt,
    invoice_paid_at: financePaidAt,
    period_start: financePaidAt,
    period_end: new Date("2026-12-10T12:00:00.000Z"),
    immutable_hash: "",
    current_state: "paid",
    refunded_cents: 0,
    dispute_status: "none",
    observed_at: financeNow,
    created_at: financeNow,
    updated_at: financeNow,
    ...change,
  };
  row.immutable_hash = storedFinancialReceiptHash(row);
  return row;
}
export function financeHistory(
  change: Partial<SubscriptionHistorySnapshot> = {},
): SubscriptionHistorySnapshot {
  return {
    id: 1n,
    subscription_id: financeContract.id,
    psychologist_id: "profile-local",
    plan_id: "plan-local",
    deleted: false,
    source_created_at: financeContract.createdAt,
    status: "ativa",
    source: "stripe",
    gateway: "stripe",
    has_gateway_subscription_id: true,
    current_period_end: financeContract.current_period_end,
    grant_started_at: null,
    observed_at: financePaidAt,
    observation: "update_observed",
    ...change,
  };
}
export function financeSnapshot(
  change: Partial<FinanceStripeSnapshot> = {},
): FinanceStripeSnapshot {
  return {
    now: financeNow,
    scopes: [{ gateway: "stripe", accountId: "acct_localfinance", mode: "test" }],
    contracts: [financeContract],
    receipts: [financeReceipt()],
    reconciliations: [],
    history: [financeHistory()],
    coverageStartedAt: new Date("2026-11-01T03:00:00.000Z"),
    prices: [
      {
        id: "version-local",
        plan_id: "plan-local",
        gateway: "stripe",
        mode: "test",
        account_id: "acct_localfinance",
        external_product_id: "prod_localfinance",
        external_price_id: "price_localfinance",
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
        interval_count: 1,
        created_at: financeContract.createdAt,
      },
    ],
    ...change,
  };
}
