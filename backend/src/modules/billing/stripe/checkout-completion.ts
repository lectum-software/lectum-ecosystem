import type { billing_operation } from "@/external/generated/prisma/client";
import type { StripeCanonicalSubscription } from "../payment-gateway/stripe-types";
import type { FinancialLedgerRepository } from "./financial-ledger/repository";
import { hasPaidCurrentPeriod, validDate } from "./policy";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";

export type OriginalCheckoutReceipt = Awaited<
  ReturnType<FinancialLedgerRepository["originalCheckoutReceipt"]>
>;

type CheckoutIdentity = Pick<
  billing_operation,
  "kind" | "intent" | "intent_kind" | "provider_intent_id"
>;

/** Only accepts the ledger's internally validated proof, never a provider payload or an HTTP input. */
export const isOriginalCheckoutCaptureComplete = (
  operation: CheckoutIdentity,
  receipt: OriginalCheckoutReceipt,
  contractedAmountCents: number | null,
  now = new Date(),
) =>
  Boolean(
    operation.kind === "checkout" &&
      operation.intent === "subscription" &&
      operation.intent_kind === "payment" &&
      receipt &&
      /^pi_[A-Za-z0-9]+$/.test(operation.provider_intent_id ?? "") &&
      receipt.paymentIntentId === operation.provider_intent_id &&
      /^[A-Za-z0-9_-]{1,128}$/.test(receipt.receiptId) &&
      /^in_[A-Za-z0-9]+$/.test(receipt.invoiceId) &&
      /^inpay_[A-Za-z0-9]+$/.test(receipt.invoicePaymentId) &&
      Number.isSafeInteger(contractedAmountCents) &&
      Number(contractedAmountCents) > 0 &&
      receipt.amountCents === contractedAmountCents &&
      validDate(now) &&
      validDate(receipt.paidAt) &&
      validDate(receipt.invoicePaidAt) &&
      receipt.paidAt <= now &&
      receipt.invoicePaidAt <= now,
  );

/** Current access is not proof that the originally authorized PI was captured. */
export const isCurrentOriginalCheckoutPaymentComplete = (
  operation: CheckoutIdentity,
  remote: StripeCanonicalSubscription,
  localStatus: string,
  now = new Date(),
) =>
  operation.kind === "checkout" &&
  operation.intent === "subscription" &&
  operation.intent_kind === "payment" &&
  /^pi_[A-Za-z0-9]+$/.test(operation.provider_intent_id ?? "") &&
  remote.latestInvoicePaymentIntentId === operation.provider_intent_id &&
  ["ativa", "cancelada"].includes(localStatus) &&
  hasPaidCurrentPeriod(remote, now);

/** A terminal contract does not establish that its originally authorized payment was never captured. */
export const unresolvedTerminalCheckoutUpdate = (
  operation: Pick<billing_operation, "kind" | "intent" | "state">,
  now = new Date(),
) => {
  if (TERMINAL_OPERATION_STATES.includes(operation.state)) return null;
  if (operation.kind === "checkout" && operation.intent === "subscription")
    return {
      state: "review_required",
      completed_at: null,
      last_error_code: "original_payment_unresolved",
    };
  return { state: "failed", completed_at: now, last_error_code: null };
};
