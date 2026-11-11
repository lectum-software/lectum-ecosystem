import { createHash } from "node:crypto";
import { StripeGatewayError } from "../payment-gateway/stripe-error";
import { StripeInvoicePaymentError } from "../payment-gateway/stripe-invoice";
import { InvoiceError } from "./config";

const CODES = new Set([
  "billing_address_incomplete",
  "billing_address_snapshot_missing",
  "company_mismatch",
  "company_not_live",
  "company_not_ready",
  "configuration_invalid",
  "document_mismatch",
  "document_observation_conflict",
  "fiscal_preview_invalid",
  "fiscal_settings_mismatch",
  "live_runtime_required",
  "payment_environment_mismatch",
  "payment_not_eligible",
  "payment_outside_scope",
  "payment_snapshot_mismatch",
  "provider_contract_invalid",
  "provider_response_invalid",
  "recipient_incomplete",
  "resource_invalid",
  "sendnf_unavailable",
  "snapshot_invalid",
  "subscription_mapping_unresolved",
  "subscription_reference_mismatch",
  "cnc_missing_in_test",
  "municipality_missing_in_test",
  "registry_missing_in_test",
  "government_test_rejected",
  "awaiting_payment",
  "zero_invoice",
  "void_invoice",
  "uncollectible_invoice",
  "provider_unavailable",
  "provider_access_denied",
]);
export const safeInvoiceDiagnostic = (code: unknown): string => {
  if (typeof code !== "string") return "operation_unavailable";
  if (CODES.has(code)) return code;
  if (/^sendnf_http_[45]\d{2}$/.test(code)) return code;
  return "operation_unavailable";
};
export const invoiceFailure = (
  error: unknown,
  gateway: string,
  verificationFailures: number,
  boundedRetries = true,
) => {
  if (error instanceof StripeInvoicePaymentError)
    return {
      code: error.disposition,
      terminal:
        error.disposition !== "awaiting_payment" || (boundedRetries && verificationFailures >= 10),
    };
  if (gateway === "stripe" && error instanceof StripeGatewayError) {
    const accessDenied = error.details.status === 401 || error.details.status === 403;
    const invalid = [
      "payment_not_eligible",
      "resource_invalid",
      "resource_mismatch",
      "contract_invalid",
      "operation_unsupported",
    ].includes(error.kind);
    return {
      code: accessDenied
        ? "provider_access_denied"
        : invalid
          ? "payment_not_eligible"
          : "provider_unavailable",
      terminal: accessDenied || invalid || (boundedRetries && verificationFailures >= 10),
    };
  }
  return {
    code: safeInvoiceDiagnostic(error instanceof InvoiceError ? error.code : null),
    terminal:
      (error instanceof InvoiceError && !error.retryable) ||
      (gateway === "stripe" &&
        !(error instanceof InvoiceError) &&
        boundedRetries &&
        verificationFailures >= 10),
  };
};

export const invoiceJobFailure = (
  error: unknown,
  gateway: string,
  previousVerificationFailures: number,
  paymentVerified: boolean,
) => {
  const awaitingRecipient =
    paymentVerified &&
    error instanceof InvoiceError &&
    error.retryable &&
    ["billing_address_incomplete", "recipient_incomplete"].includes(error.code);
  const verificationFailures = awaitingRecipient
    ? 0
    : Math.min(10, previousVerificationFailures + 1);
  return { ...invoiceFailure(error, gateway, verificationFailures), verificationFailures };
};

/** Only call after canonical paid evidence passes eligibility, never from an event callback. */
export const invoiceVerificationFailuresAfterPayment = (
  previousVerificationFailures: number,
  lastErrorCode: string | null,
) => (lastErrorCode === "awaiting_payment" ? 0 : previousVerificationFailures);

export const invoiceOperationReference = (id: string) =>
  createHash("sha256").update(`lectum.fiscal.v1:${id}`).digest("hex").slice(0, 24);

export const logInvoiceOutcome = (input: {
  id: string;
  stage: "payment_verification" | "document";
  outcome: "snapshot_ready" | "deferred" | "observed" | "retry" | "review_required" | "excluded";
  code?: string | null;
  documentStatus?: string;
  attempts: number;
}) => {
  console.info("[BILLING_INVOICES] Etapa fiscal observada.", {
    invoice_ref: invoiceOperationReference(input.id),
    stage: input.stage,
    ...(input.documentStatus
      ? {
          document_status: new Set([
            "pending",
            "processing",
            "authorized",
            "rejected",
            "blocked",
            "failed",
            "cancel_requested",
            "cancelled",
            "simulated",
            "authorization_unverified",
          ]).has(input.documentStatus)
            ? input.documentStatus
            : "unknown",
        }
      : {}),
    outcome: input.outcome,
    diagnostic: input.code == null ? null : safeInvoiceDiagnostic(input.code),
    attempts: Number.isSafeInteger(input.attempts) && input.attempts >= 0 ? input.attempts : 0,
  });
};
