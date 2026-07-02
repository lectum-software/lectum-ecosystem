import type { payment_event, professional_subscription } from "@/interfaces/objects";

export interface IWebhookRepository {
  storePaymentEvent(data: {
    gateway: string;
    external_id: string;
    type: string;
    payload: unknown;
  }): Promise<{ event: payment_event; created: boolean }>;
  findSubscriptionByGatewayReference(data: {
    subscriptionId?: string | null;
    gatewaySubscriptionId: string;
  }): Promise<professional_subscription | null>;
}
