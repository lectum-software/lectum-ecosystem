import { ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG } from "@/utils/admin-profile-conversion";
import { ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE } from "@/utils/admin-profile-received-engagement";
import { crpExperienceYears } from "@/utils/professional-experience";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import type {
  AdminPsychologistsListEngagementCategoryId,
  AdminPsychologistsListExperience,
  AdminPsychologistsListItem,
  AdminPsychologistsListProfileConversionCategoryId,
  AdminPsychologistsListProfileConversionEngagementQuadrantId,
  AdminPsychologistsListQuery,
  AdminPsychologistsListRegistryVerification,
  AdminPsychologistsListSort,
} from "../../DTOs/IAdminPsychologistsListDTO";
import { ADMIN_PSYCHOLOGISTS_LIST_PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS } from "../../DTOs/IAdminPsychologistsListDTO";
import type {
  AdminPsychologistCountGroup,
  AdminPsychologistListProfileRecord,
  AdminPsychologistListSubscriptionRecord,
  AdminPsychologistReceivedEngagementCountsRecord,
} from "../../repositories/interfaces/IAdminPsychologistsListRepository";

export const DEFAULT_LIMIT = 12;

export const MAX_LIMIT = 50;

export const STATUS_ACTIVE = "ativa";

export const FREE_PLAN_SLUG = "gratuito";

export const COMMUNITY_ENGAGEMENT_SOURCE = ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE;

export const COMMUNITY_ENGAGEMENT_MINIMUM_SIGNAL_30D = 3;

export const COMMUNITY_ENGAGEMENT_ACTIVE_30D = 6;

export const COMMUNITY_ENGAGEMENT_HIGHLY_ACTIVE_30D = 12;

export const SORTS = new Set<AdminPsychologistsListSort>([
  "relevance",
  "rating",
  "favorites",
  "whatsapp",
  "recent",
  "name",
]);

export const STATUSES = new Set<AdminPsychologistsListItem["status"]>([
  "verified",
  "free",
  "unpublished",
  "pending",
]);

export const EXPERIENCES = new Set<AdminPsychologistsListExperience>([
  "0_4",
  "5_9",
  "10_plus",
  "unknown",
]);

export const PROFILE_STATUSES = new Set(["active", "inactive"]);

export const REGISTRY_STATUSES = new Set(["active", "pending"]);

export const PROFILE_CONVERSION_CATEGORIES =
  new Set<AdminPsychologistsListProfileConversionCategoryId>([
    "insufficient_data",
    "low_conversion",
    "no_conversion",
    "standard_conversion",
    "strong_conversion",
  ]);

export const ENGAGEMENT_CATEGORIES = new Set<AdminPsychologistsListEngagementCategoryId>([
  "ativo",
  "muito_ativo",
  "pouco_ativo",
  "sem_base",
]);

export const PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS =
  new Set<AdminPsychologistsListProfileConversionEngagementQuadrantId>(
    ADMIN_PSYCHOLOGISTS_LIST_PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS,
  );

export const EXPERIENCE_LABELS: Record<AdminPsychologistsListExperience, string> = {
  "0_4": "0 a 4 anos",
  "5_9": "5 a 9 anos",
  "10_plus": "10 anos+",
  unknown: "Sem data de CRP",
};

export const STATUS_LABELS: Record<AdminPsychologistsListItem["status"], string> = {
  free: "Gratuitos",
  pending: "Pendentes",
  unpublished: "Não publicados",
  verified: "Verificados",
};

export const MODALITY_LABELS: Record<string, string> = {
  hibrido: "Híbrido",
  hybrid: "Híbrido",
  online: "Online",
  presencial: "Presencial",
};

export const GENDER_LABELS: Record<string, string> = {
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

export const PROFILE_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminPsychologistsListProfileConversionCategoryId,
    { description: string; label: string }
  >;

export const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeSearchText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const normalizeName = (name: string) =>
  normalizeProfessionalDisplayName(name) || name.replace(/\s+/g, " ").trim() || "Psicólogo";

export const normalizePagination = (query: AdminPsychologistsListQuery) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
};

export const normalizeSort = (value?: string): AdminPsychologistsListSort => {
  if (value && SORTS.has(value as AdminPsychologistsListSort)) {
    return value as AdminPsychologistsListSort;
  }

  return "relevance";
};

export const jsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

export const currentWeekdayValue = () => {
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

export const moreExperiencedCutoffDate = (date: Date) => {
  const cutoff = new Date(date);
  cutoff.setFullYear(cutoff.getFullYear() - 10);

  return cutoff;
};

export const subscriptionActiveAt = (
  subscription: AdminPsychologistListSubscriptionRecord,
  date: Date,
) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

export const isFreeSubscription = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

export const isProfessionalPlan = (subscription: AdminPsychologistListSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

export const activeSubscriptionsAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

export const hasActiveFreeAt = (profile: AdminPsychologistListProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

export const activeProfessionalSubscriptionsAt = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
) => activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

export const hasVerifiedEntitlementAt = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
) => {
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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const rawAttemptStatus = (value: unknown) => {
  if (!isRecord(value)) return null;
  const status = value.attempt_status;

  return typeof status === "string" ? status : null;
};

export const isManualCheck = (
  check: AdminPsychologistListProfileRecord["registry_checks"][number],
) =>
  check.provider === "manual_admin" ||
  (isRecord(check.raw) &&
    (check.raw.source === "manual_admin" || check.raw.verification_origin === "manual_admin"));

export const registrySourceLabel = (
  source: AdminPsychologistsListRegistryVerification["source"],
) => {
  if (source === "manual_admin") return "Aprovação manual";
  if (source === "api_automatica") return "API automática";
  if (source === "admin_grant") return "Ativação manual";

  return "Sem origem aprovada";
};

export const buildRegistryVerification = (
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

export const pickCurrentPlan = (profile: AdminPsychologistListProfileRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftProfessional = Number(isProfessionalPlan(left));
    const rightProfessional = Number(isProfessionalPlan(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

export const mapStatus = (
  profile: AdminPsychologistListProfileRecord,
  date: Date,
): AdminPsychologistsListItem["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verified";
  if (!profile.published) return "unpublished";
  if (hasActiveFreeAt(profile, date)) return "free";

  return "pending";
};

export const mapExperience = (
  profile: AdminPsychologistListProfileRecord,
): AdminPsychologistsListExperience => {
  const years = crpExperienceYears(profile.crp_registration_date);
  if (years === null) return "unknown";
  if (years >= 10) return "10_plus";
  if (years >= 5) return "5_9";

  return "0_4";
};

export const mapCountGroups = (groups: AdminPsychologistCountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));

export const mapReceivedEngagementCounts = (
  groups: AdminPsychologistReceivedEngagementCountsRecord[],
) => new Map(groups.map((group) => [group.psychologist_id, group]));
