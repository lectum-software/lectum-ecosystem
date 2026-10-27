import type { GatewayAuthorizedPayment } from "./PaymentGateway";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isAuthorizedPaymentId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 128 &&
  !/[^A-Za-z0-9_-]/.test(value);

const referenceOrNull = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return isAuthorizedPaymentId(value) ? value : null;
};

const codeOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= 80 && !/[^a-z0-9_]/.test(value)
    ? value
    : null;

// Invoice status (e.g. scheduled) is not the nested payment outcome.
export const projectAuthorizedPayment = (body: unknown): GatewayAuthorizedPayment => {
  const invoice = isRecord(body) ? body : {};
  const payment = isRecord(invoice.payment) ? invoice.payment : {};

  return {
    gateway_subscription_id: referenceOrNull(invoice.preapproval_id),
    gateway_payment_id: referenceOrNull(payment.id),
    external_reference: referenceOrNull(invoice.external_reference),
    status: codeOrNull(payment.status),
    status_detail: codeOrNull(payment.status_detail),
  };
};
