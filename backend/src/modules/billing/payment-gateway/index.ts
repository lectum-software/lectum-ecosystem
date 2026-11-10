import { sanitizePaymentGatewayError } from "./error-log";
import { MercadoPagoAdapter } from "./MercadoPagoAdapter";
import type { PaymentGateway } from "./PaymentGateway";
import { StripeAdapter } from "./StripeAdapter";
import type { PaymentGatewayName } from "./stripe-config";
import { StripeGatewayError } from "./stripe-error";

let gateway: PaymentGateway | null = null;
let stripeGateway: StripeAdapter | null = null;

const PAYMENT_GATEWAY_CONFIGURATION_ERROR_CODES = [
  "MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED",
  "MERCADO_PAGO_ACCESS_TOKEN_ENV_MISMATCH",
  "MERCADO_PAGO_SANDBOX_TEST_SELLER_ACCESS_TOKEN_REQUIRED",
  "MERCADO_PAGO_SANDBOX_SELLER_ACCOUNT_REQUIRED",
  "MERCADO_PAGO_BACK_URL_NOT_CONFIGURED",
  "MERCADO_PAGO_SANDBOX_PAYER_EMAIL_NOT_CONFIGURED",
  "MERCADO_PAGO_ENV_INVALID",
  "MERCADO_PAGO_PREAPPROVAL_PLAN_INCOMPATIBLE",
] as const;

export const getStripeGateway = (): StripeAdapter => {
  stripeGateway ??= new StripeAdapter();
  return stripeGateway;
};

export const getPaymentGateway = (provider: PaymentGatewayName = "mercadopago"): PaymentGateway => {
  if (provider === "stripe") return getStripeGateway();
  if (provider !== "mercadopago") throw new StripeGatewayError("configuration_invalid");
  if (!gateway) {
    gateway = new MercadoPagoAdapter();
  }

  return gateway;
};

export const isPaymentGatewayConfigurationError = (err: unknown) => {
  if (
    err instanceof StripeGatewayError &&
    ["configuration_invalid", "account_mismatch", "account_not_ready"].includes(err.kind)
  )
    return true;
  const message = err instanceof Error ? err.message : "";

  if (PAYMENT_GATEWAY_CONFIGURATION_ERROR_CODES.some((code) => message.includes(code))) {
    return true;
  }

  const gatewayStatus = sanitizePaymentGatewayError(err).status;

  return gatewayStatus === 401 || gatewayStatus === 403;
};

export { getPaymentGatewayErrorDetails, sanitizePaymentGatewayError } from "./error-log";
export type {
  BillingSubscriptionStatus,
  GatewayCancelSubscriptionInput,
  GatewaySubscription,
  GatewaySubscriptionInput,
  GatewaySubscriptionPaymentSummary,
  GatewaySubscriptionPlan,
  GatewaySubscriptionPlanInput,
  GatewaySubscriptionPlanResult,
  GatewaySubscriptionResult,
  GatewayUpdateSubscriptionCardInput,
  GatewayWebhookEvent,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";
export { resolvePaymentGatewayPublicError } from "./public-error";
export type { PaymentGatewayName } from "./stripe-config";
export { getNewSubscriptionGatewayName } from "./stripe-config";
export type * from "./stripe-types";
