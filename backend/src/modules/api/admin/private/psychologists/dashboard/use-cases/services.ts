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
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER,
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
  ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG,
  ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER,
  ADMIN_PROFILE_EXPOSURE_SOURCE,
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG,
  ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER,
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
  type AdminPsychologistWhatsappTrafficOriginSourceId,
  type AdminPsychologistWhatsappTrafficPlatformMetric,
  daysBetweenDates,
  firstPaidProfessionalSubscription,
  hasSearchFilterTrafficParams,
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
  AdminPsychologistsDashboardProfileActivityCategoryId,
  AdminPsychologistsDashboardProfileActivityResults,
  AdminPsychologistsDashboardProfileActivityTotals,
  AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId,
  AdminPsychologistsDashboardProfileConversionActivityMatrixResults,
  AdminPsychologistsDashboardProfileConversionBehaviorElementId,
  AdminPsychologistsDashboardProfileConversionBehaviorMetric,
  AdminPsychologistsDashboardProfileConversionBehaviorResults,
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
  AdminPsychologistsDashboardProfileCoverageCategoryId,
  AdminPsychologistsDashboardProfileCoverageResults,
  AdminPsychologistsDashboardProfileCrossMatrixAxisId,
  AdminPsychologistsDashboardProfileCrossMatrixCategory,
  AdminPsychologistsDashboardProfileCrossMatrixResults,
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
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistDirectoryFilterSearchRecord,
  AdminPsychologistEventRecord,
  AdminPsychologistPlatformPageViewRecord,
  AdminPsychologistPlatformPwaInstallRecord,
  AdminPsychologistPlatformSessionRecord,
  AdminPsychologistPreSignupConversionPageViewRecord,
  AdminPsychologistPreSignupConversionSessionRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
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
const PROFILE_ACTIVITY_SOURCE = "community_post.author_id+post_reply.author_id";
const PROFILE_COVERAGE_SOURCE =
  "post_reply.author_id+post_reply.post.author.role=paciente+distinct(post_id)" as const;
const PROFILE_ACTIVITY_THRESHOLDS = {
  active_min_actions: 6,
  low_activity_min_actions: 3,
  very_active_min_actions: 12,
} as const;
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

const PROFILE_ACTIVITY_CATEGORY_ORDER: AdminPsychologistsDashboardProfileActivityCategoryId[] = [
  "muito_ativo",
  "ativo",
  "pouco_ativo",
  "sem_base",
];

const PROFILE_COVERAGE_CATEGORY_ORDER: AdminPsychologistsDashboardProfileCoverageCategoryId[] = [
  "above_average_coverage",
  "average_coverage",
  "below_average_coverage",
  "no_coverage",
];

const PROFILE_ACTIVITY_CATEGORY_CONFIG = {
  ativo: {
    description:
      "Psicólogo com volume padrão de ações autorais nas comunidades no período selecionado.",
    label: "Ativo",
  },
  muito_ativo: {
    description:
      "Psicólogo com volume alto de ações autorais nas comunidades no período selecionado.",
    label: "Muito ativo",
  },
  pouco_ativo: {
    description: "Psicólogo com poucas ações autorais nas comunidades no período selecionado.",
    label: "Pouco ativo",
  },
  sem_base: {
    description:
      "Psicólogo com menos de três ações autorais nas comunidades no período selecionado.",
    label: "Sem base",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileActivityCategoryId,
  { description: string; label: string }
>;

const PROFILE_COVERAGE_CATEGORY_CONFIG = {
  above_average_coverage: {
    description:
      "Psicólogo respondeu mais posts únicos de pacientes do que a média dos psicólogos no período selecionado.",
    label: "Alta cobertura",
  },
  average_coverage: {
    description:
      "Psicólogo respondeu exatamente a média de posts únicos de pacientes no período selecionado.",
    label: "Cobertura padrão",
  },
  below_average_coverage: {
    description:
      "Psicólogo respondeu ao menos um post único de paciente, mas ficou abaixo da média do período selecionado.",
    label: "Baixa cobertura",
  },
  no_coverage: {
    description: "Psicólogo não respondeu posts únicos de pacientes no período selecionado.",
    label: "Sem cobertura",
  },
} satisfies Record<
  AdminPsychologistsDashboardProfileCoverageCategoryId,
  { description: string; label: string }
>;

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
    description: "interações recebidas consistentes em perfil e comunidades",
    label: "Engajamento Padrão",
  },
  low_engaged: {
    description: "poucas interações recebidas em perfil e comunidades",
    label: "Baixo Engajamento",
  },
  no_engagement: {
    description: "nenhuma interação recebida em perfil ou comunidades no período",
    label: "Sem Engajamento",
  },
  very_engaged: {
    description: "volume muito alto de interações recebidas em perfil e comunidades",
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
    description: `Psicólogos em ${profileConversion.label} com ${engagement.description}.`,
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
    .replace(/[̀-ͯ]/g, "")
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
      "Classificação interna e agregada dos psicólogos por volume bruto de cliques no WhatsApp comparado aos percentis da plataforma na janela selecionada; não é pública, não ranqueia e não pune profissionais.",
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
        ? "Sem psicólogos ativos no fim do período selecionado para classificar conversão."
        : null,
  };
};

const emptyProfileActivityTotals = (): AdminPsychologistsDashboardProfileActivityTotals => ({
  actions: 0,
  posts: 0,
  replies: 0,
});

const addProfileActivityTotals = (
  target: AdminPsychologistsDashboardProfileActivityTotals,
  source: AdminPsychologistsDashboardProfileActivityTotals,
) => {
  target.actions += source.actions;
  target.posts += source.posts;
  target.replies += source.replies;
};

const classifyProfileActivityCategory = (
  actions: number,
): AdminPsychologistsDashboardProfileActivityCategoryId => {
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.very_active_min_actions) return "muito_ativo";
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.active_min_actions) return "ativo";
  if (actions >= PROFILE_ACTIVITY_THRESHOLDS.low_activity_min_actions) return "pouco_ativo";

  return "sem_base";
};

const buildProfileActivityResults = (params: {
  communityPosts: AdminPsychologistCommunityTrafficPlatformDataset["posts"];
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileActivityResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileActivityTotals
  >();
  const ensureSignals = (psychologistId: string) => {
    const current = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    signalsByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityPosts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(post.author_id);
    signals.actions += 1;
    signals.posts += 1;
  }

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(reply.author_id);
    signals.actions += 1;
    signals.replies += 1;
  }

  const categories = new Map(
    PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileActivityTotals(),
      },
    ]),
  );
  const totalSignals = {
    ...emptyProfileActivityTotals(),
    psychologists: params.profiles.length,
    psychologists_with_actions: 0,
  };

  for (const profile of params.profiles) {
    const signals = signalsByPsychologistId.get(profile.user.id) ?? emptyProfileActivityTotals();
    const categoryId = classifyProfileActivityCategory(signals.actions);
    const category = categories.get(categoryId);

    addProfileActivityTotals(totalSignals, signals);
    if (signals.actions > 0) totalSignals.psychologists_with_actions += 1;
    if (category) {
      category.count += 1;
      addProfileActivityTotals(category.totals, signals);
    }
  }

  return {
    categories: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_ACTIVITY_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: emptyProfileActivityTotals(),
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
    description:
      "Classificação interna e agregada dos psicólogos por ações autorais reais nas comunidades no período selecionado: posts publicados e respostas criadas.",
    source: PROFILE_ACTIVITY_SOURCE,
    thresholds: PROFILE_ACTIVITY_THRESHOLDS,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Atividade."
        : null,
  };
};

const buildProfileCoverageCountsByPsychologistId = (params: {
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}) => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const coveredPatientPostIdsByPsychologistId = new Map<string, Set<string>>();

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range) ||
      reply.post.author.role !== "paciente"
    ) {
      continue;
    }

    const current = coveredPatientPostIdsByPsychologistId.get(reply.author_id) ?? new Set<string>();
    current.add(reply.post_id);
    coveredPatientPostIdsByPsychologistId.set(reply.author_id, current);
  }

  return new Map(
    [...coveredPatientPostIdsByPsychologistId.entries()].map(([psychologistId, postIds]) => [
      psychologistId,
      postIds.size,
    ]),
  );
};

const classifyProfileCoverageCategory = (
  patientPostsAnswered: number,
  averagePatientPostsAnswered: number,
): AdminPsychologistsDashboardProfileCoverageCategoryId => {
  if (patientPostsAnswered <= 0 || averagePatientPostsAnswered <= 0) return "no_coverage";
  if (patientPostsAnswered > averagePatientPostsAnswered) return "above_average_coverage";
  if (patientPostsAnswered < averagePatientPostsAnswered) return "below_average_coverage";

  return "average_coverage";
};

const buildProfileCoverageResults = (params: {
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
}): AdminPsychologistsDashboardProfileCoverageResults => {
  const coverageCountsByPsychologistId = buildProfileCoverageCountsByPsychologistId(params);
  const totalPsychologists = params.profiles.length;
  const totalPatientPostsAnswered = [...coverageCountsByPsychologistId.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const averagePatientPostsAnswered =
    totalPsychologists > 0 ? totalPatientPostsAnswered / totalPsychologists : 0;
  const categories = new Map(
    PROFILE_COVERAGE_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: {
          patient_posts_answered: 0,
        },
      },
    ]),
  );
  let psychologistsWithCoverage = 0;

  for (const profile of params.profiles) {
    const patientPostsAnswered = coverageCountsByPsychologistId.get(profile.user.id) ?? 0;
    const categoryId = classifyProfileCoverageCategory(
      patientPostsAnswered,
      averagePatientPostsAnswered,
    );
    const category = categories.get(categoryId);

    if (patientPostsAnswered > 0) psychologistsWithCoverage += 1;
    if (category) {
      category.count += 1;
      category.totals.patient_posts_answered += patientPostsAnswered;
    }
  }

  return {
    categories: PROFILE_COVERAGE_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_COVERAGE_CATEGORY_CONFIG[id];
      const values = categories.get(id) ?? {
        count: 0,
        totals: {
          patient_posts_answered: 0,
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
      "Classificação interna e agregada dos psicólogos por quantidade de posts únicos de pacientes que receberam ao menos uma resposta do psicólogo no período selecionado.",
    source: PROFILE_COVERAGE_SOURCE,
    totals: {
      average_patient_posts_answered: roundOneDecimal(averagePatientPostsAnswered),
      patient_posts_answered: totalPatientPostsAnswered,
      psychologists: totalPsychologists,
      psychologists_with_coverage: psychologistsWithCoverage,
    },
    unavailable_reason:
      totalPsychologists === 0
        ? "Sem psicólogos ativos no fim do período selecionado para classificar Cobertura."
        : null,
  };
};

const buildProfileConversionActivityMatrixQuadrantId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  columnId: AdminPsychologistsDashboardProfileActivityCategoryId,
): AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId =>
  `${rowId}_${columnId}` as AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId;

const buildProfileConversionActivityMatrixResults = (params: {
  communityPosts: AdminPsychologistCommunityTrafficPlatformDataset["posts"];
  communityReplies: AdminPsychologistCommunityTrafficPlatformDataset["replies"];
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileConversionActivityMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const signalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileActivityTotals
  >();
  const ensureSignals = (psychologistId: string) => {
    const current = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    signalsByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityPosts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(post.author_id);
    signals.actions += 1;
    signals.posts += 1;
  }

  for (const reply of params.communityReplies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureSignals(reply.author_id);
    signals.actions += 1;
    signals.replies += 1;
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
    PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileActivityTotals(),
      },
    ]),
  );
  const quadrants = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_ACTIVITY_CATEGORY_ORDER.map((columnId) => [
        buildProfileConversionActivityMatrixQuadrantId(rowId, columnId),
        {
          count: 0,
          totals: emptyProfileActivityTotals(),
        },
      ]),
    ),
  );
  const totalSignals = {
    ...emptyProfileActivityTotals(),
    psychologists: params.profiles.length,
    psychologists_with_actions: 0,
  };

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const signals = signalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: profileConversionBenchmark,
      profileAgeDays,
      whatsappClicks,
    });
    const columnId = classifyProfileActivityCategory(signals.actions);
    const quadrantId = buildProfileConversionActivityMatrixQuadrantId(rowId, columnId);
    const row = rows.get(rowId);
    const column = columns.get(columnId);
    const quadrant = quadrants.get(quadrantId);

    addProfileActivityTotals(totalSignals, signals);
    if (signals.actions > 0) totalSignals.psychologists_with_actions += 1;
    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClicks;
    }
    if (column) {
      column.count += 1;
      addProfileActivityTotals(column.totals, signals);
    }
    if (quadrant) {
      quadrant.count += 1;
      addProfileActivityTotals(quadrant.totals, signals);
    }
  }

  const totalPsychologists = params.profiles.length;

  return {
    columns: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) => {
      const config = PROFILE_ACTIVITY_CATEGORY_CONFIG[id];
      const values = columns.get(id) ?? {
        count: 0,
        totals: emptyProfileActivityTotals(),
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
      "Matriz observacional entre Conversao e Atividade autoral nas comunidades, usando posts publicados e respostas criadas no periodo para indicar o comportamento predominante de cada faixa de conversao.",
    quadrants: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.flatMap((rowId) =>
      PROFILE_ACTIVITY_CATEGORY_ORDER.map((columnId) => {
        const quadrantId = buildProfileConversionActivityMatrixQuadrantId(rowId, columnId);
        const rowConfig = PROFILE_CONVERSION_CATEGORY_CONFIG[rowId];
        const columnConfig = PROFILE_ACTIVITY_CATEGORY_CONFIG[columnId];
        const values = quadrants.get(quadrantId) ?? {
          count: 0,
          totals: emptyProfileActivityTotals(),
        };

        return {
          column_id: columnId,
          column_label: columnConfig.label,
          count: values.count,
          description: `Psicologos em ${rowConfig.label} com ${columnConfig.label}.`,
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
    source: `${ADMIN_PROFILE_CONVERSION_SOURCE}+${PROFILE_ACTIVITY_SOURCE}`,
    totals: totalSignals,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicologos ativos no fim do periodo selecionado para cruzar Conversao com Atividade."
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
      "Relação observacional entre interações recebidas pelo psicólogo em perfil/comunidades e Alta Conversão no período selecionado; não indica causalidade, ranking ou punição.",
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
        ? "Sem psicólogos ativos no fim do período selecionado para comparar Conversão e Engajamento."
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

type CommunityTrafficPlatformMetricSourceId = Extract<
  AdminPsychologistWhatsappTrafficOriginSourceId,
  "community_post_text" | "community_post_video" | "community_reply_text" | "community_reply_video"
>;

type CommunityTrafficPlatformMetricTotals = {
  comments: number;
  contentCount: number;
  downvotes: number;
  profileAccesses: number;
  retentionSamples: number;
  retentionTotalPercent: number;
  saves: number;
  shares: number;
  upvotes: number;
  visibilitySeconds: number;
  views: number;
};

const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS: CommunityTrafficPlatformMetricSourceId[] = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
];
const COMMUNITY_TRAFFIC_PROFILE_ACCESS_ATTRIBUTION_WINDOW_MS = 30 * 60 * 1000;
const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "community_post+post_reply+page_view_event+content_attention_session+content_video_watch_session+post_vote+post_save+post_reply_save+post_share";

const emptyCommunityTrafficPlatformMetricTotals = (): CommunityTrafficPlatformMetricTotals => ({
  comments: 0,
  contentCount: 0,
  downvotes: 0,
  profileAccesses: 0,
  retentionSamples: 0,
  retentionTotalPercent: 0,
  saves: 0,
  shares: 0,
  upvotes: 0,
  visibilitySeconds: 0,
  views: 0,
});

const isCommunityTrafficVideoMedia = (record: {
  media_items?: Array<{ media_type: string | null }>;
  media_type: string | null;
}) =>
  record.media_type === "video" ||
  (record.media_items?.some((media) => media.media_type === "video") ?? false);

const isCommunityTrafficPostTargetType = (targetType: string | null) =>
  targetType === "community_post" || targetType === "post";

const isCommunityTrafficReplyTargetType = (targetType: string | null) =>
  targetType === "post_reply" || targetType === "reply";

const roundTrafficMetricPercent = (value: number) => Math.round(value * 10) / 10;

const buildCommunityTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

const buildCommunityTrafficPlatformMetrics = (
  dataset: AdminPsychologistCommunityTrafficPlatformDataset,
) => {
  const totalsBySource = new Map<
    CommunityTrafficPlatformMetricSourceId,
    CommunityTrafficPlatformMetricTotals
  >(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      emptyCommunityTrafficPlatformMetricTotals(),
    ]),
  );
  const postsById = new Map(dataset.posts.map((post) => [post.id, post]));
  const repliesById = new Map(dataset.replies.map((reply) => [reply.id, reply]));
  const postSourceById = new Map<string, CommunityTrafficPlatformMetricSourceId>();
  const replySourceById = new Map<string, CommunityTrafficPlatformMetricSourceId>();
  const sourceTotals = (sourceId: CommunityTrafficPlatformMetricSourceId) =>
    totalsBySource.get(sourceId) ?? emptyCommunityTrafficPlatformMetricTotals();

  for (const post of dataset.posts) {
    const sourceId = isCommunityTrafficVideoMedia(post)
      ? "community_post_video"
      : "community_post_text";
    postSourceById.set(post.id, sourceId);
    sourceTotals(sourceId).contentCount += 1;
  }

  for (const reply of dataset.replies) {
    const sourceId = isCommunityTrafficVideoMedia(reply)
      ? "community_reply_video"
      : "community_reply_text";
    replySourceById.set(reply.id, sourceId);
    sourceTotals(sourceId).contentCount += 1;
  }

  const sourceFromTarget = (
    targetType: string | null,
    targetId: string | null,
  ): CommunityTrafficPlatformMetricSourceId | null => {
    if (!targetId) return null;
    if (isCommunityTrafficPostTargetType(targetType)) return postSourceById.get(targetId) ?? null;
    if (isCommunityTrafficReplyTargetType(targetType)) return replySourceById.get(targetId) ?? null;

    return null;
  };

  for (const pageView of dataset.pageViews) {
    const sourceId = sourceFromTarget(pageView.target_type, pageView.target_id);
    if (!sourceId) continue;

    sourceTotals(sourceId).views += 1;
  }

  for (const session of dataset.attentionSessions) {
    const sourceId = sourceFromTarget(session.target_type, session.target_id);
    if (!sourceId) continue;

    sourceTotals(sourceId).visibilitySeconds += Math.max(0, session.attention_seconds);
  }

  const pageViewsBySession = new Map<
    string,
    AdminPsychologistCommunityTrafficPlatformDataset["pageViews"]
  >();

  for (const pageView of dataset.pageViews) {
    const sessionViews = pageViewsBySession.get(pageView.session_id) ?? [];
    sessionViews.push(pageView);
    pageViewsBySession.set(pageView.session_id, sessionViews);
  }

  for (const sessionViews of pageViewsBySession.values()) {
    const orderedViews = sessionViews.toSorted(
      (left, right) => left.occurred_at.getTime() - right.occurred_at.getTime(),
    );
    let lastContentView: {
      authorId: string;
      occurredAt: Date;
      sourceId: CommunityTrafficPlatformMetricSourceId;
    } | null = null;

    for (const pageView of orderedViews) {
      const sourceId = sourceFromTarget(pageView.target_type, pageView.target_id);

      if (sourceId && pageView.target_id) {
        const authorId = isCommunityTrafficPostTargetType(pageView.target_type)
          ? postsById.get(pageView.target_id)?.author_id
          : repliesById.get(pageView.target_id)?.author_id;

        if (authorId) {
          lastContentView = {
            authorId,
            occurredAt: pageView.occurred_at,
            sourceId,
          };
        }

        continue;
      }

      if (
        pageView.target_type !== "psychologist" ||
        !pageView.target_id ||
        !lastContentView ||
        pageView.target_id !== lastContentView.authorId
      ) {
        continue;
      }

      const elapsedMs = pageView.occurred_at.getTime() - lastContentView.occurredAt.getTime();
      if (elapsedMs < 0 || elapsedMs > COMMUNITY_TRAFFIC_PROFILE_ACCESS_ATTRIBUTION_WINDOW_MS) {
        continue;
      }

      sourceTotals(lastContentView.sourceId).profileAccesses += 1;
    }
  }

  for (const session of dataset.videoWatchSessions) {
    const sourceId = sourceFromTarget(session.target_type, session.target_id);
    if (!sourceId) continue;

    const totals = sourceTotals(sourceId);
    if (session.duration_seconds <= 0) continue;

    totals.retentionSamples += 1;
    totals.retentionTotalPercent += Math.min(
      100,
      (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100,
    );
  }

  for (const vote of dataset.votes) {
    const sourceId = vote.post_id
      ? postSourceById.get(vote.post_id)
      : vote.reply_id
        ? replySourceById.get(vote.reply_id)
        : null;
    if (!sourceId) continue;

    if (vote.value === 1) sourceTotals(sourceId).upvotes += 1;
    if (vote.value === -1) sourceTotals(sourceId).downvotes += 1;
  }

  for (const comment of dataset.comments) {
    const postSourceId = postSourceById.get(comment.post_id);
    if (postSourceId) sourceTotals(postSourceId).comments += 1;

    if (!comment.parent_reply_id) continue;

    const replySourceId = replySourceById.get(comment.parent_reply_id);
    if (replySourceId) sourceTotals(replySourceId).comments += 1;
  }

  for (const save of dataset.postSaves) {
    const sourceId = postSourceById.get(save.post_id);
    if (sourceId) sourceTotals(sourceId).saves += 1;
  }

  for (const save of dataset.replySaves) {
    const sourceId = replySourceById.get(save.reply_id);
    if (sourceId) sourceTotals(sourceId).saves += 1;
  }

  for (const share of dataset.shares) {
    const sourceId = share.reply_id
      ? replySourceById.get(share.reply_id)
      : postSourceById.get(share.post_id);
    if (sourceId) sourceTotals(sourceId).shares += 1;
  }

  const averagePerContent = (total: number, contentCount: number) =>
    contentCount > 0 ? roundTrafficMetricPercent(total / contentCount) : null;
  const averageUnavailableReason = (contentCount: number) =>
    contentCount > 0
      ? null
      : "Sem conteúdo publicado nesta categoria até o fim do período selecionado.";
  const buildAverageCommunityTrafficMetric = (
    totals: CommunityTrafficPlatformMetricTotals,
    metric: {
      id: AdminPsychologistWhatsappTrafficPlatformMetric["id"];
      label: string;
      total: number;
      unit?: AdminPsychologistWhatsappTrafficPlatformMetric["unit"];
    },
  ) =>
    buildCommunityTrafficPlatformMetric({
      id: metric.id,
      label: metric.label,
      unavailable_reason: averageUnavailableReason(totals.contentCount),
      unit: metric.unit ?? "count",
      value: averagePerContent(metric.total, totals.contentCount),
    });

  const metrics = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => {
      const totals = sourceTotals(sourceId);
      const isVideoSource =
        sourceId === "community_post_video" || sourceId === "community_reply_video";
      const averageRetention =
        totals.retentionSamples > 0
          ? roundTrafficMetricPercent(totals.retentionTotalPercent / totals.retentionSamples)
          : null;
      const commonMetrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildAverageCommunityTrafficMetric(totals, {
          id: "views",
          label: "Visualizações",
          total: totals.views,
        }),
        ...(isVideoSource
          ? [
              buildCommunityTrafficPlatformMetric({
                id: "average_retention",
                label: "Retenção",
                unavailable_reason:
                  averageRetention === null
                    ? "Sem sessões reais de vídeo com duração no período."
                    : null,
                unit: "percentage",
                value: averageRetention,
              }),
              buildAverageCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]
          : [
              buildAverageCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]),
        buildAverageCommunityTrafficMetric(totals, {
          id: "profile_accesses",
          label: "Acessos ao perfil",
          total: totals.profileAccesses,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "upvotes",
          label: "Upvotes",
          total: totals.upvotes,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "downvotes",
          label: "Downvotes",
          total: totals.downvotes,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "comments",
          label: "Comentários",
          total: totals.comments,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "saves",
          label: "Salvamentos",
          total: totals.saves,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "shares",
          label: "Compartilhamentos",
          total: totals.shares,
        }),
      ];

      return [sourceId, commonMetrics];
    }),
  );

  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      sourceTotals(sourceId).contentCount,
    ]),
  );

  return { consideredCounts, metrics };
};

const filterCommunityTrafficPlatformMetricDataset = (
  dataset: AdminPsychologistCommunityTrafficPlatformDataset,
  allowedPsychologistIds: Set<string>,
): AdminPsychologistCommunityTrafficPlatformDataset => {
  const posts = dataset.posts.filter((post) => allowedPsychologistIds.has(post.author_id));
  const replies = dataset.replies.filter((reply) => allowedPsychologistIds.has(reply.author_id));
  const postIds = new Set(posts.map((post) => post.id));
  const replyIds = new Set(replies.map((reply) => reply.id));

  return {
    attentionSessions: dataset.attentionSessions.filter((session) =>
      isCommunityTrafficPostTargetType(session.target_type)
        ? postIds.has(session.target_id)
        : isCommunityTrafficReplyTargetType(session.target_type) && replyIds.has(session.target_id),
    ),
    comments: dataset.comments.filter(
      (comment) =>
        postIds.has(comment.post_id) ||
        Boolean(comment.parent_reply_id && replyIds.has(comment.parent_reply_id)),
    ),
    pageViews: dataset.pageViews.filter((pageView) => {
      if (!pageView.target_id) return false;
      if (isCommunityTrafficPostTargetType(pageView.target_type))
        return postIds.has(pageView.target_id);
      if (isCommunityTrafficReplyTargetType(pageView.target_type))
        return replyIds.has(pageView.target_id);

      return (
        pageView.target_type === "psychologist" && allowedPsychologistIds.has(pageView.target_id)
      );
    }),
    posts,
    postSaves: dataset.postSaves.filter((save) => postIds.has(save.post_id)),
    replies,
    replySaves: dataset.replySaves.filter((save) => replyIds.has(save.reply_id)),
    shares: dataset.shares.filter((share) =>
      share.reply_id ? replyIds.has(share.reply_id) : postIds.has(share.post_id),
    ),
    videoWatchSessions: dataset.videoWatchSessions.filter((session) =>
      isCommunityTrafficPostTargetType(session.target_type)
        ? postIds.has(session.target_id)
        : isCommunityTrafficReplyTargetType(session.target_type) && replyIds.has(session.target_id),
    ),
    votes: dataset.votes.filter((vote) =>
      vote.post_id
        ? postIds.has(vote.post_id)
        : Boolean(vote.reply_id && replyIds.has(vote.reply_id)),
    ),
  };
};

const PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION =
  "psychologist_profile_publications_tab_open";
const PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION = "psychologist_profile_reviews_tab_open";
const PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_view_event.source=profile_page+page_view_event.page_kind=psychologist_profile.duration_seconds+profile_video_watch_session+psychologist_favorite+important_action_event.action_type=psychologist_profile_publications_tab_open|psychologist_profile_reviews_tab_open";

const buildProfileTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

const hasProfileTrafficVideoViewSignal = (
  session: AdminPsychologistProfileTrafficPlatformDataset["videoWatchSessions"][number],
) =>
  session.watched_seconds > 0 ||
  session.max_position_seconds > 0 ||
  session.completed ||
  session.milestone_100;

const buildProfileTrafficPlatformMetrics = (
  profiles: AdminPsychologistProfileRecord[],
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
) => {
  const profileIds = new Set(profiles.map((profile) => profile.user.id));
  const profileCount = profileIds.size;
  const noProfilesReason = "Sem perfis de psicólogos no segmento até o fim do período selecionado.";
  const countUnavailableReason = profileCount > 0 ? null : noProfilesReason;
  const averagePerProfile = (total: number) =>
    profileCount > 0 ? roundTrafficMetricPercent(total / profileCount) : null;
  const profileViews = dataset.profileViews.filter((event) =>
    profileIds.has(event.psychologist_id),
  );
  const favorites = dataset.favorites.filter((event) => profileIds.has(event.psychologist_id));
  const pageViewDurations = dataset.pageViews.flatMap((view) => {
    if (!view.target_id || !profileIds.has(view.target_id)) return [];
    if (view.user_id && view.user_id === view.target_id) return [];
    if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

    return [view.duration_seconds];
  });
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      profileIds.has(session.psychologist_id) &&
      (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
      hasProfileTrafficVideoViewSignal(session),
  );
  const retentionSamples = videoWatchSessions.flatMap((session) => {
    if (session.duration_seconds <= 0) return [];

    return [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)];
  });
  const publicationTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION &&
      event.target_id &&
      profileIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  );
  const reviewsTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
      event.target_id &&
      profileIds.has(event.target_id) &&
      event.user_id !== event.target_id,
  );
  const averageDuration =
    pageViewDurations.length > 0
      ? roundTrafficMetricPercent(
          pageViewDurations.reduce((total, value) => total + value, 0) / pageViewDurations.length,
        )
      : null;
  const averageRetention =
    retentionSamples.length > 0
      ? roundTrafficMetricPercent(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;

  const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
    buildProfileTrafficPlatformMetric({
      id: "profile_openings",
      label: "Aberturas de perfil",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(profileViews.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_stay_time",
      label: "Tempo de permanência",
      unavailable_reason:
        averageDuration === null
          ? "Sem duração real registrada em pageviews de perfil no período."
          : null,
      unit: "seconds",
      value: averageDuration,
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_views",
      label: "Views do vídeo de apresentação",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(videoWatchSessions.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_retention",
      label: "Retenção",
      unavailable_reason:
        averageRetention === null
          ? "Sem sessões reais do vídeo de apresentação com duração no período."
          : null,
      unit: "percentage",
      value: averageRetention,
    }),
    buildProfileTrafficPlatformMetric({
      id: "favorites",
      label: "Favoritado",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(favorites.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_publications_tab_opens",
      label: "Abertura da aba Publicações",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(publicationTabOpens.length),
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_reviews_tab_opens",
      label: "Abertura da aba Avaliações",
      unavailable_reason: countUnavailableReason,
      unit: "count",
      value: averagePerProfile(reviewsTabOpens.length),
    }),
  ];

  return { consideredCount: profileCount, metrics };
};

const filterProfileTrafficPlatformMetricDataset = (
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
  allowedPsychologistIds: Set<string>,
): AdminPsychologistProfileTrafficPlatformDataset => ({
  favorites: dataset.favorites.filter((event) => allowedPsychologistIds.has(event.psychologist_id)),
  pageViews: dataset.pageViews.filter((view) =>
    view.target_id ? allowedPsychologistIds.has(view.target_id) : false,
  ),
  profileViews: dataset.profileViews.filter((event) =>
    allowedPsychologistIds.has(event.psychologist_id),
  ),
  tabActions: dataset.tabActions.filter((event) =>
    event.target_id ? allowedPsychologistIds.has(event.target_id) : false,
  ),
  videoActions: dataset.videoActions.filter((event) =>
    event.target_id ? allowedPsychologistIds.has(event.target_id) : false,
  ),
  videoWatchSessions: dataset.videoWatchSessions.filter((session) =>
    allowedPsychologistIds.has(session.psychologist_id),
  ),
});

type PresentationVideoTrafficPlatformMetricSourceId = Extract<
  AdminPsychologistWhatsappTrafficOriginSourceId,
  "explore" | "search_filters"
>;

const PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS: PresentationVideoTrafficPlatformMetricSourceId[] =
  ["explore", "search_filters"];
const PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION = "psychologist_video_profile_access";
const PRESENTATION_VIDEO_FAVORITE_ACTION = "psychologist_video_favorite";
const PRESENTATION_VIDEO_SHARE_ACTION = "psychologist_video_share";
const PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_video_watch_session+important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share";

const buildPresentationVideoTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

const buildPresentationVideoTrafficPlatformMetrics = (
  profiles: AdminPsychologistProfileRecord[],
  dataset: AdminPsychologistProfileTrafficPlatformDataset,
) => {
  const videoProfileIds = new Set(
    profiles
      .filter((profile) => profile.published && Boolean(profile.video_url?.trim()))
      .map((profile) => profile.user.id),
  );
  const videoCount = videoProfileIds.size;
  const noVideoReason =
    "Sem vídeos de apresentação publicados no segmento até o fim do período selecionado.";
  const countUnavailableReason = videoCount > 0 ? null : noVideoReason;
  const averagePerVideo = (total: number) =>
    videoCount > 0 ? roundTrafficMetricPercent(total / videoCount) : null;
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      videoProfileIds.has(session.psychologist_id) &&
      (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
      hasProfileTrafficVideoViewSignal(session),
  );
  const retentionSamples = videoWatchSessions.flatMap((session) => {
    if (session.duration_seconds <= 0) return [];

    return [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)];
  });
  const videoStaySeconds = videoWatchSessions.map((session) =>
    Math.max(0, session.watched_seconds),
  );
  const averageRetention =
    retentionSamples.length > 0
      ? roundTrafficMetricPercent(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;
  const averageStaySeconds =
    videoStaySeconds.length > 0
      ? roundTrafficMetricPercent(
          videoStaySeconds.reduce((total, value) => total + value, 0) / videoStaySeconds.length,
        )
      : null;
  const replayRate =
    videoWatchSessions.length > 0
      ? roundTrafficMetricPercent(
          (videoWatchSessions.filter((session) => session.replay_count > 0).length /
            videoWatchSessions.length) *
            100,
        )
      : null;
  const videoActions = dataset.videoActions.filter(
    (event) =>
      event.target_id &&
      videoProfileIds.has(event.target_id) &&
      (!event.user_id || event.user_id !== event.target_id),
  );
  const videoActionsBySource = new Map<
    PresentationVideoTrafficPlatformMetricSourceId,
    Map<string, number>
  >(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      new Map<string, number>(),
    ]),
  );
  for (const event of videoActions) {
    const sourceId: PresentationVideoTrafficPlatformMetricSourceId = hasSearchFilterTrafficParams(
      event.path,
    )
      ? "search_filters"
      : "explore";
    const sourceTotals = videoActionsBySource.get(sourceId);
    if (!sourceTotals) continue;

    sourceTotals.set(event.action_type, (sourceTotals.get(event.action_type) ?? 0) + 1);
  }
  const sourceUnavailableReason = (metricUnavailableReason: string) =>
    videoCount <= 0 ? noVideoReason : metricUnavailableReason;

  const metrics = new Map<
    PresentationVideoTrafficPlatformMetricSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => {
      const actionTotals = videoActionsBySource.get(sourceId) ?? new Map<string, number>();
      const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildPresentationVideoTrafficPlatformMetric({
          id: "views",
          label: "Visualizações",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(videoWatchSessions.length),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_retention",
          label: "Retenção",
          unavailable_reason:
            averageRetention === null
              ? sourceUnavailableReason(
                  "Sem sessões reais do vídeo de apresentação com duração no período.",
                )
              : null,
          unit: "percentage",
          value: averageRetention,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "average_visibility",
          label: "Tempo de permanência",
          unavailable_reason:
            averageStaySeconds === null
              ? sourceUnavailableReason("Sem sessões reais do vídeo de apresentação no período.")
              : null,
          unit: "seconds",
          value: averageStaySeconds,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "replay_rate",
          label: "Taxa de replay",
          unavailable_reason:
            replayRate === null
              ? sourceUnavailableReason("Sem sessões reais do vídeo de apresentação no período.")
              : null,
          unit: "percentage",
          value: replayRate,
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "profile_accesses",
          label: "Acessos ao perfil",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "favorites",
          label: "Favoritado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_FAVORITE_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "shares",
          label: "Compartilhado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: averagePerVideo(actionTotals.get(PRESENTATION_VIDEO_SHARE_ACTION) ?? 0),
        }),
      ];

      return [sourceId, metrics];
    }),
  );

  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>(
    PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [sourceId, videoCount]),
  );

  return { consideredCounts, metrics };
};

const buildTrafficPlatformMetrics = (params: {
  communityDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  profileDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profiles: AdminPsychologistProfileRecord[];
}) => {
  const community = buildCommunityTrafficPlatformMetrics(params.communityDataset);
  const profile = buildProfileTrafficPlatformMetrics(params.profiles, params.profileDataset);
  const presentationVideo = buildPresentationVideoTrafficPlatformMetrics(
    params.profiles,
    params.profileDataset,
  );
  const metrics = new Map(community.metrics);
  const consideredCounts = new Map(community.consideredCounts);

  metrics.set("profile", profile.metrics);
  consideredCounts.set("profile", profile.consideredCount);
  for (const [sourceId, sourceMetrics] of presentationVideo.metrics) {
    metrics.set(sourceId, sourceMetrics);
  }
  for (const [sourceId, consideredCount] of presentationVideo.consideredCounts) {
    consideredCounts.set(sourceId, consideredCount);
  }

  return { consideredCounts, metrics };
};

const PROFILE_CROSS_MATRIX_SOURCE = `${ADMIN_PROFILE_CONVERSION_SOURCE}+${PROFILE_ACTIVITY_SOURCE}+${PROFILE_COVERAGE_SOURCE}+${ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE}+${ADMIN_PROFILE_EXPOSURE_SOURCE}+profile_video_watch_session+community_post.media_type+post_reply.media_type+profile_view_event.source=profile_page+professional_review.status=publicada+shared_psychologist_public_ranking_helper`;
const PROFILE_CROSS_MATRIX_DEFAULT_ROW_AXIS_ID = "conversion" as const;
const PROFILE_CROSS_MATRIX_DEFAULT_COLUMN_AXIS_ID = "community_visibility" as const;

type ProfileCrossMatrixCategoryDefinition = Omit<
  AdminPsychologistsDashboardProfileCrossMatrixCategory,
  "count" | "percentage"
>;

type ProfileCrossMatrixAxisDefinition = {
  categories: ProfileCrossMatrixCategoryDefinition[];
  description: string;
  id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  label: string;
  source: string;
};

type ProfileCrossMatrixAssignments = Record<
  AdminPsychologistsDashboardProfileCrossMatrixAxisId,
  string
>;

const PROFILE_CROSS_MATRIX_COLORS = {
  danger: "#ef4444",
  high: "#13a85b",
  low: "#f59f00",
  none: "#64748b",
  standard: "#308ce8",
} as const;

const PROFILE_VIDEO_RETENTION_CATEGORY_ORDER = [
  "high_presentation_video_retention",
  "standard_presentation_video_retention",
  "low_presentation_video_retention",
  "no_presentation_video_retention",
] as const;

type ProfileVideoRetentionCategoryId = (typeof PROFILE_VIDEO_RETENTION_CATEGORY_ORDER)[number];

const PROFILE_VIDEO_RETENTION_CATEGORY_CONFIG = {
  high_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Retenção média do vídeo de apresentação acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Retenção",
  },
  low_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Retenção média do vídeo de apresentação abaixo da faixa padrão da plataforma, mas com sessão real no período.",
    label: "Baixa Retenção",
  },
  no_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Nenhuma sessão real do vídeo de apresentação com duração suficiente para calcular retenção no período.",
    label: "Sem Retenção",
  },
  standard_presentation_video_retention: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Retenção média do vídeo de apresentação dentro da faixa padrão da plataforma no período selecionado.",
    label: "Retenção Padrão",
  },
} satisfies Record<
  ProfileVideoRetentionCategoryId,
  { color: string; description: string; label: string }
>;

const COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER = [
  "community_post_video",
  "community_post_without_video",
  "community_reply_video",
  "community_reply_without_video",
  "no_community_content",
] as const;

type CommunityContentFormatCategoryId = (typeof COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER)[number];

const COMMUNITY_CONTENT_FORMAT_CATEGORY_CONFIG = {
  community_post_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Formato autoral predominante: posts em comunidades com pelo menos uma mídia de vídeo no período selecionado.",
    label: "Posts com vídeo",
  },
  community_post_without_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Formato autoral predominante: posts em comunidades sem mídia de vídeo no período selecionado.",
    label: "Posts sem vídeo",
  },
  community_reply_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Formato autoral predominante: respostas em comunidades com mídia de vídeo no período selecionado.",
    label: "Respostas com vídeo",
  },
  community_reply_without_video: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Formato autoral predominante: respostas em comunidades sem mídia de vídeo no período selecionado.",
    label: "Respostas sem vídeo",
  },
  no_community_content: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Psicólogo não publicou posts nem respostas em comunidades no período selecionado.",
    label: "Sem conteúdo",
  },
} satisfies Record<
  CommunityContentFormatCategoryId,
  { color: string; description: string; label: string }
>;

const PROFILE_OPENING_CATEGORY_ORDER = [
  "high_profile_opening",
  "standard_profile_opening",
  "low_profile_opening",
  "no_profile_opening",
] as const;

type ProfileOpeningCategoryId = (typeof PROFILE_OPENING_CATEGORY_ORDER)[number];

const PROFILE_OPENING_CATEGORY_CONFIG = {
  high_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Aberturas reais do perfil público acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta abertura",
  },
  low_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Aberturas reais do perfil público abaixo da faixa padrão da plataforma, mas com sinal no período.",
    label: "Baixa abertura",
  },
  no_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description: "Nenhuma abertura real do perfil público no período selecionado.",
    label: "Sem abertura",
  },
  standard_profile_opening: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Aberturas reais do perfil público dentro da faixa padrão da plataforma no período selecionado.",
    label: "Abertura padrão",
  },
} satisfies Record<ProfileOpeningCategoryId, { color: string; description: string; label: string }>;

const REVIEWS_CATEGORY_ORDER = [
  "high_reviews",
  "standard_reviews",
  "low_reviews",
  "no_reviews",
] as const;

type ReviewsCategoryId = (typeof REVIEWS_CATEGORY_ORDER)[number];

const REVIEWS_CATEGORY_CONFIG = {
  high_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Avaliações publicadas recebidas acima da faixa padrão da plataforma no período selecionado.",
    label: "Muitas avaliações",
  },
  low_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Avaliações publicadas recebidas abaixo da faixa padrão da plataforma, mas com sinal no período.",
    label: "Poucas avaliações",
  },
  no_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description: "Nenhuma avaliação publicada recebida no período selecionado.",
    label: "Sem avaliações",
  },
  standard_reviews: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Avaliações publicadas recebidas dentro da faixa padrão da plataforma no período selecionado.",
    label: "Avaliações padrão",
  },
} satisfies Record<ReviewsCategoryId, { color: string; description: string; label: string }>;

const PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER = [
  "presentation_video_position_top_10",
  "presentation_video_position_top_30",
  "presentation_video_position_top_50",
  "presentation_video_position_50_plus",
] as const;

type PresentationVideoPositionCategoryId =
  (typeof PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER)[number];

const PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG = {
  presentation_video_position_50_plus: {
    color: PROFILE_CROSS_MATRIX_COLORS.none,
    description:
      "Vídeo de apresentação do psicólogo aparece após a posição 50 ou fora da lista pública ranqueada.",
    label: "50+",
  },
  presentation_video_position_top_10: {
    color: PROFILE_CROSS_MATRIX_COLORS.high,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as 10 primeiras posições da página de psicólogos.",
    label: "Top 10",
  },
  presentation_video_position_top_30: {
    color: PROFILE_CROSS_MATRIX_COLORS.standard,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as posições 11 e 30 da página de psicólogos.",
    label: "Top 30",
  },
  presentation_video_position_top_50: {
    color: PROFILE_CROSS_MATRIX_COLORS.low,
    description:
      "Vídeo de apresentação do psicólogo aparece entre as posições 31 e 50 da página de psicólogos.",
    label: "Top 50",
  },
} satisfies Record<
  PresentationVideoPositionCategoryId,
  { color: string; description: string; label: string }
>;

const profileCrossMatrixCategory = (
  id: string,
  config: { description: string; label: string },
  color: string,
): ProfileCrossMatrixCategoryDefinition => ({
  color,
  description: config.description,
  id,
  label: config.label,
});

const PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS: ProfileCrossMatrixAxisDefinition[] = [
  {
    categories: PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_CONVERSION_CATEGORY_CONFIG[id],
        id === "strong_conversion"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_conversion"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_conversion"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.danger,
      ),
    ),
    description: "Faixas de cliques reais no WhatsApp recebidos por psicólogo.",
    id: "conversion",
    label: "Conversão",
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
  },
  {
    categories: PROFILE_ACTIVITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_ACTIVITY_CATEGORY_CONFIG[id],
        id === "muito_ativo"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "ativo"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "pouco_ativo"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Volume de posts e respostas autorais criados nas comunidades.",
    id: "activity",
    label: "Atividade comunidade",
    source: PROFILE_ACTIVITY_SOURCE,
  },
  {
    categories: PROFILE_COVERAGE_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        PROFILE_COVERAGE_CATEGORY_CONFIG[id],
        id === "above_average_coverage"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "average_coverage"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "below_average_coverage"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description:
      "Posts únicos de pacientes que receberam ao menos uma resposta do psicólogo no período, comparados à média por psicólogo.",
    id: "coverage",
    label: "Cobertura",
    source: PROFILE_COVERAGE_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_ENGAGEMENT_FAVORITES_COMMUNITY_CATEGORY_CONFIG[id],
        id === "high_engagement"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_engagement"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_engagement"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Score de engajamento recebido em comunidades por comentários e interações reais.",
    id: "engagement",
    label: "Engajamento comunidade",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_ENGAGEMENT_FAVORITES_FAVORITE_CATEGORY_CONFIG[id],
        id === "high_favorites"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_favorites"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_favorites"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Favoritos reais recebidos pelos psicólogos no período selecionado.",
    id: "favorites",
    label: "Favoritados",
    source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
  },
  {
    categories: PROFILE_OPENING_CATEGORY_ORDER.map((id) => ({
      id,
      ...PROFILE_OPENING_CATEGORY_CONFIG[id],
    })),
    description: "Aberturas reais do perfil público do psicólogo no período selecionado.",
    id: "profile_opening",
    label: "Abertura de perfil",
    source: "profile_view_event.source=profile_page",
  },
  {
    categories: REVIEWS_CATEGORY_ORDER.map((id) => ({
      id,
      ...REVIEWS_CATEGORY_CONFIG[id],
    })),
    description: "Avaliações publicadas recebidas pelo psicólogo no período selecionado.",
    id: "reviews",
    label: "Avaliações",
    source: "professional_review.status=publicada",
  },
  {
    categories: ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_EXPOSURE_COMMUNITY_CATEGORY_CONFIG[id],
        id === "high_community"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_community"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_community"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Atenção real recebida em conteúdo autoral nas comunidades.",
    id: "community_visibility",
    label: "Visibilidade comunidade",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
  },
  {
    categories: ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_ORDER.map((id) =>
      profileCrossMatrixCategory(
        id,
        ADMIN_PROFILE_EXPOSURE_VIDEO_CATEGORY_CONFIG[id],
        id === "high_video"
          ? PROFILE_CROSS_MATRIX_COLORS.high
          : id === "standard_video"
            ? PROFILE_CROSS_MATRIX_COLORS.standard
            : id === "low_video"
              ? PROFILE_CROSS_MATRIX_COLORS.low
              : PROFILE_CROSS_MATRIX_COLORS.none,
      ),
    ),
    description: "Tempo real assistido no vídeo de apresentação do perfil.",
    id: "presentation_video_visibility",
    label: "Visibilidade vídeo de apresentação",
    source: ADMIN_PROFILE_EXPOSURE_SOURCE,
  },
  {
    categories: PROFILE_VIDEO_RETENTION_CATEGORY_ORDER.map((id) => ({
      id,
      ...PROFILE_VIDEO_RETENTION_CATEGORY_CONFIG[id],
    })),
    description: "Retenção média real do vídeo de apresentação, por sessões com duração.",
    id: "presentation_video_retention",
    label: "Retenção vídeo de apresentação",
    source: "profile_video_watch_session.watched_seconds/duration_seconds",
  },
  {
    categories: PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER.map((id) => ({
      id,
      ...PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG[id],
    })),
    description: "Posição do vídeo de apresentação na página pública de psicólogos.",
    id: "presentation_video_position",
    label: "Posição vídeo de apresentação",
    source: "shared_psychologist_public_ranking_helper",
  },
  {
    categories: COMMUNITY_CONTENT_FORMAT_CATEGORY_ORDER.map((id) => ({
      id,
      ...COMMUNITY_CONTENT_FORMAT_CATEGORY_CONFIG[id],
    })),
    description:
      "Formato predominante do conteúdo autoral publicado pelo psicólogo nas comunidades.",
    id: "community_content_format",
    label: "Formato de conteúdo",
    source: "community_post.author_id+post_reply.author_id+media_type",
  },
];

const classifyProfileVideoRetentionCategory = (input: {
  averageRetention: number | null;
  standardMaxRetention: number | null;
  standardMinRetention: number | null;
}): ProfileVideoRetentionCategoryId => {
  if (input.averageRetention === null || input.averageRetention <= 0) {
    return "no_presentation_video_retention";
  }

  if (input.standardMinRetention === null || input.standardMaxRetention === null) {
    return "standard_presentation_video_retention";
  }
  if (input.averageRetention > input.standardMaxRetention) {
    return "high_presentation_video_retention";
  }
  if (input.averageRetention < input.standardMinRetention) {
    return "low_presentation_video_retention";
  }

  return "standard_presentation_video_retention";
};

const classifyProfileCrossMatrixCountCategory = <TCategoryId extends string>(input: {
  count: number;
  highCategoryId: TCategoryId;
  lowCategoryId: TCategoryId;
  noCategoryId: TCategoryId;
  standardCategoryId: TCategoryId;
  standardMax: number | null;
  standardMin: number | null;
}): TCategoryId => {
  if (input.count <= 0) return input.noCategoryId;
  if (input.standardMin === null || input.standardMax === null) return input.standardCategoryId;
  if (input.count > input.standardMax) return input.highCategoryId;
  if (input.count < input.standardMin) return input.lowCategoryId;

  return input.standardCategoryId;
};

type CommunityContentFormatSignals = Record<
  "postText" | "postVideo" | "replyText" | "replyVideo",
  number
>;

const emptyCommunityContentFormatSignals = (): CommunityContentFormatSignals => ({
  postText: 0,
  postVideo: 0,
  replyText: 0,
  replyVideo: 0,
});

const classifyCommunityContentFormatCategory = (
  signals: CommunityContentFormatSignals,
): CommunityContentFormatCategoryId => {
  const rankedFormats: Array<{
    count: number;
    id: CommunityContentFormatCategoryId;
    priority: number;
  }> = [
    { count: signals.postVideo, id: "community_post_video", priority: 4 },
    { count: signals.replyVideo, id: "community_reply_video", priority: 3 },
    { count: signals.postText, id: "community_post_without_video", priority: 2 },
    { count: signals.replyText, id: "community_reply_without_video", priority: 1 },
  ];
  const selected = rankedFormats
    .filter((format) => format.count > 0)
    .sort((left, right) => right.count - left.count || right.priority - left.priority)[0];

  return selected?.id ?? "no_community_content";
};

const classifyPresentationVideoPositionCategory = (
  position: number | null,
): PresentationVideoPositionCategoryId => {
  if (typeof position !== "number" || position > 50) return "presentation_video_position_50_plus";
  if (position <= 10) return "presentation_video_position_top_10";
  if (position <= 30) return "presentation_video_position_top_30";

  return "presentation_video_position_top_50";
};

const addProfileCrossMatrixCount = <TKey extends string>(counts: Map<TKey, number>, key: TKey) => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

const buildProfileCrossMatrixResults = (params: {
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  communityTrafficPlatformMetricDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileTrafficPlatformMetricDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  publishedReviews: AdminPsychologistEventRecord[];
  rankingPositionsByPsychologistId: Map<string, number>;
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  whatsappClicks: AdminPsychologistEventRecord[];
}): AdminPsychologistsDashboardProfileCrossMatrixResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const totalPsychologists = params.profiles.length;
  const whatsappClickEvents = params.whatsappClicks.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
  const activitySignalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileActivityTotals
  >();
  const ensureActivitySignals = (psychologistId: string) => {
    const current =
      activitySignalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    activitySignalsByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityTrafficPlatformMetricDataset.posts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureActivitySignals(post.author_id);
    signals.actions += 1;
    signals.posts += 1;
  }

  for (const reply of params.communityTrafficPlatformMetricDataset.replies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureActivitySignals(reply.author_id);
    signals.actions += 1;
    signals.replies += 1;
  }

  const receivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const receivedEngagementCounts =
    countReceivedEngagementEventsByPsychologist(receivedEngagementEvents);
  const engagementSignalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileEngagementFavoritesTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const counts =
      receivedEngagementCounts.get(psychologistId) ?? emptyReceivedEngagementSignalCounts();

    engagementSignalsByPsychologistId.set(
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
  const exposureSignalsByPsychologistId = new Map<
    string,
    AdminPsychologistsDashboardProfileExposureTotals
  >();

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    exposureSignalsByPsychologistId.set(
      psychologistId,
      buildProfileExposureSignalTotals({
        communityPostAttentionSeconds: communityPostAttentionCounts.get(psychologistId) ?? 0,
        communityReplyAttentionSeconds: communityReplyAttentionCounts.get(psychologistId) ?? 0,
        profileAttentionSeconds: profileAttentionCounts.get(psychologistId) ?? 0,
        profileVideoAttentionSeconds: profileVideoAttentionCounts.get(psychologistId) ?? 0,
      }),
    );
  }

  const videoRetentionTotalsByPsychologistId = new Map<
    string,
    {
      samples: number;
      totalPercent: number;
    }
  >();

  for (const session of params.profileTrafficPlatformMetricDataset.videoWatchSessions) {
    if (
      !analyzedPsychologistIds.has(session.psychologist_id) ||
      session.duration_seconds <= 0 ||
      (session.viewer_id && session.viewer_id === session.psychologist_id) ||
      !hasProfileTrafficVideoViewSignal(session)
    ) {
      continue;
    }

    const current = videoRetentionTotalsByPsychologistId.get(session.psychologist_id) ?? {
      samples: 0,
      totalPercent: 0,
    };
    current.samples += 1;
    current.totalPercent += Math.min(
      100,
      (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100,
    );
    videoRetentionTotalsByPsychologistId.set(session.psychologist_id, current);
  }

  const averageVideoRetentionByPsychologistId = new Map(
    [...videoRetentionTotalsByPsychologistId.entries()].map(([psychologistId, totals]) => [
      psychologistId,
      totals.samples > 0 ? roundTrafficMetricPercent(totals.totalPercent / totals.samples) : null,
    ]),
  );
  const countProfileTrafficRecordsByPsychologist = (
    records: Array<{ psychologist_id: string }>,
  ) => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!analyzedPsychologistIds.has(record.psychologist_id)) continue;
      counts.set(record.psychologist_id, (counts.get(record.psychologist_id) ?? 0) + 1);
    }

    return counts;
  };
  const profileOpeningCountsByPsychologistId = countProfileTrafficRecordsByPsychologist(
    params.profileTrafficPlatformMetricDataset.profileViews,
  );
  const reviewCountsByPsychologistId = countEventsByPsychologist(
    params.publishedReviews.filter((event) => analyzedPsychologistIds.has(event.psychologist_id)),
  );
  const communityContentFormatByPsychologistId = new Map<string, CommunityContentFormatSignals>();
  const ensureCommunityContentFormatSignals = (psychologistId: string) => {
    const current =
      communityContentFormatByPsychologistId.get(psychologistId) ??
      emptyCommunityContentFormatSignals();
    communityContentFormatByPsychologistId.set(psychologistId, current);

    return current;
  };

  for (const post of params.communityTrafficPlatformMetricDataset.posts) {
    if (
      !analyzedPsychologistIds.has(post.author_id) ||
      !dateInRange(post.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureCommunityContentFormatSignals(post.author_id);
    if (isCommunityTrafficVideoMedia(post)) {
      signals.postVideo += 1;
    } else {
      signals.postText += 1;
    }
  }

  for (const reply of params.communityTrafficPlatformMetricDataset.replies) {
    if (
      !analyzedPsychologistIds.has(reply.author_id) ||
      !dateInRange(reply.createdAt, params.range)
    ) {
      continue;
    }

    const signals = ensureCommunityContentFormatSignals(reply.author_id);
    if (isCommunityTrafficVideoMedia(reply)) {
      signals.replyVideo += 1;
    } else {
      signals.replyText += 1;
    }
  }

  const coverageCountsByPsychologistId = buildProfileCoverageCountsByPsychologistId({
    communityReplies: params.communityTrafficPlatformMetricDataset.replies,
    profiles: params.profiles,
    range: params.range,
  });
  const totalPatientPostsAnswered = [...coverageCountsByPsychologistId.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const averagePatientPostsAnswered =
    totalPsychologists > 0 ? totalPatientPostsAnswered / totalPsychologists : 0;
  const eligibleConversionProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const conversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleConversionProfiles.length,
    whatsappClicks: eligibleConversionProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user.id) ?? 0,
    ),
  });
  const eligibleEngagementProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
  );
  const engagementBenchmark = buildAdminProfileEngagementFavoritesBenchmark({
    communityEngagementScores: eligibleEngagementProfiles.map(
      (profile) =>
        engagementSignalsByPsychologistId.get(profile.user.id)?.community_engagement_score ?? 0,
    ),
    eligiblePsychologists: eligibleEngagementProfiles.length,
    favoriteCounts: eligibleEngagementProfiles.map(
      (profile) => engagementSignalsByPsychologistId.get(profile.user.id)?.favorites ?? 0,
    ),
  });
  const eligibleExposureProfiles = params.profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, params.range.end) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const exposureBenchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleExposureProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologistId.get(profile.user.id);

      return signals ? getProfileExposureCommunityVisibilitySeconds(signals) : 0;
    }),
    eligiblePsychologists: eligibleExposureProfiles.length,
    exposureScores: eligibleExposureProfiles.map(
      (profile) => exposureSignalsByPsychologistId.get(profile.user.id)?.exposure_score ?? 0,
    ),
    presentationVideoSeconds: eligibleExposureProfiles.map((profile) => {
      const signals = exposureSignalsByPsychologistId.get(profile.user.id);

      return signals ? getProfileExposureVideoVisibilitySeconds(signals) : 0;
    }),
  });
  const retentionValues = eligibleExposureProfiles.flatMap((profile) => {
    const averageRetention = averageVideoRetentionByPsychologistId.get(profile.user.id);

    return typeof averageRetention === "number" && averageRetention > 0 ? [averageRetention] : [];
  });
  const standardMinRetention = percentileValue(retentionValues, 25);
  const standardMaxRetention = percentileValue(retentionValues, 75);
  const profileOpeningValues = params.profiles.flatMap((profile) => {
    const count = profileOpeningCountsByPsychologistId.get(profile.user.id) ?? 0;

    return count > 0 ? [count] : [];
  });
  const profileOpeningStandardMin = percentileValue(profileOpeningValues, 25);
  const profileOpeningStandardMax = percentileValue(profileOpeningValues, 75);
  const reviewValues = params.profiles.flatMap((profile) => {
    const count = reviewCountsByPsychologistId.get(profile.user.id) ?? 0;

    return count > 0 ? [count] : [];
  });
  const reviewsStandardMin = percentileValue(reviewValues, 25);
  const reviewsStandardMax = percentileValue(reviewValues, 75);
  const assignments = params.profiles.map((profile): ProfileCrossMatrixAssignments => {
    const psychologistId = profile.user.id;
    const activeDays = getProfileActiveDaysInRange(profile, params.range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, params.range.end);
    const forcedConversionAgeDays = Math.max(
      profileAgeDays,
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
    );
    const forcedEngagementAgeDays = Math.max(
      profileAgeDays,
      ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS.adaptation_period_days,
    );
    const forcedExposureAgeDays = Math.max(
      profileAgeDays,
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
    );
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;
    const activitySignals =
      activitySignalsByPsychologistId.get(psychologistId) ?? emptyProfileActivityTotals();
    const engagementSignals =
      engagementSignalsByPsychologistId.get(psychologistId) ??
      emptyProfileEngagementFavoritesTotals();
    const exposureSignals =
      exposureSignalsByPsychologistId.get(psychologistId) ?? emptyProfileExposureTotals();
    const conversionCategory = classifyProfileConversionMatrixCategory({
      activeDays,
      benchmark: conversionBenchmark,
      profileAgeDays: forcedConversionAgeDays,
      whatsappClicks,
    });
    const engagementCategory =
      classifyAdminProfileEngagementFavoritesCommunityCategory({
        benchmark: engagementBenchmark,
        engagementScore: engagementSignals.community_engagement_score,
        profileAgeDays: forcedEngagementAgeDays,
      }) === "insufficient_data"
        ? "no_engagement"
        : classifyAdminProfileEngagementFavoritesCommunityCategory({
            benchmark: engagementBenchmark,
            engagementScore: engagementSignals.community_engagement_score,
            profileAgeDays: forcedEngagementAgeDays,
          });
    const favoritesCategory =
      classifyAdminProfileEngagementFavoritesFavoriteCategory({
        benchmark: engagementBenchmark,
        favorites: engagementSignals.favorites,
        profileAgeDays: forcedEngagementAgeDays,
      }) === "insufficient_data"
        ? "no_favorites"
        : classifyAdminProfileEngagementFavoritesFavoriteCategory({
            benchmark: engagementBenchmark,
            favorites: engagementSignals.favorites,
            profileAgeDays: forcedEngagementAgeDays,
          });
    const communityVisibilityCategory =
      classifyAdminProfileExposureCommunityCategory({
        benchmark: exposureBenchmark,
        profileAgeDays: forcedExposureAgeDays,
        visibilitySeconds: getProfileExposureCommunityVisibilitySeconds(exposureSignals),
      }) === "insufficient_data"
        ? "no_community"
        : classifyAdminProfileExposureCommunityCategory({
            benchmark: exposureBenchmark,
            profileAgeDays: forcedExposureAgeDays,
            visibilitySeconds: getProfileExposureCommunityVisibilitySeconds(exposureSignals),
          });
    const videoVisibilityCategory =
      classifyAdminProfileExposureVideoCategory({
        benchmark: exposureBenchmark,
        profileAgeDays: forcedExposureAgeDays,
        visibilitySeconds: getProfileExposureVideoVisibilitySeconds(exposureSignals),
      }) === "insufficient_data"
        ? "no_video"
        : classifyAdminProfileExposureVideoCategory({
            benchmark: exposureBenchmark,
            profileAgeDays: forcedExposureAgeDays,
            visibilitySeconds: getProfileExposureVideoVisibilitySeconds(exposureSignals),
          });
    const retentionCategory = classifyProfileVideoRetentionCategory({
      averageRetention: averageVideoRetentionByPsychologistId.get(psychologistId) ?? null,
      standardMaxRetention,
      standardMinRetention,
    });
    const profileOpeningCategory =
      classifyProfileCrossMatrixCountCategory<ProfileOpeningCategoryId>({
        count: profileOpeningCountsByPsychologistId.get(psychologistId) ?? 0,
        highCategoryId: "high_profile_opening",
        lowCategoryId: "low_profile_opening",
        noCategoryId: "no_profile_opening",
        standardCategoryId: "standard_profile_opening",
        standardMax: profileOpeningStandardMax,
        standardMin: profileOpeningStandardMin,
      });
    const reviewsCategory = classifyProfileCrossMatrixCountCategory<ReviewsCategoryId>({
      count: reviewCountsByPsychologistId.get(psychologistId) ?? 0,
      highCategoryId: "high_reviews",
      lowCategoryId: "low_reviews",
      noCategoryId: "no_reviews",
      standardCategoryId: "standard_reviews",
      standardMax: reviewsStandardMax,
      standardMin: reviewsStandardMin,
    });
    const communityContentFormatCategory = classifyCommunityContentFormatCategory(
      communityContentFormatByPsychologistId.get(psychologistId) ??
        emptyCommunityContentFormatSignals(),
    );
    const presentationVideoPositionCategory = classifyPresentationVideoPositionCategory(
      params.rankingPositionsByPsychologistId.get(psychologistId) ?? null,
    );

    return {
      activity: classifyProfileActivityCategory(activitySignals.actions),
      community_content_format: communityContentFormatCategory,
      community_visibility: communityVisibilityCategory,
      coverage: classifyProfileCoverageCategory(
        coverageCountsByPsychologistId.get(psychologistId) ?? 0,
        averagePatientPostsAnswered,
      ),
      conversion: conversionCategory,
      engagement: engagementCategory,
      favorites: favoritesCategory,
      presentation_video_position: presentationVideoPositionCategory,
      presentation_video_retention: retentionCategory,
      presentation_video_visibility: videoVisibilityCategory,
      profile_opening: profileOpeningCategory,
      reviews: reviewsCategory,
    };
  });

  const axisCategoriesById = new Map(
    PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS.map((axis) => {
      const counts = new Map(axis.categories.map((category) => [category.id, 0]));
      for (const assignment of assignments) {
        addProfileCrossMatrixCount(counts, assignment[axis.id]);
      }

      return [
        axis.id,
        axis.categories.map((category) => {
          const count = counts.get(category.id) ?? 0;

          return {
            ...category,
            count,
            percentage: safePercentage(count, totalPsychologists),
          };
        }),
      ] as const;
    }),
  );
  const unavailableReason =
    totalPsychologists === 0
      ? "Sem psicólogos ativos no fim do período selecionado para cruzar dados."
      : null;
  const axes = PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS.map((axis) => ({
    categories: axisCategoriesById.get(axis.id) ?? [],
    description: axis.description,
    id: axis.id,
    label: axis.label,
    source: axis.source,
    unavailable_reason: unavailableReason,
  }));
  const matrices = PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS.flatMap((rowAxis) =>
    PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS.flatMap((columnAxis) => {
      if (rowAxis.id === columnAxis.id) return [];

      const rows = axisCategoriesById.get(rowAxis.id) ?? [];
      const columns = axisCategoriesById.get(columnAxis.id) ?? [];
      const quadrantCounts = new Map<string, number>(
        rows.flatMap((row) =>
          columns.map((column) => [`${row.id}:${column.id}`, 0] as [string, number]),
        ),
      );

      for (const assignment of assignments) {
        const rowId = assignment[rowAxis.id];
        const columnId = assignment[columnAxis.id];
        const quadrantId = `${rowId}:${columnId}`;
        quadrantCounts.set(quadrantId, (quadrantCounts.get(quadrantId) ?? 0) + 1);
      }

      return [
        {
          column_axis_id: columnAxis.id,
          columns,
          description: `Matriz observacional entre ${rowAxis.label} e ${columnAxis.label}, calculada por psicólogo a partir de eventos reais do período selecionado.`,
          id: `${rowAxis.id}_x_${columnAxis.id}`,
          quadrants: rows.flatMap((row) =>
            columns.map((column) => {
              const count = quadrantCounts.get(`${row.id}:${column.id}`) ?? 0;

              return {
                column_id: column.id,
                column_label: column.label,
                count,
                description: `Psicólogos em ${row.label} com ${column.label}.`,
                id: `${row.id}_${column.id}`,
                label: `${row.label} + ${column.label}`,
                percentage: safePercentage(count, totalPsychologists),
                row_id: row.id,
                row_label: row.label,
              };
            }),
          ),
          row_axis_id: rowAxis.id,
          rows,
          source: `${rowAxis.source}+${columnAxis.source}`,
          title: `${rowAxis.label} x ${columnAxis.label}`,
          totals: {
            psychologists: totalPsychologists,
          },
          unavailable_reason: unavailableReason,
        },
      ];
    }),
  );

  return {
    axes,
    default_column_axis_id: PROFILE_CROSS_MATRIX_DEFAULT_COLUMN_AXIS_ID,
    default_row_axis_id: PROFILE_CROSS_MATRIX_DEFAULT_ROW_AXIS_ID,
    description:
      "Matriz de cruzamento de dados com eixos selecionáveis para auditar relações observacionais entre sinais agregados dos psicólogos.",
    matrices,
    source: PROFILE_CROSS_MATRIX_SOURCE,
    totals: {
      psychologists: totalPsychologists,
    },
    unavailable_reason: unavailableReason,
  };
};

const PROFILE_CONVERSION_BEHAVIOR_SOURCE = `${ADMIN_PROFILE_CONVERSION_SOURCE}+profile_view_event+page_view_event+profile_video_watch_session+important_action_event+content_attention_session+content_video_watch_session+community_post.media_type+post_reply.media_type+post_vote+post_save+post_reply_save+post_share+shared_psychologist_public_ranking_helper`;

const PROFILE_CONVERSION_BEHAVIOR_COLUMNS: Array<{
  description: string;
  id: AdminPsychologistsDashboardProfileConversionBehaviorElementId;
  label: string;
}> = [
  {
    description:
      "Retenção, consumo, engajamento no vídeo, cliques de WhatsApp originados por vídeo e posição média na lista pública.",
    id: "presentation_video",
    label: "Vídeo de apresentação",
  },
  {
    description:
      "Aberturas do perfil público, permanência, navegação por abas internas, favoritos e cliques de WhatsApp feitos dentro do perfil.",
    id: "profile",
    label: "Perfil",
  },
  {
    description:
      "Conteúdos, atividade autoral, permanência, retenção em vídeos, interações recebidas, score de engajamento e WhatsApp vindo da comunidade.",
    id: "communities",
    label: "Comunidade",
  },
  {
    description: "Média de cliques de WhatsApp originados em favoritos por profissional da faixa.",
    id: "favorite",
    label: "Favoritos",
  },
];

const PROFILE_CONVERSION_BEHAVIOR_VIDEO_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["explore", "search_filters"];
const PROFILE_CONVERSION_BEHAVIOR_PROFILE_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["profile"];
const PROFILE_CONVERSION_BEHAVIOR_FAVORITES_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  ["favorites"];
const PROFILE_CONVERSION_BEHAVIOR_COMMUNITY_SOURCE_IDS: AdminPsychologistWhatsappTrafficOriginSourceId[] =
  [
    "community_post_video",
    "community_post_text",
    "community_reply_video",
    "community_reply_text",
    "community_top_mentors",
  ];

const buildProfileConversionBehaviorCellId = (
  rowId: AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  elementId: AdminPsychologistsDashboardProfileConversionBehaviorElementId,
) => `${rowId}_${elementId}` as const;

const buildProfileConversionBehaviorMetric = (metric: {
  description: string;
  display_value?: string | null;
  id: string;
  label: string;
  source: string;
  tone?: AdminPsychologistsDashboardProfileConversionBehaviorMetric["tone"];
  unit?: AdminPsychologistsDashboardProfileConversionBehaviorMetric["unit"];
  unavailable_reason?: string | null;
  value: number | null;
}): AdminPsychologistsDashboardProfileConversionBehaviorMetric => ({
  description: metric.description,
  display_value: metric.display_value ?? null,
  id: metric.id,
  label: metric.label,
  source: metric.source,
  tone:
    metric.tone ?? (typeof metric.value !== "number" || metric.value <= 0 ? "zero" : "standard"),
  unit: metric.unit ?? "count",
  unavailable_reason: metric.unavailable_reason ?? null,
  value: typeof metric.value === "number" ? roundOneDecimal(metric.value) : null,
});

const averageProfileConversionBehaviorValue = (values: number[]) =>
  values.length > 0
    ? roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

const PROFILE_CONVERSION_BEHAVIOR_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const formatProfileConversionBehaviorNumber = (value: number) =>
  PROFILE_CONVERSION_BEHAVIOR_NUMBER_FORMATTER.format(roundOneDecimal(value));

const formatProfileConversionBehaviorMetricNumber = (value: number | null, fallback: string) =>
  typeof value === "number" ? formatProfileConversionBehaviorNumber(value) : fallback;

const formatProfileConversionBehaviorPercentage = (value: number | null, fallback: string) =>
  typeof value === "number" ? `${formatProfileConversionBehaviorNumber(value)}%` : fallback;

const formatProfileConversionBehaviorSeconds = (value: number | null, fallback: string) => {
  if (typeof value !== "number") return fallback;

  const roundedSeconds = Math.max(0, Math.round(value));
  if (roundedSeconds < 60) return `${roundedSeconds}s`;

  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
};

const formatProfileConversionBehaviorCount = (value: number, singular: string, plural: string) =>
  `${formatProfileConversionBehaviorNumber(value)} ${value === 1 ? singular : plural}`;

const describeProfileConversionBehaviorOrdinal = (position: number | null) =>
  typeof position === "number" ? `${formatProfileConversionBehaviorNumber(position)}ª` : null;

type ProfileConversionBehaviorMetricTone =
  AdminPsychologistsDashboardProfileConversionBehaviorMetric["tone"];

type ProfileConversionBehaviorPositionRangeSignal = {
  count: number;
  description: string;
  label: string;
  percentage: number;
  tone: ProfileConversionBehaviorMetricTone;
  total: number;
};

const PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TONE = {
  presentation_video_position_50_plus: "zero",
  presentation_video_position_top_10: "above",
  presentation_video_position_top_30: "standard",
  presentation_video_position_top_50: "below",
} satisfies Record<PresentationVideoPositionCategoryId, ProfileConversionBehaviorMetricTone>;

const PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY = {
  presentation_video_position_50_plus: 4,
  presentation_video_position_top_50: 3,
  presentation_video_position_top_30: 2,
  presentation_video_position_top_10: 1,
} satisfies Record<PresentationVideoPositionCategoryId, number>;

const describeProfileConversionBehaviorPositionRange = (
  positions: Array<number | null>,
): ProfileConversionBehaviorPositionRangeSignal | null => {
  if (positions.length <= 0) return null;

  const counts = new Map<PresentationVideoPositionCategoryId, number>();
  for (const position of positions) {
    const categoryId = classifyPresentationVideoPositionCategory(position);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  const selected = PRESENTATION_VIDEO_POSITION_CATEGORY_ORDER.map((id) => ({
    count: counts.get(id) ?? 0,
    id,
  })).toSorted((left, right) => {
    if (right.count !== left.count) return right.count - left.count;

    return (
      PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY[right.id] -
      PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TIE_PRIORITY[left.id]
    );
  })[0];

  if (!selected || selected.count <= 0) return null;

  const config = PRESENTATION_VIDEO_POSITION_CATEGORY_CONFIG[selected.id];
  const percentage = roundOneDecimal((selected.count / positions.length) * 100);

  return {
    count: selected.count,
    description: `Faixa predominante de posição entre os profissionais com vídeo publicado: ${config.label} (${formatProfileConversionBehaviorCount(selected.count, "profissional", "profissionais")} de ${formatProfileConversionBehaviorCount(positions.length, "profissional com vídeo", "profissionais com vídeo")}, ${formatProfileConversionBehaviorPercentage(percentage, "0%")}). Profissionais com vídeo sem posição confiável entram em 50+.`,
    label: config.label,
    percentage,
    tone: PROFILE_CONVERSION_BEHAVIOR_POSITION_RANGE_TONE[selected.id],
    total: positions.length,
  };
};

const describeProfileConversionBehaviorRankingRange = (
  rangeSignal: ProfileConversionBehaviorPositionRangeSignal | null,
  averagePosition: number | null,
) => {
  if (!rangeSignal) return "posição ainda sem base na listagem";

  const ordinal = describeProfileConversionBehaviorOrdinal(averagePosition);
  const rangeDescription = `posição predominante em ${rangeSignal.label} (${formatProfileConversionBehaviorCount(rangeSignal.count, "profissional", "profissionais")} de ${formatProfileConversionBehaviorCount(rangeSignal.total, "profissional com vídeo", "profissionais com vídeo")})`;

  if (!ordinal) return rangeDescription;

  return `${rangeDescription}, com média ${ordinal}`;
};

const describeProfileConversionBehaviorVolume = (value: number, thresholds: [number, number]) => {
  if (value <= 0) return "sem sinal registrado";
  if (value >= thresholds[1]) return "alto";
  if (value >= thresholds[0]) return "padrão";

  return "baixo";
};

type ProfileConversionBehaviorSemanticSignal = {
  label: string;
  tone: ProfileConversionBehaviorMetricTone;
};

const classifyProfileConversionBehaviorHigherIsBetterTone = (
  value: number | null,
  thresholds: [number, number],
): ProfileConversionBehaviorMetricTone => {
  if (typeof value !== "number" || value <= 0) return "zero";
  if (value >= thresholds[1]) return "above";
  if (value >= thresholds[0]) return "standard";

  return "below";
};

const classifyProfileConversionBehaviorPositionTone = (
  position: number | null,
): ProfileConversionBehaviorMetricTone => {
  if (typeof position !== "number" || position <= 0) return "zero";
  if (position <= 10) return "above";
  if (position <= 30) return "standard";

  return "below";
};

const describeProfileConversionBehaviorActivitySignal = (
  actionsPerPsychologist: number | null,
): ProfileConversionBehaviorSemanticSignal => {
  if (typeof actionsPerPsychologist !== "number" || actionsPerPsychologist <= 0) {
    return { label: "Sem atividade", tone: "zero" };
  }
  if (actionsPerPsychologist >= 10) return { label: "Muito ativo", tone: "above" };
  if (actionsPerPsychologist >= 3) return { label: "Atividade padr\u00e3o", tone: "standard" };

  return { label: "Baixa atividade", tone: "below" };
};

const describeProfileConversionBehaviorEngagementSignal = (
  engagementPerPsychologist: number | null,
): ProfileConversionBehaviorSemanticSignal => {
  if (typeof engagementPerPsychologist !== "number" || engagementPerPsychologist <= 0) {
    return { label: "Sem engajamento", tone: "zero" };
  }
  if (engagementPerPsychologist >= 10) return { label: "Alto engajamento", tone: "above" };
  if (engagementPerPsychologist >= 3) return { label: "Engajamento padr\u00e3o", tone: "standard" };

  return { label: "Baixo engajamento", tone: "below" };
};

const describeProfileConversionBehaviorDominantContentFormat = (params: {
  text: number;
  textLabel: string;
  video: number;
  videoLabel: string;
  zeroLabel: string;
}): ProfileConversionBehaviorSemanticSignal => {
  const total = params.text + params.video;
  if (total <= 0) return { label: params.zeroLabel, tone: "zero" };

  if (params.video > params.text) {
    return {
      label: `${formatProfileConversionBehaviorPercentage((params.video / total) * 100, "0%")} ${params.videoLabel}`,
      tone: "above",
    };
  }

  if (params.text > params.video) {
    return {
      label: `${formatProfileConversionBehaviorPercentage((params.text / total) * 100, "0%")} ${params.textLabel}`,
      tone: "standard",
    };
  }

  return {
    label: `${formatProfileConversionBehaviorPercentage(50, "50%")} ${params.textLabel} e ${params.videoLabel}`,
    tone: "standard",
  };
};

const describeProfileConversionBehaviorDominantTabSignal = (params: {
  publicationsTabOpens: number;
  reviewsTabOpens: number;
}): ProfileConversionBehaviorSemanticSignal => {
  const total = params.publicationsTabOpens + params.reviewsTabOpens;
  if (total <= 0) return { label: "Sem aba predominante", tone: "zero" };
  if (params.publicationsTabOpens === params.reviewsTabOpens) {
    return { label: "Publica\u00e7\u00f5es e avalia\u00e7\u00f5es", tone: "standard" };
  }

  return params.publicationsTabOpens > params.reviewsTabOpens
    ? { label: "Aba Publica\u00e7\u00f5es", tone: "standard" }
    : { label: "Aba Avalia\u00e7\u00f5es", tone: "standard" };
};

const formatProfileConversionBehaviorPerPsychologistValue = (value: number | null) =>
  formatProfileConversionBehaviorMetricNumber(value, "0");

const formatProfileConversionBehaviorOpeningsValue = (value: number | null) =>
  typeof value === "number"
    ? formatProfileConversionBehaviorCount(value, "abertura", "aberturas")
    : "0 aberturas";

const describeProfileConversionBehaviorDominantPlan = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): ProfileConversionBehaviorSemanticSignal & { value: number } => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    const plan = pickCurrentPlan(profile, date);
    const key = plan?.plan.slug ?? "none";
    const label = plan?.plan.name?.trim() || "Sem plano";
    const current = counts.get(key) ?? { count: 0, label };
    counts.set(key, { ...current, count: current.count + 1 });
  }

  const dominant = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;

    return left.label.localeCompare(right.label, "pt-BR");
  })[0];

  if (!dominant || dominant.label === "Sem plano") {
    return { label: "Sem plano", tone: "zero", value: dominant?.count ?? 0 };
  }

  return { label: dominant.label, tone: "standard", value: dominant.count };
};

const describeProfileConversionBehaviorDominantProfileTab = (params: {
  publicationsTabOpens: number;
  reviewsTabOpens: number;
}) => {
  const total = params.publicationsTabOpens + params.reviewsTabOpens;
  if (total <= 0) return "não houve abertura relevante das abas Publicações ou Avaliações";

  if (params.publicationsTabOpens === params.reviewsTabOpens) {
    return `Publicações e Avaliações empataram, com ${formatProfileConversionBehaviorCount(params.publicationsTabOpens, "abertura", "aberturas")} cada`;
  }

  return params.publicationsTabOpens > params.reviewsTabOpens
    ? `a aba Publicações predomina, com ${formatProfileConversionBehaviorCount(params.publicationsTabOpens, "abertura", "aberturas")}`
    : `a aba Avaliações predomina, com ${formatProfileConversionBehaviorCount(params.reviewsTabOpens, "abertura", "aberturas")}`;
};

const buildProfileConversionBehaviorResults = (params: {
  communityTrafficPlatformMetricDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  profileTrafficPlatformMetricDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profiles: AdminPsychologistProfileRecord[];
  range: AdminPsychologistsDashboardDateRange;
  rankingPositionsByPsychologistId: Map<string, number>;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  trafficCommunityPosts: AdminPsychologistTrafficCommunityPostRecord[];
  trafficCommunityReplies: AdminPsychologistTrafficCommunityReplyRecord[];
  whatsappContactRequests: AdminPsychologistEventRecord[];
  whatsappTrafficActions: AdminPsychologistWhatsappTrafficActionRecord[];
}): AdminPsychologistsDashboardProfileConversionBehaviorResults => {
  const analyzedPsychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const whatsappClickEvents = params.whatsappContactRequests.filter((event) =>
    analyzedPsychologistIds.has(event.psychologist_id),
  );
  const whatsappClickCounts = countEventsByPsychologist(whatsappClickEvents);
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
  const rowCounters = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      {
        count: 0,
        totals: emptyProfileConversionMatrixRowTotals(),
      },
    ]),
  );
  const profilesByRow = new Map(
    PROFILE_CONVERSION_MATRIX_CATEGORY_ORDER.map((id) => [
      id,
      [] as AdminPsychologistProfileRecord[],
    ]),
  );

  for (const profile of params.profiles) {
    const psychologistId = profile.user.id;
    const rowId = classifyProfileConversionMatrixCategory({
      activeDays: getProfileActiveDaysInRange(profile, params.range),
      benchmark: profileConversionBenchmark,
      profileAgeDays: getProfileAgeDaysUntil(profile, params.range.end),
      whatsappClicks: whatsappClickCounts.get(psychologistId) ?? 0,
    });
    const row = rowCounters.get(rowId);
    const rowProfiles = profilesByRow.get(rowId);

    if (row) {
      row.count += 1;
      row.totals.whatsapp_clicks += whatsappClickCounts.get(psychologistId) ?? 0;
    }
    if (rowProfiles) rowProfiles.push(profile);
  }

  const rows = buildProfileConversionMatrixRows(rowCounters, params.profiles.length);
  const cells = rows.flatMap((row) => {
    const rowProfiles = profilesByRow.get(row.id) ?? [];
    const rowPsychologistIds = new Set(rowProfiles.map((profile) => profile.user.id));
    const rowProfileTrafficDataset = filterProfileTrafficPlatformMetricDataset(
      params.profileTrafficPlatformMetricDataset,
      rowPsychologistIds,
    );
    const rowCommunityTrafficDataset = filterCommunityTrafficPlatformMetricDataset(
      params.communityTrafficPlatformMetricDataset,
      rowPsychologistIds,
    );
    const rowTrafficPlatformMetrics = buildTrafficPlatformMetrics({
      communityDataset: rowCommunityTrafficDataset,
      profileDataset: rowProfileTrafficDataset,
      profiles: rowProfiles,
    });
    const rowTrafficSources = summarizePsychologistWhatsappTrafficOrigins({
      actions: params.whatsappTrafficActions,
      allowedPsychologistIds: rowPsychologistIds,
      communityPlatformMetrics: rowTrafficPlatformMetrics.metrics,
      platformMetricsConsideredCounts: rowTrafficPlatformMetrics.consideredCounts,
      communityPosts: params.trafficCommunityPosts,
      communityReplies: params.trafficCommunityReplies,
    }).sources;
    const rowReceivedEngagementEvents = params.receivedEngagementEvents.filter((event) =>
      rowPsychologistIds.has(event.psychologist_id),
    );
    const emptyRowReason = `Sem profissionais na categoria ${row.label.toLocaleLowerCase("pt-BR")} no período selecionado.`;
    const videoProfiles = rowProfiles.filter(
      (profile) => profile.published && Boolean(profile.video_url?.trim()),
    );
    const videoProfileIds = new Set(videoProfiles.map((profile) => profile.user.id));
    const videoWatchSessions = rowProfileTrafficDataset.videoWatchSessions.filter(
      (session) =>
        videoProfileIds.has(session.psychologist_id) &&
        (!session.viewer_id || session.viewer_id !== session.psychologist_id) &&
        hasProfileTrafficVideoViewSignal(session),
    );
    const videoRetention = averageProfileConversionBehaviorValue(
      videoWatchSessions.flatMap((session) =>
        session.duration_seconds > 0
          ? [Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100)]
          : [],
      ),
    );
    const videoAverageWatchSeconds = averageProfileConversionBehaviorValue(
      videoWatchSessions.map((session) => Math.max(0, session.watched_seconds)),
    );
    const videoViewsPerVideo =
      videoProfiles.length > 0
        ? roundOneDecimal(videoWatchSessions.length / videoProfiles.length)
        : null;
    const videoReplayRate =
      videoWatchSessions.length > 0
        ? roundOneDecimal(
            (videoWatchSessions.filter((session) => session.replay_count > 0).length /
              videoWatchSessions.length) *
              100,
          )
        : null;
    const videoActionEvents = rowProfileTrafficDataset.videoActions.filter(
      (event) =>
        event.target_id &&
        videoProfileIds.has(event.target_id) &&
        (!event.user_id || event.user_id !== event.target_id),
    );
    const videoActionCount = (actionType: string) =>
      videoActionEvents.filter((event) => event.action_type === actionType).length;
    const videoProfileAccesses = videoActionCount(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION);
    const videoFavorites = videoActionCount(PRESENTATION_VIDEO_FAVORITE_ACTION);
    const videoShares = videoActionCount(PRESENTATION_VIDEO_SHARE_ACTION);
    const averageVideoActionPerVideo = (value: number) =>
      videoProfiles.length > 0 ? roundOneDecimal(value / videoProfiles.length) : null;
    const videoProfileAccessesPerVideo = averageVideoActionPerVideo(videoProfileAccesses);
    const videoFavoritesPerVideo = averageVideoActionPerVideo(videoFavorites);
    const videoSharesPerVideo = averageVideoActionPerVideo(videoShares);
    const videoSources = rowTrafficSources.filter((source) =>
      PROFILE_CONVERSION_BEHAVIOR_VIDEO_SOURCE_IDS.includes(source.id),
    );
    const videoWhatsappClicks = videoSources.reduce(
      (sum, source) => sum + source.whatsapp_clicks,
      0,
    );
    const videoWhatsappClicksPerPsychologist =
      row.count > 0 ? roundOneDecimal(videoWhatsappClicks / row.count) : 0;
    const videoEngagementActions = videoProfileAccesses + videoFavorites + videoShares;
    const videoRankingPositionEntries = videoProfiles.map((profile) => {
      const position = params.rankingPositionsByPsychologistId.get(profile.user.id);

      return typeof position === "number" ? position : null;
    });
    const videoRankingPositions = videoRankingPositionEntries.filter(
      (position): position is number => typeof position === "number",
    );
    const averageVideoRankingPosition =
      averageProfileConversionBehaviorValue(videoRankingPositions);
    const videoRankingRangeSignal = describeProfileConversionBehaviorPositionRange(
      videoRankingPositionEntries,
    );
    const videoUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : videoProfiles.length === 0
          ? "Nenhum profissional desta categoria tem vídeo de apresentação publicado."
          : null;

    const profileViews = rowProfileTrafficDataset.profileViews.filter((event) =>
      rowPsychologistIds.has(event.psychologist_id),
    );
    const profilePageViewDurations = rowProfileTrafficDataset.pageViews.flatMap((view) => {
      if (!view.target_id || !rowPsychologistIds.has(view.target_id)) return [];
      if (view.user_id && view.user_id === view.target_id) return [];
      if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

      return [view.duration_seconds];
    });
    const profileAverageStaySeconds =
      averageProfileConversionBehaviorValue(profilePageViewDurations);
    const profileOpeningsPerPsychologist =
      row.count > 0 ? roundOneDecimal(profileViews.length / row.count) : null;
    const profileFavorites = rowProfileTrafficDataset.favorites.filter((event) =>
      rowPsychologistIds.has(event.psychologist_id),
    );
    const profileFavoritesPerPsychologist =
      row.count > 0 ? roundOneDecimal(profileFavorites.length / row.count) : null;
    const profilePublicationTabOpens = rowProfileTrafficDataset.tabActions.filter(
      (event) =>
        event.action_type === PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION &&
        event.target_id &&
        rowPsychologistIds.has(event.target_id) &&
        event.user_id !== event.target_id,
    ).length;
    const profileReviewsTabOpens = rowProfileTrafficDataset.tabActions.filter(
      (event) =>
        event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
        event.target_id &&
        rowPsychologistIds.has(event.target_id) &&
        event.user_id !== event.target_id,
    ).length;
    const profileContentTabOpensPerPsychologist =
      row.count > 0 ? roundOneDecimal(profilePublicationTabOpens / row.count) : 0;
    const profileReviewsTabOpensPerPsychologist =
      row.count > 0 ? roundOneDecimal(profileReviewsTabOpens / row.count) : 0;
    const profileVideoViewsPerPsychologist =
      row.count > 0 ? roundOneDecimal(videoWatchSessions.length / row.count) : 0;
    const profileVideoRetention = videoRetention ?? 0;
    const profileSources = rowTrafficSources.filter((source) =>
      PROFILE_CONVERSION_BEHAVIOR_PROFILE_SOURCE_IDS.includes(source.id),
    );
    const profileWhatsappClicks = profileSources.reduce(
      (sum, source) => sum + source.whatsapp_clicks,
      0,
    );
    const profileWhatsappClicksPerPsychologist =
      row.count > 0 ? roundOneDecimal(profileWhatsappClicks / row.count) : 0;
    const profileWhatsappRate =
      profileViews.length > 0
        ? roundOneDecimal((profileWhatsappClicks / profileViews.length) * 100)
        : null;
    const profileDominantPlanSignal = describeProfileConversionBehaviorDominantPlan(
      rowProfiles,
      params.range.end,
    );
    const profileSignalCount =
      profileViews.length +
      profilePageViewDurations.length +
      profileFavorites.length +
      profilePublicationTabOpens +
      profileReviewsTabOpens +
      profileWhatsappClicks;
    const profileUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : profileSignalCount === 0
          ? "Nenhum comportamento de usuários dentro do perfil público foi registrado para esta categoria no período."
          : null;

    const communityContentCount =
      rowCommunityTrafficDataset.posts.length + rowCommunityTrafficDataset.replies.length;
    const communityPostVideoCount = rowCommunityTrafficDataset.posts.filter(
      isCommunityTrafficVideoMedia,
    ).length;
    const communityReplyVideoCount = rowCommunityTrafficDataset.replies.filter(
      isCommunityTrafficVideoMedia,
    ).length;
    const communityPostTextCount =
      rowCommunityTrafficDataset.posts.length - communityPostVideoCount;
    const communityReplyTextCount =
      rowCommunityTrafficDataset.replies.length - communityReplyVideoCount;
    const communityVideoSessions = rowCommunityTrafficDataset.videoWatchSessions.filter(
      (session) => session.duration_seconds > 0,
    );
    const communityRetention = averageProfileConversionBehaviorValue(
      communityVideoSessions.map((session) =>
        Math.min(100, (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100),
      ),
    );
    const communityAttentionSeconds = rowCommunityTrafficDataset.attentionSessions.reduce(
      (sum, session) => sum + Math.max(0, session.attention_seconds),
      0,
    );
    const communityViewsPerContent =
      communityContentCount > 0
        ? roundOneDecimal(rowCommunityTrafficDataset.pageViews.length / communityContentCount)
        : null;
    const communityAttentionPerContent =
      communityContentCount > 0
        ? roundOneDecimal(communityAttentionSeconds / communityContentCount)
        : null;
    const communityUpvotes = rowCommunityTrafficDataset.votes.filter(
      (vote) => vote.value === 1,
    ).length;
    const communityDownvotes = rowCommunityTrafficDataset.votes.filter(
      (vote) => vote.value === -1,
    ).length;
    const communityEngagementActions =
      rowCommunityTrafficDataset.comments.length +
      rowCommunityTrafficDataset.postSaves.length +
      rowCommunityTrafficDataset.replySaves.length +
      rowCommunityTrafficDataset.shares.length +
      communityUpvotes;
    const communitySources = rowTrafficSources.filter((source) =>
      PROFILE_CONVERSION_BEHAVIOR_COMMUNITY_SOURCE_IDS.includes(source.id),
    );
    const communityWhatsappClicks = communitySources.reduce(
      (sum, source) => sum + source.whatsapp_clicks,
      0,
    );
    const communityWhatsappClicksPerPsychologist =
      row.count > 0 ? roundOneDecimal(communityWhatsappClicks / row.count) : 0;
    const dominantCommunitySource =
      communitySources
        .filter((source) => source.whatsapp_clicks > 0 || (source.considered_count ?? 0) > 0)
        .toSorted((left, right) => {
          if (right.whatsapp_clicks !== left.whatsapp_clicks) {
            return right.whatsapp_clicks - left.whatsapp_clicks;
          }

          return (right.considered_count ?? 0) - (left.considered_count ?? 0);
        })[0] ?? null;
    const communityContentUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : communityContentCount === 0
          ? "Nenhum conteúdo autoral de comunidade foi publicado por esta categoria no período."
          : null;

    const rowActivityAuthorIds = new Set([
      ...rowCommunityTrafficDataset.posts.map((post) => post.author_id),
      ...rowCommunityTrafficDataset.replies.map((reply) => reply.author_id),
    ]);
    const rowActivityActions =
      rowCommunityTrafficDataset.posts.length + rowCommunityTrafficDataset.replies.length;
    const activityPerPsychologist =
      row.count > 0 ? roundOneDecimal(rowActivityActions / row.count) : null;
    const activityUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : rowActivityActions === 0
          ? "Nenhuma ação autoral em comunidades foi registrada para esta categoria no período."
          : null;

    const engagementCountByType = (type: AdminPsychologistReceivedEngagementEventRecord["type"]) =>
      rowReceivedEngagementEvents.filter((event) => event.type === type).length;
    const commentsReceived = engagementCountByType("comment_received");
    const contentSaves = engagementCountByType("content_save");
    const contentShares = engagementCountByType("content_share");
    const positiveVotes = engagementCountByType("positive_vote");
    const profileFollows = engagementCountByType("profile_follow");
    const engagementScore = calculateAdminProfileEngagementFavoritesCommunityScore({
      commentsReceived,
      contentSaves,
      contentShares,
      positiveVotes,
    });
    const engagementInteractions =
      commentsReceived + contentSaves + contentShares + positiveVotes + profileFollows;
    const engagementUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : engagementInteractions === 0
          ? "Nenhum engajamento recebido foi registrado para esta categoria no período."
          : null;

    const communityHasSignals =
      communityContentCount > 0 ||
      rowActivityActions > 0 ||
      engagementInteractions > 0 ||
      communityWhatsappClicks > 0;
    const communityUnavailableReason =
      row.count <= 0
        ? emptyRowReason
        : !communityHasSignals
          ? "Nenhum sinal de comunidade, atividade ou engajamento foi registrado para esta categoria no período."
          : null;

    const favoritesScreenSources = rowTrafficSources.filter((source) =>
      PROFILE_CONVERSION_BEHAVIOR_FAVORITES_SOURCE_IDS.includes(source.id),
    );
    const favoritesScreenWhatsappClicks = favoritesScreenSources.reduce(
      (sum, source) => sum + source.whatsapp_clicks,
      0,
    );
    const favoritesScreenWhatsappClicksPerPsychologist =
      row.count > 0 ? roundOneDecimal(favoritesScreenWhatsappClicks / row.count) : 0;
    const favoriteUnavailableReason = row.count <= 0 ? emptyRowReason : null;

    const videoEngagementPerVideo =
      videoProfiles.length > 0 ? roundOneDecimal(videoEngagementActions / videoProfiles.length) : 0;
    const videoEngagementSignal =
      describeProfileConversionBehaviorEngagementSignal(videoEngagementPerVideo);
    const videoEngagementLevel = describeProfileConversionBehaviorVolume(
      videoEngagementPerVideo,
      [3, 10],
    );
    const videoEngagementText =
      videoEngagementLevel === "sem sinal registrado"
        ? "sem engajamento registrado"
        : `com engajamento ${videoEngagementLevel}`;
    const videoConsumptionText =
      typeof videoAverageWatchSeconds === "number"
        ? `O consumo médio é de ${formatProfileConversionBehaviorSeconds(videoAverageWatchSeconds, "0s")}`
        : "Ainda não há base real de consumo médio";
    const videoReplayText =
      typeof videoReplayRate === "number"
        ? `replay em ${formatProfileConversionBehaviorPercentage(videoReplayRate, "0%")} das sessões`
        : "sem base de replay";
    const videoHeadline =
      videoUnavailableReason ??
      `${typeof videoRetention === "number" ? `Retenção média de ${formatProfileConversionBehaviorPercentage(videoRetention, "0%")}` : "Retenção média ainda sem base real"}, ${videoEngagementText} (${formatProfileConversionBehaviorCount(videoEngagementActions, "ação", "ações")} no vídeo) e ${describeProfileConversionBehaviorRankingRange(videoRankingRangeSignal, averageVideoRankingPosition)}. ${videoConsumptionText}, com ${formatProfileConversionBehaviorMetricNumber(videoViewsPerVideo, "sem base de views")} views por vídeo, ${videoReplayText} e ${formatProfileConversionBehaviorCount(videoWhatsappClicks, "clique de WhatsApp vindo do vídeo", "cliques de WhatsApp vindos do vídeo")}.`;

    const profileStayText =
      typeof profileAverageStaySeconds === "number"
        ? `permanência média de ${formatProfileConversionBehaviorSeconds(profileAverageStaySeconds, "0s")}`
        : "permanência média ainda sem base real";
    const profileWhatsappText =
      typeof profileWhatsappRate === "number"
        ? `${formatProfileConversionBehaviorCount(profileWhatsappClicks, "clique de WhatsApp via perfil", "cliques de WhatsApp via perfil")}, equivalentes a ${formatProfileConversionBehaviorPercentage(profileWhatsappRate, "0%")} das aberturas`
        : `${formatProfileConversionBehaviorCount(profileWhatsappClicks, "clique de WhatsApp via perfil", "cliques de WhatsApp via perfil")}, ainda sem taxa por abertura`;
    const profileHeadline =
      profileUnavailableReason ??
      `Perfil teve ${formatProfileConversionBehaviorCount(profileViews.length, "abertura real", "aberturas reais")} (${formatProfileConversionBehaviorMetricNumber(profileOpeningsPerPsychologist, "sem base")} por psicólogo), com ${profileStayText}. Na navegação interna, ${describeProfileConversionBehaviorDominantProfileTab({ publicationsTabOpens: profilePublicationTabOpens, reviewsTabOpens: profileReviewsTabOpens })}. Usuários também favoritaram esses perfis ${formatProfileConversionBehaviorCount(profileFavorites.length, "vez", "vezes")} (${formatProfileConversionBehaviorMetricNumber(profileFavoritesPerPsychologist, "sem base")} por psicólogo) e geraram ${profileWhatsappText}.`;

    const profileDominantTabSignal = describeProfileConversionBehaviorDominantTabSignal({
      publicationsTabOpens: profilePublicationTabOpens,
      reviewsTabOpens: profileReviewsTabOpens,
    });

    const communityEngagementPerPsychologist =
      row.count > 0 ? roundOneDecimal(engagementInteractions / row.count) : engagementInteractions;
    const communityActivitySignal =
      describeProfileConversionBehaviorActivitySignal(activityPerPsychologist);
    const communityEngagementSignal = describeProfileConversionBehaviorEngagementSignal(
      communityEngagementPerPsychologist,
    );
    const communityPostFormatSignal = describeProfileConversionBehaviorDominantContentFormat({
      text: communityPostTextCount,
      textLabel: "posts de texto",
      video: communityPostVideoCount,
      videoLabel: "posts com v\u00eddeo",
      zeroLabel: "Sem posts",
    });
    const communityReplyFormatSignal = describeProfileConversionBehaviorDominantContentFormat({
      text: communityReplyTextCount,
      textLabel: "respostas de texto",
      video: communityReplyVideoCount,
      videoLabel: "respostas com v\u00eddeo",
      zeroLabel: "Sem respostas",
    });
    const communityActivityPerPsychologistText =
      typeof activityPerPsychologist === "number"
        ? `${formatProfileConversionBehaviorNumber(activityPerPsychologist)} ações por psicólogo`
        : "ações por psicólogo ainda sem base";
    const communityRetentionText =
      typeof communityRetention === "number"
        ? `vídeos de comunidade têm retenção média de ${formatProfileConversionBehaviorPercentage(communityRetention, "0%")}`
        : "vídeos de comunidade ainda não têm base de retenção";
    const communityConsumptionText =
      communityContentCount > 0
        ? `O consumo médio é de ${formatProfileConversionBehaviorMetricNumber(communityViewsPerContent, "0")} views por conteúdo e ${formatProfileConversionBehaviorSeconds(communityAttentionPerContent, "0s")} de permanência`
        : "Sem conteúdo autoral, ainda não há base de consumo por conteúdo";
    const communityEngagementLevel = describeProfileConversionBehaviorVolume(
      communityEngagementPerPsychologist,
      [3, 10],
    );
    const communityEngagementText =
      communityEngagementLevel === "sem sinal registrado"
        ? "não tem sinal registrado"
        : `tem relacionamento recebido ${communityEngagementLevel}`;
    const communityDominantWhatsappText =
      communityWhatsappClicks <= 0
        ? "Não houve cliques de WhatsApp vindos da comunidade"
        : dominantCommunitySource
          ? `A origem predominante de WhatsApp é ${dominantCommunitySource.label}, com ${formatProfileConversionBehaviorCount(communityWhatsappClicks, "clique", "cliques")} via comunidade`
          : `${formatProfileConversionBehaviorCount(communityWhatsappClicks, "clique de WhatsApp", "cliques de WhatsApp")} vieram da comunidade`;
    const communityHeadline =
      communityUnavailableReason ??
      `Comunidade reúne ${formatProfileConversionBehaviorCount(communityContentCount, "conteúdo autoral", "conteúdos autorais")} (${formatProfileConversionBehaviorCount(rowCommunityTrafficDataset.posts.length, "post", "posts")} e ${formatProfileConversionBehaviorCount(rowCommunityTrafficDataset.replies.length, "resposta", "respostas")}), com ${formatProfileConversionBehaviorCount(rowActivityAuthorIds.size, "profissional ativo", "profissionais ativos")} e ${communityActivityPerPsychologistText}. ${communityConsumptionText}; ${communityRetentionText}. O relacionamento recebido ${communityEngagementText}, com ${formatProfileConversionBehaviorCount(engagementInteractions, "interação", "interações")} (score ${formatProfileConversionBehaviorNumber(engagementScore)}), incluindo ${formatProfileConversionBehaviorCount(commentsReceived, "comentário", "comentários")}, ${formatProfileConversionBehaviorCount(contentSaves, "salvamento", "salvamentos")}, ${formatProfileConversionBehaviorCount(contentShares, "compartilhamento", "compartilhamentos")} e ${formatProfileConversionBehaviorCount(positiveVotes, "voto positivo", "votos positivos")}. ${communityDominantWhatsappText}.`;

    const favoriteHeadline =
      favoriteUnavailableReason ??
      `Favoritos geraram ${formatProfileConversionBehaviorCount(favoritesScreenWhatsappClicks, "clique de WhatsApp", "cliques de WhatsApp")}, com média de ${formatProfileConversionBehaviorMetricNumber(favoritesScreenWhatsappClicksPerPsychologist, "0")} por psicólogo da categoria.`;

    const cellsByElement: AdminPsychologistsDashboardProfileConversionBehaviorResults["cells"] = [
      {
        element_id: "presentation_video",
        headline: videoHeadline,
        id: buildProfileConversionBehaviorCellId(row.id, "presentation_video"),
        metrics: [
          buildProfileConversionBehaviorMetric({
            description:
              "Media de cliques de WhatsApp originados por video por profissional da faixa.",
            display_value: formatProfileConversionBehaviorPerPsychologistValue(
              videoWhatsappClicksPerPsychologist,
            ),
            id: "presentation_video_whatsapp_clicks_per_psychologist",
            label: "WhatsApp",
            source:
              "important_action_event.action_type=psychologist_video_whatsapp_click|whatsapp_click",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              videoWhatsappClicksPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: videoWhatsappClicksPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Percentual medio assistido nas sessoes reais do video de apresentacao.",
            id: "presentation_video_retention",
            label: "Reten\u00e7\u00e3o",
            source: "profile_video_watch_session.watched_seconds/duration_seconds",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoRetention, [30, 60]),
            unit: "percentage",
            unavailable_reason:
              videoRetention === null && !videoUnavailableReason
                ? "Sem sessoes reais do video com duracao no periodo."
                : videoUnavailableReason,
            value: videoRetention,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Views reais do video por video publicado na categoria.",
            id: "presentation_video_views_per_video",
            label: "Views",
            source: "profile_video_watch_session",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoViewsPerVideo, [1, 5]),
            unavailable_reason: videoUnavailableReason,
            value: videoViewsPerVideo,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Permanencia media por sessao real do video de apresentacao.",
            id: "presentation_video_average_watch_seconds",
            label: "Perman\u00eancia",
            source: "profile_video_watch_session.watched_seconds",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              videoAverageWatchSeconds,
              [10, 45],
            ),
            unit: "seconds",
            unavailable_reason:
              videoAverageWatchSeconds === null && !videoUnavailableReason
                ? "Sem sessoes reais do video no periodo."
                : videoUnavailableReason,
            value: videoAverageWatchSeconds,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Media de acessos ao perfil gerados por video de apresentacao na categoria.",
            id: "presentation_video_profile_accesses_per_video",
            label: "Acesso ao perfil",
            source: "important_action_event.action_type=psychologist_video_profile_access",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              videoProfileAccessesPerVideo,
              [1, 3],
            ),
            unavailable_reason: videoUnavailableReason,
            value: videoProfileAccessesPerVideo,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Media de favoritos gerados por video de apresentacao na categoria.",
            id: "presentation_video_favorites_per_video",
            label: "Favoritado",
            source: "important_action_event.action_type=psychologist_video_favorite",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              videoFavoritesPerVideo,
              [1, 3],
            ),
            unavailable_reason: videoUnavailableReason,
            value: videoFavoritesPerVideo,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Media de compartilhamentos gerados por video de apresentacao na categoria.",
            id: "presentation_video_shares_per_video",
            label: "Compartilhado",
            source: "important_action_event.action_type=psychologist_video_share",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoSharesPerVideo, [1, 3]),
            unavailable_reason: videoUnavailableReason,
            value: videoSharesPerVideo,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              videoRankingRangeSignal?.description ??
              "Faixa predominante de posicao dos profissionais com video na lista publica ranqueada.",
            display_value: videoUnavailableReason ? null : (videoRankingRangeSignal?.label ?? null),
            id: "presentation_video_average_ranking_position",
            label: "Posi\u00e7\u00e3o",
            source: "shared_psychologist_public_ranking_helper",
            tone:
              videoRankingRangeSignal?.tone ??
              classifyProfileConversionBehaviorPositionTone(averageVideoRankingPosition),
            unit: "position",
            unavailable_reason: videoUnavailableReason,
            value: averageVideoRankingPosition,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Cliques de WhatsApp classificados como originados pela navegação de vídeos em Explorar ou Busca/filtros.",
            id: "presentation_video_whatsapp_clicks",
            label: "WhatsApp via vídeo",
            source:
              "important_action_event.action_type=psychologist_video_whatsapp_click|whatsapp_click",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: videoWhatsappClicks,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Classificacao da media de acoes de engajamento no video por video publicado.",
            display_value: videoEngagementSignal.label,
            id: "presentation_video_engagement_level",
            label: "Engajamento",
            source:
              "important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share",
            tone: videoEngagementSignal.tone,
            unavailable_reason: videoUnavailableReason,
            value: videoEngagementPerVideo,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Ações no vídeo que indicam interesse: acesso ao perfil, favorito e compartilhamento.",
            id: "presentation_video_engagement_actions",
            label: "Engajamento",
            source:
              "important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share",
            unavailable_reason: videoUnavailableReason,
            value: videoEngagementActions,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Percentual de sessoes do video com ao menos um replay registrado.",
            id: "presentation_video_replay_rate",
            label: "Replay",
            source: "profile_video_watch_session.replay_count",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoReplayRate, [10, 25]),
            unit: "percentage",
            unavailable_reason:
              videoReplayRate === null && !videoUnavailableReason
                ? "Sem sessoes reais do video no periodo."
                : videoUnavailableReason,
            value: videoReplayRate,
          }),
        ],
        row_id: row.id,
        source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
        unavailable_reason: videoUnavailableReason,
      },
      {
        element_id: "profile",
        headline: profileHeadline,
        id: buildProfileConversionBehaviorCellId(row.id, "profile"),
        metrics: [
          buildProfileConversionBehaviorMetric({
            description:
              "Media de cliques de WhatsApp originados no perfil publico por profissional da faixa.",
            display_value: formatProfileConversionBehaviorPerPsychologistValue(
              profileWhatsappClicksPerPsychologist,
            ),
            id: "profile_whatsapp_clicks_per_psychologist",
            label: "WhatsApp",
            source: "important_action_event.page_kind=psychologist_profile",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileWhatsappClicksPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileWhatsappClicksPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Plano ativo predominante entre os profissionais da faixa.",
            display_value: profileDominantPlanSignal.label,
            id: "profile_dominant_plan",
            label: "Plano predominante",
            source: "professional_subscription+subscription_plan",
            tone: profileDominantPlanSignal.tone,
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileDominantPlanSignal.value,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Total de aberturas reais do perfil público dos profissionais da faixa.",
            id: "profile_openings",
            label: "Aberturas",
            source: "profile_view_event.source=profile_page",
            unavailable_reason: profileUnavailableReason,
            value: profileViews.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Media de aberturas reais do perfil por profissional da faixa.",
            display_value: formatProfileConversionBehaviorOpeningsValue(
              profileOpeningsPerPsychologist,
            ),
            id: "profile_openings_per_psychologist",
            label: "Aberturas",
            source: "profile_view_event.source=profile_page",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileOpeningsPerPsychologist,
              [1, 5],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileOpeningsPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Permanencia media registrada em pageviews do perfil publico.",
            display_value: formatProfileConversionBehaviorSeconds(profileAverageStaySeconds, "0s"),
            id: "profile_average_stay_seconds",
            label: "Perman\u00eancia",
            source: "page_view_event.page_kind=psychologist_profile.duration_seconds",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileAverageStaySeconds,
              [10, 45],
            ),
            unit: "seconds",
            unavailable_reason:
              profileAverageStaySeconds === null && !profileUnavailableReason
                ? "Sem duracao real registrada em pageviews de perfil no periodo."
                : profileUnavailableReason,
            value: profileAverageStaySeconds ?? 0,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Media de aberturas da aba Avaliacoes por profissional da faixa.",
            id: "profile_reviews_tab_opens_per_psychologist",
            label: "Aba Avalia\u00e7\u00f5es",
            source: "important_action_event.action_type=psychologist_profile_reviews_tab_open",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileReviewsTabOpensPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileReviewsTabOpensPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Media de aberturas da aba Conteudo por profissional da faixa.",
            id: "profile_content_tab_opens_per_psychologist",
            label: "Aba Conte\u00fado",
            source: "important_action_event.action_type=psychologist_profile_publications_tab_open",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileContentTabOpensPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileContentTabOpensPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Media de views do video de apresentacao por profissional da faixa.",
            id: "profile_video_views_per_psychologist",
            label: "Views v\u00eddeo",
            source: "profile_video_watch_session",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileVideoViewsPerPsychologist,
              [1, 5],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileVideoViewsPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Retencao media do video de apresentacao nos perfis da faixa.",
            id: "profile_video_retention",
            label: "Reten\u00e7\u00e3o v\u00eddeo",
            source: "profile_video_watch_session.watched_seconds/duration_seconds",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(videoRetention, [30, 60]),
            unit: "percentage",
            unavailable_reason:
              videoRetention === null && !videoUnavailableReason
                ? "Sem sessoes reais do video com duracao no periodo."
                : videoUnavailableReason,
            value: profileVideoRetention,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Aba interna predominante nas aberturas do perfil publico.",
            display_value: profileDominantTabSignal.label,
            id: "profile_dominant_tab",
            label: "Aba predominante",
            source:
              "important_action_event.action_type=psychologist_profile_publications_tab_open|psychologist_profile_reviews_tab_open",
            tone: profileDominantTabSignal.tone,
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profilePublicationTabOpens + profileReviewsTabOpens,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Aberturas da aba Publicações dentro do perfil público.",
            id: "profile_publications_tab_opens",
            label: "Aba Publicações",
            source: "important_action_event.action_type=psychologist_profile_publications_tab_open",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profilePublicationTabOpens,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Aberturas da aba Avaliações dentro do perfil público.",
            id: "profile_reviews_tab_opens",
            label: "Aba Avaliações",
            source: "important_action_event.action_type=psychologist_profile_reviews_tab_open",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileReviewsTabOpens,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Media de favoritos recebidos pelos perfis publicos por profissional da faixa.",
            id: "profile_favorites_per_psychologist",
            label: "Favoritado",
            source: "psychologist_favorite.user.role=paciente",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              profileFavoritesPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileFavoritesPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Favoritos recebidos pelos perfis públicos da faixa.",
            id: "profile_favorites",
            label: "Favoritos desses perfis",
            source: "psychologist_favorite.user.role=paciente",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileFavorites.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Cliques de WhatsApp classificados como originados do perfil público.",
            id: "profile_whatsapp_clicks",
            label: "WhatsApp via perfil",
            source: "important_action_event.page_kind=psychologist_profile",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileWhatsappClicks,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Proporcao entre cliques de WhatsApp via perfil e aberturas reais do perfil.",
            id: "profile_whatsapp_rate",
            label: "WhatsApp/abertura",
            source: "important_action_event.page_kind=psychologist_profile/profile_view_event",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(profileWhatsappRate, [5, 15]),
            unit: "percentage",
            unavailable_reason:
              profileWhatsappRate === null && !profileUnavailableReason
                ? "Sem aberturas reais do perfil para calcular taxa de WhatsApp."
                : profileUnavailableReason,
            value: profileWhatsappRate,
          }),
        ],
        row_id: row.id,
        source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
        unavailable_reason: profileUnavailableReason,
      },
      {
        element_id: "communities",
        headline: communityHeadline,
        id: buildProfileConversionBehaviorCellId(row.id, "communities"),
        metrics: [
          buildProfileConversionBehaviorMetric({
            description:
              "Media de cliques de WhatsApp originados na comunidade por profissional da faixa.",
            display_value: formatProfileConversionBehaviorPerPsychologistValue(
              communityWhatsappClicksPerPsychologist,
            ),
            id: "community_whatsapp_clicks_per_psychologist",
            label: "WhatsApp",
            source: "important_action_event.action_type=whatsapp_click",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              communityWhatsappClicksPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: communityWhatsappClicksPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Classificacao da media de posts e respostas por profissional da faixa.",
            display_value: communityActivitySignal.label,
            id: "community_activity_level",
            label: "Atividade",
            source: PROFILE_ACTIVITY_SOURCE,
            tone: communityActivitySignal.tone,
            unavailable_reason: activityUnavailableReason,
            value: activityPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Classificacao da media de interacoes recebidas por profissional da faixa.",
            display_value: communityEngagementSignal.label,
            id: "community_engagement_level",
            label: "Engajamento",
            source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
            tone: communityEngagementSignal.tone,
            unavailable_reason: engagementUnavailableReason,
            value: communityEngagementPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Formato predominante dos posts autorais da faixa.",
            display_value: communityPostFormatSignal.label,
            id: "community_post_format",
            label: "Formato posts",
            source: "community_post.media_type",
            tone: communityPostFormatSignal.tone,
            unavailable_reason: activityUnavailableReason,
            value: rowCommunityTrafficDataset.posts.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Formato predominante das respostas autorais da faixa.",
            display_value: communityReplyFormatSignal.label,
            id: "community_reply_format",
            label: "Formato respostas",
            source: "post_reply.media_type",
            tone: communityReplyFormatSignal.tone,
            unavailable_reason: activityUnavailableReason,
            value: rowCommunityTrafficDataset.replies.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Posts e respostas autorais publicados por profissionais da categoria.",
            id: "community_content_count",
            label: "Conteúdos",
            source: "community_post.author_id+post_reply.author_id",
            unavailable_reason: communityUnavailableReason,
            value: communityContentCount,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Views médias por conteúdo autoral da categoria nas comunidades.",
            id: "community_views_per_content",
            label: "Views/conteúdo",
            source: "page_view_event.target_type=post|reply",
            unavailable_reason: communityContentUnavailableReason,
            value: communityViewsPerContent,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Permanencia media por conteudo autoral da categoria.",
            id: "community_attention_per_content",
            label: "Perman\u00eancia",
            source: "content_attention_session.attention_seconds",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              communityAttentionPerContent,
              [10, 45],
            ),
            unit: "seconds",
            unavailable_reason: communityContentUnavailableReason,
            value: communityAttentionPerContent,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Retenção média em sessões reais de vídeos publicados nas comunidades.",
            id: "community_video_retention",
            label: "Retenção vídeo",
            source: "content_video_watch_session.watched_seconds/duration_seconds",
            unit: "percentage",
            unavailable_reason:
              communityRetention === null && !communityUnavailableReason
                ? "Sem sessões reais de vídeo de comunidade com duração no período."
                : communityUnavailableReason,
            value: communityRetention,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Interações recebidas nos conteúdos: comentários, salvamentos, compartilhamentos e votos positivos.",
            id: "community_engagement_actions",
            label: "Interações",
            source: "post_reply+post_vote+post_save+post_reply_save+post_share",
            unavailable_reason: communityUnavailableReason,
            value: communityEngagementActions,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Votos negativos recebidos nos conteúdos da categoria.",
            id: "community_downvotes",
            label: "Downvotes",
            source: "post_vote.value=-1",
            unavailable_reason: communityUnavailableReason,
            value: communityDownvotes,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Cliques de WhatsApp classificados como originados por posts, respostas ou Top Mentores.",
            id: "community_whatsapp_clicks",
            label: "WhatsApp comunidade",
            source: "important_action_event.action_type=whatsapp_click",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: communityWhatsappClicks,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Total de posts e respostas autorais no período.",
            id: "activity_actions",
            label: "Ações autorais",
            source: PROFILE_ACTIVITY_SOURCE,
            unavailable_reason: activityUnavailableReason,
            value: rowActivityActions,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Quantidade de posts publicados por psicólogos da categoria.",
            id: "activity_posts",
            label: "Posts",
            source: "community_post.author_id",
            unavailable_reason: activityUnavailableReason,
            value: rowCommunityTrafficDataset.posts.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Quantidade de respostas publicadas por psicólogos da categoria.",
            id: "activity_replies",
            label: "Respostas",
            source: "post_reply.author_id",
            unavailable_reason: activityUnavailableReason,
            value: rowCommunityTrafficDataset.replies.length,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Profissionais da categoria que publicaram post ou resposta no período.",
            id: "activity_active_psychologists",
            label: "Profissionais ativos",
            source: PROFILE_ACTIVITY_SOURCE,
            unavailable_reason: activityUnavailableReason,
            value: rowActivityAuthorIds.size,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Média de posts e respostas por profissional da categoria.",
            id: "activity_actions_per_psychologist",
            label: "Ações/psicólogo",
            source: PROFILE_ACTIVITY_SOURCE,
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: activityPerPsychologist,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Score ponderado de engajamento recebido em comunidades.",
            id: "engagement_score",
            label: "Score",
            source: ADMIN_PROFILE_ENGAGEMENT_FAVORITES_SOURCE,
            unit: "score",
            unavailable_reason: engagementUnavailableReason,
            value: engagementScore,
          }),
          buildProfileConversionBehaviorMetric({
            description:
              "Comentários recebidos em conteúdos de autoria dos psicólogos da categoria.",
            id: "engagement_comments_received",
            label: "Comentários",
            source: "post_reply.received.user.role=paciente",
            unavailable_reason: engagementUnavailableReason,
            value: commentsReceived,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Compartilhamentos recebidos nos conteúdos da categoria.",
            id: "engagement_content_shares",
            label: "Compartilhamentos",
            source: "post_share.received.user.role=paciente",
            unavailable_reason: engagementUnavailableReason,
            value: contentShares,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Salvamentos recebidos nos conteúdos da categoria.",
            id: "engagement_content_saves",
            label: "Salvamentos",
            source: "post_save+post_reply_save",
            unavailable_reason: engagementUnavailableReason,
            value: contentSaves,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Votos positivos recebidos nos conteúdos da categoria.",
            id: "engagement_positive_votes",
            label: "Votos positivos",
            source: "post_vote.value=1.received.user.role=paciente",
            unavailable_reason: engagementUnavailableReason,
            value: positiveVotes,
          }),
          buildProfileConversionBehaviorMetric({
            description: "Seguidores recebidos pelos profissionais da categoria.",
            id: "engagement_profile_follows",
            label: "Seguidores",
            source: "psychologist_follow.user.role=paciente",
            unavailable_reason: row.count <= 0 ? emptyRowReason : null,
            value: profileFollows,
          }),
        ],
        row_id: row.id,
        source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
        unavailable_reason: communityUnavailableReason,
      },
      {
        element_id: "favorite",
        headline: favoriteHeadline,
        id: buildProfileConversionBehaviorCellId(row.id, "favorite"),
        metrics: [
          buildProfileConversionBehaviorMetric({
            description:
              "Media de cliques de WhatsApp originados em favoritos por profissional da faixa.",
            display_value: formatProfileConversionBehaviorPerPsychologistValue(
              favoritesScreenWhatsappClicksPerPsychologist,
            ),
            id: "favorites_screen_whatsapp_clicks_per_psychologist",
            label: "WhatsApp",
            source: "important_action_event.path=/favorites|/favoritos",
            tone: classifyProfileConversionBehaviorHigherIsBetterTone(
              favoritesScreenWhatsappClicksPerPsychologist,
              [1, 3],
            ),
            unavailable_reason: favoriteUnavailableReason,
            value: favoritesScreenWhatsappClicksPerPsychologist,
          }),
        ],
        row_id: row.id,
        source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
        unavailable_reason: favoriteUnavailableReason,
      },
    ];
    return cellsByElement;
  });

  return {
    cells,
    columns: PROFILE_CONVERSION_BEHAVIOR_COLUMNS,
    description:
      "Tabela observacional que detalha, em tags, os sinais predominantes de vídeo de apresentação, perfil, comunidade e favoritos para cada faixa de Conversão.",
    rows,
    source: PROFILE_CONVERSION_BEHAVIOR_SOURCE,
    unavailable_reason:
      params.profiles.length === 0
        ? "Sem psicólogos ativos no fim do período selecionado para detalhar comportamento por Conversão."
        : null,
  };
};

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
  communityTrafficPlatformMetricDataset: AdminPsychologistCommunityTrafficPlatformDataset;
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
  profileTrafficPlatformMetricDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  publishedReviews: AdminPsychologistEventRecord[];
  rankingPositionsByPsychologistId: Map<string, number>;
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
      const trafficPlatformMetrics = buildTrafficPlatformMetrics({
        communityDataset: isAll
          ? params.communityTrafficPlatformMetricDataset
          : filterCommunityTrafficPlatformMetricDataset(
              params.communityTrafficPlatformMetricDataset,
              segmentUserIds,
            ),
        profileDataset: isAll
          ? params.profileTrafficPlatformMetricDataset
          : filterProfileTrafficPlatformMetricDataset(
              params.profileTrafficPlatformMetricDataset,
              segmentUserIds,
            ),
        profiles: segmentProfiles,
      });
      const trafficSources = summarizePsychologistWhatsappTrafficOrigins({
        actions: params.whatsappTrafficActions,
        allowedPsychologistIds: isAll ? null : segmentUserIds,
        communityPlatformMetrics: trafficPlatformMetrics.metrics,
        platformMetricsConsideredCounts: trafficPlatformMetrics.consideredCounts,
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
        profile_activity: buildProfileActivityResults({
          communityPosts: params.communityTrafficPlatformMetricDataset.posts,
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
        }),
        profile_coverage: buildProfileCoverageResults({
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
        }),
        profile_conversion_activity: buildProfileConversionActivityMatrixResults({
          communityPosts: params.communityTrafficPlatformMetricDataset.posts,
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_cross_matrix: buildProfileCrossMatrixResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          communityTrafficPlatformMetricDataset: params.communityTrafficPlatformMetricDataset,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileTrafficPlatformMetricDataset: params.profileTrafficPlatformMetricDataset,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          publishedReviews: params.publishedReviews,
          rankingPositionsByPsychologistId: params.rankingPositionsByPsychologistId,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_behavior: buildProfileConversionBehaviorResults({
          communityTrafficPlatformMetricDataset: params.communityTrafficPlatformMetricDataset,
          profileTrafficPlatformMetricDataset: params.profileTrafficPlatformMetricDataset,
          profiles: segmentProfiles,
          range: params.range,
          rankingPositionsByPsychologistId: params.rankingPositionsByPsychologistId,
          receivedEngagementEvents: params.receivedEngagementEvents,
          trafficCommunityPosts: params.trafficCommunityPosts,
          trafficCommunityReplies: params.trafficCommunityReplies,
          whatsappContactRequests: params.whatsappContactRequests,
          whatsappTrafficActions: params.whatsappTrafficActions,
        }),
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
    communityTrafficPlatformMetricDataset,
    profileTrafficPlatformMetricDataset,
    publishedReviews,
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
    repository.listCommunityTrafficPlatformMetricDataset(current),
    repository.listProfileTrafficPlatformMetricDataset(current, psychologistUserIds),
    repository.listPublishedReviews(current),
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
  const rankingPositionsByPsychologistId = new Map(
    rankedPsychologists.map(({ item }, index) => [item.user.id, index + 1]),
  );
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
    communityTrafficPlatformMetricDataset,
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
    profileTrafficPlatformMetricDataset,
    profileVideoAttentionSeconds,
    profiles,
    publishedReviews,
    rankingPositionsByPsychologistId,
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
  const profileActivity = planSegments.all.profile_activity;
  const profileCoverage = planSegments.all.profile_coverage;
  const profileConversionActivity = planSegments.all.profile_conversion_activity;
  const profileConversionBehavior = planSegments.all.profile_conversion_behavior;
  const profileCrossMatrix = planSegments.all.profile_cross_matrix;
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
    profile_activity: profileActivity,
    profile_coverage: profileCoverage,
    profile_conversion_activity: profileConversionActivity,
    profile_conversion_behavior: profileConversionBehavior,
    profile_cross_matrix: profileCrossMatrix,
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
      ...(profileActivity.unavailable_reason
        ? [
            {
              description:
                "A Atividade depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_activity",
              label: "Atividade dos psicólogos",
              source: profileActivity.source,
            },
          ]
        : []),
      ...(profileCoverage.unavailable_reason
        ? [
            {
              description:
                "A Cobertura depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_coverage",
              label: "Cobertura dos psicólogos",
              source: profileCoverage.source,
            },
          ]
        : []),
      ...(profileConversionActivity.unavailable_reason
        ? [
            {
              description:
                "A matriz Conversao x Atividade depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_conversion_activity",
              label: "Conversao x Atividade",
              source: profileConversionActivity.source,
            },
          ]
        : []),
      ...(profileConversionBehavior.unavailable_reason
        ? [
            {
              description:
                "A tabela comportamental por Conversao depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_conversion_behavior",
              label: "Tabela comportamental por Conversao",
              source: profileConversionBehavior.source,
            },
          ]
        : []),
      ...(profileCrossMatrix.unavailable_reason
        ? [
            {
              description:
                "A matriz de cruzamento de dados depende de ao menos um perfil de psicologo ativo no periodo selecionado.",
              id: "psychologist_profile_cross_matrix",
              label: "Matriz de cruzamento de dados",
              source: profileCrossMatrix.source,
            },
          ]
        : []),
      ...(profileConversion.unavailable_reason
        ? [
            {
              description:
                "A Conversão depende de ao menos um perfil de psicólogo ativo no período selecionado.",
              id: "psychologist_profile_conversion",
              label: "Conversão dos psicólogos",
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
                "O comparativo Conversão x Engajamento depende de ao menos um perfil de psicólogo ativo no período selecionado.",
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
