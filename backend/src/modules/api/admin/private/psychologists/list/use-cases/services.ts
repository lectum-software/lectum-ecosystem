import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  diagnoseAdminCommunityEngagement,
  formatAdminPsychologistCommunityEngagementDiagnosis,
} from "@/utils/admin-community-engagement-diagnosis";
import { crpExperienceYears } from "@/utils/professional-experience";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsListEngagementCategoryId,
  AdminPsychologistsListExperience,
  AdminPsychologistsListFilters,
  AdminPsychologistsListItem,
  AdminPsychologistsListOption,
  AdminPsychologistsListQuery,
  AdminPsychologistsListRegistryVerification,
  AdminPsychologistsListSort,
  AdminPsychologistsListTractionCategoryId,
  AdminPsychologistsListTractionEngagementQuadrantId,
  IAdminPsychologistsListDTO,
} from "../DTOs/IAdminPsychologistsListDTO";
import { ADMIN_PSYCHOLOGISTS_LIST_TRACTION_ENGAGEMENT_QUADRANTS } from "../DTOs/IAdminPsychologistsListDTO";
import { AdminPsychologistsListRepository } from "../repositories/AdminPsychologistsListRepository";
import type {
  AdminPsychologistAuthorCountGroup,
  AdminPsychologistCountGroup,
  AdminPsychologistListProfileRecord,
  AdminPsychologistListSpecialtyCatalogRecord,
  AdminPsychologistListSubscriptionRecord,
  AdminPsychologistUserCountGroup,
} from "../repositories/interfaces/IAdminPsychologistsListRepository";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const STATUS_ACTIVE = "ativa";
const FREE_PLAN_SLUG = "gratuito";
const MS_PER_DAY = 86_400_000;
const TRACTION_FAVORITES_HIGH_30D = 5;
const TRACTION_MIN_ACTIVE_DAYS = 7;
const TRACTION_PROFILE_VIEWS_HIGH_30D = 60;
const TRACTION_STRONG_CONVERSION_RATE_PERCENT = 5;
const TRACTION_WHATSAPP_HIGH_30D = 5;
const TRACTION_WHATSAPP_HIGH_WITH_CONVERSION_30D = 3;
const COMMUNITY_ENGAGEMENT_SOURCE = "community_post+post_reply+post_vote.user_id";
const COMMUNITY_ENGAGEMENT_MINIMUM_SIGNAL_30D = 3;
const COMMUNITY_ENGAGEMENT_ACTIVE_30D = 6;
const COMMUNITY_ENGAGEMENT_HIGHLY_ACTIVE_30D = 12;

const SORTS = new Set<AdminPsychologistsListSort>([
  "relevance",
  "rating",
  "favorites",
  "whatsapp",
  "recent",
  "name",
]);
const STATUSES = new Set<AdminPsychologistsListItem["status"]>([
  "verified",
  "free",
  "unpublished",
  "pending",
]);
const EXPERIENCES = new Set<AdminPsychologistsListExperience>(["0_4", "5_9", "10_plus", "unknown"]);
const PROFILE_STATUSES = new Set(["active", "inactive"]);
const REGISTRY_STATUSES = new Set(["active", "pending"]);
const TRACTION_CATEGORIES = new Set<AdminPsychologistsListTractionCategoryId>([
  "insufficient_data",
  "low_traction",
  "strong_traction",
  "unconverted_interest",
  "unconverted_traffic",
]);
const ENGAGEMENT_CATEGORIES = new Set<AdminPsychologistsListEngagementCategoryId>([
  "ativo",
  "muito_ativo",
  "pouco_ativo",
  "sem_base",
]);
const TRACTION_ENGAGEMENT_QUADRANTS = new Set<AdminPsychologistsListTractionEngagementQuadrantId>(
  ADMIN_PSYCHOLOGISTS_LIST_TRACTION_ENGAGEMENT_QUADRANTS,
);

const EXPERIENCE_LABELS: Record<AdminPsychologistsListExperience, string> = {
  "0_4": "0 a 4 anos",
  "5_9": "5 a 9 anos",
  "10_plus": "10 anos+",
  unknown: "Sem data de CRP",
};

const STATUS_LABELS: Record<AdminPsychologistsListItem["status"], string> = {
  free: "Gratuitos",
  pending: "Pendentes",
  unpublished: "Não publicados",
  verified: "Verificados",
};

const MODALITY_LABELS: Record<string, string> = {
  hibrido: "Híbrido",
  hybrid: "Híbrido",
  online: "Online",
  presencial: "Presencial",
};

const GENDER_LABELS: Record<string, string> = {
  feminina: "Feminino",
  feminino: "Feminino",
  female: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  outro: "Outro",
  other: "Outro",
};

const TRACTION_CATEGORY_CONFIG = {
  insufficient_data: {
    description:
      "Perfil com menos de 7 dias ativos desde o cadastro e sem volume forte de WhatsApp para classificar com segurança.",
    label: "Dados Insuficientes",
  },
  low_traction: {
    description: "Poucos cliques no WhatsApp, poucas aberturas de perfil e poucos favoritos.",
    label: "Baixa Tração",
  },
  strong_traction: {
    description: "Alto índice de cliques no WhatsApp, o sinal mais forte de resultado.",
    label: "Tração Forte",
  },
  unconverted_interest: {
    description: "Muitos favoritos, mas poucos cliques no WhatsApp.",
    label: "Interesse Não Convertido",
  },
  unconverted_traffic: {
    description: "Muitas aberturas de perfil, mas poucos cliques no WhatsApp.",
    label: "Tráfego Não Convertido",
  },
} satisfies Record<
  AdminPsychologistsListTractionCategoryId,
  { description: string; label: string }
>;

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeName = (name: string) =>
  normalizeProfessionalDisplayName(name) || name.replace(/\s+/g, " ").trim() || "Psicólogo";

const normalizePagination = (query: AdminPsychologistsListQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

const normalizeSort = (value?: string): AdminPsychologistsListSort => {
  if (value && SORTS.has(value as AdminPsychologistsListSort)) {
    return value as AdminPsychologistsListSort;
  }

  return "relevance";
};

const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = weekday
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";

  return "domingo";
};

const moreExperiencedCutoffDate = (date: Date) => {
  const cutoff = new Date(date);
  cutoff.setFullYear(cutoff.getFullYear() - 10);

  return cutoff;
};

const subscriptionActiveAt = (
  subscription: AdminPsychologistListSubscriptionRecord,
  date: Date,
) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

const isProfessionalPlan = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

const activeSubscriptionsAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

const hasActiveFreeAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

const activeProfessionalSubscriptionsAt = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
) => activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

const hasVerifiedEntitlementAt = (profile: AdminPsychologistListProfileRecord, date: Date) => {
  const entitlements = activeProfessionalSubscriptionsAt(profile, date);
  if (entitlements.length === 0) return false;

  if (profile.crp_status === "aprovado") return true;
  if (profile.cfp_verified_at && profile.cfp_verified_at <= date) return true;

  return entitlements.some(
    (subscription) =>
      subscription.source === "admin_grant" &&
      (subscription.grant_started_at ?? subscription.createdAt) <= date,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const rawAttemptStatus = (value: unknown) => {
  if (!isRecord(value)) return null;
  const status = value.attempt_status;

  return typeof status === "string" ? status : null;
};

const isManualCheck = (check: AdminPsychologistListProfileRecord["registry_checks"][number]) =>
  check.provider === "manual_admin" ||
  (isRecord(check.raw) &&
    (check.raw.source === "manual_admin" || check.raw.verification_origin === "manual_admin"));

const registrySourceLabel = (source: AdminPsychologistsListRegistryVerification["source"]) => {
  if (source === "manual_admin") return "Aprovação manual";
  if (source === "api_automatica") return "API automática";
  if (source === "admin_grant") return "Ativação manual";

  return "Sem origem aprovada";
};

const buildRegistryVerification = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
): AdminPsychologistsListRegistryVerification => {
  const latestCheck = profile.registry_checks[0] ?? null;
  const latestManualApproval = profile.registry_checks.find(
    (check) => isManualCheck(check) && check.found,
  );
  const latestStatus = rawAttemptStatus(latestCheck?.raw);
  const activeAdminGrant = activeProfessionalSubscriptionsAt(profile, date).some(
    (subscription) => subscription.source === "admin_grant",
  );
  let source: AdminPsychologistsListRegistryVerification["source"] = "pendente";
  let status: AdminPsychologistsListRegistryVerification["status"] = "pendente";
  let status_label = "Pendente";

  if (
    latestManualApproval &&
    (!profile.cfp_verified_at || latestManualApproval.checked_at >= profile.cfp_verified_at)
  ) {
    status = "aprovado";
    source = "manual_admin";
    status_label = "Aprovado manualmente";
  } else if (activeAdminGrant) {
    status = "aprovado";
    source = "admin_grant";
    status_label = "Ativado manualmente";
  } else if (profile.crp_status === "aprovado") {
    status = "aprovado";
    if (profile.cfp_verified_at) {
      source = "api_automatica";
      status_label = "Aprovado via API automática";
    } else {
      source = latestManualApproval ? "manual_admin" : "api_automatica";
      status_label = latestManualApproval ? "Aprovado manualmente" : "Aprovado";
    }
  } else if (profile.crp_status === "rejeitado") {
    status = "rejeitado";
    source = latestCheck && isManualCheck(latestCheck) ? "manual_admin" : "pendente";
    status_label = "Rejeitado";
  } else if (latestStatus === "provider_rate_limited") {
    status = "limite_tentativas";
    source = "api_automatica";
    status_label = "Limite de tentativas atingido";
  } else if (latestStatus === "provider_unavailable" || latestStatus === "provider_config_error") {
    status = "api_indisponivel";
    source = "api_automatica";
    status_label = "API automática indisponível";
  } else if (profile.crp_status === "em_analise") {
    status = "em_analise";
    source = latestCheck && isManualCheck(latestCheck) ? "manual_admin" : "api_automatica";
    status_label = "Em análise";
  }

  return {
    source,
    source_label: registrySourceLabel(source),
    status,
    status_label,
  };
};

const pickCurrentPlan = (profile: AdminPsychologistListProfileRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftProfessional = Number(isProfessionalPlan(left));
    const rightProfessional = Number(isProfessionalPlan(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const mapStatus = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
): AdminPsychologistsListItem["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verified";
  if (!profile.published) return "unpublished";
  if (hasActiveFreeAt(profile, date)) return "free";

  return "pending";
};

const mapExperience = (
  profile: AdminPsychologistListProfileRecord,
): AdminPsychologistsListExperience => {
  const years = crpExperienceYears(profile.crp_registration_date);
  if (years === null) return "unknown";
  if (years >= 10) return "10_plus";
  if (years >= 5) return "5_9";

  return "0_4";
};

const mapCountGroups = (groups: AdminPsychologistCountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));

const mapAuthorCountGroups = (groups: AdminPsychologistAuthorCountGroup[]) =>
  new Map(groups.map((group) => [group.author_id, group._count._all]));

const mapUserCountGroups = (groups: AdminPsychologistUserCountGroup[]) =>
  new Map(groups.map((group) => [group.user_id, group._count._all]));

const getNormalizedOptionMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeKey(current) === normalizeKey(expected);
};

const getExactTextMatch = (current: string | null | undefined, expected?: string) => {
  if (!expected) return true;
  if (!current) return false;

  return normalizeSearchText(current).trim() === normalizeSearchText(expected).trim();
};

const matchesJsonArray = (value: unknown, expected?: string) => {
  if (!expected) return true;

  return jsonStringArray(value).some((item) => normalizeKey(item) === normalizeKey(expected));
};

const matchesAvailableToday = (profile: AdminPsychologistListProfileRecord, expected?: boolean) => {
  if (typeof expected !== "boolean") return true;

  const available = jsonStringArray(profile.available_days).includes(currentWeekdayValue());

  return available === expected;
};

const matchesMoreExperienced = (
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

const matchesModality = (current: string | null | undefined, expected?: string) => {
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

const matchesPlanFilter = (
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

const matchesProfileStatus = (
  profile: AdminPsychologistListProfileRecord,
  expected?: "active" | "inactive",
) => {
  if (!expected) return true;

  return expected === "active" ? profile.published : !profile.published;
};

const matchesRegistryStatus = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
  expected?: "active" | "pending",
) => {
  if (!expected) return true;

  const active = buildRegistryVerification(profile, date).status === "aprovado";

  return expected === "active" ? active : !active;
};

const matchesSearch = (profile: AdminPsychologistListProfileRecord, search?: string) => {
  const normalized = normalizeSearchText(search).trim();
  if (!normalized) return true;

  const crpDigits = (profile.crp ?? "").replace(/\D/g, "");
  const searchDigits = search?.replace(/\D/g, "") ?? "";
  const haystack = [profile.user.name, profile.user.email, profile.crp]
    .map((value) => normalizeSearchText(value))
    .join(" ");

  return haystack.includes(normalized) || Boolean(searchDigits && crpDigits.includes(searchDigits));
};

const matchesFilters = (
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

const roundScore = (value: number) => Math.round(value * 1000) / 10;
const ratingAverage = (value: number) => Math.round((value / 100) * 10) / 10;

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const profileActiveDaysUntil = (profileCreatedAt: Date, date: Date) => {
  const createdAt = startOfDate(profileCreatedAt);
  const until = startOfDate(date);

  if (createdAt > until) return 0;

  return daysBetweenInclusive(createdAt, until);
};

const normalizeCountToThirtyDays = (count: number, activeDays: number) => {
  if (activeDays <= 0) return 0;

  return roundPercent((count / activeDays) * 30);
};

type TractionSignalCounts = {
  activeDays: number;
  favorites: number;
  normalizedFavorites: number;
  normalizedProfileViews: number;
  normalizedWhatsappClicks: number;
  profileViews: number;
  whatsappClicks: number;
  whatsappConversionRate: number | null;
};

const classifyTractionCategory = (
  signals: TractionSignalCounts,
): AdminPsychologistsListTractionCategoryId => {
  const hasStrongWhatsappVolume =
    signals.normalizedWhatsappClicks >= TRACTION_WHATSAPP_HIGH_30D ||
    (signals.whatsappClicks >= 2 &&
      signals.normalizedWhatsappClicks >= TRACTION_WHATSAPP_HIGH_WITH_CONVERSION_30D &&
      typeof signals.whatsappConversionRate === "number" &&
      signals.whatsappConversionRate >= TRACTION_STRONG_CONVERSION_RATE_PERCENT);

  if (hasStrongWhatsappVolume) return "strong_traction";
  if (signals.activeDays < TRACTION_MIN_ACTIVE_DAYS) return "insufficient_data";

  const hasLowWhatsappVolume = signals.normalizedWhatsappClicks < TRACTION_WHATSAPP_HIGH_30D;
  const hasWeakWhatsappConversion =
    signals.whatsappConversionRate === null ||
    signals.whatsappConversionRate < TRACTION_STRONG_CONVERSION_RATE_PERCENT;

  if (
    signals.normalizedProfileViews >= TRACTION_PROFILE_VIEWS_HIGH_30D &&
    hasLowWhatsappVolume &&
    hasWeakWhatsappConversion
  ) {
    return "unconverted_traffic";
  }

  if (signals.normalizedFavorites >= TRACTION_FAVORITES_HIGH_30D && hasLowWhatsappVolume) {
    return "unconverted_interest";
  }

  return "low_traction";
};

const buildTractionSummary = (input: {
  activeDays: number;
  favorites: number;
  profileViews: number;
  whatsappClicks: number;
}): AdminPsychologistsListItem["traction"] => {
  const whatsappConversionRate =
    input.profileViews > 0 ? roundPercent((input.whatsappClicks / input.profileViews) * 100) : null;
  const signals = {
    activeDays: input.activeDays,
    favorites: input.favorites,
    normalizedFavorites: normalizeCountToThirtyDays(input.favorites, input.activeDays),
    normalizedProfileViews: normalizeCountToThirtyDays(input.profileViews, input.activeDays),
    normalizedWhatsappClicks: normalizeCountToThirtyDays(input.whatsappClicks, input.activeDays),
    profileViews: input.profileViews,
    whatsappClicks: input.whatsappClicks,
    whatsappConversionRate,
  };
  const categoryId = classifyTractionCategory(signals);
  const config = TRACTION_CATEGORY_CONFIG[categoryId];

  return {
    description: config.description,
    id: categoryId,
    label: config.label,
    signals: {
      active_days: signals.activeDays,
      favorites: signals.favorites,
      normalized_favorites_30d: signals.normalizedFavorites,
      normalized_profile_views_30d: signals.normalizedProfileViews,
      normalized_whatsapp_clicks_30d: signals.normalizedWhatsappClicks,
      profile_views: signals.profileViews,
      whatsapp_clicks: signals.whatsappClicks,
      whatsapp_conversion_rate_percent: signals.whatsappConversionRate,
    },
    source: "profile_view_event+contact_request+psychologist_favorite",
    thresholds: {
      favorites_high_30d: TRACTION_FAVORITES_HIGH_30D,
      minimum_active_days: TRACTION_MIN_ACTIVE_DAYS,
      profile_views_high_30d: TRACTION_PROFILE_VIEWS_HIGH_30D,
      strong_conversion_rate_percent: TRACTION_STRONG_CONVERSION_RATE_PERCENT,
      whatsapp_high_30d: TRACTION_WHATSAPP_HIGH_30D,
      whatsapp_high_with_conversion_30d: TRACTION_WHATSAPP_HIGH_WITH_CONVERSION_30D,
    },
  };
};

const buildEngagementSummary = (input: {
  activeDays: number;
  posts: number;
  replies: number;
  votes: number;
}): AdminPsychologistsListItem["engagement"] => {
  const interactions = input.posts + input.replies + input.votes;
  const normalizedInteractions = normalizeCountToThirtyDays(interactions, input.activeDays);
  const diagnosis = formatAdminPsychologistCommunityEngagementDiagnosis(
    diagnoseAdminCommunityEngagement({
      interactions: normalizedInteractions,
      source: COMMUNITY_ENGAGEMENT_SOURCE,
    }),
  );

  return {
    id: diagnosis.id,
    label: diagnosis.label,
    signals: {
      active_days: input.activeDays,
      interactions,
      normalized_interactions_30d: normalizedInteractions,
      posts: input.posts,
      replies: input.replies,
      votes: input.votes,
    },
    source: COMMUNITY_ENGAGEMENT_SOURCE,
    thresholds: {
      active_interactions_30d: COMMUNITY_ENGAGEMENT_ACTIVE_30D,
      highly_active_interactions_30d: COMMUNITY_ENGAGEMENT_HIGHLY_ACTIVE_30D,
      minimum_signal_interactions_30d: COMMUNITY_ENGAGEMENT_MINIMUM_SIGNAL_30D,
    },
  };
};

const buildItem = (
  profile: AdminPsychologistListProfileRecord,
  params: {
    communityPostCounts: Map<string, number>;
    communityReplyCounts: Map<string, number>;
    communityVoteCounts: Map<string, number>;
    date: Date;
    favoriteCounts: Map<string, number>;
    profileViewCounts: Map<string, number>;
    rankingById: Map<string, { position: number; score: number }>;
    whatsappCounts: Map<string, number>;
  },
): AdminPsychologistsListItem => {
  const plan = pickCurrentPlan(profile, params.date);
  const userId = profile.user.id;
  const ranking = params.rankingById.get(userId);
  const status = mapStatus(profile, params.date);
  const activeDays = profileActiveDaysUntil(profile.user.createdAt, params.date);
  const favorites = params.favoriteCounts.get(userId) ?? 0;
  const profileViews = params.profileViewCounts.get(userId) ?? 0;
  const whatsappClicks = params.whatsappCounts.get(userId) ?? 0;
  const posts = params.communityPostCounts.get(userId) ?? 0;
  const replies = params.communityReplyCounts.get(userId) ?? 0;
  const votes = params.communityVoteCounts.get(userId) ?? 0;

  return {
    accepts_insurance: profile.accepts_insurance,
    avatar: profile.user.avatar,
    city: profile.professional_address_city,
    created_at: profile.user.createdAt,
    crp: profile.crp,
    detail_url: `/psicologos/${userId}`,
    discount_first_session: profile.discount_first_session,
    email: profile.user.email,
    engagement: buildEngagementSummary({
      activeDays,
      posts,
      replies,
      votes,
    }),
    experience_years: crpExperienceYears(profile.crp_registration_date),
    favorites_count: favorites,
    gender: profile.gender,
    id: userId,
    name: normalizeName(profile.user.name),
    plan_name: plan?.plan.name ?? null,
    plan_slug: plan?.plan.slug ?? null,
    public_profile_url: `/psychologists/${userId}`,
    published: profile.published,
    ranking_position: ranking?.position ?? null,
    ranking_score: ranking?.score ?? null,
    rating_avg: ratingAverage(profile.rating_avg),
    rating_count: profile.rating_count,
    social_value: profile.social_value,
    state: profile.professional_address_state,
    status,
    traction: buildTractionSummary({
      activeDays,
      favorites,
      profileViews,
      whatsappClicks,
    }),
    registry_verification: buildRegistryVerification(profile, params.date),
    verified: status === "verified",
    whatsapp_clicks_count: whatsappClicks,
  };
};

const isHighEngagementCategory = (id: AdminPsychologistsListEngagementCategoryId) =>
  id === "ativo" || id === "muito_ativo";

const resolveTractionEngagementQuadrant = (
  item: AdminPsychologistsListItem,
): AdminPsychologistsListTractionEngagementQuadrantId => {
  const hasStrongTraction = item.traction.id === "strong_traction";
  const hasHighEngagement = isHighEngagementCategory(item.engagement.id);
  const hasInsufficientData =
    item.traction.signals.active_days < TRACTION_MIN_ACTIVE_DAYS &&
    !hasStrongTraction &&
    !hasHighEngagement;

  if (hasInsufficientData) return "insufficient_data";
  if (hasStrongTraction && hasHighEngagement) return "strong_traction_high_engagement";
  if (hasStrongTraction) return "strong_traction_low_engagement";
  if (hasHighEngagement) return "low_traction_high_engagement";

  return "low_traction_low_engagement";
};

const matchesSignalFilters = (
  item: AdminPsychologistsListItem,
  query: AdminPsychologistsListQuery,
) =>
  (!query.traction || item.traction.id === query.traction) &&
  (!query.engagement || item.engagement.id === query.engagement) &&
  (!query.traction_engagement ||
    resolveTractionEngagementQuadrant(item) === query.traction_engagement);

const sortItems = (items: AdminPsychologistsListItem[], sort: AdminPsychologistsListSort) => {
  const sorted = [...items];

  return sorted.sort((left, right) => {
    if (sort === "relevance") {
      const leftRanked = left.ranking_position !== null;
      const rightRanked = right.ranking_position !== null;
      if (leftRanked !== rightRanked) return Number(rightRanked) - Number(leftRanked);
      if (left.ranking_position !== null && right.ranking_position !== null) {
        return left.ranking_position - right.ranking_position;
      }
    }

    if (sort === "rating") {
      if (right.rating_avg !== left.rating_avg) return right.rating_avg - left.rating_avg;
      if (right.rating_count !== left.rating_count) return right.rating_count - left.rating_count;
    }

    if (sort === "favorites" && right.favorites_count !== left.favorites_count) {
      return right.favorites_count - left.favorites_count;
    }

    if (sort === "whatsapp" && right.whatsapp_clicks_count !== left.whatsapp_clicks_count) {
      return right.whatsapp_clicks_count - left.whatsapp_clicks_count;
    }

    if (sort === "recent" && right.created_at.getTime() !== left.created_at.getTime()) {
      return right.created_at.getTime() - left.created_at.getTime();
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
};

const addOptionCount = (
  map: Map<string, { count: number; label: string }>,
  id: string,
  label: string,
) => {
  const normalizedId = id.trim();
  const normalizedLabel = label.trim();
  if (!normalizedId || !normalizedLabel) return;

  const current = map.get(normalizedId);
  map.set(normalizedId, {
    count: (current?.count ?? 0) + 1,
    label: current?.label ?? normalizedLabel,
  });
};

const optionsFromMap = (map: Map<string, { count: number; label: string }>) =>
  [...map.entries()]
    .map(
      ([id, item]): AdminPsychologistsListOption => ({
        count: item.count,
        id,
        label: item.label,
      }),
    )
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

const optionsFromSpecialtyCatalog = (
  catalog: AdminPsychologistListSpecialtyCatalogRecord[],
  counts: Map<string, { count: number; label: string }>,
): AdminPsychologistsListOption[] =>
  catalog.map((item) => ({
    count: counts.get(item.slug)?.count ?? 0,
    id: item.slug,
    label: item.name,
  }));

const buildFilters = (
  profiles: AdminPsychologistListProfileRecord[],
  date: Date,
  specialtyCatalog: AdminPsychologistListSpecialtyCatalogRecord[],
): AdminPsychologistsListFilters => {
  const approaches = new Map<string, { count: number; label: string }>();
  const cities = new Map<string, { count: number; label: string }>();
  const experienceRanges = new Map<string, { count: number; label: string }>();
  const genders = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const modalities = new Map<string, { count: number; label: string }>();
  const plans = new Map<string, { count: number; label: string }>();
  const raceColors = new Map<string, { count: number; label: string }>();
  const religions = new Map<string, { count: number; label: string }>();
  const services = new Map<string, { count: number; label: string }>();
  const specialties = new Map<string, { count: number; label: string }>();
  const states = new Map<string, { count: number; label: string }>();
  const statuses = new Map<string, { count: number; label: string }>();
  const targetAudience = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    const status = mapStatus(profile, date);
    const plan = pickCurrentPlan(profile, date);
    const experience = mapExperience(profile);

    addOptionCount(statuses, status, STATUS_LABELS[status]);
    addOptionCount(experienceRanges, experience, EXPERIENCE_LABELS[experience]);
    addOptionCount(plans, plan?.plan.slug ?? "sem_plano", plan?.plan.name ?? "Sem plano ativo");

    if (profile.professional_address_state?.trim()) {
      const state = profile.professional_address_state.trim().toUpperCase();
      addOptionCount(states, state, state);
    }

    if (profile.professional_address_city?.trim()) {
      const city = profile.professional_address_city.trim();
      addOptionCount(cities, city, city);
    }

    for (const { approach } of profile.user.psychologist_approaches) {
      addOptionCount(approaches, approach.slug, approach.name);
    }

    for (const { specialty } of profile.user.psychologist_specialties) {
      addOptionCount(specialties, specialty.slug, specialty.name);
    }

    for (const { service } of profile.user.psychologist_services) {
      addOptionCount(services, service.slug, service.name);
    }

    for (const audience of jsonStringArray(profile.target_audience)) {
      addOptionCount(targetAudience, normalizeKey(audience), audience);
    }

    for (const language of jsonStringArray(profile.languages)) {
      addOptionCount(languages, normalizeKey(language), language);
    }

    if (profile.modality?.trim()) {
      const key = normalizeKey(profile.modality);
      addOptionCount(modalities, key, MODALITY_LABELS[key] ?? profile.modality.trim());
    }

    if (profile.gender?.trim()) {
      const key = normalizeKey(profile.gender);
      addOptionCount(genders, key, GENDER_LABELS[key] ?? profile.gender.trim());
    }

    if (profile.race_color?.trim()) {
      const raceColor = profile.race_color.trim();
      addOptionCount(raceColors, normalizeKey(raceColor), raceColor);
    }

    if (profile.religion?.trim()) {
      const religion = profile.religion.trim();
      addOptionCount(religions, normalizeKey(religion), religion);
    }
  }

  return {
    approaches: optionsFromMap(approaches),
    cities: optionsFromMap(cities),
    experience_ranges: optionsFromMap(experienceRanges),
    genders: optionsFromMap(genders),
    languages: optionsFromMap(languages),
    modalities: optionsFromMap(modalities),
    plans: optionsFromMap(plans),
    race_colors: optionsFromMap(raceColors),
    religions: optionsFromMap(religions),
    services: optionsFromMap(services),
    specialties: optionsFromSpecialtyCatalog(specialtyCatalog, specialties),
    states: optionsFromMap(states),
    statuses: optionsFromMap(statuses),
    target_audience: optionsFromMap(targetAudience),
  };
};

const activeFiltersCount = (query: AdminPsychologistsListQuery) =>
  [
    query.q,
    query.state,
    query.city,
    query.status,
    query.plan,
    query.profile_status,
    query.registry_status,
    query.traction,
    query.traction_engagement,
    query.engagement,
    query.experience,
    query.available_today,
    query.more_experienced,
    query.verified,
    query.discount_first_session,
    query.accepts_insurance,
    query.social_value,
    query.target_audience,
    query.specialty,
    query.approach,
    query.service,
    query.modality,
    query.language,
    query.gender,
    query.race_color,
    query.religion,
  ].filter((value) => value !== undefined && value !== null && value !== "").length;

export const listAdminPsychologists = async (
  query: AdminPsychologistsListQuery,
): Promise<Resolve> => {
  if (
    (query.status && !STATUSES.has(query.status)) ||
    (query.experience && !EXPERIENCES.has(query.experience)) ||
    (query.profile_status && !PROFILE_STATUSES.has(query.profile_status)) ||
    (query.registry_status && !REGISTRY_STATUSES.has(query.registry_status)) ||
    (query.traction && !TRACTION_CATEGORIES.has(query.traction)) ||
    (query.traction_engagement && !TRACTION_ENGAGEMENT_QUADRANTS.has(query.traction_engagement)) ||
    (query.engagement && !ENGAGEMENT_CATEGORIES.has(query.engagement)) ||
    (query.sort && !SORTS.has(query.sort))
  ) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const repository = new AdminPsychologistsListRepository();
  const now = new Date();
  const sort = normalizeSort(query.sort);
  const pagination = normalizePagination(query);

  const [profiles, rankingCandidates, specialtyCatalog] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listPublicRankingCandidates(),
    repository.listSpecialtyCatalog(),
  ]);

  const ids = profiles.map((profile) => profile.user.id);
  const [
    communityPostGroups,
    communityReplyGroups,
    communityVoteGroups,
    favoriteGroups,
    profileViewGroups,
    whatsappGroups,
    ranked,
  ] = await Promise.all([
    repository.listCommunityPostCounts(ids),
    repository.listCommunityReplyCounts(ids),
    repository.listCommunityVoteCounts(ids),
    repository.listFavoriteCounts(ids),
    repository.listProfileViewCounts(ids),
    repository.listWhatsappClickCounts(ids),
    rankPsychologistCandidates(rankingCandidates, null),
  ]);

  const communityPostCounts = mapAuthorCountGroups(communityPostGroups);
  const communityReplyCounts = mapAuthorCountGroups(communityReplyGroups);
  const communityVoteCounts = mapUserCountGroups(communityVoteGroups);
  const favoriteCounts = mapCountGroups(favoriteGroups);
  const profileViewCounts = mapCountGroups(profileViewGroups);
  const whatsappCounts = mapCountGroups(whatsappGroups);
  const rankingById = new Map(
    ranked.map(({ item, ranking }, index) => [
      item.user.id,
      {
        position: index + 1,
        score: roundScore(ranking.score),
      },
    ]),
  );

  const allItems = profiles
    .filter((profile) => matchesFilters(profile, query, now))
    .map((profile) =>
      buildItem(profile, {
        communityPostCounts,
        communityReplyCounts,
        communityVoteCounts,
        date: now,
        favoriteCounts,
        profileViewCounts,
        rankingById,
        whatsappCounts,
      }),
    )
    .filter((item) => matchesSignalFilters(item, query));
  const sortedItems = sortItems(allItems, sort);
  const count = sortedItems.length;
  const pages = Math.max(1, Math.ceil(count / pagination.limit));
  const responsePage = Math.min(pagination.page, pages);
  const responseSkip = (responsePage - 1) * pagination.limit;
  const data = sortedItems.slice(responseSkip, responseSkip + pagination.limit);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      active_filters_count: activeFiltersCount(query),
      count,
      data,
      filters: buildFilters(profiles, now, specialtyCatalog),
      page: responsePage,
      pages,
      per_page: pagination.limit,
      sort,
      source:
        "user+psychologist_profile+professional_subscription+public_ranking+profile_view_event+contact_request+psychologist_favorite+community_post+post_reply+post_vote" as const,
    },
  };
};

export default async (data: IAdminPsychologistsListDTO): Promise<Resolve> => {
  return listAdminPsychologists(data.q ?? {});
};
