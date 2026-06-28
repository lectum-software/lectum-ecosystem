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
  GatewaySubscription,
  GatewaySubscriptionInput,
  GatewaySubscriptionResult,
  GatewayWebhookEvent,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";
