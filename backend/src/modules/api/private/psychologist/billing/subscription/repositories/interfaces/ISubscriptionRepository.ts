import type { payment_method, professional_subscription } from "@/interfaces/objects";

export type BillingPaymentHistoryStatus =
  | "pago"
  | "pendente"
  | "recusado"
  | "cancelado"
  | "processado";

export type BillingPaymentHistoryItem = {
  id: string;
  title: string;
  description: string;
  amount_cents: number | null;
  status: BillingPaymentHistoryStatus;
  status_label: string;
  occurred_at: Date | null;
  gateway: string;
  external_id: string;
};

export interface ISubscriptionRepository {
  findProfileByUserId(
    userId: string,
  ): Promise<{ id?: string | null; deleted?: boolean | null } | null>;
  showSubscription(psychologistId: string): Promise<professional_subscription | null>;
  findCancelableSubscription(psychologistId: string): Promise<professional_subscription | null>;
  findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  cancelSubscription(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
  }): Promise<professional_subscription>;
  showPaymentMethod(userId: string, gatewayToken?: string | null): Promise<payment_method | null>;
  showPaymentHistory(
    subscription: professional_subscription | null,
  ): Promise<BillingPaymentHistoryItem[]>;
}
