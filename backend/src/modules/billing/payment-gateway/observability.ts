import { createHash } from "node:crypto";
import { sanitizePaymentGatewayError } from "./error-log";

export type BillingOperationContext = {
  operation: "create_subscription" | "update_subscription_card";
  subscriptionId: string;
  deviceSessionPresent: boolean;
};

// Opaque references allow incident correlation without logging identifiers or payloads.
export const billingReference = (kind: "attempt" | "invoice" | "payment", id: string) =>
  createHash("sha256").update(`lectum.billing.${kind}.v1:${id}`).digest("hex").slice(0, 24);

const operationFields = (context: BillingOperationContext) => ({
  operation: context.operation,
  attempt_ref: billingReference("attempt", context.subscriptionId),
  device_session_present: context.deviceSessionPresent,
  observed_at: new Date().toISOString(),
});

export const logBillingAttempt = (context: BillingOperationContext) => {
  console.info("[BILLING] Tentativa iniciada.", operationFields(context));
};

export const logBillingResult = (context: BillingOperationContext) => {
  console.info("[BILLING] Operação recebida.", operationFields(context));
};

export const logBillingFailure = (
  context: BillingOperationContext,
  error: unknown,
  stage: "gateway" | "local_after_gateway" = "gateway",
) => {
  console.warn("[BILLING] Falha na operação.", {
    ...operationFields(context),
    stage,
    ...(stage === "gateway"
      ? sanitizePaymentGatewayError(error)
      : { name: "BillingLocalPersistenceError" }),
  });
};

export const classifyBillingPayment = (status: unknown, detail: unknown) => {
  if (detail === "invalid_credentials") return "credential_rejected";
  if (detail === "cc_rejected_high_risk" || detail === "rejected_high_risk") {
    return "risk_rejected";
  }
  if (detail === "cc_rejected_max_attempts" || detail === "max_attempts_exceeded") {
    return "attempt_limit_rejected";
  }
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected_other";
  if (status === "pending" || status === "in_process") return "pending";
  if (status === "cancelled") return "cancelled";
  return "unclassified";
};
