import type { AdminPsychologistsListQuery } from "../../DTOs/IAdminPsychologistsListDTO";
import type {
  AdminPsychologistListProfileRecord,
  AdminPsychologistReceivedEngagementCountsRecord,
} from "../../repositories/interfaces/IAdminPsychologistsListRepository";

import {
  activeSubscriptionsAt,
  buildRegistryVerification,
  currentWeekdayValue,
  isFreeSubscription,
  isProfessionalPlan,
  jsonStringArray,
  mapExperience,
  mapStatus,
  moreExperiencedCutoffDate,
  normalizeKey,
  normalizeSearchText,
  pickCurrentPlan,
} from "./list-support";

export const emptyReceivedEngagementCounts = (
  psychologistId: string,
): AdminPsychologistReceivedEngagementCountsRecord => ({
  comments_received: 0,
  content_saves: 0,
  content_shares: 0,
  positive_votes: 0,
  profile_favorites: 0,
  profile_follows: 0,
  psychologist_id: psychologistId,
});

export const getNormalizedOptionMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeKey(current) === normalizeKey(expected);
};

export const getExactTextMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeSearchText(current).trim() === normalizeSearchText(expected).trim();
};

export const matchesJsonArray = (value: unknown, expected?: string) => {
  if (!expected) return true;

  return jsonStringArray(value).some((item) => normalizeKey(item) === normalizeKey(expected));
};

export const matchesAvailableToday = (
  profile: AdminPsychologistListProfileRecord,
  expected?: boolean,
) => {
  if (typeof expected !== "boolean") return true;

  const available = jsonStringArray(profile.available_days).includes(currentWeekdayValue());

  return available === expected;
};

export const matchesMoreExperienced = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
  expected?: boolean,
) => {
  if (typeof expected !== "boolean") return true;
  if (!expected) return true;

  return (
    profile.show_experience_tag &&
    Boolean(
      profile.crp_registration_date &&
        profile.crp_registration_date < moreExperiencedCutoffDate(date),
    )
  );
};

export const matchesModality = (current: string | null | undefined, expected?: string) => {
  const normalizedExpected = expected ? normalizeKey(expected) : "";
  if (!normalizedExpected) return true;
  if (!current) return false;

  const normalizedCurrent = normalizeKey(current);

  if (normalizedExpected === "online") return ["hibrido", "online"].includes(normalizedCurrent);
  if (normalizedExpected === "presencial") {
    return ["hibrido", "presencial"].includes(normalizedCurrent);
  }

  return normalizedCurrent === normalizedExpected;
};

export const matchesPlanFilter = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
  expected?: string,
) => {
  const normalizedExpected = expected ? normalizeKey(expected) : "";
  if (!normalizedExpected) return true;

  const plan = pickCurrentPlan(profile, date);

  if (normalizedExpected === "courtesy") {
    return activeSubscriptionsAt(profile, date).some(
      (subscription) => subscription.source === "admin_grant",
    );
  }

  if (normalizedExpected === "free") {
    return !plan || isFreeSubscription(plan);
  }

  if (["professional", "assinante", "subscriber"].includes(normalizedExpected)) {
    return Boolean(plan && isProfessionalPlan(plan) && plan.source !== "admin_grant");
  }

  return (plan?.plan.slug ?? "sem_plano") === normalizedExpected;
};

export const matchesProfileStatus = (
  profile: AdminPsychologistListProfileRecord,
  expected?: "active" | "inactive",
) => {
  if (!expected) return true;

  return expected === "active" ? profile.published : !profile.published;
};

export const matchesRegistryStatus = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
  expected?: "active" | "pending",
) => {
  if (!expected) return true;

  const active = buildRegistryVerification(profile, date).status === "aprovado";

  return expected === "active" ? active : !active;
};

export const matchesSearch = (profile: AdminPsychologistListProfileRecord, search?: string) => {
  const normalized = normalizeSearchText(search).trim();
  if (!normalized) return true;

  const crpDigits = (profile.crp ?? "").replace(/\D/g, "");
  const searchDigits = search?.replace(/\D/g, "") ?? "";
  const haystack = [profile.user.name, profile.user.email, profile.crp]
    .map((value) => normalizeSearchText(value))
    .join(" ");

  return haystack.includes(normalized) || Boolean(searchDigits && crpDigits.includes(searchDigits));
};

export const matchesFilters = (
  profile: AdminPsychologistListProfileRecord,
  query: AdminPsychologistsListQuery,
  date: Date,
) =>
  matchesSearch(profile, query.q) &&
  getExactTextMatch(profile.professional_address_state, query.state) &&
  getExactTextMatch(profile.professional_address_city, query.city) &&
  (!query.status || mapStatus(profile, date) === query.status) &&
  matchesPlanFilter(profile, date, query.plan) &&
  matchesProfileStatus(profile, query.profile_status) &&
  matchesRegistryStatus(profile, date, query.registry_status) &&
  (!query.experience || mapExperience(profile) === query.experience) &&
  (!query.verified || mapStatus(profile, date) === "verified") &&
  matchesAvailableToday(profile, query.available_today) &&
  matchesMoreExperienced(profile, date, query.more_experienced) &&
  (typeof query.discount_first_session !== "boolean" ||
    profile.discount_first_session === query.discount_first_session) &&
  (typeof query.accepts_insurance !== "boolean" ||
    profile.accepts_insurance === query.accepts_insurance) &&
  (typeof query.social_value !== "boolean" || profile.social_value === query.social_value) &&
  matchesJsonArray(profile.target_audience, query.target_audience) &&
  (!query.approach ||
    profile.user.psychologist_approaches.some(({ approach }) =>
      getNormalizedOptionMatch(approach.slug, query.approach),
    )) &&
  (!query.specialty ||
    profile.user.psychologist_specialties.some(({ specialty }) =>
      getNormalizedOptionMatch(specialty.slug, query.specialty),
    )) &&
  (!query.service ||
    profile.user.psychologist_services.some(({ service }) =>
      getNormalizedOptionMatch(service.slug, query.service),
    )) &&
  matchesModality(profile.modality, query.modality) &&
  matchesJsonArray(profile.languages, query.language) &&
  getNormalizedOptionMatch(profile.gender, query.gender) &&
  getNormalizedOptionMatch(profile.race_color, query.race_color) &&
  getNormalizedOptionMatch(profile.religion, query.religion);
