import type { user } from "@/api/generator/types";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";

export const PSYCHOLOGIST_ONBOARDING_PATHS = {
  plans: "/app/professional/billing/plans",
  checkout: "/app/professional/billing/checkout",
  phone: "/app/professional/whatsapp/verify",
  billingAddress: "/app/professional/billing/address",
  cfp: "/psychologist/cfp",
  profileSetup: "/app/professional/profile/setup",
} as const;

type SubscriptionLike = Pick<ProfessionalSubscription, "status" | "plan"> | null | undefined;

export const isProfessionalSubscriptionActive = (subscription: SubscriptionLike) => {
  return subscription?.status === "ativa" && subscription.plan?.slug === "profissional";
};

export const getAfterPhoneVerificationPath = (subscription: SubscriptionLike) => {
  if (isProfessionalSubscriptionActive(subscription)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress;
  }

  return PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup;
};

export const getAfterPlanSelectionPath = () => PSYCHOLOGIST_ONBOARDING_PATHS.phone;

export const getPsychologistRegistrationEntryPath = (
  data: Partial<Pick<user, "role">> | null | undefined,
  fallback: string,
) => {
  if (data?.role === "psicologo") {
    return PSYCHOLOGIST_ONBOARDING_PATHS.plans;
  }

  return fallback;
};
