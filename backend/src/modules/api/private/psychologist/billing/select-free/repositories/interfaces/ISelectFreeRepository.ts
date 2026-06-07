import type {
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";

export interface ISelectFreeRepository {
  findProfileByUserId(userId: string): Promise<Pick<psychologist_profile, "id" | "deleted"> | null>;
  findPlanBySlug(slug: "gratuito"): Promise<subscription_plan | null>;
  findCurrentSubscription(psychologistId: string): Promise<professional_subscription | null>;
  findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  createFreeSubscription(
    psychologistId: string,
    planId: string,
  ): Promise<professional_subscription>;
}
