import type { payment_method, professional_subscription } from "@/interfaces/objects";

export interface ISubscriptionRepository {
  findProfileByUserId(
    userId: string,
  ): Promise<{ id?: string | null; deleted?: boolean | null } | null>;
  showSubscription(psychologistId: string): Promise<professional_subscription | null>;
  showPaymentMethod(userId: string): Promise<payment_method | null>;
}
