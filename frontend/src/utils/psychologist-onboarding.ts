import type { user } from "@/api/generator/types";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";
import { hasSubscriptionBenefits } from "./subscription-period";

export const PSYCHOLOGIST_ONBOARDING_PATHS = {
  plans: "/app/profissional/assinatura/planos",
  checkout: "/app/profissional/assinatura/pagamento",
  phone: "/app/profissional/whatsapp/verificar",
  billingAddress: "/app/profissional/assinatura/endereco",
  cfp: "/app/profissional/cfp",
  completion: "/app/profissional/assinatura/concluir",
  profileSetup: "/app/profissional/perfil/configurar",
} as const;

type SubscriptionValue = Pick<
  ProfessionalSubscription,
  | "status"
  | "plan"
  | "source"
  | "current_period_end"
  | "billing_grace_ends_at"
  | "billing_downgraded_at"
>;
type SubscriptionLike = SubscriptionValue | null | undefined;

type PsychologistProfileLike = NonNullable<user["psychologist_profile"]>;

const isActiveSubscription = (subscription: SubscriptionLike): subscription is SubscriptionValue =>
  Boolean(subscription && hasSubscriptionBenefits(subscription));

export const isProfessionalSubscriptionActive = (subscription: SubscriptionLike) => {
  if (!isActiveSubscription(subscription)) return false;

  return subscription.plan?.active !== false && subscription.plan?.slug === "profissional";
};

export const isAdministrativeCourtesySubscription = (subscription: SubscriptionLike) =>
  isProfessionalSubscriptionActive(subscription) && subscription?.source === "admin_grant";

export const isPaidRegistryVerificationComplete = (
  profile: Pick<PsychologistProfileLike, "cfp_verified_at" | "crp_status"> | null | undefined,
  subscription?: SubscriptionLike,
) =>
  Boolean(
    profile?.crp_status !== "rejeitado" &&
      (profile?.crp_status === "aprovado" ||
        profile?.cfp_verified_at ||
        isAdministrativeCourtesySubscription(subscription)),
  );

export const getActiveProfessionalSubscription = (
  profile: Pick<PsychologistProfileLike, "subscriptions"> | null | undefined,
) => profile?.subscriptions?.find(isProfessionalSubscriptionActive) ?? null;

const getActiveSubscription = (
  profile: Pick<PsychologistProfileLike, "subscriptions"> | null | undefined,
) => profile?.subscriptions?.find(isActiveSubscription) ?? null;

export const getAfterPhoneVerificationPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
) => {
  if (data?.role !== "psicologo") return PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup;

  const profile = data.psychologist_profile;
  const activeProfessional = getActiveProfessionalSubscription(profile);

  if (
    profile &&
    activeProfessional &&
    !isPaidRegistryVerificationComplete(profile, activeProfessional)
  ) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.cfp;
  }

  return PSYCHOLOGIST_ONBOARDING_PATHS.profileSetup;
};

export const getAfterPlanSelectionPath = () => PSYCHOLOGIST_ONBOARDING_PATHS.phone;

// The billing endpoint is authoritative; a public profile address is not a billing address.
export const getPaidSubscriptionNextPath = (
  data: Partial<Pick<user, "role" | "psychologist_profile">> | null | undefined,
  subscription: ProfessionalSubscription | null | undefined,
  billingAddressComplete: boolean | undefined,
) => {
  if (data?.role !== "psicologo" || !isProfessionalSubscriptionActive(subscription)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.plans;
  }
  const end = subscription?.current_period_end;
  if (end && !(new Date(end).getTime() > Date.now())) return PSYCHOLOGIST_ONBOARDING_PATHS.plans;
  if (!isAdministrativeCourtesySubscription(subscription) && billingAddressComplete !== true) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress;
  }
  if (!data.psychologist_profile?.whatsapp?.trim()) return PSYCHOLOGIST_ONBOARDING_PATHS.phone;
  if (!isPaidRegistryVerificationComplete(data.psychologist_profile, subscription)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.cfp;
  }
  return PSYCHOLOGIST_ONBOARDING_PATHS.completion;
};

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

  if (!isAdministrativeCourtesySubscription(activeProfessional) && !hasBillingAddress(profile)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress;
  }

  if (!profile.whatsapp) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.phone;
  }

  if (!isPaidRegistryVerificationComplete(profile, activeProfessional)) {
    return PSYCHOLOGIST_ONBOARDING_PATHS.cfp;
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

  // A previous plan choice remains valid after expiration or cancellation.
  const hasSelectedPlan = Boolean(currentSubscription || profile?._count?.subscriptions);
  if (!profile || !hasSelectedPlan) {
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
    (!profile.whatsapp ? PSYCHOLOGIST_ONBOARDING_PATHS.phone : null)
  );
};
