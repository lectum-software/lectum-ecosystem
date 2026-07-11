import { MercadoPagoAdapter } from "./MercadoPagoAdapter";
import type { PaymentGateway } from "./PaymentGateway";

let gateway: PaymentGateway | null = null;

export const getPaymentGateway = (): PaymentGateway => {
  if (!gateway) {
    gateway = new MercadoPagoAdapter();
  }

  return gateway;
};

export type {
  BillingSubscriptionStatus,
  GatewayCancelSubscriptionInput,
  GatewaySubscription,
  GatewaySubscriptionInput,
  GatewaySubscriptionPaymentSummary,
  GatewaySubscriptionPlanInput,
  GatewaySubscriptionPlanResult,
  GatewaySubscriptionResult,
  GatewayUpdateSubscriptionCardInput,
  GatewayWebhookEvent,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";
