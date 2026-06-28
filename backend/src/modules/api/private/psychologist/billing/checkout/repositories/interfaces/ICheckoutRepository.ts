import type {
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";

export interface ICheckoutRepository {
  findProfileByUserId(userId: string): Promise<Pick<psychologist_profile, "id" | "deleted"> | null>;
  findPlanBySlug(slug: "profissional"): Promise<subscription_plan | null>;
  findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  createPendingSubscription(
    psychologistId: string,
    planId: string,
  ): Promise<professional_subscription>;
  setGatewaySubscriptionId(
    subscriptionId: string,
    gatewaySubscriptionId: string,
  ): Promise<professional_subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
