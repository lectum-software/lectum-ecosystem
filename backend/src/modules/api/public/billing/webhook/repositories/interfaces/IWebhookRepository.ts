import type { payment_event, professional_subscription } from "@/interfaces/objects";

export interface IWebhookRepository {
  storePaymentEvent(data: {
    gateway: string;
    external_id: string;
    type: string;
    payload: unknown;
  }): Promise<{ event: payment_event; created: boolean }>;
  updateSubscriptionByGatewayReference(data: {
    subscriptionId?: string | null;
    gatewaySubscriptionId: string;
    status: "inativa" | "ativa" | "inadimplente" | "cancelada";
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null>;
}
