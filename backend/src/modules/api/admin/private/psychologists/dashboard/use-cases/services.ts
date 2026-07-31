import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { extractPsychologistSignupAnalyticsVisitorId } from "@/modules/api/public/analytics/helpers/signup-identity";
import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import {
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER,
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionCategory,
} from "@/utils/admin-profile-conversion";
import type {
  AdminProfileEngagementFavoritesCategoryId,
  AdminProfileEngagementFavoritesCombinationId,
  AdminProfileEngagementFavoritesCommunityCategoryId,
  AdminProfileEngagementFavoritesFavoriteCategoryId,
} from "@/utils/admin-profile-engagement-favorites";
import {
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
  buildAdminProfileEngagementFavoritesBenchmark,
  buildAdminProfileEngagementFavoritesCombinationId,
  calculateAdminProfileEngagementFavoritesCommunityScore,
  classifyAdminProfileEngagementFavoritesCommunityCategory,
  classifyAdminProfileEngagementFavoritesFavoriteCategory,
  getAdminProfileEngagementFavoritesCombinationConfig,
} from "@/utils/admin-profile-engagement-favorites";
import type { AdminProfileExposureCombinationId } from "@/utils/admin-profile-exposure";
import {
  ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER,
  ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER,
  ADMIN_PROFILE_EXPOSURE_SOURCE,
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  buildAdminProfileExposureBenchmark,
  buildAdminProfileExposureCombinationId,
  calculateAdminProfileExposureScore,
  classifyAdminProfileExposureCommunityCategory,
  classifyAdminProfileExposureVideoCategory,
  getAdminProfileExposureCategoryConfig,
  roundAdminProfileExposureNumber,
} from "@/utils/admin-profile-exposure";
import {
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG,
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS,
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE,
  calculateAdminProfileReceivedEngagementScore,
  diagnoseAdminProfileReceivedEngagement,
  normalizeAdminProfileReceivedEngagementToThirtyDays,
} from "@/utils/admin-profile-received-engagement";
import {
  daysBetweenDates,
  firstPaidProfessionalSubscription,
  isPaidProfessionalSubscription,
  platformPageLabel,
  roundOneDecimal,
  signupMethodFromProvider,
  signupMethodLabel,
  summarizeConversionCohort,
  summarizePlatformUsage,
  summarizePsychologistWhatsappTrafficOrigins,
} from "@/utils/admin-psychologist-analytics";
import { crpExperienceYears } from "@/utils/professional-experience";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsDashboardBooleanBreakdown,
  AdminPsychologistsDashboardBreakdownItem,
  AdminPsychologistsDashboardDailyPoint,
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDeviceType,
  AdminPsychologistsDashboardDirectoryFilterItem,
  AdminPsychologistsDashboardDirectoryFilters,
  AdminPsychologistsDashboardFilterSearchDimension,
  AdminPsychologistsDashboardFilterSearches,
  AdminPsychologistsDashboardMetric,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPlanSegment,
  AdminPsychologistsDashboardPlanSegmentSummary,
  AdminPsychologistsDashboardPreSignupConversion,
  AdminPsychologistsDashboardProfileConversionCategoryId,
  AdminPsychologistsDashboardProfileConversionEngagementCategoryId,
  AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults,
  AdminPsychologistsDashboardProfileConversionEngagementLevelId,
  AdminPsychologistsDashboardProfileConversionEngagementQuadrantId,
  AdminPsychologistsDashboardProfileConversionEngagementResults,
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileConversionResults,
  AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults,
  AdminPsychologistsDashboardProfileEngagementFavoritesResults,
  AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
  AdminPsychologistsDashboardProfileExposureCategoryId,
  AdminPsychologistsDashboardProfileExposureResults,
  AdminPsychologistsDashboardProfileExposureTotals,
  AdminPsychologistsDashboardPsychologist,
  AdminPsychologistsDashboardQuery,
  AdminPsychologistsDashboardSummary,
  IAdminPsychologistsDashboardDTO,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import { AdminPsychologistsDashboardRepository } from "../repositories/AdminPsychologistsDashboardRepository";
import type {
  AdminPsychologistAttentionRecord,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistDirectoryFilterSearchRecord,
  AdminPsychologistEventRecord,
  AdminPsychologistPlatformPageViewRecord,
  AdminPsychologistPlatformPwaInstallRecord,
  AdminPsychologistPlatformSessionRecord,
  AdminPsychologistPreSignupConversionPageViewRecord,
  AdminPsychologistPreSignupConversionSessionRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistReceivedEngagementEventRecord,
  AdminPsychologistSignupAnalyticsIdentityRecord,
  AdminPsychologistSubscriptionRecord,
  AdminPsychologistTrafficCommunityPostRecord,
  AdminPsychologistTrafficCommunityReplyRecord,
  AdminPsychologistWhatsappTrafficActionRecord,
} from "../repositories/interfaces/IAdminPsychologistsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const COURTESY_SUBSCRIPTION_SOURCE = "admin_grant";

const STATUS_ACTIVE = "ativa";
const STATUS_CANCELLED = "cancelada";
const FREE_PLAN_SLUG = "gratuito";
const DIRECTORY_FILTER_SEARCH_ACTION_SOURCE =
  "important_action_event.action_type=psychologist_directory_filter_search";
const CITY_FILTER_MINIMUM_SEARCHES = 10;
const RECEIVED_ENGAGEMENT_SOURCE = ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SOURCE;
const PROFILE_CONVERSION_ENGAGEMENT_MIN_ACTIVE_DAYS = 7;
const PROFILE_CONVERSION_ENGAGEMENT_MINIMUM_SIGNAL_30D = 3;
const PROFILE_CONVERSION_ENGAGEMENT_ENGAGED_INTERACTIONS_30D = 6;
const PROFILE_CONVERSION_ENGAGEMENT_VERY_ENGAGED_INTERACTIONS_30D = 12;
const PRE_SIGNUP_CONVERSION_FIRST_TOUCH_LIMIT = 6;
const PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD = 3;
const PRE_SIGNUP_CONVERSION_SESSION_LABEL = "Sessão sem página capturada";
const PRE_SIGNUP_CONVERSION_COVERAGE_NOTE =
  "Coorte de psicólogos cadastrados no período; leitura de trás para frente pela ponte visitor_id/session_id salva no cadastro do psicólogo e por eventos vinculados ao mesmo visitor_id. Pacientes e visitantes que não viraram psicólogo não entram neste bloco.";

const PLAN_SEGMENT_OPTIONS: Array<{
  id: AdminPsychologistsDashboardPlanSegment;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "free", label: "Gratuitos" },
  { id: "courtesy", label: "Cortesia" },
];

const PROFILE_CONVERSION_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionCategoryId[];

const PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionEngagementCategoryId[];

const PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminPsychologistsDashboardProfileConversionMatrixCategoryId[];

const PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER: AdminPsychologistsDashboardProfileConversionEngagementLevelId[] =
  ["very_engaged", "engaged", "low_engaged", "no_engagement"];

const PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER =
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMBINATION_ORDER as AdminProfileEngagementFavoritesCombinationId[];

const PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER =
  ADMIN_PROFILE_EXPOSURE_COMBINATION_ORDER as AdminProfileExposureCombinationId[];

const PROFILE_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminPsychologistsDashboardProfileConversionCategoryId,
    { description: string; label: string }
  >;
const PROFILE_EXPOSURE_CATEGORY_ORDER =
  ADMIN_PROFILE_EXPOSURE_CATEGORY_ORDER as AdminPsychologistsDashboardProfileExposureCategoryId[];

const PROFILE_CONVERSION_ENGAGEMENT_LEVEL_CONFIG = {
  engaged: {
    description: "intera\u00e7\u00f5es recebidas consistentes em perfil e comunidades",
    label: "Engajamento Padr\u00e3o",
  },
  low_engaged: {
    description: "poucas intera\u00e7\u00f5es recebidas em perfil e comunidades",
    label: "Baixo Engajamento",
  },
  no_engagement: {
    description: "nenhuma intera\u00e7\u00e3o recebida em perfil ou comunidades no per\u00edodo",
    label: "Sem Engajamento",
  },
  very_engaged: {
    description: "volume muito alto de intera\u00e7\u00f5es recebidas em perfil e comunidades",
    label: "Alto Engajamento",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileConversionEngagementLevelId,
  { description: string; label: string }
>;

const buildProfileConversionEngagementQuadrantId = (
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionEngagementCategoryId,
  engagementLevel: AdminPsychologistsDashboardProfileConversionEngagementLevelId,
): AdminPsychologistsDashboardProfileConversionEngagementQuadrantId => {
  const id = `${profileConversionCategoryId}_${engagementLevel}`;

  return id as AdminPsychologistsDashboardProfileConversionEngagementQuadrantId;
};

const PROFILE_CONVERSION_ENGAGEMENT_QUADRANT_ORDER: AdminPsychologistsDashboardProfileConversionEngagementQuadrantId[] =
  PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER.flatMap((profileConversionCategoryId) =>
    PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER.map((engagementLevel) =>
      buildProfileConversionEngagementQuadrantId(profileConversionCategoryId, engagementLevel),
    ),
  );

const mapProfileConversionCategoryToEngagementAxis = (
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionCategoryId,
): AdminPsychologistsDashboardProfileConversionEngagementCategoryId =>
  profileConversionCategoryId === "insufficient_data"
    ? "standard_conversion"
    : profileConversionCategoryId;

const getProfileConversionEngagementQuadrantConfig = (input: {
  engagementLevel: AdminPsychologistsDashboardProfileConversionEngagementLevelId;
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionEngagementCategoryId;
}) => {
  const profileConversion = PROFILE_CONVERSION_CATEGORY_CONFIG[input.profileConversionCategoryId];
  const engagement = PROFILE_CONVERSION_ENGAGEMENT_LEVEL_CONFIG[input.engagementLevel];

  return {
    description: `Psic\u00f3logos em ${profileConversion.label} com ${engagement.description}.`,
    label: `${profileConversion.label} + ${engagement.label}`,
  };
};

const DEVICE_LABELS: Record<AdminPsychologistsDashboardDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
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
  nao_binario: "Não binário",
  não_binário: "Não binário",
  outro: "Outro",
  other: "Outro",
};

const RACE_COLOR_LABELS: Record<string, string> = {
  amarela: "Amarela",
  amarelo: "Amarela",
  branca: "Branca",
  branco: "Branca",
  indigena: "Indígena",
  indígena: "Indígena",
  parda: "Parda",
  pardo: "Parda",
  preta: "Preta",
  preto: "Preta",
};

const RELIGION_LABELS: Record<string, string> = {
  ateu_agnostico: "Ateu/Agnóstico",
  budista: "Budista",
  catolica: "Católica",
  católico: "Católica",
  catolico: "Católica",
  evangelica: "Evangélica",
  evangelico: "Evangélica",
  espírita: "Espírita",
  espirita: "Espírita",
  islamica: "Islâmica",
  islamico: "Islâmica",
  judaica: "Judaica",
  judaico: "Judaica",
  outra: "Outra",
  outro: "Outra",
  sem_religiao: "Sem religião",
  umbanda_candomble: "Umbanda/Candomblé",
};

const FILTER_SEARCH_TARGET_TYPES = {
  approaches: ["psychologist_filter_approach"],
  cities: ["psychologist_filter_city"],
  features: ["psychologist_filter_feature"],
  genders: ["psychologist_filter_gender"],
  languages: ["psychologist_filter_language"],
  modalities: ["psychologist_filter_modality"],
  race_colors: ["psychologist_filter_race_color"],
  religions: ["psychologist_filter_religion"],
  services: ["psychologist_filter_service"],
  specialties: ["psychologist_filter_specialty"],
  states: ["psychologist_filter_state"],
  target_audiences: ["psychologist_filter_target_audience"],
} satisfies Record<string, string[]>;

const PRE_SIGNUP_CONVERSION_BUCKETS = [
  { id: "same_day", label: "Mesmo dia" },
  { id: "days_1_3", label: "1-3 dias" },
  { id: "days_4_7", label: "4-7 dias" },
  { id: "days_8_30", label: "8-30 dias" },
  { id: "over_30", label: "Mais de 30 dias" },
  { id: "no_history", label: "Sem trilha capturada" },
] as const satisfies Array<{
  id: AdminPsychologistsDashboardPreSignupConversion["buckets"][number]["id"];
  label: string;
}>;

type PsychologistsPeriodResolution = {
  current: AdminPsychologistsDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminPsychologistsDashboardPeriod;
  previous: AdminPsychologistsDashboardDateRange;
};

type PeriodResult =
  | {
      period: PsychologistsPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);

  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (
  query: AdminPsychologistsDashboardQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const today = new Date();
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDate(addDays(today, -(days - 1)));
    end = endOfDate(today);
    label = `Últimos ${days} dias`;
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o período";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    period: {
      current: { start, end },
      days,
      labels: buildLabels(start, days),
      previous: { start: previousStart, end: previousEnd },
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
    },
  };
};
const roundPercent = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous: number;
  previousValueCount?: number;
  source: string;
  unit?: AdminPsychologistsDashboardMetric["unit"];
  unavailable?: boolean;
  unavailableReason?: string;
  valueCount?: number;
}): AdminPsychologistsDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    ...(typeof params.previousValueCount === "number"
      ? { previous_value_count: params.previousValueCount }
      : {}),
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: params.unit ?? "count",
    unavailable: params.unavailable ?? false,
    ...(typeof params.estimated === "boolean" ? { estimated: params.estimated } : {}),
    ...(params.unavailableReason ? { unavailable_reason: params.unavailableReason } : {}),
    value: params.current,
    ...(typeof params.valueCount === "number" ? { value_count: params.valueCount } : {}),
  };
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const safeNullablePercentage = (value: number, total: number) => {
  if (total <= 0) return null;

  return roundPercent((value / total) * 100);
};

const averageNumber = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const percentileValue = (values: number[], percent: number) => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? null;
};

const preSignupConversionBucketForDays = (
  days: number,
): AdminPsychologistsDashboardPreSignupConversion["buckets"][number]["id"] => {
  if (days === 0) return "same_day";
  if (days <= 3) return "days_1_3";
  if (days <= 7) return "days_4_7";
  if (days <= 30) return "days_8_30";

  return "over_30";
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Psicólogo";

type PreSignupConversionPsychologistTouch = {
  occurredAt: Date;
  pageId: string;
  pageLabel: string;
  sessionId: string;
  source: "page_view_event" | "visitor_session";
};

type PreSignupConversionPsychologistSummary = {
  daysToRegistration: number | null;
  firstTouchId: string | null;
  firstTouchLabel: string | null;
  psychologistId: string;
  sessions: Set<string>;
};

const preSignupConversionPageLabel = (view: AdminPsychologistPreSignupConversionPageViewRecord) =>
  platformPageLabel(view);

const latestPsychologistSignupDate = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.reduce<Date | null>((latest, profile) => {
    if (!latest || profile.user.createdAt > latest) return profile.user.createdAt;

    return latest;
  }, null);

const buildPsychologistVisitorIds = (params: {
  linkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  linkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  psychologistIds: Set<string>;
  signupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
}) => {
  const visitorIdsByPsychologistId = new Map<string, Set<string>>();
  const addVisitorId = (psychologistId: string | null, visitorId: string | null) => {
    if (!psychologistId || !visitorId || !params.psychologistIds.has(psychologistId)) return;

    const current = visitorIdsByPsychologistId.get(psychologistId) ?? new Set<string>();
    current.add(visitorId);
    visitorIdsByPsychologistId.set(psychologistId, current);
  };

  for (const view of params.linkedPageViews) {
    addVisitorId(view.user_id, view.visitor_id);
  }

  for (const session of params.linkedSessions) {
    addVisitorId(session.user_id, session.visitor_id);
  }

  for (const identity of params.signupIdentities) {
    const visitorId = extractPsychologistSignupAnalyticsVisitorId(identity.data);
    if (visitorId) addVisitorId(identity.user_id, visitorId);
  }

  return visitorIdsByPsychologistId;
};

const collectPreSignupConversionVisitorIds = (
  visitorIdsByPsychologistId: Map<string, Set<string>>,
) => [
  ...new Set([...visitorIdsByPsychologistId.values()].flatMap((visitorIds) => [...visitorIds])),
];

const psychologistScopedRecord = (userId: string | null, psychologistId: string) =>
  userId === null || userId === psychologistId;

const touchSort = (
  left: PreSignupConversionPsychologistTouch,
  right: PreSignupConversionPsychologistTouch,
) => {
  const dateDiff = left.occurredAt.getTime() - right.occurredAt.getTime();
  if (dateDiff !== 0) return dateDiff;
  if (left.source !== right.source) return left.source === "page_view_event" ? -1 : 1;

  return left.pageLabel.localeCompare(right.pageLabel, "pt-BR");
};

const summarizePreSignupConversion = (params: {
  linkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  linkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  pageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  period: AdminPsychologistsDashboardPeriod;
  profiles: AdminPsychologistProfileRecord[];
  sessions: AdminPsychologistPreSignupConversionSessionRecord[];
  signupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
}): AdminPsychologistsDashboardPreSignupConversion => {
  const psychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const visitorIdsByPsychologistId = buildPsychologistVisitorIds({
    linkedPageViews: params.linkedPageViews,
    linkedSessions: params.linkedSessions,
    psychologistIds,
    signupIdentities: params.signupIdentities,
  });
  const pageViewsByVisitorId = new Map<
    string,
    AdminPsychologistPreSignupConversionPageViewRecord[]
  >();
  const sessionsByVisitorId = new Map<
    string,
    AdminPsychologistPreSignupConversionSessionRecord[]
  >();

  for (const view of params.pageViews) {
    if (!view.visitor_id) continue;

    const current = pageViewsByVisitorId.get(view.visitor_id) ?? [];
    current.push(view);
    pageViewsByVisitorId.set(view.visitor_id, current);
  }

  for (const session of params.sessions) {
    if (!session.visitor_id) continue;

    const current = sessionsByVisitorId.get(session.visitor_id) ?? [];
    current.push(session);
    sessionsByVisitorId.set(session.visitor_id, current);
  }

  const psychologistSummaries = params.profiles.map(
    (profile): PreSignupConversionPsychologistSummary => {
      const profileVisitorIds =
        visitorIdsByPsychologistId.get(profile.user.id) ?? new Set<string>();
      const touches: PreSignupConversionPsychologistTouch[] = [];

      for (const visitorId of profileVisitorIds) {
        for (const view of pageViewsByVisitorId.get(visitorId) ?? []) {
          if (!psychologistScopedRecord(view.user_id, profile.user.id)) continue;
          if (view.occurred_at > profile.user.createdAt) continue;

          const label = preSignupConversionPageLabel(view);
          touches.push({
            occurredAt: view.occurred_at,
            pageId: normalizeKey(label) || "outras_paginas",
            pageLabel: label,
            sessionId: view.session_id,
            source: "page_view_event",
          });
        }

        for (const session of sessionsByVisitorId.get(visitorId) ?? []) {
          if (!psychologistScopedRecord(session.user_id, profile.user.id)) continue;
          if (session.first_seen_at > profile.user.createdAt) continue;

          touches.push({
            occurredAt: session.first_seen_at,
            pageId: "sessao_sem_pagina",
            pageLabel: PRE_SIGNUP_CONVERSION_SESSION_LABEL,
            sessionId: session.session_id,
            source: "visitor_session",
          });
        }
      }

      const sortedTouches = touches.sort(touchSort);
      const firstTouch = sortedTouches[0];
      const sessions = new Set(sortedTouches.map((touch) => touch.sessionId));

      return {
        daysToRegistration: firstTouch
          ? daysBetweenDates(firstTouch.occurredAt, profile.user.createdAt)
          : null,
        firstTouchId: firstTouch?.pageId ?? null,
        firstTouchLabel: firstTouch?.pageLabel ?? null,
        psychologistId: profile.user.id,
        sessions,
      };
    },
  );

  const psychologistsWithHistory = psychologistSummaries.filter(
    (profile) => typeof profile.daysToRegistration === "number",
  );
  const historyDays = psychologistsWithHistory.flatMap((profile) =>
    typeof profile.daysToRegistration === "number" ? [profile.daysToRegistration] : [],
  );
  const bucketCounts = new Map(PRE_SIGNUP_CONVERSION_BUCKETS.map((bucket) => [bucket.id, 0]));

  for (const profile of psychologistSummaries) {
    const bucket =
      typeof profile.daysToRegistration === "number"
        ? preSignupConversionBucketForDays(profile.daysToRegistration)
        : "no_history";
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }

  const firstTouchGroups = new Map<
    string,
    {
      historyDays: number[];
      label: string;
      psychologistsCount: number;
    }
  >();

  for (const profile of psychologistsWithHistory) {
    if (!profile.firstTouchId || !profile.firstTouchLabel) continue;

    const current = firstTouchGroups.get(profile.firstTouchId) ?? {
      historyDays: [],
      label: profile.firstTouchLabel,
      psychologistsCount: 0,
    };
    current.psychologistsCount += 1;

    if (typeof profile.daysToRegistration === "number") {
      current.historyDays.push(profile.daysToRegistration);
    }

    firstTouchGroups.set(profile.firstTouchId, current);
  }

  const registeredPsychologistsCount = psychologistSummaries.length;
  const psychologistsWithHistoryCount = psychologistsWithHistory.length;
  const psychologistsWithoutHistoryCount =
    registeredPsychologistsCount - psychologistsWithHistoryCount;
  const anonymousSessionsCount = new Set(
    psychologistSummaries.flatMap((profile) =>
      [...profile.sessions].map((sessionId) => `${profile.psychologistId}:${sessionId}`),
    ),
  ).size;

  return {
    anonymous_sessions_count: anonymousSessionsCount,
    average_days: averageNumber(historyDays),
    buckets: PRE_SIGNUP_CONVERSION_BUCKETS.map((bucket) => ({
      count: bucketCounts.get(bucket.id) ?? 0,
      id: bucket.id,
      label: bucket.label,
      percentage: safePercentage(bucketCounts.get(bucket.id) ?? 0, registeredPsychologistsCount),
    })),
    cohort_from: params.period.from,
    cohort_to: params.period.to,
    coverage_note: PRE_SIGNUP_CONVERSION_COVERAGE_NOTE,
    first_touch_pages: [...firstTouchGroups.entries()]
      .map(([id, group]) => ({
        average_days: averageNumber(group.historyDays),
        id,
        label: group.label,
        percentage: safePercentage(group.psychologistsCount, psychologistsWithHistoryCount),
        psychologists_count: group.psychologistsCount,
        sample_sufficient:
          group.psychologistsCount >= PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD,
        unavailable_reason:
          group.psychologistsCount === 0
            ? "Sem psicólogos neste ponto de entrada."
            : group.psychologistsCount < PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD
              ? "Amostra pequena; interpretar apenas como leitura operacional."
              : null,
      }))
      .sort((left, right) => {
        if (right.psychologists_count !== left.psychologists_count) {
          return right.psychologists_count - left.psychologists_count;
        }

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, PRE_SIGNUP_CONVERSION_FIRST_TOUCH_LIMIT),
    history_coverage_rate:
      registeredPsychologistsCount > 0
        ? roundOneDecimal((psychologistsWithHistoryCount / registeredPsychologistsCount) * 100)
        : null,
    median_days: percentileValue(historyDays, 50),
    p75_days: percentileValue(historyDays, 75),
    p90_days: percentileValue(historyDays, 90),
    psychologists_with_anonymous_history_count: psychologistsWithHistoryCount,
    psychologists_without_anonymous_history_count: psychologistsWithoutHistoryCount,
    registered_psychologists_count: registeredPsychologistsCount,
    source: "user.createdAt+user_background+page_view_event+visitor_session",
    unavailable_reason:
      registeredPsychologistsCount === 0
        ? "Sem psicólogos cadastrados no período selecionado."
        : psychologistsWithHistoryCount === 0
          ? "Nenhum psicólogo cadastrado no período possui trilha anônima prévia capturada pelo mesmo visitor_id."
          : null,
  };
};

const normalizeDeviceType = (value: string): AdminPsychologistsDashboardDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDeviceUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts: Record<AdminPsychologistsDashboardDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const activePsychologistsByDevice = new Map<AdminPsychologistsDashboardDeviceType, Set<string>>(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Set<string>(),
    ]),
  );
  const operatingSystemCountsByDevice = new Map<
    AdminPsychologistsDashboardDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );
  const activePsychologistsByDeviceAndOperatingSystem = new Map<
    AdminPsychologistsDashboardDeviceType,
    Map<AdminOperatingSystemType, Set<string>>
  >(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Map(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
      ),
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    if (session.user_id) activePsychologistsByDevice.get(deviceType)?.add(session.user_id);
    const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
    if (session.user_id) {
      activePsychologistsByDeviceAndOperatingSystem
        .get(deviceType)
        ?.get(operatingSystem)
        ?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePsychologists = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[])
      .map((deviceType) => {
        const deviceTotal = counts[deviceType];
        const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
        const activePsychologistsByOperatingSystem =
          activePsychologistsByDeviceAndOperatingSystem.get(deviceType);

        return {
          active_psychologists_count: activePsychologistsByDevice.get(deviceType)?.size ?? 0,
          count: deviceTotal,
          device_type: deviceType,
          id: deviceType,
          label: DEVICE_LABELS[deviceType],
          operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
            active_psychologists_count:
              activePsychologistsByOperatingSystem?.get(operatingSystem)?.size ?? 0,
            count: countsByOperatingSystem?.[operatingSystem] ?? 0,
            id: operatingSystem,
            label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
            operating_system: operatingSystem,
            percentage: safePercentage(
              countsByOperatingSystem?.[operatingSystem] ?? 0,
              deviceTotal,
            ),
          }))
            .filter((operatingSystem) => operatingSystem.count > 0)
            .sort((left, right) => {
              if (right.count !== left.count) return right.count - left.count;

              return left.label.localeCompare(right.label, "pt-BR");
            }),
          percentage: safePercentage(deviceTotal, totalSessions),
        };
      })
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      }),
    source: "visitor_session.device_type+visitor_session.os+user.role=psicologo" as const,
    total_active_psychologists: totalActivePsychologists,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de psicólogos com dispositivo identificado no período selecionado."
        : null,
  };
};

const buildOperatingSystemUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts = Object.fromEntries(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
  ) as Record<AdminOperatingSystemType, number>;
  const activePsychologistsByOperatingSystem = new Map<AdminOperatingSystemType, Set<string>>(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[operatingSystem] += 1;
    if (session.user_id) {
      activePsychologistsByOperatingSystem.get(operatingSystem)?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePsychologists = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
      active_psychologists_count:
        activePsychologistsByOperatingSystem.get(operatingSystem)?.size ?? 0,
      count: counts[operatingSystem],
      id: operatingSystem,
      label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
      operating_system: operatingSystem,
      percentage: safePercentage(counts[operatingSystem], totalSessions),
    })).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.os+visitor_session.device_type+user.role=psicologo" as const,
    total_active_psychologists: totalActivePsychologists,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de psicólogos com sistema operacional no período selecionado."
        : null,
  };
};

const normalizeStateCode = (value: string | null | undefined) => {
  const state = value?.trim().toUpperCase();

  return state && /^[A-Z]{2}$/.test(state) ? state : null;
};

const buildCityStateLabel = (city: string, state: string | null) =>
  state ? `${city}/${state}` : city;

const buildCityStateId = (city: string, state: string | null) =>
  normalizeKey(state ? `${city}_${state}` : city);

const parseCityFilterTarget = (value: string) => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const slashIndex = trimmed.lastIndexOf("/");

  if (slashIndex > 0) {
    const city = trimmed.slice(0, slashIndex).trim();
    const state = normalizeStateCode(trimmed.slice(slashIndex + 1));

    if (city && state) {
      return {
        city,
        id: buildCityStateId(city, state),
        label: buildCityStateLabel(city, state),
        state,
      };
    }
  }

  return {
    city: trimmed,
    id: buildCityStateId(trimmed, null),
    label: trimmed,
    state: null,
  };
};

const humanizeFilterValue = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) ||
  value;

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = normalizeKey(weekday);

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";

  return "domingo";
};

const dateInRange = (date: Date, range: AdminPsychologistsDashboardDateRange) =>
  date >= range.start && date <= range.end;

type ProfileConversionSignalCounts = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

const countEventsByPsychologist = (events: AdminPsychologistEventRecord[]) => {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.psychologist_id, (counts.get(event.psychologist_id) ?? 0) + 1);
  }

  return counts;
};

const getProfileActiveDaysInRange = (
  profile: AdminPsychologistProfileRecord,
  range: AdminPsychologistsDashboardDateRange,
) => {
  const rangeStart = startOfDate(range.start);
  const rangeEnd = endOfDate(range.end);
  const profileStart = startOfDate(profile.user.createdAt);
  const activeStart = profileStart > rangeStart ? profileStart : rangeStart;

  if (activeStart > rangeEnd) return 0;

  return daysBetweenInclusive(activeStart, rangeEnd);
};

const getProfileAgeDaysUntil = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const profileStart = startOfDate(profile.user.createdAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

const classifyProfileConversionCategory = (
  signals: ProfileConversionSignalCounts,
): AdminPsychologistsDashboardProfileConversionCategoryId => {
  return classifyAdminProfileConversionCategory(signals);
};

const buildProfileConversionResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleProfiles.length,
    whatsappClicks: eligibleProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const categories = new Map(
    PROFILE_CONVERSION_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: {
          whatsapp_clicks: 0,
        },
      },
    ]),
  );

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const categoryId = classifyProfileConversionCategory({
      activeDays,
      benchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const category = categories.get(categoryId);

    if (category) {
      category.count += 1;
      category.totals.whatsapp_clicks += whatsappClicks;
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    benchmark,
    categories: PROFILE_CONVERSION_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_CONVERSION_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: {
          whatsapp_clicks: 0,
        },
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, totalPsychologists),
        totals: values.totals,
      };
    }),
    description:
      "Classifica??o interna e agregada dos psic?logos por volume bruto de cliques no WhatsApp comparado aos percentis da plataforma na janela selecionada; n?o ? p?blica, n?o ranqueia e n?o pune profissionais.",
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
    thresholds: ADMIN_PROFILE_CONVERSION_THRESHOLDS,
    totals: {
      adaptation_psychologists: totalPsychologists - benchmark.eligible_psychologists,
      eligible_psychologists: benchmark.eligible_psychologists,
      non_zero_whatsapp_psychologists: benchmark.non_zero_whatsapp_psychologists,
      psychologists: totalPsychologists,
      whatsapp_clicks: whatsappClickEvents.length,
    },
    unavailable_reason:
      totalPsychologists === 0
        ? "Sem psic?logos ativos no fim do per?odo selecionado para classificar convers?o."
        : null,
  };
};

const emptyProfileExposureTotals = (): AdminPsychologistsDashboardProfileExposureTotals => ({
  community_post_attention_seconds: 0,
  community_post_views: 0,
  community_reply_attention_seconds: 0,
  community_reply_views: 0,
  exposure_score: 0,
  profile_attention_seconds: 0,
  profile_surface_attention_seconds: 0,
  profile_video_attention_seconds: 0,
  profile_views: 0,
  qualified_video_views: 0,
  search_result_impressions: 0,
  visibility_seconds: 0,
});

const getProfileExposureCommunityVisibilitySeconds = (
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => signals.community_post_attention_seconds + signals.community_reply_attention_seconds;

const getProfileExposureVideoVisibilitySeconds = (
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => signals.profile_video_attention_seconds;

const addProfileExposureTotals = (
  totals: AdminPsychologistsDashboardProfileExposureTotals,
  signals: AdminPsychologistsDashboardProfileExposureTotals,
) => {
  totals.community_post_attention_seconds += signals.community_post_attention_seconds;
  totals.community_post_views += signals.community_post_views;
  totals.community_reply_attention_seconds += signals.community_reply_attention_seconds;
  totals.community_reply_views += signals.community_reply_views;
  totals.exposure_score = roundAdminProfileExposureNumber(
    totals.exposure_score + signals.exposure_score,
  );
  totals.profile_attention_seconds += signals.profile_attention_seconds;
  totals.profile_surface_attention_seconds += signals.profile_surface_attention_seconds;
  totals.profile_video_attention_seconds += signals.profile_video_attention_seconds;
  totals.profile_views += signals.profile_views;
  totals.qualified_video_views += signals.qualified_video_views;
  totals.search_result_impressions += signals.search_result_impressions;
  totals.visibility_seconds = roundAdminProfileExposureNumber(
    totals.visibility_seconds + signals.visibility_seconds,
  );
};

const buildProfileExposureSignalTotals = (input: {
  communityPostAttentionSeconds: number;
  communityReplyAttentionSeconds: number;
  profileAttentionSeconds: number;
  profileVideoAttentionSeconds: number;
}): AdminPsychologistsDashboardProfileExposureTotals => {
  const profileSurfaceAttentionSeconds = Math.max(
    input.profileAttentionSeconds,
    input.profileVideoAttentionSeconds,
  );
  const visibilitySeconds = calculateAdminProfileExposureScore(input);

  return {
    community_post_attention_seconds: input.communityPostAttentionSeconds,
    community_post_views: 0,
    community_reply_attention_seconds: input.communityReplyAttentionSeconds,
    community_reply_views: 0,
    exposure_score: visibilitySeconds,
    profile_attention_seconds: input.profileAttentionSeconds,
    profile_surface_attention_seconds: profileSurfaceAttentionSeconds,
    profile_video_attention_seconds: input.profileVideoAttentionSeconds,
    profile_views: 0,
    qualified_video_views: 0,
    search_result_impressions: 0,
    visibility_seconds: visibilitySeconds,
  };
};

const buildProfileExposureResults = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileExposureResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const attentionSecondsByPsychologist = (records: AdminPsychologistAttentionRecord[]) => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!analyzedPsychologistIds.has(record.psychologist_id)) continue;

      counts.set(
        record.psychologist_id,
        (counts.get(record.psychologist_id) ?? 0) + record.attention_seconds,
      );
    }

    return counts;
  };
  const contentAttentionByPsychologistAndType = (
    records: AdminPsychologistContentAttentionRecord[],
    targetType: AdminPsychologistContentAttentionRecord["target_type"],
  ) =>
    attentionSecondsByPsychologist(records.filter((record) => record.target_type === targetType));
  const profileAttentionCounts = attentionSecondsByPsychologist(params.profileAttentionSeconds);
  const profileVideoAttentionCounts = attentionSecondsByPsychologist(
    params.profileVideoAttentionSeconds,
  );
  const communityPostAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "post",
  );
  const communityReplyAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "reply",
  );
  const exposureSignalsByPsychologist = new Map<
    string,
    AdminPsychologistsDashboardProfileExposureTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    exposureSignalsByPsychologist.set(
      psychologistId,
      buildProfileExposureSignalTotals({
        communityPostAttentionSeconds: communityPostAttentionCounts.get(psychologistId) ?? 0,
        communityReplyAttentionSeconds: communityReplyAttentionCounts.get(psychologistId) ?? 0,
        profileAttentionSeconds: profileAttentionCounts.get(psychologistId) ?? 0,
        profileVideoAttentionSeconds: profileVideoAttentionCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureCommunityVisibilitySeconds(signals) : 0;
    }),
    eligiblePsychologists: eligibleProfiles.length,
    exposureScores: eligibleProfiles.map(
      (profile) => exposureSignalsByPsychologist.get(profile.user.id)?.exposure_score ?? 0,
    ),
    presentationVideoSeconds: eligibleProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureVideoVisibilitySeconds(signals) : 0;
    }),
  });
  const categories = new Map(
    PROFILE_EXPOSURE_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileExposureTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileExposureTotals(),
    adaptation_psychologists: params.profiles.length - benchmark.eligible_psychologists,
    community_visible_psychologists: 0,
    eligible_psychologists: benchmark.eligible_psychologists,
    exposed_psychologists: 0,
    psychologists: params.profiles.length,
    video_visible_psychologists: 0,
  };

  for (const profile of params.profiles) {
    const signals =
      exposureSignalsByPsychologist.get(profile.user.id) ?? emptyProfileExposureTotals();
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const communityVisibilitySeconds = getProfileExposureCommunityVisibilitySeconds(signals);
    const videoVisibilitySeconds = getProfileExposureVideoVisibilitySeconds(signals);
    const communityCategoryId = classifyAdminProfileExposureCommunityCategory({
      benchmark,
      profileAgeDays,
      visibilitySeconds: communityVisibilitySeconds,
    });
    const videoCategoryId = classifyAdminProfileExposureVideoCategory({
      benchmark,
      profileAgeDays,
      visibilitySeconds: videoVisibilitySeconds,
    });
    const categoryId: AdminPsychologistsDashboardProfileExposureCategoryId =
      communityCategoryId === "insufficient_data" || videoCategoryId === "insufficient_data"
        ? "insufficient_data"
        : buildAdminProfileExposureCombinationId({
            communityCategoryId,
            videoCategoryId,
          });
    const category = categories.get(categoryId);

    addProfileExposureTotals(totalSignals, signals);
    if (signals.exposure_score > 0) totalSignals.exposed_psychologists += 1;
    if (communityVisibilitySeconds > 0) totalSignals.community_visible_psychologists += 1;
    if (videoVisibilitySeconds > 0) totalSignals.video_visible_psychologists += 1;
    if (category) {
      category.count += 1;
      addProfileExposureTotals(category.totals, signals);
    }
  }

  return {
    benchmark,
    categories: PROFILE_EXPOSURE_CATEGORY_ORDER.map((id) => {
      const config = getAdminProfileExposureCategoryConfig(id);
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileExposureTotals(),
      };

      return {
        community_id: config.community_id,
        community_label: config.community_label,
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, params.profiles.length),
        totals: values.totals,
        video_id: config.video_id,
        video_label: config.video_label,
      };
    }),
    description:
      "Classificação interna e agregada que cruza a Visibilidade em conteúdo autoral nas comunidades (feed, páginas de comunidade e detalhes; texto, imagem ou vídeo) com o tempo assistido no vídeo de apresentação. Não conta aparição em listagem nem WhatsApp como Visibilidade.",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
    thresholds: ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Visibilidade."
        : null,
  };
};

type ReceivedEngagementSignalCounts = {
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  interactions: number;
  normalizedInteractions: number;
  normalizedWeightedScore: number;
  positiveVotes: number;
  profileFavorites: number;
  profileFollows: number;
  uncappedNormalizedWeightedScore: number;
};

const emptyReceivedEngagementSignalCounts = (): ReceivedEngagementSignalCounts => ({
  commentsReceived: 0,
  contentSaves: 0,
  contentShares: 0,
  interactions: 0,
  normalizedInteractions: 0,
  normalizedWeightedScore: 0,
  positiveVotes: 0,
  profileFavorites: 0,
  profileFollows: 0,
  uncappedNormalizedWeightedScore: 0,
});

const countReceivedEngagementEventsByPsychologist = (
  events: AdminPsychologistReceivedEngagementEventRecord[],
) => {
  const counts = new Map<string, ReceivedEngagementSignalCounts>();

  for (const event of events) {
    const current = counts.get(event.psychologist_id) ?? emptyReceivedEngagementSignalCounts();

    current.interactions += 1;
    if (event.type === "comment_received") current.commentsReceived += 1;
    if (event.type === "content_save") current.contentSaves += 1;
    if (event.type === "content_share") current.contentShares += 1;
    if (event.type === "positive_vote") current.positiveVotes += 1;
    if (event.type === "profile_favorite") current.profileFavorites += 1;
    if (event.type === "profile_follow") current.profileFollows += 1;

    counts.set(event.psychologist_id, current);
  }

  return counts;
};

const emptyProfileEngagementFavoritesTotals =
  (): AdminPsychologistsDashboardProfileEngagementFavoritesTotals => ({
    comments_received: 0,
    community_engagement_score: 0,
    content_saves: 0,
    content_shares: 0,
    favorites: 0,
    positive_votes: 0,
    received_community_interactions: 0,
    whatsapp_clicks: 0,
  });

const addProfileEngagementFavoritesTotals = (
  target: AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
  source: AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
) => {
  target.comments_received += source.comments_received;
  target.community_engagement_score = roundOneDecimal(
    target.community_engagement_score + source.community_engagement_score,
  );
  target.content_saves += source.content_saves;
  target.content_shares += source.content_shares;
  target.favorites += source.favorites;
  target.positive_votes += source.positive_votes;
  target.received_community_interactions += source.received_community_interactions;
  target.whatsapp_clicks += source.whatsapp_clicks;
};

const buildProfileEngagementFavoritesSignalTotals = (input: {
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  favorites: number;
  positiveVotes: number;
  whatsappClicks: number;
}): AdminPsychologistsDashboardProfileEngagementFavoritesTotals => {
  const communityEngagementScore = calculateAdminProfileEngagementFavoritesCommunityScore({
    commentsReceived: input.commentsReceived,
    contentSaves: input.contentSaves,
    contentShares: input.contentShares,
    positiveVotes: input.positiveVotes,
  });

  return {
    comments_received: input.commentsReceived,
    community_engagement_score: communityEngagementScore,
    content_saves: input.contentSaves,
    content_shares: input.contentShares,
    favorites: input.favorites,
    positive_votes: input.positiveVotes,
    received_community_interactions:
      input.commentsReceived + input.contentSaves + input.contentShares + input.positiveVotes,
    whatsapp_clicks: input.whatsappClicks,
  };
};

const getProfileEngagementFavoritesCategoryConfig = (
  id: AdminProfileEngagementFavoritesCategoryId,
) => {
  if (id === "insufficient_data") {
    return {
      description: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG.description,
      engagement_id: null,
      engagement_label: null,
      favorites_id: null,
      favorites_label: null,
      label: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_INSUFFICIENT_DATA_CONFIG.label,
    };
  }

  const communityId = ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER.find(
    (candidate) => id.startsWith(`${candidate}_`),
  ) as AdminProfileEngagementFavoritesCommunityCategoryId;
  const favoritesId = id.slice(
    `${communityId}_`.length,
  ) as AdminProfileEngagementFavoritesFavoriteCategoryId;
  const config = getAdminProfileEngagementFavoritesCombinationConfig({
    communityCategoryId: communityId,
    favoriteCategoryId: favoritesId,
  });

  return {
    description: config.description,
    engagement_id: communityId,
    engagement_label:
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG[communityId].label,
    favorites_id: favoritesId,
    favorites_label: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG[favoritesId].label,
    label: config.label,
  };
};

const buildProfileEngagementFavoritesResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileEngagementFavoritesResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileEngagementFavoritesTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const counts =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();

    signalsByPsychologistId.set(
      psychologistId,
      buildProfileEngagementFavoritesSignalTotals({
        commentsReceived: counts.commentsReceived,
        contentSaves: counts.contentSaves,
        contentShares: counts.contentShares,
        favorites: counts.profileFavorites,
        positiveVotes: counts.positiveVotes,
        whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileEngagementFavoritesBenchmark({
    communityEngagementScores: eligibleProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.community_engagement_score ?? 0,
    ),
    eligiblePsychologists: eligibleProfiles.length,
    favoriteCounts: eligibleProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.favorites ?? 0,
    ),
  });
  const categories = new Map(
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileEngagementFavoritesTotals(),
    adaptation_psychologists: params.profiles.length - eligibleProfiles.length,
    eligible_psychologists: eligibleProfiles.length,
    engaged_psychologists: 0,
    favorited_psychologists: 0,
    psychologists: params.profiles.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const signals =
      signalsByPsychologistId.get(psychologistId) ?? emptyProfileEngagementFavoritesTotals();
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const communityCategoryId = classifyAdminProfileEngagementFavoritesCommunityCategory({
      benchmark,
      engagementScore: signals.community_engagement_score,
      profileAgeDays,
    });
    const favoriteCategoryId = classifyAdminProfileEngagementFavoritesFavoriteCategory({
      benchmark,
      favorites: signals.favorites,
      profileAgeDays,
    });
    const categoryId =
      communityCategoryId === "insufficient_data" || favoriteCategoryId === "insufficient_data"
        ? "insufficient_data"
        : buildAdminProfileEngagementFavoritesCombinationId({
            communityCategoryId,
            favoriteCategoryId,
          });
    const category = categories.get(categoryId);

    addProfileEngagementFavoritesTotals(totalSignals, signals);
    if (signals.community_engagement_score > 0) totalSignals.engaged_psychologists += 1;
    if (signals.favorites > 0) totalSignals.favorited_psychologists += 1;
    if (category) {
      category.count += 1;
      addProfileEngagementFavoritesTotals(category.totals, signals);
    }
  }

  return {
    benchmark,
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_CATEGORY_ORDER.map((id) => {
      const config = getProfileEngagementFavoritesCategoryConfig(id);
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        engagement_id: config.engagement_id,
        engagement_label: config.engagement_label,
        favorites_id: config.favorites_id,
        favorites_label: config.favorites_label,
        id,
        label: config.label,
        percentage: safePercentage(values.count, params.profiles.length),
        totals: values.totals,
      };
    }),
    description:
      "Classificação interna e agregada que cruza relacionamento recebido na comunidade com favoritos recebidos no período; usada para entender o funil até WhatsApp sem alterar ranking público ou punir psicólogos.",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
    thresholds: {
      ...ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
      score: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SCORE_CONFIG,
    },
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Engajamento e Favoritos."
        : null,
  };
};

const emptyProfileConversionEngagementTotals = () => ({
  comments_received: 0,
  content_saves: 0,
  content_shares: 0,
  positive_votes: 0,
  profile_favorites: 0,
  profile_follows: 0,
  received_interactions: 0,
  whatsapp_clicks: 0,
});

const emptyProfileConversionEngagementRate = () => ({
  psychologists: 0,
  strong_conversion_count: 0,
  strong_conversion_rate: null as number | null,
});

const engagementLevelFromSignals = (input: {
  diagnosisId: string;
  interactions: number;
}): AdminPsychologistsDashboardProfileConversionEngagementLevelId => {
  if (input.interactions <= 0) return "no_engagement";
  if (input.diagnosisId === "muito_ativo") return "very_engaged";
  if (input.diagnosisId === "ativo") return "engaged";

  return "low_engaged";
};

const resolveProfileConversionEngagementQuadrantId = (input: {
  engagementLevel: AdminPsychologistsDashboardProfileConversionEngagementLevelId;
  profileConversionCategoryId: AdminPsychologistsDashboardProfileConversionCategoryId;
}): AdminPsychologistsDashboardProfileConversionEngagementQuadrantId => {
  const profileConversionCategoryId = mapProfileConversionCategoryToEngagementAxis(
    input.profileConversionCategoryId,
  );

  return buildProfileConversionEngagementQuadrantId(
    profileConversionCategoryId,
    input.engagementLevel,
  );
};

const assignProfileConversionEngagementRate = (
  rate: ReturnType<typeof emptyProfileConversionEngagementRate>,
) => {
  rate.strong_conversion_rate = safeNullablePercentage(
    rate.strong_conversion_count,
    rate.psychologists,
  );
};

const differenceBetweenProfileConversionRates = (
  left: ReturnType<typeof emptyProfileConversionEngagementRate>,
  right: ReturnType<typeof emptyProfileConversionEngagementRate>,
) =>
  typeof left.strong_conversion_rate === "number" &&
  typeof right.strong_conversion_rate === "number"
    ? roundPercent(left.strong_conversion_rate - right.strong_conversion_rate)
    : null;

const buildProfileConversionEngagementResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionEngagementResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const eligibleProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleProfiles.length,
    whatsappClicks: eligibleProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const quadrants = new Map(
    PROFILE_CONVERSION_ENGAGEMENT_QUADRANT_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionEngagementTotals(),
      },
    ]),
  );
  const comparison = {
    engaged: emptyProfileConversionEngagementRate(),
    high_engagement: emptyProfileConversionEngagementRate(),
    low_engaged: emptyProfileConversionEngagementRate(),
    low_engagement: emptyProfileConversionEngagementRate(),
    engaged_vs_low_rate_difference_points: null as number | null,
    engaged_vs_no_rate_difference_points: null as number | null,
    no_engagement: emptyProfileConversionEngagementRate(),
    rate_difference_points: null as number | null,
    very_engaged: emptyProfileConversionEngagementRate(),
    very_vs_low_rate_difference_points: null as number | null,
    very_vs_no_rate_difference_points: null as number | null,
  };
  const totalSignals = {
    comments_received: receivedEngagementEvents.filter((event) => event.type === "comment_received")
      .length,
    content_saves: receivedEngagementEvents.filter((event) => event.type === "content_save").length,
    content_shares: receivedEngagementEvents.filter((event) => event.type === "content_share")
      .length,
    engaged_psychologists: 0,
    high_engagement_psychologists: 0,
    insufficient_data_psychologists: 0,
    low_engaged_psychologists: 0,
    low_engagement_psychologists: 0,
    no_engagement_psychologists: 0,
    positive_votes: receivedEngagementEvents.filter((event) => event.type === "positive_vote")
      .length,
    profile_favorites: receivedEngagementEvents.filter((event) => event.type === "profile_favorite")
      .length,
    profile_follows: receivedEngagementEvents.filter((event) => event.type === "profile_follow")
      .length,
    psychologists: params.profiles.length,
    received_interactions: receivedEngagementEvents.length,
    strong_conversion_psychologists: 0,
    very_engaged_psychologists: 0,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const engagementSignals =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();
    const weightedEngagementScore = calculateAdminProfileReceivedEngagementScore({
      activeDays,
      commentsReceived: engagementSignals.commentsReceived,
      contentSaves: engagementSignals.contentSaves,
      contentShares: engagementSignals.contentShares,
      positiveVotes: engagementSignals.positiveVotes,
      profileFavorites: engagementSignals.profileFavorites,
      profileFollows: engagementSignals.profileFollows,
    });
    engagementSignals.normalizedInteractions = normalizeAdminProfileReceivedEngagementToThirtyDays(
      engagementSignals.interactions,
      activeDays,
    );
    engagementSignals.normalizedWeightedScore = weightedEngagementScore.weighted_score_30d;
    engagementSignals.uncappedNormalizedWeightedScore =
      weightedEngagementScore.uncapped_weighted_score_30d;

    const profileConversionCategoryId = classifyProfileConversionCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const hasStrongProfileConversion = profileConversionCategoryId === "strong_conversion";
    if (profileConversionCategoryId === "insufficient_data") {
      totalSignals.insufficient_data_psychologists += 1;
    }
    const engagementDiagnosis = diagnoseAdminProfileReceivedEngagement({
      activeDays,
      commentsReceived: engagementSignals.commentsReceived,
      contentSaves: engagementSignals.contentSaves,
      contentShares: engagementSignals.contentShares,
      positiveVotes: engagementSignals.positiveVotes,
      profileFavorites: engagementSignals.profileFavorites,
      profileFollows: engagementSignals.profileFollows,
      source: RECEIVED_ENGAGEMENT_SOURCE,
    });
    const engagementLevel = engagementLevelFromSignals({
      diagnosisId: engagementDiagnosis.id,
      interactions: engagementSignals.interactions,
    });
    const quadrantId = resolveProfileConversionEngagementQuadrantId({
      engagementLevel,
      profileConversionCategoryId,
    });
    const quadrant = quadrants.get(quadrantId);

    if (hasStrongProfileConversion) totalSignals.strong_conversion_psychologists += 1;
    if (engagementLevel === "very_engaged") {
      comparison.very_engaged.psychologists += 1;
      if (hasStrongProfileConversion) comparison.very_engaged.strong_conversion_count += 1;
      comparison.high_engagement.psychologists += 1;
      if (hasStrongProfileConversion) comparison.high_engagement.strong_conversion_count += 1;
      totalSignals.very_engaged_psychologists += 1;
      totalSignals.high_engagement_psychologists += 1;
    } else if (engagementLevel === "engaged") {
      comparison.engaged.psychologists += 1;
      if (hasStrongProfileConversion) comparison.engaged.strong_conversion_count += 1;
      comparison.high_engagement.psychologists += 1;
      if (hasStrongProfileConversion) comparison.high_engagement.strong_conversion_count += 1;
      totalSignals.engaged_psychologists += 1;
      totalSignals.high_engagement_psychologists += 1;
    } else if (engagementLevel === "low_engaged") {
      comparison.low_engaged.psychologists += 1;
      if (hasStrongProfileConversion) comparison.low_engaged.strong_conversion_count += 1;
      comparison.low_engagement.psychologists += 1;
      if (hasStrongProfileConversion) comparison.low_engagement.strong_conversion_count += 1;
      totalSignals.low_engaged_psychologists += 1;
      totalSignals.low_engagement_psychologists += 1;
    } else {
      comparison.no_engagement.psychologists += 1;
      if (hasStrongProfileConversion) comparison.no_engagement.strong_conversion_count += 1;
      comparison.low_engagement.psychologists += 1;
      if (hasStrongProfileConversion) comparison.low_engagement.strong_conversion_count += 1;
      totalSignals.no_engagement_psychologists += 1;
      totalSignals.low_engagement_psychologists += 1;
    }

    if (quadrant) {
      quadrant.count += 1;
      quadrant.totals.comments_received += engagementSignals.commentsReceived;
      quadrant.totals.content_saves += engagementSignals.contentSaves;
      quadrant.totals.content_shares += engagementSignals.contentShares;
      quadrant.totals.positive_votes += engagementSignals.positiveVotes;
      quadrant.totals.profile_favorites += engagementSignals.profileFavorites;
      quadrant.totals.profile_follows += engagementSignals.profileFollows;
      quadrant.totals.received_interactions += engagementSignals.interactions;
      quadrant.totals.whatsapp_clicks += whatsappClicks;
    }
  }

  assignProfileConversionEngagementRate(comparison.very_engaged);
  assignProfileConversionEngagementRate(comparison.engaged);
  assignProfileConversionEngagementRate(comparison.low_engaged);
  assignProfileConversionEngagementRate(comparison.no_engagement);
  assignProfileConversionEngagementRate(comparison.high_engagement);
  assignProfileConversionEngagementRate(comparison.low_engagement);
  comparison.rate_difference_points = differenceBetweenProfileConversionRates(
    comparison.high_engagement,
    comparison.low_engagement,
  );
  comparison.very_vs_low_rate_difference_points = differenceBetweenProfileConversionRates(
    comparison.very_engaged,
    comparison.low_engaged,
  );
  comparison.very_vs_no_rate_difference_points = differenceBetweenProfileConversionRates(
    comparison.very_engaged,
    comparison.no_engagement,
  );
  comparison.engaged_vs_low_rate_difference_points = differenceBetweenProfileConversionRates(
    comparison.engaged,
    comparison.low_engaged,
  );
  comparison.engaged_vs_no_rate_difference_points = differenceBetweenProfileConversionRates(
    comparison.engaged,
    comparison.no_engagement,
  );

  return {
    comparison,
    description:
      "Rela\u00e7\u00e3o observacional entre intera\u00e7\u00f5es recebidas pelo psic\u00f3logo em perfil/comunidades e Alta Convers\u00e3o no per\u00edodo selecionado; n\u00e3o indica causalidade, ranking ou puni\u00e7\u00e3o.",
    quadrants: PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER.flatMap((profileConversionCategoryId) =>
      PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER.map((engagementLevel) => {
        const id = buildProfileConversionEngagementQuadrantId(
          profileConversionCategoryId,
          engagementLevel,
        );
        const config = getProfileConversionEngagementQuadrantConfig({
          engagementLevel,
          profileConversionCategoryId,
        });
        const values = quadrants.get(id) ?? {
          count: 0,
          totals: emptyProfileConversionEngagementTotals(),
        };

        return {
          count: values.count,
          description: config.description,
          id,
          label: config.label,
          percentage: safePercentage(values.count, params.profiles.length),
          totals: values.totals,
        };
      }),
    ),
    source:
      "contact_request.channel=whatsapp+user.createdAt+platform_percentiles+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share",
    thresholds: {
      engaged_score_30d: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.engaged_score_30d,
      engaged_interactions_30d: PROFILE_CONVERSION_ENGAGEMENT_ENGAGED_INTERACTIONS_30D,
      high_engagement_interactions_30d: PROFILE_CONVERSION_ENGAGEMENT_ENGAGED_INTERACTIONS_30D,
      highly_engaged_score_30d:
        ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.very_engaged_score_30d,
      highly_engaged_interactions_30d: PROFILE_CONVERSION_ENGAGEMENT_VERY_ENGAGED_INTERACTIONS_30D,
      minimum_active_days: PROFILE_CONVERSION_ENGAGEMENT_MIN_ACTIVE_DAYS,
      minimum_signal_score_30d:
        ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.minimum_signal_score_30d,
      minimum_signal_interactions_30d: PROFILE_CONVERSION_ENGAGEMENT_MINIMUM_SIGNAL_30D,
      score_caps_30d: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG.caps_30d,
      profile_conversion_adaptation_period_days:
        ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
      weights: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG.weights,
    },
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psic\u00f3logos ativos no fim do per\u00edodo selecionado para comparar Convers\u00e3o e Engajamento."
        : null,
  };
};

const classifyProfileConversionMatrixCategory = (signals: {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
}): AdminPsychologistsDashboardProfileConversionMatrixCategoryId => {
  const categoryId = classifyProfileConversionCategory({
    ...signals,
    profileAgeDays: Math.max(
      signals.profileAgeDays,
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
    ),
  });

  return categoryId === "insufficient_data" ? "no_conversion" : categoryId;
};

const emptyProfileConversionMatrixRowTotals = () => ({
  whatsapp_clicks: 0,
});

const buildProfileConversionMatrixRows = (
  rows: Map<
    AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
    {
      count: number;
      totals: ReturnType<typeof emptyProfileConversionMatrixRowTotals>;
    }
  >,
  totalPsychologists: number,
) =>
  PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => {
    const config = PROFILE_CONVERSION_CATEGORY_CONFIG[id];
    const values = rows.get(id) ?? {
      count: 0,
      totals: emptyProfileConversionMatrixRowTotals(),
    };

    return {
      count: values.count,
      description: config.description,
      id,
      label: config.label,
      percentage: safePercentage(values.count, totalPsychologists),
      totals: values.totals,
    };
  });

const buildProfileConversionEngagementFavoritesMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminProfileEngagementFavoritesCombinationId,
): AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId;

const classifyProfileEngagementFavoritesMatrixColumn = (input: {
  benchmark: ReturnType<typeof buildAdminProfileEngagementFavoritesBenchmark>;
  profileAgeDays: number;
  signals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals;
}): AdminProfileEngagementFavoritesCombinationId => {
  const profileAgeDays = Math.max(
    input.profileAgeDays,
    ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const communityCategoryId = classifyAdminProfileEngagementFavoritesCommunityCategory({
    benchmark: input.benchmark,
    engagementScore: input.signals.community_engagement_score,
    profileAgeDays,
  });
  const favoriteCategoryId = classifyAdminProfileEngagementFavoritesFavoriteCategory({
    benchmark: input.benchmark,
    favorites: input.signals.favorites,
    profileAgeDays,
  });

  if (communityCategoryId === "insufficient_data" || favoriteCategoryId === "insufficient_data") {
    return "no_engagement_no_favorites";
  }

  return buildAdminProfileEngagementFavoritesCombinationId({
    communityCategoryId,
    favoriteCategoryId,
  });
};

const buildProfileConversionEngagementFavoritesMatrixResults = (params: {
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileEngagementFavoritesTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const counts =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();

    signalsByPsychologistId.set(
      psychologistId,
      buildProfileEngagementFavoritesSignalTotals({
        commentsReceived: counts.commentsReceived,
        contentSaves: counts.contentSaves,
        contentShares: counts.contentShares,
        favorites: counts.profileFavorites,
        positiveVotes: counts.positiveVotes,
        whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleConversionProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleConversionProfiles.length,
    whatsappClicks: eligibleConversionProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const eligibleEngagementFavoritesProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileEngagementFavoritesBenchmark({
    communityEngagementScores: eligibleEngagementFavoritesProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.community_engagement_score ?? 0,
    ),
    eligiblePsychologists: eligibleEngagementFavoritesProfiles.length,
    favoriteCounts: eligibleEngagementFavoritesProfiles.map(
      (profile) => signalsByPsychologistId.get(profile.user.id)?.favorites ?? 0,
    ),
  });
  const rows = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionMatrixRowTotals(),
      },
    ]),
  );
  const columns = new Map(
    PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((columnId) => [
        buildProfileConversionEngagementFavoritesMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileEngagementFavoritesTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileEngagementFavoritesTotals(),
    adaptation_psychologists: params.profiles.length - eligibleEngagementFavoritesProfiles.length,
    eligible_psychologists: eligibleEngagementFavoritesProfiles.length,
    psychologists: params.profiles.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals =
      signalsByPsychologistId.get(psychologistId) ?? emptyProfileEngagementFavoritesTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileEngagementFavoritesMatrixColumn({
      benchmark,
      profileAgeDays,
      signals,
    });
    const quadrantId = buildProfileConversionEngagementFavoritesMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileEngagementFavoritesTotals(totalSignals, signals);
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileEngagementFavoritesTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileEngagementFavoritesTotals(quadrant.totals, signals);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((id) => {
      const config = getProfileEngagementFavoritesCategoryConfig(id);
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileEngagementFavoritesTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, totalPsychologists),
        totals: values.totals,
      };
    }),
    description:
      "Matriz observacional entre ConversÃ£o e as 16 combinaÃ§Ãµes de Engajamento comunitÃ¡rio recebido x Favoritos. Perfis em adaptaÃ§Ã£o sÃ£o projetados nos mesmos 16 eixos para manter a leitura do funil fechada, sem alterar ranking ou punir profissionais.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_ENGAGEMENT_FAVORITES_MATRIX_COLUMN_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionEngagementFavoritesMatrixQuadrantId(
          rowId,
          columnId,
        );
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = getProfileEngagementFavoritesCategoryConfig(columnId);
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileEngagementFavoritesTotals(),
        };

        return {
          column_id: columnId,
          column_label: columnConfig.label,
          count: values.count,
          description: `PsicÃ³logos em ${rowConfig.label} com ${columnConfig.label}.`,
          id: quadrantId,
          label: `${rowConfig.label} + ${columnConfig.label}`,
          percentage: safePercentage(values.count, totalPsychologists),
          row_id: rowId,
          row_label: rowConfig.label,
          totals: values.totals,
        };
      }),
    ),
    rows: buildProfileConversionMatrixRows(rows, totalPsychologists),
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicÃ³logos ativos no fim do perÃ­odo selecionado para cruzar ConversÃ£o com Engajamentos e Favoritos."
        : null,
  };
};

type ProfileConversionVisibilityMatrixTotals = AdminPsychologistsDashboardProfileExposureTotals & {
  whatsapp_clicks: number;
};

const emptyProfileConversionVisibilityMatrixTotals =
  (): ProfileConversionVisibilityMatrixTotals => ({
    ...emptyProfileExposureTotals(),
    whatsapp_clicks: 0,
  });

const addProfileConversionVisibilityMatrixTotals = (
  target: ProfileConversionVisibilityMatrixTotals,
  signals: AdminPsychologistsDashboardProfileExposureTotals,
  whatsappClicks: number,
) => {
  addProfileExposureTotals(target, signals);
  target.whatsapp_clicks += whatsappClicks;
};

const buildProfileConversionVisibilityMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminProfileExposureCombinationId,
): AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId;

const classifyProfileVisibilityMatrixColumn = (input: {
  benchmark: ReturnType<typeof buildAdminProfileExposureBenchmark>;
  profileAgeDays: number;
  signals: AdminPsychologistsDashboardProfileExposureTotals;
}): AdminProfileExposureCombinationId => {
  const profileAgeDays = Math.max(
    input.profileAgeDays,
    ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const communityCategoryId = classifyAdminProfileExposureCommunityCategory({
    benchmark: input.benchmark,
    profileAgeDays,
    visibilitySeconds: getProfileExposureCommunityVisibilitySeconds(input.signals),
  });
  const videoCategoryId = classifyAdminProfileExposureVideoCategory({
    benchmark: input.benchmark,
    profileAgeDays,
    visibilitySeconds: getProfileExposureVideoVisibilitySeconds(input.signals),
  });

  if (communityCategoryId === "insufficient_data" || videoCategoryId === "insufficient_data") {
    return "no_community_no_video";
  }

  return buildAdminProfileExposureCombinationId({
    communityCategoryId,
    videoCategoryId,
  });
};

const buildProfileConversionVisibilityMatrixResults = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const attentionSecondsByPsychologist = (records: AdminPsychologistAttentionRecord[]) => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!analyzedPsychologistIds.has(record.psychologist_id)) continue;

      counts.set(
        record.psychologist_id,
        (counts.get(record.psychologist_id) ?? 0) + record.attention_seconds,
      );
    }

    return counts;
  };
  const contentAttentionByPsychologistAndType = (
    records: AdminPsychologistContentAttentionRecord[],
    targetType: AdminPsychologistContentAttentionRecord["target_type"],
  ) =>
    attentionSecondsByPsychologist(records.filter((record) => record.target_type === targetType));
  const profileAttentionCounts = attentionSecondsByPsychologist(params.profileAttentionSeconds);
  const profileVideoAttentionCounts = attentionSecondsByPsychologist(
    params.profileVideoAttentionSeconds,
  );
  const communityPostAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "post",
  );
  const communityReplyAttentionCounts = contentAttentionByPsychologistAndType(
    params.communityContentAttentionSeconds,
    "reply",
  );
  const exposureSignalsByPsychologist = new Map<
    string,
    AdminPsychologistsDashboardProfileExposureTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    exposureSignalsByPsychologist.set(
      psychologistId,
      buildProfileExposureSignalTotals({
        communityPostAttentionSeconds: communityPostAttentionCounts.get(psychologistId) ?? 0,
        communityReplyAttentionSeconds: communityReplyAttentionCounts.get(psychologistId) ?? 0,
        profileAttentionSeconds: profileAttentionCounts.get(psychologistId) ?? 0,
        profileVideoAttentionSeconds: profileVideoAttentionCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const eligibleConversionProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleConversionProfiles.length,
    whatsappClicks: eligibleConversionProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const eligibleVisibilityProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleVisibilityProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureCommunityVisibilitySeconds(signals) : 0;
    }),
    eligiblePsychologists: eligibleVisibilityProfiles.length,
    exposureScores: eligibleVisibilityProfiles.map(
      (profile) => exposureSignalsByPsychologist.get(profile.user.id)?.exposure_score ?? 0,
    ),
    presentationVideoSeconds: eligibleVisibilityProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologist.get(profile.user.id);

      return signals ? getProfileExposureVideoVisibilitySeconds(signals) : 0;
    }),
  });
  const rows = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionMatrixRowTotals(),
      },
    ]),
  );
  const columns = new Map(
    PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileExposureTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((columnId) => [
        buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileConversionVisibilityMatrixTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileExposureTotals(),
    adaptation_psychologists: params.profiles.length - eligibleVisibilityProfiles.length,
    eligible_psychologists: eligibleVisibilityProfiles.length,
    psychologists: params.profiles.length,
    whatsapp_clicks: whatsappClickEvents.length,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals =
      exposureSignalsByPsychologist.get(psychologistId) ?? emptyProfileExposureTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileVisibilityMatrixColumn({
      benchmark,
      profileAgeDays,
      signals,
    });
    const quadrantId = buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileExposureTotals(totalSignals, signals);
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileExposureTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileConversionVisibilityMatrixTotals(quadrant.totals, signals, whatsappClicks);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((id) => {
      const config = getAdminProfileExposureCategoryConfig(id);
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileExposureTotals(),
      };

      return {
        count: values.count,
        description: config.description,
        id,
        label: config.label,
        percentage: safePercentage(values.count, totalPsychologists),
        totals: values.totals,
      };
    }),
    description:
      "Matriz observacional entre ConversÃ£o e as 16 combinaÃ§Ãµes de Visibilidade em comunidades x VÃ­deo de apresentaÃ§Ã£o. Perfis em adaptaÃ§Ã£o sÃ£o projetados nos mesmos 16 eixos para manter a leitura do funil fechada, sem alterar ranking ou punir profissionais.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_CONVERSION_VISIBILITY_MATRIX_COLUMN_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionVisibilityMatrixQuadrantId(rowId, columnId);
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = getAdminProfileExposureCategoryConfig(columnId);
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileConversionVisibilityMatrixTotals(),
        };

        return {
          column_id: columnId,
          column_label: columnConfig.label,
          count: values.count,
          description: `PsicÃ³logos em ${rowConfig.label} com ${columnConfig.label}.`,
          id: quadrantId,
          label: `${rowConfig.label} + ${columnConfig.label}`,
          percentage: safePercentage(values.count, totalPsychologists),
          row_id: rowId,
          row_label: rowConfig.label,
          totals: values.totals,
        };
      }),
    ),
    rows: buildProfileConversionMatrixRows(rows, totalPsychologists),
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${ADMIN_PROFILE_EXPOSURE_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicÃ³logos ativos no fim do perÃ­odo selecionado para cruzar ConversÃ£o com Visibilidade."
        : null,
  };
};

const profileCreatedUntil = (profile: AdminPsychologistProfileRecord, date: Date) =>
  profile.user.createdAt <= date;

const subscriptionActiveAt = (subscription: AdminPsychologistSubscriptionRecord, date: Date) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

const isProfessionalPlan = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

const isPaidGatewaySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  isPaidProfessionalSubscription(subscription);

const isCourtesySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.source === COURTESY_SUBSCRIPTION_SOURCE && isProfessionalPlan(subscription);

const activeSubscriptionsAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

const hasActiveFreeAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

const getPlanSegmentAt = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
): "courtesy" | "free" | "none" | "subscriber" => {
  const activeSubscriptions = activeSubscriptionsAt(profile, date);

  if (activeSubscriptions.some(isPaidGatewaySubscription)) return "subscriber";
  if (activeSubscriptions.some(isCourtesySubscription)) return "courtesy";
  if (activeSubscriptions.some(isFreeSubscription)) return "free";

  return "none";
};

const hasActiveSubscriberAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "subscriber";

const hasActiveCourtesyAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "courtesy";

const hasCurrentFreePlanAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "free";

const profileMatchesPlanSegment = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) => {
  if (segment === "all") return true;
  if (segment === "free") return getPlanSegmentAt(profile, date) === "free";
  if (segment === "courtesy") return getPlanSegmentAt(profile, date) === "courtesy";

  return getPlanSegmentAt(profile, date) === "subscriber";
};

const filterProfilesByPlanSegment = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) =>
  segment === "all"
    ? profiles
    : profiles.filter((profile) => profileMatchesPlanSegment(profile, date, segment));

const filterRecordsByUserPlanSegment = <T extends { user_id: string | null }>(
  records: T[],
  allowedUserIds: Set<string>,
) => records.filter((record) => record.user_id && allowedUserIds.has(record.user_id));

const collectWhatsappTrafficTargetIds = (
  actions: AdminPsychologistWhatsappTrafficActionRecord[],
  targetTypes: Set<string>,
) => [
  ...new Set(
    actions.flatMap((action) =>
      action.target_id && action.target_type && targetTypes.has(action.target_type)
        ? [action.target_id]
        : [],
    ),
  ),
];

const activeProfessionalSubscriptionsAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

const hasVerifiedEntitlementAt = (profile: AdminPsychologistProfileRecord, date: Date) => {
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

const pickCurrentPlan = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftPaid = Number(isProfessionalPlan(left));
    const rightPaid = Number(isProfessionalPlan(right));
    if (leftPaid !== rightPaid) return rightPaid - leftPaid;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const flattenSubscriptions = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.flatMap((profile) => profile.subscriptions);

const paidGatewayCanceledInRange = (
  subscriptions: AdminPsychologistSubscriptionRecord[],
  range: AdminPsychologistsDashboardDateRange,
) =>
  subscriptions.filter(
    (item) =>
      isPaidGatewaySubscription(item) &&
      item.status === STATUS_CANCELLED &&
      dateInRange(item.updatedAt, range),
  );

const paidGatewaySubscriptionInOpeningBaseAt = (
  subscription: AdminPsychologistSubscriptionRecord,
  date: Date,
) => {
  if (!isPaidGatewaySubscription(subscription)) return false;
  if (subscription.createdAt > date) return false;
  if (subscription.current_period_end && subscription.current_period_end <= date) return false;
  if (subscription.status === STATUS_ACTIVE) return true;

  return subscription.status === STATUS_CANCELLED && subscription.updatedAt > date;
};

/**
 * Churn V1 do Admin Psicólogos:
 * cancelamentos reais de assinaturas profissionais originadas no gateway Mercado Pago no período
 * divididos pela base paga ativa no início do período. Novas assinaturas iniciadas dentro do
 * período não entram no denominador. Cortesias/admin_grant e plano gratuito não entram no
 * numerador nem denominador.
 */
const calculateChurnPercent = (
  profiles: AdminPsychologistProfileRecord[],
  range: AdminPsychologistsDashboardDateRange,
) => {
  const subscriptions = flattenSubscriptions(profiles);
  const openingBase = subscriptions.filter((item) =>
    paidGatewaySubscriptionInOpeningBaseAt(item, range.start),
  );
  const denominator = openingBase.length;
  const canceled = paidGatewayCanceledInRange(subscriptions, range).length;

  if (denominator === 0) {
    return {
      canceled,
      denominator,
      value: 0,
    };
  }

  return {
    canceled,
    denominator,
    value: roundPercent((canceled / denominator) * 100),
  };
};

const countByDate = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

const getDateCount = (counts: Map<string, number>, label: string) => counts.get(label) ?? 0;

const buildTimeline = (params: {
  labels: string[];
  profiles: AdminPsychologistProfileRecord[];
}): AdminPsychologistsDashboardDailyPoint[] => {
  const newSignupsByDate = countByDate(
    params.profiles.map((profile) => ({ createdAt: profile.user.createdAt })),
    params.labels,
  );

  return params.labels.map((date) => {
    const dayStart = parseDateOnly(date, "start") ?? startOfDate(new Date(date));
    const dayEnd = parseDateOnly(date, "end") ?? endOfDate(new Date(date));
    const profilesCreatedUntilDay = params.profiles.filter((profile) =>
      profileCreatedUntil(profile, dayEnd),
    );

    return {
      churn: calculateChurnPercent(params.profiles, { end: dayEnd, start: dayStart }).value,
      courtesy_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveCourtesyAt(profile, dayEnd),
      ).length,
      date,
      free_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasCurrentFreePlanAt(profile, dayEnd),
      ).length,
      new_signups: getDateCount(newSignupsByDate, date),
      subscriber_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveSubscriberAt(profile, dayEnd),
      ).length,
      total_psychologists: profilesCreatedUntilDay.length,
    };
  });
};

const addMapCount = (
  map: Map<string, { count: number; label: string }>,
  id: string,
  label: string,
) => {
  const current = map.get(id);
  map.set(id, {
    count: (current?.count ?? 0) + 1,
    label: current?.label ?? label,
  });
};

const buildBreakdown = (
  map: Map<string, { count: number; label: string }>,
  total: number,
  limit?: number,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const items = [...map.entries()]
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });

  return typeof limit === "number" ? items.slice(0, limit) : items;
};

const buildOptionLookup = (options: AdminPsychologistsDashboardDirectoryFilterItem[] = []) => {
  const lookup = new Map<string, AdminPsychologistsDashboardDirectoryFilterItem>();

  for (const option of options) {
    for (const value of [option.id, option.slug, option.label]) {
      const key = normalizeKey(value);
      if (key) lookup.set(key, option);
    }
  }

  return lookup;
};

const buildFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  minimumCount?: number;
  options?: AdminPsychologistsDashboardDirectoryFilterItem[];
  targetTypes: string[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const optionLookup = buildOptionLookup(params.options);
  const itemsById = new Map<string, { count: number; label: string }>();
  const targetTypes = new Set(params.targetTypes);

  for (const option of params.options ?? []) {
    const id = option.slug || option.id;
    if (!id) continue;

    itemsById.set(id, {
      count: 0,
      label: option.label,
    });
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const normalizedTarget = normalizeKey(targetId);
    if (!normalizedTarget) continue;

    const option = optionLookup.get(normalizedTarget);
    if (params.options && !option) continue;

    const id = option?.slug || option?.id || normalizedTarget;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      label: current?.label ?? option?.label ?? humanizeFilterValue(targetId),
    });
  }

  const allItems = buildBreakdown(
    itemsById,
    [...itemsById.values()].reduce((sum, item) => sum + item.count, 0),
  );
  const minimumCount = params.minimumCount;
  const visibleItems =
    typeof minimumCount === "number"
      ? allItems.filter((item) => item.count >= minimumCount)
      : allItems;
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

const buildCityFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  supplyItems: AdminPsychologistsDashboardBreakdownItem[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const itemsById = new Map<string, { count: number; hasSupply: boolean; label: string }>();
  const supplyItemsByCity = new Map<string, AdminPsychologistsDashboardBreakdownItem[]>();
  const targetTypes = new Set(FILTER_SEARCH_TARGET_TYPES.cities);

  for (const item of params.supplyItems) {
    itemsById.set(item.id, {
      count: 0,
      hasSupply: item.count > 0,
      label: item.label,
    });

    const city = item.label.split("/")[0]?.trim();
    const cityKey = city ? normalizeKey(city) : "";
    if (!cityKey) continue;

    supplyItemsByCity.set(cityKey, [...(supplyItemsByCity.get(cityKey) ?? []), item]);
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const parsed = parseCityFilterTarget(targetId);
    if (!parsed.city) continue;

    const sameCitySupplyItems = supplyItemsByCity.get(normalizeKey(parsed.city)) ?? [];
    const matchedSupplyItem = parsed.state
      ? sameCitySupplyItems.find((item) => item.id === parsed.id)
      : sameCitySupplyItems.length === 1
        ? sameCitySupplyItems[0]
        : null;
    const id = matchedSupplyItem?.id ?? parsed.id;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      hasSupply: current?.hasSupply ?? Boolean(matchedSupplyItem?.count),
      label: current?.label ?? matchedSupplyItem?.label ?? parsed.label,
    });
  }

  const visibleItems = [...itemsById.entries()]
    .filter(([, item]) => item.hasSupply || item.count >= CITY_FILTER_MINIMUM_SEARCHES)
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: 0,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

const buildFilterSearches = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  citySupplyItems: AdminPsychologistsDashboardBreakdownItem[];
  directoryFilters: AdminPsychologistsDashboardDirectoryFilters;
}): AdminPsychologistsDashboardFilterSearches => ({
  available: true,
  description:
    "Buscas reais por filtros aplicados no diretório público de psicólogos, capturadas por evento first-party sem texto livre.",
  dimensions: {
    approaches: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.approaches,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.approaches,
    }),
    cities: buildCityFilterSearchDimension({
      actions: params.actions,
      supplyItems: params.citySupplyItems,
    }),
    features: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.features,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.features,
    }),
    genders: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.genders,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.genders,
    }),
    languages: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.languages,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.languages,
    }),
    modalities: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.modalities,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.modalities,
    }),
    race_colors: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.race_colors,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.race_colors,
    }),
    religions: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.religions,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.religions,
    }),
    services: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.services,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.services,
    }),
    specialties: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.specialties,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.specialties,
    }),
    states: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.states,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.states,
    }),
    target_audiences: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.target_audiences,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.target_audiences,
    }),
  },
  minimum_city_searches: CITY_FILTER_MINIMUM_SEARCHES,
  source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
});

const booleanBreakdown = (params: {
  falseLabel?: string;
  source: string;
  total: number;
  trueCount: number;
  trueLabel?: string;
}): AdminPsychologistsDashboardBooleanBreakdown => ({
  false_count: Math.max(0, params.total - params.trueCount),
  false_label: params.falseLabel ?? "Não",
  source: params.source,
  true_count: params.trueCount,
  true_label: params.trueLabel ?? "Sim",
  true_percentage: safePercentage(params.trueCount, params.total),
});

const jsonStringArray = (value: AdminPsychologistProfileRecord["target_audience"]) => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const profileMatchesPatientModality = (
  profile: AdminPsychologistProfileRecord,
  modality: "online" | "presencial",
) => {
  const key = normalizeKey(profile.modality ?? "");

  if (modality === "online") return key === "online" || key === "hibrido" || key === "hybrid";

  return key === "presencial" || key === "hibrido" || key === "hybrid";
};

const buildPatientModalityBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;

  return [
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "online")).length,
      id: "online",
      label: "Online",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "presencial"))
        .length,
      id: "presencial",
      label: "Presencial",
      percentage: 0,
    },
  ].map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

const isAvailableToday = (profile: AdminPsychologistProfileRecord) =>
  jsonStringArray(profile.available_days).includes(currentWeekdayValue());

const isMoreExperienced = (profile: AdminPsychologistProfileRecord) =>
  profile.show_experience_tag && (crpExperienceYears(profile.crp_registration_date) ?? 0) >= 10;

const buildFeatureBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;
  const items: AdminPsychologistsDashboardBreakdownItem[] = [
    {
      count: profiles.filter(isAvailableToday).length,
      id: "available_today",
      label: "Disponível hoje",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => hasVerifiedEntitlementAt(profile, date)).length,
      id: "verified",
      label: "Somente verificados",
      percentage: 0,
    },
    {
      count: profiles.filter(isMoreExperienced).length,
      id: "more_experienced",
      label: "Mais experientes",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.discount_first_session).length,
      id: "discount_first_session",
      label: "Desconto na 1ª sessão",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.accepts_insurance).length,
      id: "accepts_insurance",
      label: "Aceita convênios",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.social_value).length,
      id: "social_value",
      label: "Valor social",
      percentage: 0,
    },
  ];

  return items.map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

const buildStatistics = (profiles: AdminPsychologistProfileRecord[], date: Date) => {
  const services = new Map<string, { count: number; label: string }>();
  const cities = new Map<string, { count: number; label: string }>();
  const specialties = new Map<string, { count: number; label: string }>();
  const approaches = new Map<string, { count: number; label: string }>();
  const targetAudience = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const gender = new Map<string, { count: number; label: string }>();
  const raceColors = new Map<string, { count: number; label: string }>();
  const religions = new Map<string, { count: number; label: string }>();
  const states = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    for (const relation of profile.user.psychologist_services) {
      addMapCount(services, relation.service.slug, relation.service.name);
    }

    for (const relation of profile.user.psychologist_specialties) {
      addMapCount(specialties, relation.specialty.slug, relation.specialty.name);
    }

    for (const relation of profile.user.psychologist_approaches) {
      addMapCount(approaches, relation.approach.slug, relation.approach.name);
    }

    for (const audience of jsonStringArray(profile.target_audience)) {
      addMapCount(targetAudience, normalizeKey(audience), audience);
    }

    for (const language of jsonStringArray(profile.languages)) {
      addMapCount(languages, normalizeKey(language), language);
    }

    if (profile.gender?.trim()) {
      const key = normalizeKey(profile.gender);
      addMapCount(gender, key, GENDER_LABELS[key] ?? profile.gender.trim());
    }

    if (profile.race_color?.trim()) {
      const key = normalizeKey(profile.race_color);
      addMapCount(raceColors, key, RACE_COLOR_LABELS[key] ?? profile.race_color.trim());
    }

    if (profile.religion?.trim()) {
      const key = normalizeKey(profile.religion);
      addMapCount(religions, key, RELIGION_LABELS[key] ?? profile.religion.trim());
    }

    if (profile.professional_address_state?.trim()) {
      const state = profile.professional_address_state.trim().toUpperCase();
      addMapCount(states, state, state);
    }

    if (profile.professional_address_city?.trim()) {
      const city = profile.professional_address_city.trim();
      const state = normalizeStateCode(profile.professional_address_state);
      addMapCount(cities, buildCityStateId(city, state), buildCityStateLabel(city, state));
    }
  }

  const total = profiles.length;
  const experienceOver10 = profiles.filter(
    (profile) => (crpExperienceYears(profile.crp_registration_date) ?? 0) >= 10,
  ).length;

  return {
    accepts_insurance: booleanBreakdown({
      source: "psychologist_profile.accepts_insurance",
      total,
      trueCount: profiles.filter((profile) => profile.accepts_insurance).length,
    }),
    approaches: {
      items: buildBreakdown(approaches, total),
      source: "psychologist_approach" as const,
      total,
    },
    discount_first_session: booleanBreakdown({
      source: "psychologist_profile.discount_first_session",
      total,
      trueCount: profiles.filter((profile) => profile.discount_first_session).length,
    }),
    experience_over_10_years: booleanBreakdown({
      source: "psychologist_profile.crp_registration_date",
      total,
      trueCount: experienceOver10,
    }),
    gender: {
      items: buildBreakdown(gender, total),
      source: "psychologist_profile.gender" as const,
      total,
    },
    cities: {
      items: buildBreakdown(cities, total),
      source: "psychologist_profile.professional_address_city+professional_address_state" as const,
      total,
    },
    features: {
      items: buildFeatureBreakdown(profiles, date),
      source: "psychologist_profile+professional_subscription" as const,
      total,
    },
    languages: {
      items: buildBreakdown(languages, total),
      source: "psychologist_profile.languages" as const,
      total,
    },
    modalities: {
      items: buildPatientModalityBreakdown(profiles),
      source: "psychologist_profile.modality" as const,
      total,
    },
    services: {
      items: buildBreakdown(services, total),
      source: "psychologist_service" as const,
      total,
    },
    specialties: {
      items: buildBreakdown(specialties, total),
      source: "psychologist_specialty" as const,
      total,
    },
    race_colors: {
      items: buildBreakdown(raceColors, total),
      source: "psychologist_profile.race_color" as const,
      total,
    },
    religions: {
      items: buildBreakdown(religions, total),
      source: "psychologist_profile.religion" as const,
      total,
    },
    social_value: booleanBreakdown({
      source: "psychologist_profile.social_value",
      total,
      trueCount: profiles.filter((profile) => profile.social_value).length,
    }),
    states: {
      items: buildBreakdown(states, total),
      source: "psychologist_profile.professional_address_state" as const,
      total,
    },
    target_audience: {
      items: buildBreakdown(targetAudience, total),
      source: "psychologist_profile.target_audience" as const,
      total,
    },
  };
};

const buildSignupMethod = (profiles: AdminPsychologistProfileRecord[]) => {
  const counts = {
    email_password: 0,
    google: 0,
    unknown: 0,
  };

  for (const profile of profiles) {
    counts[signupMethodFromProvider(profile.user.provider)] += 1;
  }

  const total = profiles.length;

  return {
    items: (["google", "email_password"] as const).map((id) => ({
      count: counts[id],
      id,
      label: signupMethodLabel(id),
      percentage: safePercentage(counts[id], total),
    })),
    source: "user.provider" as const,
    total,
    unknown_count: counts.unknown,
  };
};

const buildConversionBySignupMethod = (profiles: AdminPsychologistProfileRecord[]) =>
  (["google", "email_password"] as const).map((id) => {
    const methodProfiles = profiles.filter(
      (profile) => signupMethodFromProvider(profile.user.provider) === id,
    );
    const convertedDays = methodProfiles.flatMap((profile) => {
      const firstPaid = firstPaidProfessionalSubscription(profile.subscriptions);
      if (!firstPaid) return [];

      return [
        Math.max(
          0,
          Math.floor(
            (startOfDate(firstPaid.createdAt).getTime() -
              startOfDate(profile.user.createdAt).getTime()) /
              MS_PER_DAY,
          ),
        ),
      ];
    });
    const conversion = summarizeConversionCohort(methodProfiles);
    const sampleSufficient = methodProfiles.length >= 3 && convertedDays.length > 0;

    return {
      average_days: sampleSufficient ? conversion.average_days : null,
      conversion_rate:
        methodProfiles.length > 0
          ? roundOneDecimal((convertedDays.length / methodProfiles.length) * 100)
          : null,
      converted_paid_count: convertedDays.length,
      id,
      label: signupMethodLabel(id),
      median_days: sampleSufficient ? conversion.median_days : null,
      registered_count: methodProfiles.length,
      sample_sufficient: sampleSufficient,
      unavailable_reason: sampleSufficient
        ? null
        : methodProfiles.length === 0
          ? "Sem psicólogos cadastrados por esta via na coorte."
          : "Amostra insuficiente para comparar prazo por modo de cadastro.",
    };
  });

const buildPlanSegmentSummaries = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  currentNewSignups: AdminPsychologistProfileRecord[];
  currentProfiles: AdminPsychologistProfileRecord[];
  date: Date;
  labels: string[];
  platformPageViews: AdminPsychologistPlatformPageViewRecord[];
  platformPwaInstalls: AdminPsychologistPlatformPwaInstallRecord[];
  platformSessions: AdminPsychologistPlatformSessionRecord[];
  period: AdminPsychologistsDashboardPeriod;
  preSignupConversionLinkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  preSignupConversionLinkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  preSignupConversionPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  preSignupConversionSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  preSignupConversionSignupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  trafficCommunityPosts: AdminPsychologistTrafficCommunityPostRecord[];
  trafficCommunityReplies: AdminPsychologistTrafficCommunityReplyRecord[];
  whatsappTrafficActions: AdminPsychologistWhatsappTrafficActionRecord[];
  whatsappContactRequests: AdminPsychologistEventRecord[];
}) =>
  PLAN_SEGMENT_OPTIONS.reduce(
    (accumulator, segment) => {
      const segmentProfiles = filterProfilesByPlanSegment(
        params.currentProfiles,
        params.date,
        segment.id,
      );
      const segmentProfilesForSupply = filterProfilesByPlanSegment(
        params.profiles,
        params.date,
        segment.id,
      );
      const segmentNewSignups = filterProfilesByPlanSegment(
        params.currentNewSignups,
        params.date,
        segment.id,
      );
      const segmentUserIds = new Set(segmentProfiles.map((profile) => profile.user.id));
      const isAll = segment.id === "all";
      const platformPageViews = isAll
        ? params.platformPageViews
        : filterRecordsByUserPlanSegment(params.platformPageViews, segmentUserIds);
      const platformSessions = isAll
        ? params.platformSessions
        : filterRecordsByUserPlanSegment(params.platformSessions, segmentUserIds);
      const platformPwaInstalls = isAll
        ? params.platformPwaInstalls
        : filterRecordsByUserPlanSegment(params.platformPwaInstalls, segmentUserIds);
      const platformUsage = summarizePlatformUsage({
        eligiblePsychologistsCount: segmentProfiles.length,
        labels: params.labels,
        pageViews: platformPageViews,
        pwaInstalledUserIds: platformPwaInstalls.flatMap((event) =>
          event.user_id ? [event.user_id] : [],
        ),
      });
      const trafficSources = summarizePsychologistWhatsappTrafficOrigins({
        actions: params.whatsappTrafficActions,
        allowedPsychologistIds: isAll ? null : segmentUserIds,
        communityPosts: params.trafficCommunityPosts,
        communityReplies: params.trafficCommunityReplies,
      });

      accumulator[segment.id] = {
        device_usage: buildDeviceUsage(platformSessions),
        id: segment.id,
        label: segment.label,
        platform_usage: {
          ...platformUsage,
          eligible_psychologists_count: segmentProfiles.length,
          source: "page_view_event+important_action_event" as const,
        },
        pre_signup_conversion: summarizePreSignupConversion({
          linkedPageViews: params.preSignupConversionLinkedPageViews,
          linkedSessions: params.preSignupConversionLinkedSessions,
          pageViews: params.preSignupConversionPageViews,
          period: params.period,
          profiles: segmentNewSignups,
          sessions: params.preSignupConversionSessions,
          signupIdentities: params.preSignupConversionSignupIdentities,
        }),
        psychologists_count: segmentProfiles.length,
        signup_method: buildSignupMethod(segmentNewSignups),
        statistics: buildStatistics(segmentProfilesForSupply, params.date),
        profile_conversion: buildProfileConversionResults({
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_engagement_favorites: buildProfileEngagementFavoritesResults({
          profiles: segmentProfiles,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_engagement: buildProfileConversionEngagementResults({
          profiles: segmentProfiles,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_engagement_favorites:
          buildProfileConversionEngagementFavoritesMatrixResults({
            profiles: segmentProfiles,
            range: params.range,
            receivedEngagementEvents: params.receivedEngagementEvents,
            whatsappClicks: params.whatsappContactRequests,
          }),
        profile_conversion_visibility: buildProfileConversionVisibilityMatrixResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_exposure: buildProfileExposureResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          range: params.range,
        }),
        traffic_sources: {
          ...trafficSources,
          source:
            "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click" as const,
        },
      };

      return accumulator;
    },
    {} as Record<
      AdminPsychologistsDashboardPlanSegment,
      AdminPsychologistsDashboardPlanSegmentSummary
    >,
  );

const mapPsychologistStatus = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
): AdminPsychologistsDashboardPsychologist["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verificado";
  if (!profile.published) return "nao_publicado";
  if (hasActiveFreeAt(profile, date)) return "gratuito";

  return "pendente";
};

const buildPsychologistsList = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardPsychologist[] =>
  profiles.slice(0, 5).map((profile) => {
    const plan = pickCurrentPlan(profile, date);

    return {
      avatar: profile.user.avatar,
      city: profile.professional_address_city,
      created_at: profile.user.createdAt,
      crp: profile.crp,
      email: profile.user.email,
      id: profile.user.id,
      name: normalizeName(profile.user.name),
      plan_name: plan?.plan.name ?? null,
      plan_slug: plan?.plan.slug ?? null,
      published: profile.published,
      state: profile.professional_address_state,
      status: mapPsychologistStatus(profile, date),
      verified: hasVerifiedEntitlementAt(profile, date),
    };
  });

const roundRankingScore = (value: number) => Math.round(value * 1000) / 10;

const getAllPeriodStartDate = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.reduce<Date | undefined>((earliest, profile) => {
    const createdAt = profile.user.createdAt;
    if (!earliest || createdAt < earliest) return createdAt;

    return earliest;
  }, undefined);

export const buildPsychologistsDashboard = async (
  query: AdminPsychologistsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPsychologistsDashboardRepository();
  const [profiles, directoryFilters] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listDirectoryFilters(),
  ]);
  const resolvedPeriod = resolvePeriod(query ?? {}, getAllPeriodStartDate(profiles));
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;

  const currentNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, current),
  );
  const currentPeriodPsychologistIds = currentNewSignups.map((profile) => profile.user.id);
  const psychologistUserIds = profiles.map((profile) => profile.user.id);
  const [
    directoryFilterSearchActions,
    rankingCandidates,
    platformPageViews,
    platformSessions,
    platformPwaInstalls,
    whatsappTrafficActions,
    whatsappContactRequests,
    preSignupConversionLinkedPageViews,
    preSignupConversionLinkedSessions,
    preSignupConversionSignupIdentities,
  ] = await Promise.all([
    repository.listDirectoryFilterSearchActions(current),
    repository.listPublicRankingCandidates(),
    repository.listPlatformPageViews(current),
    repository.listPlatformSessions(current),
    repository.listPlatformPwaInstallActions(current),
    repository.listWhatsappTrafficActions(current),
    repository.listWhatsappContactRequests(current),
    repository.listPreSignupConversionLinkedPageViews(currentPeriodPsychologistIds),
    repository.listPreSignupConversionLinkedSessions(currentPeriodPsychologistIds),
    repository.listPreSignupConversionSignupIdentities(currentPeriodPsychologistIds),
  ]);
  const [trafficCommunityPosts, trafficCommunityReplies] = await Promise.all([
    repository.listTrafficCommunityPosts(
      collectWhatsappTrafficTargetIds(whatsappTrafficActions, new Set(["community_post", "post"])),
    ),
    repository.listTrafficCommunityReplies(
      collectWhatsappTrafficTargetIds(whatsappTrafficActions, new Set(["post_reply", "reply"])),
    ),
  ]);
  const receivedEngagementEvents = await repository.listReceivedEngagementEvents(current);
  const [communityContentAttentionSeconds, profileAttentionSeconds, profileVideoAttentionSeconds] =
    await Promise.all([
      repository.listCommunityContentAttentionSeconds(current),
      repository.listProfileAttentionSeconds(current, psychologistUserIds),
      repository.listProfileVideoAttentionSeconds(current),
    ]);
  const preSignupConversionVisitorIds = collectPreSignupConversionVisitorIds(
    buildPsychologistVisitorIds({
      linkedPageViews: preSignupConversionLinkedPageViews,
      linkedSessions: preSignupConversionLinkedSessions,
      psychologistIds: new Set(currentPeriodPsychologistIds),
      signupIdentities: preSignupConversionSignupIdentities,
    }),
  );
  const preSignupConversionMaxSignupDate = latestPsychologistSignupDate(currentNewSignups);
  const [preSignupConversionPageViews, preSignupConversionSessions] = await Promise.all([
    repository.listPreSignupConversionPageViewsByVisitorIds(
      preSignupConversionVisitorIds,
      currentPeriodPsychologistIds,
      preSignupConversionMaxSignupDate,
    ),
    repository.listPreSignupConversionSessionsByVisitorIds(
      preSignupConversionVisitorIds,
      currentPeriodPsychologistIds,
      preSignupConversionMaxSignupDate,
    ),
  ]);

  const currentProfiles = profiles.filter((profile) => profileCreatedUntil(profile, current.end));
  const previousProfiles = profiles.filter((profile) => profileCreatedUntil(profile, previous.end));
  const previousNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, previous),
  );
  const currentFree = currentProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, current.end),
  );
  const previousFree = previousProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, previous.end),
  );
  const currentSubscribers = currentProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, current.end),
  );
  const previousSubscribers = previousProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, previous.end),
  );
  const currentCourtesy = currentProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, current.end),
  );
  const previousCourtesy = previousProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, previous.end),
  );
  const currentChurn = calculateChurnPercent(profiles, current);
  const previousChurn = calculateChurnPercent(profiles, previous);
  const rankedPsychologists = await rankPsychologistCandidates(rankingCandidates, null);
  const conversion = summarizeConversionCohort(currentNewSignups);
  const preSignupConversion = summarizePreSignupConversion({
    linkedPageViews: preSignupConversionLinkedPageViews,
    linkedSessions: preSignupConversionLinkedSessions,
    pageViews: preSignupConversionPageViews,
    period,
    profiles: currentNewSignups,
    sessions: preSignupConversionSessions,
    signupIdentities: preSignupConversionSignupIdentities,
  });
  const planSegments = buildPlanSegmentSummaries({
    communityContentAttentionSeconds,
    currentNewSignups,
    currentProfiles,
    date: current.end,
    labels,
    platformPageViews,
    platformPwaInstalls,
    platformSessions,
    period,
    preSignupConversionLinkedPageViews,
    preSignupConversionLinkedSessions,
    preSignupConversionPageViews,
    preSignupConversionSessions,
    preSignupConversionSignupIdentities,
    profileAttentionSeconds,
    profileVideoAttentionSeconds,
    profiles,
    range: current,
    receivedEngagementEvents,
    trafficCommunityPosts,
    trafficCommunityReplies,
    whatsappTrafficActions,
    whatsappContactRequests,
  });
  const platformUsage = planSegments.all.platform_usage;
  const deviceUsage = planSegments.all.device_usage;
  const operatingSystemUsage = buildOperatingSystemUsage(platformSessions);
  const trafficSources = planSegments.all.traffic_sources;
  const profileConversion = planSegments.all.profile_conversion;
  const profileConversionEngagement = planSegments.all.profile_conversion_engagement;
  const profileConversionEngagementFavorites =
    planSegments.all.profile_conversion_engagement_favorites;
  const profileConversionVisibility = planSegments.all.profile_conversion_visibility;
  const profileEngagementFavorites = planSegments.all.profile_engagement_favorites;
  const profileExposure = planSegments.all.profile_exposure;
  const statistics = planSegments.all.statistics;
  const profileNameByUserId = new Map(
    profiles.map((profile) => [profile.user.id, profile.user.name]),
  );

  const summary: AdminPsychologistsDashboardSummary = {
    cards: {
      churn: metric({
        current: currentChurn.value,
        description:
          "Cancelamentos de assinaturas profissionais Mercado Pago no período ÷ base paga ativa no início do período. Novas assinaturas do período não entram no denominador; cortesias e plano gratuito não entram.",
        id: "churn",
        label: "Churn",
        previous: previousChurn.value,
        previousValueCount: previousChurn.canceled,
        source: "professional_subscription.source=mercadopago/status=cancelada",
        unit: "percentage",
        unavailable: currentChurn.denominator === 0,
        valueCount: currentChurn.canceled,
        ...(currentChurn.denominator === 0
          ? {
              unavailableReason:
                "Não há base paga Mercado Pago ativa no início do período para calcular churn.",
            }
          : {}),
      }),
      courtesy_psychologists: metric({
        current: currentCourtesy.length,
        description:
          "Psicólogos com cortesia administrativa profissional ativa no fim do período selecionado.",
        id: "courtesy_psychologists",
        label: "Psicólogos cortesia",
        previous: previousCourtesy.length,
        source: "professional_subscription.source=admin_grant/status=ativa",
      }),
      free_psychologists: metric({
        current: currentFree.length,
        description:
          "Psicólogos cujo segmento ativo no fim do período é o plano gratuito; assinantes pagos e cortesias são contados separadamente.",
        id: "free_psychologists",
        label: "Psicólogos gratuitos",
        previous: previousFree.length,
        source: "professional_subscription.plan.slug=gratuito/status=ativa",
      }),
      new_signups: metric({
        current: currentNewSignups.length,
        description: "Novos usuários com role psicologo criados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewSignups.length,
        source: "user.createdAt/role=psicologo",
      }),
      subscriber_psychologists: metric({
        current: currentSubscribers.length,
        description:
          "Psicólogos com assinatura profissional paga Mercado Pago ativa no fim do período selecionado.",
        id: "subscriber_psychologists",
        label: "Psicólogos assinantes",
        previous: previousSubscribers.length,
        source: "professional_subscription.source=mercadopago/status=ativa",
      }),
      total_psychologists: metric({
        current: currentProfiles.length,
        description:
          "Usuários ativos com role psicologo e perfil profissional não deletado existentes até o fim do período.",
        id: "total_psychologists",
        label: "Total de psicólogos",
        previous: previousProfiles.length,
        source: "user.role=psicologo+psychologist_profile",
      }),
    },
    conversion: {
      ...conversion,
      cohort_from: period.from,
      cohort_to: period.to,
      source: "user.createdAt+professional_subscription+subscription_plan",
    },
    conversion_by_signup_method: buildConversionBySignupMethod(currentNewSignups),
    device_usage: deviceUsage,
    filters_searches: buildFilterSearches({
      actions: directoryFilterSearchActions,
      citySupplyItems: statistics.cities.items,
      directoryFilters,
    }),
    pre_signup_conversion: preSignupConversion,
    directory_filters: directoryFilters,
    operating_system_usage: operatingSystemUsage,
    plan_segments: planSegments,
    period,
    platform_usage: platformUsage,
    psychologists: {
      items: buildPsychologistsList(profiles, current.end),
      source: "user+psychologist_profile+professional_subscription",
      total: profiles.length,
    },
    ranking: {
      formula: "public_directory_psychologist_ranking",
      items: rankedPsychologists.slice(0, 5).map(({ item, ranking }, index) => ({
        avatar: item.user.avatar,
        base_score: roundRankingScore(ranking.baseScore),
        crp: item.crp,
        id: item.user.id,
        name: normalizeName(profileNameByUserId.get(item.user.id) ?? "Psicólogo"),
        position: index + 1,
        public_profile_url: `/psychologists/${item.user.id}`,
        score: roundRankingScore(ranking.score),
        verified: ranking.isVerified,
      })),
      source: "shared_psychologist_public_ranking_helper",
      total: rankedPsychologists.length,
    },
    signup_method: planSegments.all.signup_method,
    statistics,
    timeline: {
      points: buildTimeline({
        labels,
        profiles,
      }),
      source: "user+professional_subscription",
    },
    profile_conversion: profileConversion,
    profile_engagement_favorites: profileEngagementFavorites,
    profile_conversion_engagement: profileConversionEngagement,
    profile_conversion_engagement_favorites: profileConversionEngagementFavorites,
    profile_conversion_visibility: profileConversionVisibility,
    profile_exposure: profileExposure,
    traffic_sources: {
      ...trafficSources,
      source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click",
    },
    unavailable: [
      ...(profileConversion.unavailable_reason
        ? [
            {
              description:
                "A Conversão depende de ao menos um perfil de psic\u00f3logo ativo no per\u00edodo selecionado.",
              id: "psychologist_profile_conversion",
              label: "Conversão dos psic\u00f3logos",
              source: ADMIN_PROFILE_CONVERSION_SOURCE,
            },
          ]
        : []),
      ...(profileExposure.unavailable_reason
        ? [
            {
              description:
                "A Visibilidade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_exposure",
              label: "Visibilidade dos psicólogos",
              source: profileExposure.source,
            },
          ]
        : []),
      ...(profileConversionEngagement.unavailable_reason
        ? [
            {
              description:
                "O comparativo Conversão x Engajamento depende de ao menos um perfil de psic\u00f3logo ativo no per\u00edodo selecionado.",
              id: "psychologist_profile_conversion_engagement",
              label: "Conversão x Engajamento",
              source: profileConversionEngagement.source,
            },
          ]
        : []),
      ...(profileConversionEngagementFavorites.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversão x Engajamentos e Favoritos depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion_engagement_favorites",
              label: "Conversão x Engajamentos e Favoritos",
              source: profileConversionEngagementFavorites.source,
            },
          ]
        : []),
      ...(profileConversionVisibility.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversão x Visibilidade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion_visibility",
              label: "Conversão x Visibilidade",
              source: profileConversionVisibility.source,
            },
          ]
        : []),
      ...(profileEngagementFavorites.unavailable_reason
        ? [
            {
              description:
                "Engajamento e Favoritos depende de ao menos um perfil de psicÃ³logo ativo no perÃ­odo selecionado.",
              id: "psychologist_profile_engagement_favorites",
              label: "Engajamento e Favoritos",
              source: profileEngagementFavorites.source,
            },
          ]
        : []),
      ...(trafficSources.unavailable_reason
        ? [
            {
              description:
                "Origem do tráfego agregada depende de important_action_event de WhatsApp no período selecionado.",
              id: "traffic_sources",
              label: "Origem do tráfego",
              source: "important_action_event",
            },
          ]
        : []),
      ...(preSignupConversion.unavailable_reason
        ? [
            {
              description: preSignupConversion.unavailable_reason,
              id: "pre_signup_conversion",
              label: "Conversão até o cadastro",
              source: preSignupConversion.source,
            },
          ]
        : []),
      ...(currentChurn.denominator === 0
        ? [
            {
              description:
                "Churn exige assinaturas profissionais Mercado Pago ativas no início do período; não há base para o período atual.",
              id: "churn_denominator_zero",
              label: "Churn de assinaturas",
              source: "professional_subscription",
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "Uso da plataforma por psicólogos depende de page_view_event autenticado no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
            },
          ]
        : []),
      ...(deviceUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de devices dos psicólogos depende de visitor_session autenticada com user.role=psicologo no período selecionado.",
              id: "psychologist_device_usage",
              label: "Devices dos psicólogos",
              source: "visitor_session",
            },
          ]
        : []),
      ...(operatingSystemUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de sistemas operacionais dos psicólogos depende de visitor_session autenticada com os normalizado no período selecionado.",
              id: "psychologist_operating_system_usage",
              label: "Sistema operacional dos psicólogos",
              source: "visitor_session",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminPsychologistsDashboardDTO): Promise<Resolve> => {
  return buildPsychologistsDashboard(data.q ?? {});
};
