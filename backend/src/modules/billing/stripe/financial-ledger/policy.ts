import { createHash } from "node:crypto";
import type { billing_financial_receipt } from "@/external/generated/prisma/client";
import { StripeGatewayError } from "../../payment-gateway/stripe-error";
import type { StripeFinancialReceipt } from "../../payment-gateway/stripe-financial-types";

export type FinancialFailureCode =
  | "not_found"
  | "scope_mismatch"
  | "unsupported_invoice"
  | "read_access_denied"
  | "provider_unavailable"
  | "receipt_conflict"
  | "stale_revision"
  | "lease_unavailable"
  | "invalid_arguments";
export class FinancialLedgerError extends Error {
  constructor(readonly code: FinancialFailureCode) {
    super("FINANCIAL_RECONCILIATION_UNAVAILABLE");
  }
}
export const financialFailureCode = (error: unknown): FinancialFailureCode => {
  if (error instanceof FinancialLedgerError) return error.code;
  if (error instanceof StripeGatewayError) {
    if (error.details.status === 401 || error.details.status === 403) return "read_access_denied";
    if (["resource_mismatch", "account_mismatch"].includes(error.kind)) return "scope_mismatch";
    if (
      [
        "payment_not_eligible",
        "contract_invalid",
        "operation_unsupported",
        "resource_invalid",
      ].includes(error.kind)
    )
      return "unsupported_invoice";
  }
  return "provider_unavailable";
};
export const financialReference = (id: string) =>
  createHash("sha256").update(`lectum.financial.v1:${id}`).digest("hex").slice(0, 24);

type FinancialReceiptCore = Pick<
  StripeFinancialReceipt,
  | "accountId"
  | "mode"
  | "subscriptionId"
  | "invoiceId"
  | "invoicePaymentId"
  | "paymentIntentId"
  | "chargeId"
  | "priceId"
  | "currency"
  | "amountCents"
  | "paidAt"
  | "invoicePaidAt"
  | "periodStart"
  | "periodEnd"
>;

export const financialReceiptHash = <T extends FinancialReceiptCore>(
  receipt: T,
  local: { subscriptionId: string; psychologistId: string; priceVersionId: string },
) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        "lectum.financial.receipt.v1",
        receipt.accountId,
        receipt.mode,
        local.subscriptionId,
        local.psychologistId,
        receipt.subscriptionId,
        receipt.invoiceId,
        receipt.invoicePaymentId,
        receipt.paymentIntentId,
        receipt.chargeId,
        receipt.priceId,
        local.priceVersionId,
        receipt.currency,
        receipt.amountCents,
        receipt.paidAt.toISOString(),
        receipt.invoicePaidAt.toISOString(),
        receipt.periodStart.toISOString(),
        receipt.periodEnd.toISOString(),
      ]),
    )
    .digest("hex");

export const storedFinancialReceiptHash = (row: billing_financial_receipt) =>
  financialReceiptHash(
    {
      accountId: row.account_id,
      mode: row.mode as "test" | "live",
      subscriptionId: row.provider_subscription_id,
      invoiceId: row.invoice_id,
      invoicePaymentId: row.invoice_payment_id,
      paymentIntentId: row.payment_intent_id,
      chargeId: row.charge_id,
      priceId: row.price_id,
      currency: row.currency as "BRL",
      amountCents: row.amount_paid_cents,
      paidAt: row.paid_at,
      invoicePaidAt: row.invoice_paid_at,
      periodStart: row.period_start,
      periodEnd: row.period_end,
    },
    {
      subscriptionId: row.subscription_id,
      psychologistId: row.psychologist_id,
      priceVersionId: row.price_version_id ?? "",
    },
  );

export type FinancialReconcileOptions = {
  subscriptionId: string;
  accountId: string;
  mode: "test" | "live";
  apply: boolean;
  confirm?: "test" | "live";
  refresh?: boolean;
  maxPages?: number;
};
export const validateFinancialOptions = (input: FinancialReconcileOptions) => {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.subscriptionId) ||
    !/^acct_[A-Za-z0-9]{1,100}$/.test(input.accountId) ||
    !["test", "live"].includes(input.mode) ||
    (input.apply && input.confirm !== input.mode) ||
    (input.refresh && !input.apply) ||
    !Number.isInteger(input.maxPages ?? 1) ||
    (input.maxPages ?? 1) < 1 ||
    (input.maxPages ?? 1) > 5
  )
    throw new FinancialLedgerError("invalid_arguments");
};
