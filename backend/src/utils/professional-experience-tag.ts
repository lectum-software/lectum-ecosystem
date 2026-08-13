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
