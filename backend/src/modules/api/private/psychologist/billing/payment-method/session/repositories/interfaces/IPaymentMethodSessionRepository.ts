import type { payment_method, professional_subscription } from "@/interfaces/objects";

type PaymentMethodDisplay = {
  gatewaySubscriptionId: string;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
};

export interface IPaymentMethodSessionRepository {
  findProfileByUserId(
    userId: string,
  ): Promise<{ id?: string | null; deleted?: boolean | null } | null>;
  findManageableSubscription(psychologistId: string): Promise<professional_subscription | null>;
  savePaymentMethod(userId: string, data: PaymentMethodDisplay): Promise<payment_method>;
}
