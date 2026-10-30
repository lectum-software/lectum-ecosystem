import { crpExperienceYears } from "./professional-experience";

type ExperienceTagPlan = {
  slug?: string | null;
};

type ExperienceTagSubscription = {
  createdAt?: Date | string | null;
  grant_started_at?: Date | string | null;
  plan?: ExperienceTagPlan | null;
};

type ExperienceTagProfile = {
  show_experience_tag?: boolean | null;
  updatedAt?: Date | string | null;
};

const toTimestamp = (value?: Date | string | null) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

const getEntitlementStartedAt = (subscription?: ExperienceTagSubscription | null) => {
  const grantStartedAt = toTimestamp(subscription?.grant_started_at);
  const createdAt = toTimestamp(subscription?.createdAt);

  if (grantStartedAt !== null && createdAt !== null) {
    return Math.min(grantStartedAt, createdAt);
  }

  return grantStartedAt ?? createdAt;
};

const isProfessionalEntitlement = (
  subscription?: ExperienceTagSubscription | null,
  fallback = false,
) => {
  const slug = subscription?.plan?.slug;

  if (slug) return slug !== "gratuito";

  return fallback;
};

export const resolveProfessionalExperienceTagVisibility = ({
  profile,
  subscription,
  hasProfessionalEntitlement,
}: {
  profile: ExperienceTagProfile;
  subscription?: ExperienceTagSubscription | null;
  hasProfessionalEntitlement?: boolean;
}) => {
  if (profile.show_experience_tag !== false) return true;

  const entitled = hasProfessionalEntitlement ?? isProfessionalEntitlement(subscription, false);

  if (!entitled) return false;

  const profileUpdatedAt = toTimestamp(profile.updatedAt);
  const entitlementStartedAt = getEntitlementStartedAt(subscription);

  if (profileUpdatedAt === null || entitlementStartedAt === null) return true;

  return profileUpdatedAt <= entitlementStartedAt;
};

export const publicProfessionalExperience = (
  profile:
    | (ExperienceTagProfile & {
        crp_registration_date?: Date | string | null;
        subscriptions?: ExperienceTagSubscription[];
      })
    | null
    | undefined,
  eligible: boolean,
) => {
  const subscription = profile?.subscriptions?.[0];
  // Sparse legacy authors must not inherit the resolver's permissive defaults.
  const hasVisibilityEvidence =
    typeof profile?.show_experience_tag === "boolean" &&
    (profile.show_experience_tag ||
      (toTimestamp(profile.updatedAt) !== null && getEntitlementStartedAt(subscription) !== null));
  const showExperienceTag = Boolean(
    eligible &&
      profile &&
      hasVisibilityEvidence &&
      resolveProfessionalExperienceTagVisibility({
        profile,
        subscription,
        hasProfessionalEntitlement: Boolean(profile.subscriptions?.length),
      }),
  );

  return {
    formation_years: showExperienceTag ? crpExperienceYears(profile?.crp_registration_date) : null,
    show_experience_tag: showExperienceTag,
  };
};
