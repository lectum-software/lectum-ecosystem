import type { user } from "@/api/generator/types";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";

export const PSYCHOLOGIST_ONBOARDING_PATHS = {
  plans: "/app/professional/billing/plans",
  checkout: "/app/professional/billing/checkout",
  phone: "/app/professional/whatsapp/verify",
  billingAddress: "/app/professional/billing/address",
  cfp: "/app/professional/cfp",
  profileSetup: "/app/professional/profile/setup",
} as const;

type SubscriptionValue = Pick<ProfessionalSubscription, "status" | "plan" | "source">;
type SubscriptionLike = SubscriptionValue | null | undefined;

type PsychologistProfileLike = NonNullable<user["psychologist_profile"]>;

const isActiveSubscription = (subscription: SubscriptionLike): subscription is SubscriptionValue =>
  subscription?.status === "ativa";

export const isProfessionalSubscriptionActive = (subscription: SubscriptionLike) => {
  if (!isActiveSubscription(subscription)) return false;

  return subscription.plan?.active !== false && subscription.plan?.slug === "profissional";
};

export const isPaidRegistryVerificationComplete = (
  profile: Pick<PsychologistProfileLike, "cfp_verified_at"> | null | undefined,
  subscription: SubscriptionLike,
) => Boolean(profile?.cfp_verified_at || subscription?.source === "admin_grant");

export const getActiveProfessionalSubscription = (
  profile: Pick<PsychologistProfileLike, "subscriptions"> | null | undefined,
) => profile?.subscriptions?.find(isProfessionalSubscriptionActive) ?? null;

const getActiveSubscription = (
  profile: Pick<PsychologistProfileLike, "subscriptions"> | null | undefined,
) => profile?.subscriptions?.find(isActiveSubscription) ?? null;

export const getAfterPhoneVerificationPath = () => PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup;

export const getAfterPlanSelectionPath = () => PSYCHOLOGIST_ONBOARDING_PATHS.phone;

const hasBillingAddress = (profile: PsychologistProfileLike) =>
  Boolean(
    profile.professional_address_street?.trim() &&
      profile.professional_address_number?.trim() &&
      profile.professional_address_district?.trim() &&
      profile.professional_address_zip?.trim() &&
      profile.professional_address_city?.trim() &&
      profile.professional_address_state?.trim(),
  );

export const getPsychologistPaidOnboardingRequirementPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
) => {
  if (data?.role !== "psicologo") return null;

  const profile = data.psychologist_profile;
  const activeProfessional = getActiveProfessionalSubscription(profile);

  if (!profile || !activeProfessional) return null;

  if (!hasBillingAddress(profile)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress;
  }

  if (!isPaidRegistryVerificationComplete(profile, activeProfessional)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.cfp;
  }

  if (!profile.whatsapp) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.phone;
  }

  if (!profile.published) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup;
  }

  return null;
};

export const getPsychologistRegistrationEntryPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
  fallback: string,
) => {
  return getPsychologistRegistrationRequirementPath(data) ?? fallback;
};

export const getPsychologistPlanSelectionRequirementPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
) => {
  if (data?.role !== "psicologo") return null;

  const profile = data.psychologist_profile;
  const currentSubscription = getActiveSubscription(profile);

  if (!profile || !currentSubscription) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.plans;
  }

  return null;
};

export const getPsychologistRegistrationRequirementPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
) => {
  const planSelectionRequirement = getPsychologistPlanSelectionRequirementPath(data);

  if (planSelectionRequirement || data?.role !== "psicologo") return planSelectionRequirement;

  const profile = data.psychologist_profile;
  if (!profile) return null;

  return (
    getPsychologistPaidOnboardingRequirementPath(data) ??
    (!profile.whatsapp
      ? PSYCHOLOGIST_ONBOARDING_PATHS.phone
      : !profile.published
        ? PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup
        : null)
  );
};
