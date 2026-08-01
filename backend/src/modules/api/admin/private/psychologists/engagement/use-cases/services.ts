import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  bestAdminCommunityEngagementDiagnosis,
  diagnoseAdminCommunityEngagement,
  formatAdminPsychologistCommunityEngagementDiagnosis,
} from "@/utils/admin-community-engagement-diagnosis";
import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import {
  ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS,
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_PLATFORM_POSITION_CONFIG,
  ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  buildAdminProfileConversionHeadline,
  classifyAdminProfileConversionCategory,
  classifyAdminProfileConversionPlatformPosition,
  classifyAdminProfileConversionQuality,
  normalizeAdminProfileConversionToThirtyDays,
} from "@/utils/admin-profile-conversion";
import type { AdminProfileExposureAggregateCategoryId } from "@/utils/admin-profile-exposure";
import {
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  buildAdminProfileExposureBenchmark,
  classifyAdminProfileExposureAggregateCategory,
  roundAdminProfileExposureNumber,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistWhatsappTrafficOriginSourceId,
  AdminPsychologistWhatsappTrafficPlatformMetric,
} from "@/utils/admin-psychologist-analytics";
import {
  hasSearchFilterTrafficParams,
  psychologistTrafficOriginDefinitions,
  roundOneDecimal,
  summarizePlatformHourlyActivity,
  summarizePlatformHourlyActivityByWeekday,
  summarizePlatformPeakActivityHours,
  summarizePlatformUsage,
  summarizePsychologistWhatsappTrafficOrigins,
  trafficOriginFromPageViewSource,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistAvailabilityMetric,
  AdminPsychologistBusinessProfileConversion,
  AdminPsychologistBusinessProfileConversionCategoryId,
  AdminPsychologistContentFormatDistribution,
  AdminPsychologistContentFormatId,
  AdminPsychologistEngagementQuery,
  AdminPsychologistMetricComparison,
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationsDTO,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistStatisticsDTO,
  AdminPsychologistStatisticsPeriod,
  AdminPsychologistStatisticsSeriesPoint,
  AdminPsychologistTrafficQualityLevelId,
  AdminPsychologistVisibilityDiagnosis,
  IAdminPsychologistPublicationsDTO,
  IAdminPsychologistStatisticsDTO,
} from "../DTOs/IAdminPsychologistEngagementDTO";
import {
  type AdminPsychologistCoveragePatientPost,
  type AdminPsychologistEngagementPost,
  type AdminPsychologistEngagementReply,
  AdminPsychologistEngagementRepository,
  type AdminPsychologistPlatformSessionRecord,
  PROFILE_VIDEO_ACTION_TYPES,
  type ProfileVideoActionType,
} from "../repositories/AdminPsychologistEngagementRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const TRAFFIC_QUALITY_SOURCE =
  "page_view_event+psychologist_favorite+contact_request+important_action_event" as const;
const PROFILE_VISIBILITY_TEMPORAL_SOURCE =
  "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds" as const;
const PROFILE_VISIBILITY_DETAILED_SOURCE =
  "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds+profile_view_event+page_view_event.target_type" as const;
const PRESENTATION_VIDEO_ANALYSIS_SOURCE =
  "profile_video_watch_session+important_action_event+profile_view_event.search_result_position" as const;
const VIDEO_EXPLORE_POSITION_SOURCE =
  "profile_view_event.source=search_result.search_result_position" as const;
const ACTIVITY_ACTIONS_SOURCE = "community_post.author_id+post_reply.author_id" as const;
const PATIENT_POST_REPLY_COVERAGE_SOURCE =
  "post_reply.author_id+post_reply.post.author.role=paciente+post_reply.media_type" as const;
const TRAFFIC_QUALITY_LEVEL_CONFIG = {
  interested: {
    description: "Retornou ao perfil ou favoritou este psicólogo antes do WhatsApp.",
    label: "Interessado",
  },
  qualified: {
    description: "Clicou no WhatsApp deste psicólogo no período.",
    label: "Qualificado",
  },
  unidentified: {
    description: "Sinal real sem identidade first-party suficiente para ligar à origem.",
    label: "Não identificado",
  },
  visited: {
    description: "Abriu o perfil, mas não gerou favorito, retorno relevante ou WhatsApp.",
    label: "Só visitou",
  },
} as const satisfies Record<
  AdminPsychologistTrafficQualityLevelId,
  { description: string; label: string }
>;
const TRAFFIC_QUALITY_LEVEL_ORDER: AdminPsychologistTrafficQualityLevelId[] = [
  "visited",
  "interested",
  "qualified",
  "unidentified",
];
type AdminPsychologistPublicationsSort = NonNullable<AdminPsychologistPublicationsQuery["sort"]>;
const PSYCHOLOGIST_PUBLICATIONS_SORTS = new Set<AdminPsychologistPublicationsSort>([
  "engagement",
  "oldest",
  "recent",
]);

const BUSINESS_PROFILE_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminPsychologistBusinessProfileConversionCategoryId,
    { description: string; label: string }
  >;
const BUSINESS_VISIBILITY_DIAGNOSIS_CONFIG = {
  high_exposure: {
    description:
      "Psic?logo fora da adapta??o com tempo real de Visibilidade acima da faixa padr?o da plataforma no per?odo selecionado.",
    label: "Alta Visibilidade",
  },
  insufficient_data: {
    description:
      "Psic?logo ainda dentro dos primeiros 30 dias de adapta??o; a Visibilidade ainda n?o ? comparada com a plataforma.",
    label: "Dados Insuficientes",
  },
  low_exposure: {
    description:
      "Psic?logo fora da adapta??o, com algum tempo real de Visibilidade, mas abaixo da faixa padr?o da plataforma no per?odo selecionado.",
    label: "Baixa Visibilidade",
  },
  no_exposure: {
    description:
      "Psic?logo fora da adapta??o sem tempo real de Visibilidade no perfil, no v?deo de apresenta??o ou em conte?do autoral na comunidade no per?odo selecionado.",
    label: "Sem Visibilidade",
  },
  standard_exposure: {
    description:
      "Psic?logo fora da adapta??o com tempo real de Visibilidade dentro da faixa padr?o da plataforma no per?odo selecionado.",
    label: "Visibilidade Padr?o",
  },
} as const satisfies Record<
  AdminProfileExposureAggregateCategoryId,
  { description: string; label: string }
>;
const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const labelsFromRange = (start: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(start, index)));

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfMonth = (date: Date) => startOfDate(new Date(date.getFullYear(), date.getMonth(), 1));

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(next, diff);
};

const startOfYear = (date: Date) => startOfDate(new Date(date.getFullYear(), 0, 1));

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

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

type PeriodResult =
  | {
      current: { end: Date; start: Date };
      labels: string[];
      period: AdminPsychologistStatisticsPeriod;
      previous: { end: Date; start: Date };
      success: true;
    }
  | { code: string; success: false };

const resolvePeriod = (
  query: { from?: string; period?: string; to?: string } = {},
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);
  let start: Date;
  let end: Date;
  let label = "Últimos 30 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo)
      return { success: false, code: "invalid_analytics_date_range" };

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

  const labels = labelsFromRange(start, days);
  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    current: { end, start },
    labels,
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
    previous: { end: previousEnd, start: previousStart },
  };
};

const metric = (input: {
  available?: boolean;
  comparison?: AdminPsychologistMetricComparison | null;
  id: string;
  label: string;
  source: string;
  unit?: AdminPsychologistAvailabilityMetric["unit"];
  unavailable_reason?: string | null;
  value: number | null;
}): AdminPsychologistAvailabilityMetric => ({
  available: input.available ?? input.value !== null,
  ...(input.comparison ? { comparison: input.comparison } : {}),
  id: input.id,
  label: input.label,
  source: input.source,
  unit: input.unit ?? "count",
  unavailable_reason: input.unavailable_reason ?? null,
  value: input.value,
});

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const safePercentage = (count: number, total: number) =>
  total > 0 ? roundPercent((count / total) * 100) : 0;

type BusinessProfileConversionSignals = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

const classifyBusinessProfileConversionCategory = (
  signals: BusinessProfileConversionSignals,
): AdminPsychologistBusinessProfileConversionCategoryId => {
  return classifyAdminProfileConversionCategory(signals);
};

const getProfileActiveDaysInStatisticsRange = (
  profileCreatedAt: Date,
  range: { end: Date; start: Date },
) => {
  const rangeStart = startOfDate(range.start);
  const rangeEnd = endOfDate(range.end);
  const profileStart = startOfDate(profileCreatedAt);
  const activeStart = profileStart > rangeStart ? profileStart : rangeStart;

  if (activeStart > rangeEnd) return 0;

  return daysBetweenInclusive(activeStart, rangeEnd);
};

const getProfileAgeDaysUntil = (profileCreatedAt: Date, date: Date) => {
  const profileStart = startOfDate(profileCreatedAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

const buildBusinessProfileConversion = (input: {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
}): AdminPsychologistBusinessProfileConversion => {
  const signals = {
    activeDays: input.activeDays,
    benchmark: input.benchmark,
    profileAgeDays: input.profileAgeDays,
    whatsappClicks: input.whatsappClicks,
  };
  const categoryId = classifyBusinessProfileConversionCategory(signals);
  const config = BUSINESS_PROFILE_CONVERSION_CATEGORY_CONFIG[categoryId];
  const qualityId = classifyAdminProfileConversionQuality(signals);
  const qualityConfig = ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG[qualityId];
  const platformPositionId = classifyAdminProfileConversionPlatformPosition(signals);
  const platformPositionConfig =
    ADMIN_PROFILE_CONVERSION_PLATFORM_POSITION_CONFIG[platformPositionId];
  const normalizedWhatsappClicks30d = normalizeAdminProfileConversionToThirtyDays(
    signals.whatsappClicks,
    signals.activeDays,
  );

  return {
    benchmark: input.benchmark,
    description: config.description,
    headline: buildAdminProfileConversionHeadline({
      platformPositionId,
      qualityId,
    }),
    id: categoryId,
    label: config.label,
    platform_position: {
      description: platformPositionConfig.description,
      id: platformPositionId,
      label: platformPositionConfig.label,
      reference_whatsapp_clicks: input.benchmark.p50_whatsapp_clicks,
    },
    quality: {
      description: qualityConfig.description,
      id: qualityId,
      label: qualityConfig.label,
      normalized_whatsapp_clicks_30d: normalizedWhatsappClicks30d,
      thresholds: ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS,
    },
    signals: {
      active_days: signals.activeDays,
      normalized_whatsapp_clicks_30d: normalizedWhatsappClicks30d,
      profile_age_days: signals.profileAgeDays,
      whatsapp_clicks: signals.whatsappClicks,
    },
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
    thresholds: ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  };
};

type VisibilityAttentionSecondsByPsychologistRecord = {
  attention_seconds: number | null;
  psychologist_id: string | null;
};

const sumAttentionByPsychologist = (records: VisibilityAttentionSecondsByPsychologistRecord[]) => {
  const counts = new Map<string, number>();

  for (const record of records) {
    if (!record.psychologist_id) continue;

    counts.set(
      record.psychologist_id,
      (counts.get(record.psychologist_id) ?? 0) + normalizeSeconds(record.attention_seconds),
    );
  }

  return counts;
};

const sumCommunityAttentionByPsychologist = sumAttentionByPsychologist;
const sumVideoAttentionByPsychologist = sumAttentionByPsychologist;

const visibilitySecondsFromAttention = (input: {
  communityContentSeconds: number;
  presentationVideoSeconds: number;
  profileSeconds: number;
}) =>
  roundAdminProfileExposureNumber(
    Math.max(0, input.communityContentSeconds) +
      Math.max(0, Math.max(input.profileSeconds, input.presentationVideoSeconds)),
  );

const buildBusinessVisibilityDiagnosis = (input: {
  benchmarkCommunityContentAttentionSeconds: VisibilityAttentionSecondsByPsychologistRecord[];
  benchmarkProfileAttentionSeconds: VisibilityAttentionSecondsByPsychologistRecord[];
  benchmarkProfileVideoAttentionSeconds: VisibilityAttentionSecondsByPsychologistRecord[];
  benchmarkProfiles: { user: { createdAt: Date }; user_id: string }[];
  communityContentSeconds: number;
  periodEnd: Date;
  presentationVideoSeconds: number;
  profileAgeDays: number;
  profileSeconds: number;
}): AdminPsychologistVisibilityDiagnosis => {
  const profileAttentionCounts = sumAttentionByPsychologist(input.benchmarkProfileAttentionSeconds);
  const communityContentAttentionCounts = sumCommunityAttentionByPsychologist(
    input.benchmarkCommunityContentAttentionSeconds,
  );
  const profileVideoAttentionCounts = sumVideoAttentionByPsychologist(
    input.benchmarkProfileVideoAttentionSeconds,
  );
  const eligibleBenchmarkProfiles = input.benchmarkProfiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile.user.createdAt, input.periodEnd) >=
      ADMIN_PROFILE_EXPOSURE_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileExposureBenchmark({
    communityVisibilitySeconds: eligibleBenchmarkProfiles.map((profile) =>
      roundAdminProfileExposureNumber(communityContentAttentionCounts.get(profile.user_id) ?? 0),
    ),
    eligiblePsychologists: eligibleBenchmarkProfiles.length,
    exposureScores: eligibleBenchmarkProfiles.map((profile) =>
      visibilitySecondsFromAttention({
        communityContentSeconds: communityContentAttentionCounts.get(profile.user_id) ?? 0,
        presentationVideoSeconds: profileVideoAttentionCounts.get(profile.user_id) ?? 0,
        profileSeconds: profileAttentionCounts.get(profile.user_id) ?? 0,
      }),
    ),
    presentationVideoSeconds: eligibleBenchmarkProfiles.map((profile) =>
      roundAdminProfileExposureNumber(profileVideoAttentionCounts.get(profile.user_id) ?? 0),
    ),
  });
  const signals = {
    community_content_seconds: roundAdminProfileExposureNumber(input.communityContentSeconds),
    presentation_video_seconds: roundAdminProfileExposureNumber(input.presentationVideoSeconds),
    profile_age_days: input.profileAgeDays,
    profile_seconds: roundAdminProfileExposureNumber(input.profileSeconds),
    visibility_seconds: visibilitySecondsFromAttention({
      communityContentSeconds: input.communityContentSeconds,
      presentationVideoSeconds: input.presentationVideoSeconds,
      profileSeconds: input.profileSeconds,
    }),
  } satisfies AdminPsychologistVisibilityDiagnosis["signals"];
  const categoryId = classifyAdminProfileExposureAggregateCategory({
    benchmark,
    signals: {
      exposureScore: signals.visibility_seconds,
      profileAgeDays: signals.profile_age_days,
    },
  });
  const config = BUSINESS_VISIBILITY_DIAGNOSIS_CONFIG[categoryId];

  return {
    benchmark,
    description: config.description,
    id: categoryId,
    label: config.label,
    signals,
    source: PROFILE_VISIBILITY_TEMPORAL_SOURCE,
    thresholds: ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  };
};

const CONTENT_FORMAT_ORDER = ["text", "video", "image", "image_carousel"] as const;

const CONTENT_FORMAT_LABELS = {
  image: "Imagem",
  image_carousel: "Carrossel de imagens",
  text: "Apenas texto",
  video: "Vídeo",
} satisfies Record<
  AdminPsychologistContentFormatId,
  AdminPsychologistContentFormatDistribution["items"][number]["label"]
>;

const emptyContentFormatCounts = () =>
  ({
    image: 0,
    image_carousel: 0,
    text: 0,
    video: 0,
  }) satisfies Record<AdminPsychologistContentFormatId, number>;

const normalizeContentMediaType = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const classifyPostContentFormat = (
  post: AdminPsychologistEngagementPost,
): AdminPsychologistContentFormatId => {
  const mediaItems = post.media_items.filter((item) => item.media_url);
  const mediaTypes = mediaItems.map((item) => normalizeContentMediaType(item.media_type));
  const legacyMediaType = post.media_url ? normalizeContentMediaType(post.media_type) : "";
  const hasVideo = mediaTypes.includes("video") || legacyMediaType === "video";
  if (hasVideo) return "video";

  const imageItemsCount = mediaTypes.filter((type) => type === "image").length;
  if (imageItemsCount > 1) return "image_carousel";
  if (imageItemsCount === 1 || legacyMediaType === "image") return "image";

  return "text";
};

const classifyReplyContentFormat = (
  reply: AdminPsychologistEngagementReply,
): AdminPsychologistContentFormatId => {
  const mediaType = reply.media_url ? normalizeContentMediaType(reply.media_type) : "";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "image";

  return "text";
};

type PatientPostReplyCoverageKind = "text" | "video";

type PatientPostReplyCoverageEntry = {
  createdAt: Date;
  kind: PatientPostReplyCoverageKind;
};

const buildPatientPostReplyCoverageEntries = (
  replies: AdminPsychologistEngagementReply[],
): PatientPostReplyCoverageEntry[] => {
  const coverageByPost = new Map<
    string,
    {
      textCreatedAt: Date | null;
      videoCreatedAt: Date | null;
    }
  >();

  for (const reply of replies) {
    if (reply.post.author.role !== "paciente") continue;

    const current = coverageByPost.get(reply.post.id) ?? {
      textCreatedAt: null,
      videoCreatedAt: null,
    };

    if (classifyReplyContentFormat(reply) === "video") {
      current.videoCreatedAt = earlierDate(current.videoCreatedAt, reply.createdAt);
    } else {
      current.textCreatedAt = earlierDate(current.textCreatedAt, reply.createdAt);
    }

    coverageByPost.set(reply.post.id, current);
  }

  return [...coverageByPost.values()].flatMap((coverage): PatientPostReplyCoverageEntry[] => {
    if (coverage.videoCreatedAt) {
      return [{ createdAt: coverage.videoCreatedAt, kind: "video" as const }];
    }

    if (coverage.textCreatedAt) {
      return [{ createdAt: coverage.textCreatedAt, kind: "text" as const }];
    }

    return [];
  });
};

const countPatientPostReplyCoverage = (
  entries: PatientPostReplyCoverageEntry[],
  kind: PatientPostReplyCoverageKind,
) => entries.filter((entry) => entry.kind === kind).length;

const buildContentFormatDistribution = <T>(
  items: T[],
  classify: (item: T) => AdminPsychologistContentFormatId,
): AdminPsychologistContentFormatDistribution => {
  const counts = emptyContentFormatCounts();

  for (const item of items) {
    counts[classify(item)] += 1;
  }

  const total = items.length;

  return {
    items: CONTENT_FORMAT_ORDER.map((id) => ({
      count: counts[id],
      id,
      label: CONTENT_FORMAT_LABELS[id],
      percentage: total > 0 ? roundPercent((counts[id] / total) * 100) : 0,
    })),
    total,
  };
};

const PLATFORM_DEVICE_TYPES = ["desktop", "mobile", "tablet", "unknown"] as const;
type PlatformDeviceType = (typeof PLATFORM_DEVICE_TYPES)[number];

const PLATFORM_DEVICE_LABELS: Record<PlatformDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

const normalizePlatformDeviceType = (value: string | null | undefined): PlatformDeviceType => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildPlatformDeviceUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts: Record<PlatformDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const operatingSystemCounts = new Map<
    PlatformDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    PLATFORM_DEVICE_TYPES.map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizePlatformDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    const countsByOperatingSystem = operatingSystemCounts.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
  }

  const totalSessions = sessions.length;

  return {
    items: PLATFORM_DEVICE_TYPES.map((deviceType) => {
      const deviceTotal = counts[deviceType];
      const countsByOperatingSystem = operatingSystemCounts.get(deviceType);

      return {
        count: deviceTotal,
        device_type: deviceType,
        id: deviceType,
        label: PLATFORM_DEVICE_LABELS[deviceType],
        operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
          count: countsByOperatingSystem?.[operatingSystem] ?? 0,
          id: operatingSystem,
          label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
          operating_system: operatingSystem,
          percentage:
            deviceTotal > 0
              ? roundPercent(
                  ((countsByOperatingSystem?.[operatingSystem] ?? 0) / deviceTotal) * 100,
                )
              : 0,
        }))
          .filter((operatingSystem) => operatingSystem.count > 0)
          .sort((left, right) => {
            if (right.count !== left.count) return right.count - left.count;

            return left.label.localeCompare(right.label, "pt-BR");
          }),
        percentage: totalSessions > 0 ? roundPercent((deviceTotal / totalSessions) * 100) : 0,
      };
    }).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.device_type+visitor_session.os+user_id" as const,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas do psicólogo por dispositivo no período selecionado."
        : null,
  };
};

const latestPlatformAccessAt = (params: {
  pageViews: Array<{ occurred_at: Date }>;
  sessions: Array<{ last_seen_at: Date }>;
}) => {
  const dates = [
    ...params.pageViews.map((view) => view.occurred_at),
    ...params.sessions.map((session) => session.last_seen_at),
  ];

  return dates.reduce<Date | null>(
    (latest, current) => (!latest || current > latest ? current : latest),
    null,
  );
};

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const buildComparison = (
  current: number,
  previous: number,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistMetricComparison => {
  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
};

const buildPositionComparison = (
  current: number,
  previous: number | null,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistMetricComparison => {
  if (previous === null) {
    return {
      change_percent: null,
      previous_from: period.previous_from,
      previous_to: period.previous_to,
      previous_value: 0,
      trend: "unavailable",
    };
  }

  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: current < previous ? "up" : current > previous ? "down" : "flat",
  };
};

const groupDateCounts = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

const normalizeSeconds = (value: number | null | undefined) => {
  const seconds = Number(value ?? 0);

  if (!Number.isFinite(seconds) || seconds <= 0) return 0;

  return Math.round(seconds);
};

const groupDateSums = <T extends { createdAt: Date }>(
  items: T[],
  labels: string[],
  getValue: (item: T) => number | null | undefined,
) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (!counts.has(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + normalizeSeconds(getValue(item)));
  }

  return counts;
};

const valueFromMap = (map: Map<string, number>, key: string) => map.get(key) ?? 0;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const buildVisibilitySecondsByDate = (input: {
  communityContentAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  labels: string[];
  profileAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  videoSessions: { createdAt: Date; watched_seconds: number }[];
}) => {
  const profileAttentionSeconds = groupDateSums(
    input.profileAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  );
  const videoAttentionSeconds = groupDateSums(input.videoSessions, input.labels, (item) => {
    return item.watched_seconds;
  });
  const communityAttentionSeconds = groupDateSums(
    input.communityContentAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  );

  return new Map(
    input.labels.map((label) => {
      const profileSurfaceSeconds = Math.max(
        valueFromMap(profileAttentionSeconds, label),
        valueFromMap(videoAttentionSeconds, label),
      );
      const communitySeconds = valueFromMap(communityAttentionSeconds, label);

      return [label, profileSurfaceSeconds + communitySeconds];
    }),
  );
};

type VisibilityBreakdownMapsByDate = {
  communityContentSeconds: Map<string, number>;
  presentationVideoSeconds: Map<string, number>;
  profileSeconds: Map<string, number>;
};

const buildVisibilityBreakdownMapsByDate = (input: {
  communityContentAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  labels: string[];
  profileAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  videoSessions: { createdAt: Date; watched_seconds: number }[];
}): VisibilityBreakdownMapsByDate => ({
  communityContentSeconds: groupDateSums(
    input.communityContentAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  ),
  presentationVideoSeconds: groupDateSums(input.videoSessions, input.labels, (item) => {
    return item.watched_seconds;
  }),
  profileSeconds: groupDateSums(input.profileAttentionSessions, input.labels, (item) => {
    return item.attention_seconds;
  }),
});

const buildVisibilityBreakdownSeries = (
  labels: string[],
  maps: VisibilityBreakdownMapsByDate,
): AdminPsychologistStatisticsDTO["business"]["visibility"]["series"] =>
  labels.map((date) => {
    const profileSeconds = valueFromMap(maps.profileSeconds, date);
    const presentationVideoSeconds = valueFromMap(maps.presentationVideoSeconds, date);
    const communityContentSeconds = valueFromMap(maps.communityContentSeconds, date);

    return {
      community_content_seconds: communityContentSeconds,
      date,
      presentation_video_seconds: presentationVideoSeconds,
      profile_seconds: profileSeconds,
      total_seconds: profileSeconds + presentationVideoSeconds + communityContentSeconds,
    };
  });

const sumMapValues = (map: Map<string, number>) => sum([...map.values()]);

const sumVisibilitySecondsByDate = (visibilitySecondsByDate: Map<string, number>) =>
  sum([...visibilitySecondsByDate.values()]);

const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

const normalizeString = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const excerpt = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

const mediaFromPost = (post: AdminPsychologistEngagementPost) => {
  const first = post.media_items[0];
  const url = first?.media_url ?? post.media_url;
  const type = first?.media_type ?? post.media_type;

  return url ? { type: type ?? null, url } : null;
};

const mediaFromReply = (reply: AdminPsychologistEngagementReply) =>
  reply.media_url ? { type: reply.media_type ?? null, url: reply.media_url } : null;

const toCountMap = <T extends Record<string, unknown>>(items: T[], key: keyof T) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const rawKey = item[key];
    if (typeof rawKey !== "string") continue;
    map.set(rawKey, (map.get(rawKey) ?? 0) + 1);
  }

  return map;
};

const groupCountMap = <T extends { _count: { _all: number } }>(
  items: T[],
  getKey: (item: T) => string | null,
) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map.set(key, item._count._all);
  }

  return map;
};

const buildSeries = (input: {
  commentsReceived: { createdAt: Date }[];
  coverageRatePercentByDate?: Map<string, number>;
  favorites: { createdAt: Date }[];
  labels: string[];
  postShares: { createdAt: Date }[];
  postSaves: { createdAt: Date }[];
  postVotes: { createdAt: Date; value: number }[];
  posts: { createdAt: Date }[];
  profileViews: { createdAt: Date }[];
  replies: AdminPsychologistEngagementReply[];
  reviews: { createdAt: Date }[];
  replyShares: { createdAt: Date }[];
  replySaves: { createdAt: Date }[];
  replyVotes: { createdAt: Date; value: number }[];
  searchResults: { createdAt: Date }[];
  visibilitySecondsByDate?: Map<string, number>;
  whatsappClicks: { createdAt: Date }[];
}): AdminPsychologistStatisticsSeriesPoint[] => {
  const profileViews = groupDateCounts(input.profileViews, input.labels);
  const whatsappClicks = groupDateCounts(input.whatsappClicks, input.labels);
  const favorites = groupDateCounts(input.favorites, input.labels);
  const reviews = groupDateCounts(input.reviews, input.labels);
  const searchResults = groupDateCounts(input.searchResults, input.labels);
  const posts = groupDateCounts(input.posts, input.labels);
  const replies = groupDateCounts(input.replies, input.labels);
  const patientPostReplyCoverageEntries = buildPatientPostReplyCoverageEntries(input.replies);
  const patientPostTextReplyCoverage = groupDateCounts(
    patientPostReplyCoverageEntries.filter((entry) => entry.kind === "text"),
    input.labels,
  );
  const patientPostVideoReplyCoverage = groupDateCounts(
    patientPostReplyCoverageEntries.filter((entry) => entry.kind === "video"),
    input.labels,
  );
  const commentsReceived = groupDateCounts(input.commentsReceived, input.labels);
  const saves = groupDateCounts([...input.postSaves, ...input.replySaves], input.labels);
  const upvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === 1),
    input.labels,
  );
  const downvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === -1),
    input.labels,
  );
  const shares = groupDateCounts([...input.postShares, ...input.replyShares], input.labels);
  const coverageRatePercentByDate = input.coverageRatePercentByDate ?? new Map<string, number>();
  const visibilitySecondsByDate = input.visibilitySecondsByDate ?? new Map<string, number>();

  return input.labels.map((date) => ({
    comments_received: valueFromMap(commentsReceived, date),
    coverage_rate_percent: valueFromMap(coverageRatePercentByDate, date),
    date,
    downvotes: valueFromMap(downvotes, date),
    favorites: valueFromMap(favorites, date),
    patient_post_reply_coverage:
      valueFromMap(patientPostTextReplyCoverage, date) +
      valueFromMap(patientPostVideoReplyCoverage, date),
    patient_post_text_reply_coverage: valueFromMap(patientPostTextReplyCoverage, date),
    patient_post_video_reply_coverage: valueFromMap(patientPostVideoReplyCoverage, date),
    profile_views: valueFromMap(profileViews, date),
    replies: valueFromMap(replies, date),
    reviews: valueFromMap(reviews, date),
    saves: valueFromMap(saves, date),
    search_results: valueFromMap(searchResults, date),
    shares: valueFromMap(shares, date),
    visibility_seconds: valueFromMap(visibilitySecondsByDate, date),
    whatsapp_clicks: valueFromMap(whatsappClicks, date),
    upvotes: valueFromMap(upvotes, date),
    posts: valueFromMap(posts, date),
  }));
};

type VideoSessions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoSessions"]>
>;

type VideoActionEvents = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoActionEvents"]>
>;

type SearchResultImpressions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listSearchResultImpressions"]>
>;

const countVideoActionEvents = (actions: VideoActionEvents) => {
  const counts = new Map<ProfileVideoActionType, number>(
    PROFILE_VIDEO_ACTION_TYPES.map((actionType) => [actionType, 0]),
  );

  for (const action of actions) {
    const actionType = action.action_type as ProfileVideoActionType;
    if (!counts.has(actionType)) continue;
    counts.set(actionType, (counts.get(actionType) ?? 0) + 1);
  }

  return {
    favorites_from_video: counts.get("psychologist_video_favorite") ?? 0,
    profile_accesses_from_video: counts.get("psychologist_video_profile_access") ?? 0,
    shares_from_video: counts.get("psychologist_video_share") ?? 0,
    whatsapp_clicks_from_video: counts.get("psychologist_video_whatsapp_click") ?? 0,
  };
};

const videoPercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
};

const averageSearchResultPosition = (impressions: SearchResultImpressions) => {
  const positions = impressions
    .map((impression) => impression.search_result_position)
    .filter(
      (position): position is number =>
        typeof position === "number" && Number.isFinite(position) && position > 0,
    );

  if (positions.length === 0) return null;

  return Math.round((sum(positions) / positions.length) * 10) / 10;
};

const buildExplorePositionMetric = (
  current: SearchResultImpressions,
  previous: SearchResultImpressions,
  period: AdminPsychologistStatisticsPeriod,
) => {
  const currentPosition = averageSearchResultPosition(current);
  const previousPosition = averageSearchResultPosition(previous);

  return metric({
    available: currentPosition !== null,
    comparison:
      currentPosition !== null
        ? buildPositionComparison(currentPosition, previousPosition, period)
        : null,
    id: "average_explore_position",
    label: "Posição média no Explorar",
    source: VIDEO_EXPLORE_POSITION_SOURCE,
    unavailable_reason:
      currentPosition !== null
        ? null
        : "Nenhuma impressão real com posição confiável foi registrada no Explorar no período.",
    unit: "position",
    value: currentPosition,
  });
};

const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

const deriveRetentionBucketsFromPosition = (
  maxPositionSeconds: number,
  durationSeconds: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (durationSeconds <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPositionSeconds / durationSeconds) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
};

const buildSessionRetentionBuckets = (session: VideoSessions[number]) => {
  const persistedBuckets = normalizeRetentionBuckets(session.retention_buckets);
  const derivedBuckets = deriveRetentionBucketsFromPosition(
    session.max_position_seconds,
    session.duration_seconds,
    session.completed || session.milestone_100,
  );
  const legacyMilestones = [
    session.milestone_25 ? 25 : null,
    session.milestone_50 ? 50 : null,
    session.milestone_75 ? 75 : null,
    session.milestone_100 ? 100 : null,
  ].filter((bucket): bucket is number => typeof bucket === "number");

  return new Set([...persistedBuckets, ...derivedBuckets, ...legacyMilestones]);
};

const filterCurrentPresentationVideoSessions = (
  sessions: VideoSessions,
  profile: { user_id: string; video_url: string | null },
) => {
  if (!profile.video_url) return [];

  return sessions.filter(
    (session) =>
      session.video_url === profile.video_url &&
      (session.viewer_id === null || session.viewer_id !== profile.user_id) &&
      (session.watched_seconds > 0 ||
        session.max_position_seconds > 0 ||
        session.completed ||
        session.milestone_100),
  );
};

const buildVideoMetrics = (sessions: VideoSessions) => {
  const total = sessions.length;
  const sessionRetentionBuckets = sessions.map(buildSessionRetentionBuckets);
  const completions = sessionRetentionBuckets.filter((buckets) => buckets.has(100)).length;
  const replaySessions = sessions.filter((session) => session.replay_count > 0).length;
  const durationSeconds =
    sessions.reduce((max, session) => Math.max(max, session.duration_seconds), 0) || null;
  const totalWatchedSeconds = sum(sessions.map((session) => session.watched_seconds));
  const averageWatchSeconds = total > 0 ? Math.round(totalWatchedSeconds / total) : 0;
  const averageRetention =
    total > 0 && durationSeconds
      ? videoPercentage(Math.min(averageWatchSeconds, durationSeconds), durationSeconds)
      : 0;

  return {
    average_watch_seconds: averageWatchSeconds,
    average_retention_percent: averageRetention,
    completions,
    duration_seconds: durationSeconds,
    replay_rate_percent: total > 0 ? roundPercent((replaySessions / total) * 100) : 0,
    sessions: total,
  };
};

const buildVideoRetention = (
  sessions: VideoSessions,
): AdminPsychologistStatisticsDTO["video"]["retention"] => {
  const total = sessions.length;
  const sessionRetentionBuckets = sessions.map(buildSessionRetentionBuckets);

  return RETENTION_BUCKETS.map((bucket) => {
    const viewers = sessionRetentionBuckets.filter((buckets) => buckets.has(bucket)).length;

    return {
      label: `${bucket}%`,
      percentage: videoPercentage(viewers, total),
      position_percent: bucket,
    };
  });
};

const buildVideoRetentionDropoff = (
  retention: AdminPsychologistStatisticsDTO["video"]["retention"],
  durationSeconds: number | null,
  sessionsCount: number,
): AdminPsychologistStatisticsDTO["video"]["retention_dropoff"] => {
  const retentionTimeline = [
    {
      percentage: sessionsCount > 0 ? 100 : 0,
      position_percent: 0,
    },
    ...retention,
  ];
  let dropoff: AdminPsychologistStatisticsDTO["video"]["retention_dropoff"] = null;

  for (let index = 1; index < retentionTimeline.length; index += 1) {
    const previous = retentionTimeline[index - 1]!;
    const current = retentionTimeline[index]!;
    const rateDrop = Math.max(0, previous.percentage - current.percentage);

    if (rateDrop > (dropoff?.rate_drop ?? 0)) {
      dropoff = {
        from_milestone: previous.position_percent,
        to_milestone: current.position_percent,
        rate_drop: rateDrop,
        from_seconds: durationSeconds
          ? Math.round((durationSeconds * previous.position_percent) / 100)
          : 0,
        to_seconds: durationSeconds
          ? Math.round((durationSeconds * current.position_percent) / 100)
          : 0,
      };
    }
  }

  if (!dropoff || dropoff.rate_drop <= 0) return null;

  return dropoff;
};

const buildVideo = (
  profile: {
    cover_image_url: string | null;
    user_id: string;
    video_cover_url: string | null;
    video_url: string | null;
  },
  sessions: VideoSessions,
  previousSessions: VideoSessions,
  actions: VideoActionEvents,
  previousActions: VideoActionEvents,
  searchResults: SearchResultImpressions,
  previousSearchResults: SearchResultImpressions,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistStatisticsDTO["video"] => {
  const currentVideoSessions = filterCurrentPresentationVideoSessions(sessions, profile);
  const previousCurrentVideoSessions = filterCurrentPresentationVideoSessions(
    previousSessions,
    profile,
  );
  const total = currentVideoSessions.length;
  const metrics = buildVideoMetrics(currentVideoSessions);
  const previousMetrics = buildVideoMetrics(previousCurrentVideoSessions);
  const actionMetrics = countVideoActionEvents(actions);
  const previousActionMetrics = countVideoActionEvents(previousActions);
  const retention = buildVideoRetention(currentVideoSessions);
  const retentionDropoff = buildVideoRetentionDropoff(
    retention,
    metrics.duration_seconds,
    metrics.sessions,
  );
  const { duration_seconds: durationSeconds, ...metricValues } = metrics;

  return {
    available: total > 0,
    comparisons: {
      average_retention_percent: buildComparison(
        metrics.average_retention_percent,
        previousMetrics.average_retention_percent,
        period,
      ),
      favorites_from_video: buildComparison(
        actionMetrics.favorites_from_video,
        previousActionMetrics.favorites_from_video,
        period,
      ),
      profile_accesses_from_video: buildComparison(
        actionMetrics.profile_accesses_from_video,
        previousActionMetrics.profile_accesses_from_video,
        period,
      ),
      replay_rate_percent: buildComparison(
        metrics.replay_rate_percent,
        previousMetrics.replay_rate_percent,
        period,
      ),
      shares_from_video: buildComparison(
        actionMetrics.shares_from_video,
        previousActionMetrics.shares_from_video,
        period,
      ),
      sessions: buildComparison(metrics.sessions, previousMetrics.sessions, period),
      whatsapp_clicks_from_video: buildComparison(
        actionMetrics.whatsapp_clicks_from_video,
        previousActionMetrics.whatsapp_clicks_from_video,
        period,
      ),
    },
    cover_url: profile.video_cover_url ?? profile.cover_image_url,
    duration_seconds: durationSeconds,
    explore_position: buildExplorePositionMetric(searchResults, previousSearchResults, period),
    metrics: {
      ...metricValues,
      ...actionMetrics,
    },
    retention,
    retention_dropoff: retentionDropoff,
    source: PRESENTATION_VIDEO_ANALYSIS_SOURCE,
    unavailable_reason:
      total > 0 ? null : "Nenhuma sessão real de vídeo foi registrada no período.",
    video_url: profile.video_url,
  };
};

type WhatsappTrafficActions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listWhatsappTrafficActions"]>
>;
type CommunityTrafficPlatformMetricDataset = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listCommunityTrafficPlatformMetricDataset"]>
>;
type ProfileTrafficPlatformMetricDataset = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listProfileTrafficPlatformMetricDataset"]>
>;
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
  views: number;
  visibilitySeconds: number;
};

const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "page_view_event+content_attention_session+content_video_watch_session+post_vote+post_save+post_reply_save+post_share+post_reply" as const;
const PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_view_event.source=profile_page+page_view_event.page_kind=psychologist_profile.duration_seconds+profile_video_watch_session+psychologist_favorite+important_action_event.action_type=psychologist_profile_publications_tab_open|psychologist_profile_reviews_tab_open" as const;
const PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "profile_video_watch_session+important_action_event.action_type=psychologist_video_profile_access|psychologist_video_favorite|psychologist_video_share" as const;
const PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION = "psychologist_video_profile_access";
const PRESENTATION_VIDEO_FAVORITE_ACTION = "psychologist_video_favorite";
const PRESENTATION_VIDEO_SHARE_ACTION = "psychologist_video_share";
const PROFILE_TRAFFIC_PLATFORM_PUBLICATIONS_TAB_ACTION =
  "psychologist_profile_publications_tab_open";
const PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION = "psychologist_profile_reviews_tab_open";
const COMMUNITY_TRAFFIC_PROFILE_ACCESS_ATTRIBUTION_WINDOW_MS = 30 * 60 * 1000;
const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS: CommunityTrafficPlatformMetricSourceId[] = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
];

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
  views: 0,
  visibilitySeconds: 0,
});

const isCommunityTrafficVideoMedia = (item: {
  media_items?: Array<{ media_type: string | null }>;
  media_type: string | null;
}) => {
  const mediaTypes = [
    item.media_type,
    ...(item.media_items?.map((mediaItem) => mediaItem.media_type) ?? []),
  ];

  return mediaTypes.some((mediaType) => mediaType === "video");
};

const isCommunityTrafficPostTargetType = (targetType: string | null) =>
  targetType === "community_post" || targetType === "post";

const isCommunityTrafficReplyTargetType = (targetType: string | null) =>
  targetType === "post_reply" || targetType === "reply";

const buildTrafficPlatformMetric = (
  source: string,
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source,
  unavailable_reason: metric.unavailable_reason ?? null,
});

const metricValueForExistingBase = (total: number, baseCount: number) =>
  baseCount > 0 ? roundOneDecimal(total) : null;

const buildCommunityTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
) => buildTrafficPlatformMetric(COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE, metric);

const buildCommunityTrafficPlatformMetrics = (dataset: CommunityTrafficPlatformMetricDataset) => {
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

  const pageViewsBySession = new Map<string, CommunityTrafficPlatformMetricDataset["pageViews"]>();

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

  const unavailableForNoContent = (contentCount: number) =>
    contentCount > 0
      ? null
      : "Sem conteúdo publicado nesta categoria até o fim do período selecionado.";
  const buildTotalCommunityTrafficMetric = (
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
      unavailable_reason: unavailableForNoContent(totals.contentCount),
      unit: metric.unit ?? "count",
      value: metricValueForExistingBase(metric.total, totals.contentCount),
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
          ? roundOneDecimal(totals.retentionTotalPercent / totals.retentionSamples)
          : null;
      const commonMetrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildTotalCommunityTrafficMetric(totals, {
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
              buildTotalCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]
          : [
              buildTotalCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]),
        buildTotalCommunityTrafficMetric(totals, {
          id: "profile_accesses",
          label: "Acessos ao perfil",
          total: totals.profileAccesses,
        }),
        buildTotalCommunityTrafficMetric(totals, {
          id: "upvotes",
          label: "Upvotes",
          total: totals.upvotes,
        }),
        buildTotalCommunityTrafficMetric(totals, {
          id: "downvotes",
          label: "Downvotes",
          total: totals.downvotes,
        }),
        buildTotalCommunityTrafficMetric(totals, {
          id: "comments",
          label: "Comentários",
          total: totals.comments,
        }),
        buildTotalCommunityTrafficMetric(totals, {
          id: "saves",
          label: "Salvamentos",
          total: totals.saves,
        }),
        buildTotalCommunityTrafficMetric(totals, {
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

const buildProfileTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
) => buildTrafficPlatformMetric(PROFILE_TRAFFIC_PLATFORM_METRIC_SOURCE, metric);

const hasProfileTrafficVideoViewSignal = (
  session: ProfileTrafficPlatformMetricDataset["videoWatchSessions"][number],
) =>
  session.watched_seconds > 0 ||
  session.max_position_seconds > 0 ||
  session.completed ||
  session.milestone_100;

const buildProfileTrafficPlatformMetrics = (dataset: ProfileTrafficPlatformMetricDataset) => {
  const pageViewDurations = dataset.pageViews.flatMap((view) => {
    if (!view.target_id) return [];
    if (view.user_id && view.user_id === view.target_id) return [];
    if (typeof view.duration_seconds !== "number" || view.duration_seconds <= 0) return [];

    return [view.duration_seconds];
  });
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
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
      event.user_id !== event.target_id,
  );
  const reviewsTabOpens = dataset.tabActions.filter(
    (event) =>
      event.action_type === PROFILE_TRAFFIC_PLATFORM_REVIEWS_TAB_ACTION &&
      event.target_id &&
      event.user_id !== event.target_id,
  );
  const totalDuration = pageViewDurations.reduce((total, value) => total + value, 0);
  const averageRetention =
    retentionSamples.length > 0
      ? roundOneDecimal(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;

  const metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
    buildProfileTrafficPlatformMetric({
      id: "profile_openings",
      label: "Aberturas de perfil",
      unit: "count",
      value: dataset.profileViews.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_stay_time",
      label: "Tempo de permanência",
      unit: "seconds",
      value: totalDuration,
    }),
    buildProfileTrafficPlatformMetric({
      id: "presentation_video_views",
      label: "Views do vídeo de apresentação",
      unit: "count",
      value: videoWatchSessions.length,
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
      unit: "count",
      value: dataset.favorites.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_publications_tab_opens",
      label: "Abertura da aba Publicações",
      unit: "count",
      value: publicationTabOpens.length,
    }),
    buildProfileTrafficPlatformMetric({
      id: "profile_reviews_tab_opens",
      label: "Abertura da aba Avaliações",
      unit: "count",
      value: reviewsTabOpens.length,
    }),
  ];

  return { consideredCount: 1, metrics };
};

const buildPresentationVideoTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
) => buildTrafficPlatformMetric(PRESENTATION_VIDEO_TRAFFIC_PLATFORM_METRIC_SOURCE, metric);

const buildPresentationVideoTrafficPlatformMetrics = (
  profile: { user_id: string; video_url: string | null },
  dataset: ProfileTrafficPlatformMetricDataset,
) => {
  const videoCount = profile.video_url?.trim() ? 1 : 0;
  const noVideoReason = "Sem vídeo de apresentação publicado até o fim do período selecionado.";
  const countUnavailableReason = videoCount > 0 ? null : noVideoReason;
  const videoWatchSessions = dataset.videoWatchSessions.filter(
    (session) =>
      session.psychologist_id === profile.user_id &&
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
      ? roundOneDecimal(
          retentionSamples.reduce((total, value) => total + value, 0) / retentionSamples.length,
        )
      : null;
  const totalStaySeconds = roundOneDecimal(
    videoStaySeconds.reduce((total, value) => total + value, 0),
  );
  const replayRate =
    videoWatchSessions.length > 0
      ? roundOneDecimal(
          (videoWatchSessions.filter((session) => session.replay_count > 0).length /
            videoWatchSessions.length) *
            100,
        )
      : null;
  const videoActions = dataset.videoActions.filter(
    (event) =>
      event.target_id &&
      event.target_id === profile.user_id &&
      (!event.user_id || event.user_id !== event.target_id),
  );
  const videoActionsBySource = new Map<
    Extract<AdminPsychologistWhatsappTrafficOriginSourceId, "explore" | "search_filters">,
    Map<string, number>
  >([
    ["explore", new Map<string, number>()],
    ["search_filters", new Map<string, number>()],
  ]);

  for (const event of videoActions) {
    const sourceId = hasSearchFilterTrafficParams(event.path) ? "search_filters" : "explore";
    const sourceTotals = videoActionsBySource.get(sourceId);
    if (!sourceTotals) continue;

    sourceTotals.set(event.action_type, (sourceTotals.get(event.action_type) ?? 0) + 1);
  }

  const sourceUnavailableReason = (metricUnavailableReason: string) =>
    videoCount <= 0 ? noVideoReason : metricUnavailableReason;
  const countValue = (value: number) => (videoCount > 0 ? value : null);

  const metrics = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    (["explore", "search_filters"] as const).map((sourceId) => {
      const actionTotals = videoActionsBySource.get(sourceId) ?? new Map<string, number>();
      const sourceMetrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildPresentationVideoTrafficPlatformMetric({
          id: "views",
          label: "Visualizações",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(videoWatchSessions.length),
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
            videoStaySeconds.length === 0
              ? sourceUnavailableReason("Sem sessões reais do vídeo de apresentação no período.")
              : null,
          unit: "seconds",
          value: videoCount > 0 ? totalStaySeconds : null,
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
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_PROFILE_ACCESS_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "favorites",
          label: "Favoritado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_FAVORITE_ACTION) ?? 0),
        }),
        buildPresentationVideoTrafficPlatformMetric({
          id: "shares",
          label: "Compartilhado",
          unavailable_reason: countUnavailableReason,
          unit: "count",
          value: countValue(actionTotals.get(PRESENTATION_VIDEO_SHARE_ACTION) ?? 0),
        }),
      ];

      return [sourceId, sourceMetrics];
    }),
  );
  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>([
    ["explore", videoCount],
    ["search_filters", videoCount],
  ]);

  return { consideredCounts, metrics };
};

const buildTrafficPlatformMetrics = (params: {
  communityDataset: CommunityTrafficPlatformMetricDataset;
  profile: { user_id: string; video_url: string | null };
  profileDataset: ProfileTrafficPlatformMetricDataset;
}) => {
  const community = buildCommunityTrafficPlatformMetrics(params.communityDataset);
  const profile = buildProfileTrafficPlatformMetrics(params.profileDataset);
  const presentationVideo = buildPresentationVideoTrafficPlatformMetrics(
    params.profile,
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

const buildTrafficSources = (params: {
  actions: WhatsappTrafficActions;
  communityDataset: CommunityTrafficPlatformMetricDataset;
  profile: { user: { id: string }; user_id: string; video_url: string | null };
  profileDataset: ProfileTrafficPlatformMetricDataset;
}): AdminPsychologistStatisticsDTO["traffic_sources"] => {
  const trafficPlatformMetrics = buildTrafficPlatformMetrics({
    communityDataset: params.communityDataset,
    profile: params.profile,
    profileDataset: params.profileDataset,
  });
  const summary = summarizePsychologistWhatsappTrafficOrigins({
    actions: params.actions,
    allowedPsychologistIds: new Set([params.profile.user.id]),
    communityPlatformMetrics: trafficPlatformMetrics.metrics,
    platformMetricsConsideredCounts: trafficPlatformMetrics.consideredCounts,
    communityPosts: params.communityDataset.posts,
    communityReplies: params.communityDataset.replies,
  });

  return {
    ...summary,
    description:
      "Entenda em quais superfícies os pacientes clicam no WhatsApp deste psicólogo e veja a somatória de engajamento por origem.",
    source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click",
  };
};

type TrafficQualityPageView = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listPublicProfilePageViews"]>
>[number];
type TrafficQualityProfileView = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listProfileViews"]>
>[number];
type TrafficQualityFavorite = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listFavorites"]>
>[number];
type TrafficQualityWhatsappClick = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listWhatsappClicks"]>
>[number];
type TrafficQualityImportantWhatsappAction = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listImportantPsychologistWhatsappActions"]>
>[number];

type TrafficQualityActorOrigin = {
  favorites: number;
  originId: string;
  profileViews: number;
  sessions: Set<string>;
  whatsappSignals: number;
};

const TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN = {
  description:
    "Sinais reais sem pageview de origem suficiente para ligar o contato a um canal first-party.",
  id: "unattributed",
  label: "Origem não atribuída",
} as const;

const trafficQualityOriginDefinitions = [
  ...psychologistTrafficOriginDefinitions,
  TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN,
];

const actorKeyFromTrafficEvent = (event: {
  session_id?: string | null;
  user_id?: string | null;
  visitor_id?: string | null;
}) => {
  if (event.user_id) return `user:${event.user_id}`;
  if (event.visitor_id) return `visitor:${event.visitor_id}`;
  if (event.session_id) return `session:${event.session_id}`;

  return null;
};

const actorKeyFromProfileView = (event: {
  device_id?: string | null;
  viewer_id?: string | null;
}) => {
  if (event.viewer_id) return `user:${event.viewer_id}`;
  if (event.device_id) return `device:${event.device_id}`;

  return null;
};

const trafficQualityOriginLabel = (originId: string) =>
  trafficQualityOriginDefinitions.find((definition) => definition.id === originId)?.label ??
  "Origem não atribuída";

const buildTrafficQuality = (params: {
  favorites: TrafficQualityFavorite[];
  importantWhatsappActions: TrafficQualityImportantWhatsappAction[];
  pageViews: TrafficQualityPageView[];
  profileViews: TrafficQualityProfileView[];
  whatsappClicks: TrafficQualityWhatsappClick[];
}): AdminPsychologistStatisticsDTO["traffic_quality"] => {
  const groups = new Map<string, TrafficQualityActorOrigin>();
  const originsByActor = new Map<string, Set<string>>();

  const getGroup = (actorKey: string, originId: string) => {
    const key = `${actorKey}:${originId}`;
    const current = groups.get(key);
    if (current) return current;

    const next: TrafficQualityActorOrigin = {
      favorites: 0,
      originId,
      profileViews: 0,
      sessions: new Set<string>(),
      whatsappSignals: 0,
    };
    groups.set(key, next);

    if (!originsByActor.has(actorKey)) originsByActor.set(actorKey, new Set());
    originsByActor.get(actorKey)?.add(originId);

    return next;
  };

  const getOriginIdsForActor = (actorKey: string) => {
    const origins = originsByActor.get(actorKey);
    if (origins && origins.size > 0) return [...origins];

    return [TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN.id];
  };

  for (const pageView of params.pageViews) {
    const actorKey = actorKeyFromTrafficEvent(pageView);
    if (!actorKey) continue;

    const originId = trafficOriginFromPageViewSource(pageView.traffic_source);
    const group = getGroup(actorKey, originId);
    group.profileViews += 1;
    group.sessions.add(pageView.session_id);
  }

  for (const profileView of params.profileViews) {
    const actorKey = actorKeyFromProfileView(profileView);
    if (!actorKey) continue;

    for (const originId of getOriginIdsForActor(actorKey)) {
      const group = getGroup(actorKey, originId);
      if (group.profileViews === 0) group.profileViews += 1;
    }
  }

  for (const favorite of params.favorites) {
    const actorKey = `user:${favorite.user_id}`;

    for (const originId of getOriginIdsForActor(actorKey)) {
      getGroup(actorKey, originId).favorites += 1;
    }
  }

  for (const action of params.importantWhatsappActions) {
    const actorKey = actorKeyFromTrafficEvent(action);
    if (!actorKey) continue;

    for (const originId of getOriginIdsForActor(actorKey)) {
      getGroup(actorKey, originId).whatsappSignals += 1;
    }
  }

  let attributedWhatsappClicks = 0;

  params.whatsappClicks.forEach((click, index) => {
    const actorKey = click.user_id ? `user:${click.user_id}` : `contact:${index}`;
    const originIds = getOriginIdsForActor(actorKey);
    const hasAttributedOrigin = originIds.some(
      (originId) => originId !== TRAFFIC_QUALITY_UNATTRIBUTED_ORIGIN.id,
    );

    if (hasAttributedOrigin) attributedWhatsappClicks += 1;

    for (const originId of originIds) {
      getGroup(actorKey, originId).whatsappSignals += 1;
    }
  });

  const flowCounts = new Map<string, number>();
  const qualityCounts = new Map<AdminPsychologistTrafficQualityLevelId, number>(
    TRAFFIC_QUALITY_LEVEL_ORDER.map((id) => [id, 0]),
  );
  const originActorCounts = new Map<string, number>();
  const originProfileViews = new Map<string, number>();
  const originQualifiedActors = new Map<string, number>();

  for (const group of groups.values()) {
    const qualityId: AdminPsychologistTrafficQualityLevelId =
      group.whatsappSignals > 0
        ? "qualified"
        : group.favorites > 0 || group.profileViews > 1
          ? "interested"
          : group.profileViews > 0
            ? "visited"
            : "unidentified";
    const flowKey = `${group.originId}_${qualityId}`;

    flowCounts.set(flowKey, (flowCounts.get(flowKey) ?? 0) + 1);
    qualityCounts.set(qualityId, (qualityCounts.get(qualityId) ?? 0) + 1);
    originActorCounts.set(group.originId, (originActorCounts.get(group.originId) ?? 0) + 1);
    originProfileViews.set(
      group.originId,
      (originProfileViews.get(group.originId) ?? 0) + group.profileViews,
    );
    if (qualityId === "qualified") {
      originQualifiedActors.set(
        group.originId,
        (originQualifiedActors.get(group.originId) ?? 0) + 1,
      );
    }
  }

  const totalActors = [...originActorCounts.values()].reduce((sum, count) => sum + count, 0);
  const totalProfileViews = params.pageViews.length || params.profileViews.length;
  const totalWhatsappClicks = params.whatsappClicks.length;
  const qualityLevels = TRAFFIC_QUALITY_LEVEL_ORDER.map((id) => {
    const count = qualityCounts.get(id) ?? 0;

    return {
      count,
      description: TRAFFIC_QUALITY_LEVEL_CONFIG[id].description,
      id,
      label: TRAFFIC_QUALITY_LEVEL_CONFIG[id].label,
      percentage: safePercentage(count, totalActors),
    };
  });
  const origins = trafficQualityOriginDefinitions
    .map((definition) => {
      const actors = originActorCounts.get(definition.id) ?? 0;

      return {
        actors,
        id: definition.id,
        label: definition.label,
        percentage: safePercentage(actors, totalActors),
        profile_views: originProfileViews.get(definition.id) ?? 0,
        qualified_actors: originQualifiedActors.get(definition.id) ?? 0,
      };
    })
    .filter((origin) => origin.actors > 0 || origin.profile_views > 0);
  const predominantQuality =
    [...qualityLevels].sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return right.percentage - left.percentage;
    })[0] ?? null;
  const primaryQualifiedOrigin =
    [...origins]
      .filter((origin) => origin.qualified_actors > 0)
      .sort((left, right) => {
        if (right.qualified_actors !== left.qualified_actors) {
          return right.qualified_actors - left.qualified_actors;
        }

        return right.profile_views - left.profile_views;
      })[0] ?? null;

  return {
    absorption_rate:
      totalProfileViews > 0 ? roundPercent((totalWhatsappClicks / totalProfileViews) * 100) : null,
    attributed_whatsapp_clicks: Math.min(attributedWhatsappClicks, totalWhatsappClicks),
    attribution_note:
      "WhatsApp total usa contact_request; a ligação com origem usa visitor/session/user de page_view_event e important_action_event quando disponível.",
    flows: trafficQualityOriginDefinitions
      .flatMap((origin) =>
        TRAFFIC_QUALITY_LEVEL_ORDER.map((qualityId) => {
          const count = flowCounts.get(`${origin.id}_${qualityId}`) ?? 0;

          return {
            count,
            id: `${origin.id}_${qualityId}` as const,
            origin_id: origin.id,
            origin_label: trafficQualityOriginLabel(origin.id),
            percentage: safePercentage(count, totalActors),
            quality_id: qualityId,
            quality_label: TRAFFIC_QUALITY_LEVEL_CONFIG[qualityId].label,
          };
        }),
      )
      .filter((flow) => flow.count > 0),
    origins,
    predominant_quality: predominantQuality?.count ? predominantQuality : null,
    primary_qualified_origin: primaryQualifiedOrigin,
    quality_levels: qualityLevels,
    source: TRAFFIC_QUALITY_SOURCE,
    total_actors: totalActors,
    total_profile_views: totalProfileViews,
    total_whatsapp_clicks: totalWhatsappClicks,
    unattributed_whatsapp_clicks: Math.max(
      0,
      totalWhatsappClicks - Math.min(attributedWhatsappClicks, totalWhatsappClicks),
    ),
    unavailable_reason:
      totalActors > 0
        ? null
        : "Nenhum acesso com origem first-party foi encontrado para este psicólogo no período.",
  };
};

const earlierDate = (current: Date | null, candidate: Date | null) => {
  if (!candidate) return current;
  if (!current) return candidate;

  return candidate < current ? candidate : current;
};

const buildCommunityItems = (input: {
  allPosts: AdminPsychologistEngagementPost[];
  allReplies: AdminPsychologistEngagementReply[];
  coverageWindow: { end: Date; start: Date };
  memberships: Awaited<ReturnType<AdminPsychologistEngagementRepository["listCommunities"]>>;
  patientPostsByCommunity: Map<string, number>;
  postVotesByUser: Awaited<
    ReturnType<AdminPsychologistEngagementRepository["listPostVotesByUser"]>
  >;
  posts: AdminPsychologistEngagementPost[];
  replies: AdminPsychologistEngagementReply[];
  replyVotesByUser: Awaited<
    ReturnType<AdminPsychologistEngagementRepository["listReplyVotesByUser"]>
  >;
}): AdminPsychologistStatisticsDTO["community"]["communities"] => {
  const communities = new Map<
    string,
    AdminPsychologistStatisticsDTO["community"]["communities"][number]
  >();

  const ensureItem = (
    community: AdminPsychologistEngagementPost["community"],
  ): AdminPsychologistStatisticsDTO["community"]["communities"][number] => {
    const current = communities.get(community.id);
    if (current) return current;

    const next = {
      avatar_url: community.avatar_url,
      color: community.visual_primary_color,
      coverage: {
        covered_patient_posts: 0,
        patient_posts: input.patientPostsByCommunity.get(community.id) ?? 0,
        rate_percent: null,
        source: "community_post.author.role=paciente+post_reply.author_id" as const,
      },
      downvotes: 0,
      engagement_diagnosis: formatAdminPsychologistCommunityEngagementDiagnosis(
        diagnoseAdminCommunityEngagement({
          interactions: 0,
          source: "community_post+post_reply+post_vote.user_id",
        }),
      ),
      following: false,
      id: community.id,
      interactions: 0,
      member_since: null,
      name: community.name,
      posts: 0,
      ranking: null,
      replies: 0,
      slug: community.slug,
      upvotes: 0,
    };

    communities.set(community.id, next);

    return next;
  };

  for (const post of input.allPosts) {
    const current = ensureItem(post.community);
    current.member_since = earlierDate(current.member_since, post.createdAt);
  }

  for (const reply of input.allReplies) {
    const current = ensureItem(reply.post.community);
    current.member_since = earlierDate(current.member_since, reply.createdAt);
  }

  for (const membership of input.memberships) {
    const current = ensureItem(membership.community);
    current.following = true;
    current.member_since = earlierDate(current.member_since, membership.createdAt);
  }

  for (const post of input.posts) {
    const current = ensureItem(post.community);
    current.interactions += 1;
    current.posts += 1;
  }

  for (const reply of input.replies) {
    const current = ensureItem(reply.post.community);
    current.interactions += 1;
    current.replies += 1;
  }

  for (const vote of input.postVotesByUser) {
    const community = vote.post?.community;
    if (!community) continue;

    const current = ensureItem(community);
    current.interactions += 1;
    if (vote.value > 0) current.upvotes += 1;
    if (vote.value < 0) current.downvotes += 1;
  }

  for (const vote of input.replyVotesByUser) {
    const community = vote.reply?.post.community;
    if (!community) continue;

    const current = ensureItem(community);
    current.interactions += 1;
    if (vote.value > 0) current.upvotes += 1;
    if (vote.value < 0) current.downvotes += 1;
  }

  for (const community of communities.values()) {
    const coveredPatientPosts = new Set(
      input.replies
        .filter(
          (reply) =>
            reply.post.community.id === community.id &&
            reply.post.author.role === "paciente" &&
            reply.post.createdAt >= input.coverageWindow.start &&
            reply.post.createdAt <= input.coverageWindow.end,
        )
        .map((reply) => reply.post.id),
    ).size;
    const patientPosts = community.coverage.patient_posts;

    community.coverage.covered_patient_posts = coveredPatientPosts;
    community.coverage.rate_percent =
      patientPosts > 0 ? roundPercent((coveredPatientPosts / patientPosts) * 100) : null;
  }

  const activeCommunities = [...communities.values()].filter(
    (community) => community.interactions > 0,
  );
  return activeCommunities
    .map((community) => ({
      ...community,
      engagement_diagnosis: formatAdminPsychologistCommunityEngagementDiagnosis(
        diagnoseAdminCommunityEngagement({
          interactions: community.interactions,
          source: "community_post+post_reply+post_vote.user_id",
        }),
      ),
    }))
    .sort((left, right) => {
      if (left.interactions !== right.interactions) return right.interactions - left.interactions;

      return left.name.localeCompare(right.name, "pt-BR");
    });
};

const withCommunityRankings = async (input: {
  communities: AdminPsychologistStatisticsDTO["community"]["communities"];
  psychologistId: string;
  repository: AdminPsychologistEngagementRepository;
}): Promise<AdminPsychologistStatisticsDTO["community"]["communities"]> => {
  if (input.communities.length === 0) return input.communities;

  const eligibleMentorIds = await input.repository.listTopMentorEligiblePsychologistIds();
  if (!eligibleMentorIds.includes(input.psychologistId)) {
    return input.communities.map((community) => ({ ...community, ranking: null }));
  }

  const rankingsByCommunityId = new Map<
    string,
    NonNullable<AdminPsychologistStatisticsDTO["community"]["communities"][number]["ranking"]>
  >();

  await Promise.all(
    input.communities.map(async (community) => {
      const rankingSignals = await input.repository.getCommunityMentorRankingSignals(community.id, [
        ...eligibleMentorIds,
      ]);
      const ranking = rankingSignals.get(input.psychologistId);

      if (ranking) rankingsByCommunityId.set(community.id, ranking);
    }),
  );

  return input.communities.map((community) => ({
    ...community,
    ranking: rankingsByCommunityId.get(community.id) ?? null,
  }));
};

const normalizeStatisticsQuery = (query: AdminPsychologistEngagementQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  period: query.period,
  to: query.to,
});

const matchesCommunityFilter = (community: { id: string; slug: string }, communityFilter: string) =>
  communityFilter === "all" ||
  community.id === communityFilter ||
  community.slug === communityFilter;

const filterPostsByCommunity = (
  posts: AdminPsychologistEngagementPost[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? posts
    : posts.filter((post) => matchesCommunityFilter(post.community, communityFilter));

const filterRepliesByCommunity = (
  replies: AdminPsychologistEngagementReply[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? replies
    : replies.filter((reply) => matchesCommunityFilter(reply.post.community, communityFilter));

type CommunityReference = { id: string; slug: string };

type CommunityContentAttentionSessions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listCommunityContentAttentionSessions"]>
>;

const uniqueCommunityReferences = (communities: CommunityReference[]) => {
  const map = new Map<string, CommunityReference>();

  for (const community of communities) {
    map.set(community.id, community);
  }

  return [...map.values()];
};

const resolveCommunityFilterIds = (communityFilter: string, communities: CommunityReference[]) => {
  if (communityFilter === "all") return null;

  const ids = new Set(
    communities
      .filter((community) => matchesCommunityFilter(community, communityFilter))
      .map((community) => community.id),
  );

  if (ids.size === 0) ids.add(communityFilter);

  return ids;
};

const filterPatientPostsByCommunity = (
  posts: AdminPsychologistCoveragePatientPost[],
  communityFilterIds: Set<string> | null,
) =>
  communityFilterIds === null
    ? posts
    : posts.filter((post) => communityFilterIds.has(post.community.id));

const filterCommunityContentAttentionSessions = (
  sessions: CommunityContentAttentionSessions,
  communityFilterIds: Set<string> | null,
) =>
  communityFilterIds === null
    ? sessions
    : sessions.filter((session) => communityFilterIds.has(session.community_id));

const countPatientPostsByCommunity = (posts: AdminPsychologistCoveragePatientPost[]) => {
  const counts = new Map<string, number>();

  for (const post of posts) {
    counts.set(post.community.id, (counts.get(post.community.id) ?? 0) + 1);
  }

  return counts;
};

const countCoveredPatientPosts = (input: {
  coverageWindow: { end: Date; start: Date };
  replies: AdminPsychologistEngagementReply[];
}) =>
  new Set(
    input.replies
      .filter(
        (reply) =>
          reply.post.author.role === "paciente" &&
          reply.post.createdAt >= input.coverageWindow.start &&
          reply.post.createdAt <= input.coverageWindow.end,
      )
      .map((reply) => reply.post.id),
  ).size;

const coverageRatePercent = (coveredPatientPosts: number, patientPosts: number) =>
  patientPosts > 0 ? roundPercent((coveredPatientPosts / patientPosts) * 100) : null;

const buildCoverageRatePercentByDate = (input: {
  coverageWindow: { end: Date; start: Date };
  labels: string[];
  patientPosts: AdminPsychologistCoveragePatientPost[];
  replies: AdminPsychologistEngagementReply[];
}) => {
  const patientPostsByDate = groupDateCounts(input.patientPosts, input.labels);
  const coveredPatientPostsByDate = new Map<string, Set<string>>();

  for (const reply of input.replies) {
    if (reply.post.author.role !== "paciente") continue;
    if (reply.post.createdAt < input.coverageWindow.start) continue;
    if (reply.post.createdAt > input.coverageWindow.end) continue;

    const date = toDateKey(reply.post.createdAt);
    if (!input.labels.includes(date)) continue;

    const current = coveredPatientPostsByDate.get(date) ?? new Set<string>();
    current.add(reply.post.id);
    coveredPatientPostsByDate.set(date, current);
  }

  return new Map(
    input.labels.map((date) => {
      const patientPosts = valueFromMap(patientPostsByDate, date);
      const coveredPatientPosts = coveredPatientPostsByDate.get(date)?.size ?? 0;

      return [date, coverageRatePercent(coveredPatientPosts, patientPosts) ?? 0] as const;
    }),
  );
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const showAdminPsychologistStatistics = async (
  data: IAdminPsychologistStatisticsDTO,
): Promise<Resolve> => {
  const query = normalizeStatisticsQuery(data.q ?? {});
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(query, profile.user.createdAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [
    benchmarkProfiles,
    benchmarkWhatsappClickCounts,
    profileViews,
    whatsappClicks,
    favorites,
    reviews,
    searchResults,
    profileAttentionSessions,
    communityContentAttentionSessions,
    videoSessions,
    videoActionEvents,
    previousProfileViews,
    previousWhatsappClicks,
    previousFavorites,
    previousReviews,
    previousSearchResults,
    previousProfileAttentionSessions,
    previousCommunityContentAttentionSessions,
    previousVideoSessions,
    previousVideoActionEvents,
    posts,
    replies,
    allPosts,
    allReplies,
    previousPosts,
    previousReplies,
    memberships,
    platformPageViews,
    platformSessions,
    pwaInstallAction,
    trafficPageViews,
    importantWhatsappActions,
    whatsappTrafficActions,
    communityTrafficPlatformMetricDataset,
    profileTrafficPlatformMetricDataset,
    patientPostsForCoverage,
    previousPatientPostsForCoverage,
  ] = await Promise.all([
    repository.listProfileConversionBenchmarkProfiles(),
    repository.listWhatsappClickCountsByPsychologist(period.current.start, period.current.end),
    repository.listProfileViews(userId, period.current.start, period.current.end),
    repository.listWhatsappClicks(userId, period.current.start, period.current.end),
    repository.listFavorites(userId, period.current.start, period.current.end),
    repository.listReviews(userId, period.current.start, period.current.end),
    repository.listSearchResultImpressions(userId, period.current.start, period.current.end),
    repository.listPublicProfileAttentionSessions(userId, period.current.start, period.current.end),
    repository.listCommunityContentAttentionSessions(
      userId,
      period.current.start,
      period.current.end,
    ),
    repository.listVideoSessions(userId, period.current.start, period.current.end),
    repository.listVideoActionEvents(userId, period.current.start, period.current.end),
    repository.listProfileViews(userId, period.previous.start, period.previous.end),
    repository.listWhatsappClicks(userId, period.previous.start, period.previous.end),
    repository.listFavorites(userId, period.previous.start, period.previous.end),
    repository.listReviews(userId, period.previous.start, period.previous.end),
    repository.listSearchResultImpressions(userId, period.previous.start, period.previous.end),
    repository.listPublicProfileAttentionSessions(
      userId,
      period.previous.start,
      period.previous.end,
    ),
    repository.listCommunityContentAttentionSessions(
      userId,
      period.previous.start,
      period.previous.end,
    ),
    repository.listVideoSessions(userId, period.previous.start, period.previous.end),
    repository.listVideoActionEvents(userId, period.previous.start, period.previous.end),
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
    repository.listAuthoredPosts(userId),
    repository.listAuthoredReplies(userId),
    repository.listAuthoredPosts(userId, period.previous.start, period.previous.end),
    repository.listAuthoredReplies(userId, period.previous.start, period.previous.end),
    repository.listCommunities(userId),
    repository.listPlatformPageViews(userId, period.current.start, period.current.end),
    repository.listPlatformSessions(userId, period.current.start, period.current.end),
    repository.findPwaInstallAction(userId),
    repository.listPublicProfilePageViews(userId, period.current.start, period.current.end),
    repository.listImportantPsychologistWhatsappActions(
      userId,
      period.current.start,
      period.current.end,
    ),
    repository.listWhatsappTrafficActions(period.current.start, period.current.end),
    repository.listCommunityTrafficPlatformMetricDataset(
      userId,
      period.current.start,
      period.current.end,
    ),
    repository.listProfileTrafficPlatformMetricDataset(
      userId,
      period.current.start,
      period.current.end,
    ),
    repository.listPatientPostsByCommunityForCoverage(period.current.start, period.current.end),
    repository.listPatientPostsByCommunityForCoverage(period.previous.start, period.previous.end),
  ]);
  const benchmarkPsychologistIds = benchmarkProfiles.map((item) => item.user_id);
  const [
    benchmarkProfileAttentionSeconds,
    benchmarkCommunityContentAttentionSeconds,
    benchmarkProfileVideoAttentionSeconds,
  ] = await Promise.all([
    repository.listPublicProfileAttentionSecondsByPsychologists(
      benchmarkPsychologistIds,
      period.current.start,
      period.current.end,
    ),
    repository.listCommunityContentAttentionSecondsByPsychologists(
      benchmarkPsychologistIds,
      period.current.start,
      period.current.end,
    ),
    repository.listProfileVideoAttentionSecondsByPsychologists(
      benchmarkPsychologistIds,
      period.current.start,
      period.current.end,
    ),
  ]);

  const communityPosts = filterPostsByCommunity(posts, query.community);
  const communityReplies = filterRepliesByCommunity(replies, query.community);
  const previousCommunityPosts = filterPostsByCommunity(previousPosts, query.community);
  const previousCommunityReplies = filterRepliesByCommunity(previousReplies, query.community);
  const psychologistCommunityReferences = uniqueCommunityReferences([
    ...allPosts.map((post) => post.community),
    ...allReplies.map((reply) => reply.post.community),
    ...memberships.map((membership) => membership.community),
  ]);
  const communityReferences = uniqueCommunityReferences([
    ...psychologistCommunityReferences,
    ...patientPostsForCoverage.map((post) => post.community),
    ...previousPatientPostsForCoverage.map((post) => post.community),
  ]);
  const communityFilterIds = resolveCommunityFilterIds(query.community, communityReferences);
  const coverageCommunityFilterIds =
    communityFilterIds ?? new Set(psychologistCommunityReferences.map((community) => community.id));
  const communityContentAttentionSessionsForFilter = filterCommunityContentAttentionSessions(
    communityContentAttentionSessions,
    communityFilterIds,
  );
  const previousCommunityContentAttentionSessionsForFilter =
    filterCommunityContentAttentionSessions(
      previousCommunityContentAttentionSessions,
      communityFilterIds,
    );
  const patientPostsForCoverageFilter = filterPatientPostsByCommunity(
    patientPostsForCoverage,
    coverageCommunityFilterIds,
  );
  const previousPatientPostsForCoverageFilter = filterPatientPostsByCommunity(
    previousPatientPostsForCoverage,
    coverageCommunityFilterIds,
  );
  const postIds = communityPosts.map((post) => post.id);
  const replyIds = communityReplies.map((reply) => reply.id);
  const previousPostIds = previousCommunityPosts.map((post) => post.id);
  const previousReplyIds = previousCommunityReplies.map((reply) => reply.id);
  const allPostIds = allPosts.map((post) => post.id);
  const allReplyIds = allReplies.map((reply) => reply.id);
  const [
    postSaves,
    replySaves,
    commentsReceived,
    postVotes,
    replyVotes,
    postShares,
    replyShares,
    platformPostSaves,
    platformReplySaves,
    platformPostVotes,
    platformReplyVotes,
    platformPostShares,
    platformReplyShares,
    platformReports,
    previousPostSaves,
    previousReplySaves,
    previousCommentsReceived,
    previousPostVotes,
    previousReplyVotes,
    previousPostShares,
    previousReplyShares,
    visibilityPostViews,
    visibilityReplyViews,
  ] = await Promise.all([
    repository.listPostSaves(postIds, period.current.start, period.current.end),
    repository.listReplySaves(replyIds, period.current.start, period.current.end),
    repository.listCommentsReceived(postIds, userId, period.current.start, period.current.end),
    repository.listPostVotes(postIds, period.current.start, period.current.end),
    repository.listReplyVotes(replyIds, period.current.start, period.current.end),
    repository.listPostShareEvents(postIds, period.current.start, period.current.end),
    repository.listReplyShareEvents(replyIds, period.current.start, period.current.end),
    repository.listPostSavesByUser(userId, period.current.start, period.current.end),
    repository.listReplySavesByUser(userId, period.current.start, period.current.end),
    repository.listPostVotesByUser(userId, period.current.start, period.current.end),
    repository.listReplyVotesByUser(userId, period.current.start, period.current.end),
    repository.listPostShareEventsByUser(userId, period.current.start, period.current.end),
    repository.listReplyShareEventsByUser(userId, period.current.start, period.current.end),
    repository.listReportsByUser(userId, period.current.start, period.current.end),
    repository.listPostSaves(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplySaves(previousReplyIds, period.previous.start, period.previous.end),
    repository.listCommentsReceived(
      previousPostIds,
      userId,
      period.previous.start,
      period.previous.end,
    ),
    repository.listPostVotes(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplyVotes(previousReplyIds, period.previous.start, period.previous.end),
    repository.listPostShareEvents(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplyShareEvents(previousReplyIds, period.previous.start, period.previous.end),
    repository.countPostViews(allPostIds, period.current.start, period.current.end),
    repository.countReplyViews(allReplyIds, period.current.start, period.current.end),
  ]);
  const savesCount = postSaves.length + replySaves.length;
  const previousSavesCount = previousPostSaves.length + previousReplySaves.length;
  const upvotesCount = [...postVotes, ...replyVotes].filter((vote) => vote.value === 1).length;
  const previousUpvotesCount = [...previousPostVotes, ...previousReplyVotes].filter(
    (vote) => vote.value === 1,
  ).length;
  const downvotesCount = [...postVotes, ...replyVotes].filter((vote) => vote.value === -1).length;
  const previousDownvotesCount = [...previousPostVotes, ...previousReplyVotes].filter(
    (vote) => vote.value === -1,
  ).length;
  const sharesCount = postShares.length + replyShares.length;
  const previousSharesCount = previousPostShares.length + previousReplyShares.length;
  const patientPostReplyCoverageEntries = buildPatientPostReplyCoverageEntries(communityReplies);
  const previousPatientPostReplyCoverageEntries =
    buildPatientPostReplyCoverageEntries(previousCommunityReplies);
  const patientPostTextReplyCoverageCount = countPatientPostReplyCoverage(
    patientPostReplyCoverageEntries,
    "text",
  );
  const previousPatientPostTextReplyCoverageCount = countPatientPostReplyCoverage(
    previousPatientPostReplyCoverageEntries,
    "text",
  );
  const patientPostVideoReplyCoverageCount = countPatientPostReplyCoverage(
    patientPostReplyCoverageEntries,
    "video",
  );
  const previousPatientPostVideoReplyCoverageCount = countPatientPostReplyCoverage(
    previousPatientPostReplyCoverageEntries,
    "video",
  );
  const activityActions = communityPosts.length + communityReplies.length;
  const previousActivityActions = previousCommunityPosts.length + previousCommunityReplies.length;
  const patientPostsByCommunity = countPatientPostsByCommunity(patientPostsForCoverage);
  const currentCoveredPatientPosts = countCoveredPatientPosts({
    coverageWindow: period.current,
    replies: communityReplies,
  });
  const previousCoveredPatientPosts = countCoveredPatientPosts({
    coverageWindow: period.previous,
    replies: previousCommunityReplies,
  });
  const coverageRate = coverageRatePercent(
    currentCoveredPatientPosts,
    patientPostsForCoverageFilter.length,
  );
  const previousCoverageRate = coverageRatePercent(
    previousCoveredPatientPosts,
    previousPatientPostsForCoverageFilter.length,
  );
  const unavailable: AdminPsychologistAvailabilityMetric[] = [];
  const currentPresentationVideoSessions = filterCurrentPresentationVideoSessions(
    videoSessions,
    profile,
  );
  const previousPresentationVideoSessions = filterCurrentPresentationVideoSessions(
    previousVideoSessions,
    profile,
  );
  const visibilityBreakdownMaps = buildVisibilityBreakdownMapsByDate({
    communityContentAttentionSessions,
    labels: period.labels,
    profileAttentionSessions,
    videoSessions: currentPresentationVideoSessions,
  });
  const previousVisibilityBreakdownMaps = buildVisibilityBreakdownMapsByDate({
    communityContentAttentionSessions: previousCommunityContentAttentionSessions,
    labels: labelsFromRange(period.previous.start, period.period.days),
    profileAttentionSessions: previousProfileAttentionSessions,
    videoSessions: previousPresentationVideoSessions,
  });
  const visibilityBreakdownSeries = buildVisibilityBreakdownSeries(
    period.labels,
    visibilityBreakdownMaps,
  );
  const profileVisibilitySeconds = sumMapValues(visibilityBreakdownMaps.profileSeconds);
  const previousProfileVisibilitySeconds = sumMapValues(
    previousVisibilityBreakdownMaps.profileSeconds,
  );
  const presentationVideoSeconds = sumMapValues(visibilityBreakdownMaps.presentationVideoSeconds);
  const previousPresentationVideoSeconds = sumMapValues(
    previousVisibilityBreakdownMaps.presentationVideoSeconds,
  );
  const communityContentSeconds = sumMapValues(visibilityBreakdownMaps.communityContentSeconds);
  const previousCommunityContentSeconds = sumMapValues(
    previousVisibilityBreakdownMaps.communityContentSeconds,
  );
  const detailedVisibilitySeconds = sum(
    visibilityBreakdownSeries.map((point) => point.total_seconds),
  );
  const contentViewsCount =
    sum(visibilityPostViews.map((item) => item._count._all)) +
    sum(visibilityReplyViews.map((item) => item._count._all));
  const visibilitySecondsByDate = buildVisibilitySecondsByDate({
    communityContentAttentionSessions,
    labels: period.labels,
    profileAttentionSessions,
    videoSessions: currentPresentationVideoSessions,
  });
  const previousVisibilitySecondsByDate = buildVisibilitySecondsByDate({
    communityContentAttentionSessions: previousCommunityContentAttentionSessions,
    labels: labelsFromRange(period.previous.start, period.period.days),
    profileAttentionSessions: previousProfileAttentionSessions,
    videoSessions: previousPresentationVideoSessions,
  });
  const visibilitySeconds = sumVisibilitySecondsByDate(visibilitySecondsByDate);
  const previousVisibilitySeconds = sumVisibilitySecondsByDate(previousVisibilitySecondsByDate);
  const communityVisibilitySecondsByDate = buildVisibilitySecondsByDate({
    communityContentAttentionSessions: communityContentAttentionSessionsForFilter,
    labels: period.labels,
    profileAttentionSessions: [],
    videoSessions: [],
  });
  const previousCommunityVisibilitySecondsByDate = buildVisibilitySecondsByDate({
    communityContentAttentionSessions: previousCommunityContentAttentionSessionsForFilter,
    labels: labelsFromRange(period.previous.start, period.period.days),
    profileAttentionSessions: [],
    videoSessions: [],
  });
  const communityVisibilitySeconds = sumVisibilitySecondsByDate(communityVisibilitySecondsByDate);
  const previousCommunityVisibilitySeconds = sumVisibilitySecondsByDate(
    previousCommunityVisibilitySecondsByDate,
  );
  const coverageRatePercentByDate = buildCoverageRatePercentByDate({
    coverageWindow: period.current,
    labels: period.labels,
    patientPosts: patientPostsForCoverageFilter,
    replies: communityReplies,
  });
  const businessSeries = buildSeries({
    commentsReceived,
    favorites,
    labels: period.labels,
    postShares,
    postSaves,
    postVotes,
    posts,
    profileViews,
    replies,
    reviews,
    replyShares,
    replySaves,
    replyVotes,
    searchResults,
    visibilitySecondsByDate,
    whatsappClicks,
  });
  const communitySeries = buildSeries({
    commentsReceived,
    coverageRatePercentByDate,
    favorites: [],
    labels: period.labels,
    postShares,
    postSaves,
    postVotes,
    posts: communityPosts,
    profileViews: [],
    replies: communityReplies,
    reviews: [],
    replyShares,
    replySaves,
    replyVotes,
    searchResults: [],
    visibilitySecondsByDate: communityVisibilitySecondsByDate,
    whatsappClicks: [],
  });
  const communityItems = await withCommunityRankings({
    communities: buildCommunityItems({
      allPosts,
      allReplies,
      coverageWindow: period.current,
      memberships,
      patientPostsByCommunity,
      postVotesByUser: platformPostVotes,
      posts,
      replies,
      replyVotesByUser: platformReplyVotes,
    }),
    psychologistId: userId,
    repository,
  });
  const communityEngagementDiagnosis = formatAdminPsychologistCommunityEngagementDiagnosis(
    bestAdminCommunityEngagementDiagnosis({
      diagnoses: communityItems.map((community) => community.engagement_diagnosis),
      source: "community.engagement_diagnosis:max",
    }),
  );
  const communityContentDistribution = {
    posts: buildContentFormatDistribution(communityPosts, classifyPostContentFormat),
    replies: buildContentFormatDistribution(communityReplies, classifyReplyContentFormat),
    source: "community_post.media_type+community_post_media+post_reply.media_type" as const,
  };
  const platformUsageSummary = summarizePlatformUsage({
    eligiblePsychologistsCount: 1,
    pageViews: platformPageViews,
  });
  const platformHourlyActivityInput = {
    engagementEvents: [
      ...platformPostSaves,
      ...platformReplySaves,
      ...platformPostVotes,
      ...platformReplyVotes,
      ...platformPostShares,
      ...platformReplyShares,
    ],
    pageViews: platformPageViews,
    posts,
    replies,
    reportEvents: platformReports,
  };
  const platformHourlyActivity = summarizePlatformHourlyActivity(platformHourlyActivityInput);
  const platformHourlyActivityByWeekday = summarizePlatformHourlyActivityByWeekday(
    platformHourlyActivityInput,
  );
  const platformUsage = {
    access_days_count:
      platformPageViews.length > 0
        ? new Set(platformPageViews.map((view) => toDateKey(view.occurred_at))).size
        : 0,
    average_duration_seconds: platformUsageSummary.average_duration_seconds,
    device_usage: buildPlatformDeviceUsage(platformSessions),
    duration_unavailable_reason: platformUsageSummary.duration_unavailable_reason,
    last_access_at: latestPlatformAccessAt({
      pageViews: platformPageViews,
      sessions: platformSessions,
    }),
    period_from: period.period.from,
    period_to: period.period.to,
    pwa_installation_recorded: Boolean(pwaInstallAction),
    pwa_installed_at: pwaInstallAction?.occurred_at ?? null,
    sessions_count:
      platformSessions.length > 0
        ? platformSessions.length
        : new Set(platformPageViews.map((view) => view.session_id)).size,
    source:
      "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report" as const,
    hourly_activity: platformHourlyActivity,
    hourly_activity_by_weekday: platformHourlyActivityByWeekday,
    peak_activity_hours: summarizePlatformPeakActivityHours(platformPageViews),
    top_pages: platformUsageSummary.top_pages,
    unavailable_reason: platformUsageSummary.unavailable_reason,
  };
  const trafficSources = buildTrafficSources({
    actions: whatsappTrafficActions,
    communityDataset: communityTrafficPlatformMetricDataset,
    profile,
    profileDataset: profileTrafficPlatformMetricDataset,
  });
  const trafficQuality = buildTrafficQuality({
    favorites,
    importantWhatsappActions,
    pageViews: trafficPageViews,
    profileViews,
    whatsappClicks,
  });
  const benchmarkWhatsappCounts = new Map(
    benchmarkWhatsappClickCounts.map((item) => [item.psychologist_id, item._count._all]),
  );
  const benchmarkEligibleProfiles = benchmarkProfiles.filter(
    (item) =>
      getProfileAgeDaysUntil(item.user.createdAt, period.current.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const profileConversionBenchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: benchmarkEligibleProfiles.length,
    whatsappClicks: benchmarkEligibleProfiles.map(
      (item) => benchmarkWhatsappCounts.get(item.user_id) ?? 0,
    ),
  });
  const profileAgeDays = getProfileAgeDaysUntil(profile.user.createdAt, period.current.end);
  const businessProfileConversion = buildBusinessProfileConversion({
    activeDays: getProfileActiveDaysInStatisticsRange(profile.user.createdAt, period.current),
    benchmark: profileConversionBenchmark,
    profileAgeDays,
    whatsappClicks: whatsappClicks.length,
  });
  const businessVisibilityDiagnosis = buildBusinessVisibilityDiagnosis({
    benchmarkCommunityContentAttentionSeconds,
    benchmarkProfileAttentionSeconds,
    benchmarkProfileVideoAttentionSeconds,
    benchmarkProfiles,
    communityContentSeconds,
    periodEnd: period.current.end,
    presentationVideoSeconds,
    profileAgeDays,
    profileSeconds: profileVisibilitySeconds,
  });
  const response: AdminPsychologistStatisticsDTO = {
    business: {
      cards: [
        metric({
          comparison: buildComparison(
            profileViews.length,
            previousProfileViews.length,
            period.period,
          ),
          id: "profile_views",
          label: "Visualizações de perfil",
          source: "profile_view_event.source=profile_page",
          value: profileViews.length,
        }),
        metric({
          comparison: buildComparison(visibilitySeconds, previousVisibilitySeconds, period.period),
          id: "visibility_signal",
          label: "Visibilidade (tempo)",
          source: PROFILE_VISIBILITY_TEMPORAL_SOURCE,
          unit: "seconds",
          value: visibilitySeconds,
        }),
        metric({
          comparison: buildComparison(
            whatsappClicks.length,
            previousWhatsappClicks.length,
            period.period,
          ),
          id: "whatsapp_clicks",
          label: "Cliques no WhatsApp",
          source: "contact_request.channel=whatsapp",
          value: whatsappClicks.length,
        }),
        metric({
          comparison: buildComparison(activityActions, previousActivityActions, period.period),
          id: "activity_score",
          label: "Atividade (ações)",
          source: ACTIVITY_ACTIONS_SOURCE,
          value: activityActions,
        }),
        metric({
          comparison: buildComparison(favorites.length, previousFavorites.length, period.period),
          id: "favorites",
          label: "Favoritados",
          source: "psychologist_favorite",
          value: favorites.length,
        }),
        metric({
          comparison: buildComparison(reviews.length, previousReviews.length, period.period),
          id: "reviews",
          label: "Avaliações",
          source: "professional_review",
          value: reviews.length,
        }),
        metric({
          comparison: buildComparison(
            searchResults.length,
            previousSearchResults.length,
            period.period,
          ),
          id: "search_results",
          label: "Resultados de busca",
          source: "profile_view_event.source=search_result",
          value: searchResults.length,
        }),
      ],
      series: businessSeries,
      profile_conversion: businessProfileConversion,
      visibility: {
        cards: [
          metric({
            comparison: buildComparison(
              profileVisibilitySeconds,
              previousProfileVisibilitySeconds,
              period.period,
            ),
            id: "profile",
            label: "Perfil",
            source: "page_view_event.page_kind=psychologist_profile.duration_seconds",
            unit: "seconds",
            value: profileVisibilitySeconds,
          }),
          metric({
            comparison: buildComparison(
              presentationVideoSeconds,
              previousPresentationVideoSeconds,
              period.period,
            ),
            id: "presentation_video",
            label: "Vídeo de apresentação",
            source: "profile_video_watch_session.watched_seconds",
            unit: "seconds",
            value: presentationVideoSeconds,
          }),
          metric({
            comparison: buildComparison(
              communityContentSeconds,
              previousCommunityContentSeconds,
              period.period,
            ),
            id: "community_content",
            label: "Conteúdo na comunidade",
            source: "content_attention_session.attention_seconds",
            unit: "seconds",
            value: communityContentSeconds,
          }),
        ],
        counters: [
          {
            id: "presentation_video_explore_views",
            label: "Views do vídeo de apresentação no explorar",
            source: "profile_video_watch_session",
            value: currentPresentationVideoSessions.length,
          },
          {
            id: "search_result_views",
            label: "Views do vídeo de apresentação nos resultados de busca",
            source: "profile_view_event.source=search_result",
            value: searchResults.length,
          },
          {
            id: "profile_opens",
            label: "Aberturas do perfil",
            source: "profile_view_event.source=profile_page",
            value: profileViews.length,
          },
          {
            id: "content_views",
            label: "Visualizações de conteúdo na comunidade",
            source: "page_view_event.target_type=post|reply",
            value: contentViewsCount,
          },
        ],
        diagnosis: businessVisibilityDiagnosis,
        series: visibilityBreakdownSeries,
        source: PROFILE_VISIBILITY_DETAILED_SOURCE,
        total_seconds: detailedVisibilitySeconds,
      },
    },
    community: {
      cards: [
        metric({
          comparison: buildComparison(
            communityVisibilitySeconds,
            previousCommunityVisibilitySeconds,
            period.period,
          ),
          id: "community_visibility",
          label: "Visibilidade",
          source: "content_attention_session.attention_seconds",
          unit: "seconds",
          value: communityVisibilitySeconds,
        }),
        metric({
          comparison: buildComparison(
            communityPosts.length,
            previousCommunityPosts.length,
            period.period,
          ),
          id: "posts",
          label: "Posts",
          source: "community_post.author_id",
          value: communityPosts.length,
        }),
        metric({
          comparison: buildComparison(
            communityReplies.length,
            previousCommunityReplies.length,
            period.period,
          ),
          id: "replies",
          label: "Respostas",
          source: "post_reply.author_id",
          value: communityReplies.length,
        }),
        metric({
          available: coverageRate !== null,
          comparison:
            coverageRate !== null
              ? buildComparison(coverageRate, previousCoverageRate ?? 0, period.period)
              : null,
          id: "coverage_rate",
          label: "Taxa de cobertura",
          source: "community_post.author.role=paciente+post_reply.author_id",
          unit: "percentage",
          unavailable_reason:
            coverageRate !== null
              ? null
              : "Nenhum post de paciente foi encontrado no período selecionado.",
          value: coverageRate,
        }),
        metric({
          comparison: buildComparison(
            patientPostTextReplyCoverageCount,
            previousPatientPostTextReplyCoverageCount,
            period.period,
          ),
          id: "patient_post_text_reply_coverage",
          label: "Posts de pacientes respondidos sem vídeo",
          source: PATIENT_POST_REPLY_COVERAGE_SOURCE,
          value: patientPostTextReplyCoverageCount,
        }),
        metric({
          comparison: buildComparison(
            patientPostVideoReplyCoverageCount,
            previousPatientPostVideoReplyCoverageCount,
            period.period,
          ),
          id: "patient_post_video_reply_coverage",
          label: "Posts de pacientes respondidos com vídeo",
          source: PATIENT_POST_REPLY_COVERAGE_SOURCE,
          value: patientPostVideoReplyCoverageCount,
        }),
        metric({
          comparison: buildComparison(upvotesCount, previousUpvotesCount, period.period),
          id: "upvotes",
          label: "Upvotes",
          source: "post_vote.value=1 em community_post/post_reply do psicólogo",
          value: upvotesCount,
        }),
        metric({
          comparison: buildComparison(downvotesCount, previousDownvotesCount, period.period),
          id: "downvotes",
          label: "Downvotes",
          source: "post_vote.value=-1 em community_post/post_reply do psicólogo",
          value: downvotesCount,
        }),
        metric({
          comparison: buildComparison(savesCount, previousSavesCount, period.period),
          id: "saves",
          label: "Salvamentos",
          source: "post_save+post_reply_save",
          value: savesCount,
        }),
        metric({
          comparison: buildComparison(sharesCount, previousSharesCount, period.period),
          id: "shares",
          label: "Compartilhamentos",
          source: "post_share em community_post/post_reply do psicólogo",
          value: sharesCount,
        }),
        metric({
          comparison: buildComparison(
            commentsReceived.length,
            previousCommentsReceived.length,
            period.period,
          ),
          id: "comments_received",
          label: "Comentários recebidos",
          source: "post_reply em posts do psicólogo",
          value: commentsReceived.length,
        }),
      ],
      communities: communityItems,
      content_distribution: communityContentDistribution,
      engagement_diagnosis: communityEngagementDiagnosis,
      series: communitySeries,
    },
    period: period.period,
    platform_usage: platformUsage,
    source:
      "profile_events+community_activity+video_sessions+search_impressions+professional_review+page_view_event+important_action_event+content_attention_session",
    traffic_quality: trafficQuality,
    traffic_sources: trafficSources,
    unavailable,
    video: buildVideo(
      profile,
      videoSessions,
      previousVideoSessions,
      videoActionEvents,
      previousVideoActionEvents,
      searchResults,
      previousSearchResults,
      period.period,
    ),
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

const normalizePublicationQuery = (query: AdminPsychologistPublicationsQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  limit: Math.min(Math.max(Number(query.limit || 5), 1), 20),
  page: Math.max(Number(query.page || 1), 1),
  period: query.period,
  q: query.q?.trim() || "",
  sort: query.sort && PSYCHOLOGIST_PUBLICATIONS_SORTS.has(query.sort) ? query.sort : "engagement",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
});

const publicationEngagementScore = (item: AdminPsychologistPublicationItem) =>
  (item.metrics.views.value ?? 0) +
  (item.metrics.upvotes.value ?? 0) +
  (item.metrics.downvotes.value ?? 0) +
  (item.metrics.comments.value ?? 0) +
  (item.metrics.saves.value ?? 0) +
  (item.metrics.shares.value ?? 0) +
  (item.metrics.whatsapp_clicks.value ?? 0);

const comparePublicationsByRecent = (
  left: AdminPsychologistPublicationItem,
  right: AdminPsychologistPublicationItem,
) => right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id);

const sortPublications = (
  items: AdminPsychologistPublicationItem[],
  sort: AdminPsychologistPublicationsSort,
) =>
  [...items].sort((left, right) => {
    if (sort === "oldest") {
      return (
        left.created_at.getTime() - right.created_at.getTime() || left.id.localeCompare(right.id)
      );
    }

    if (sort === "recent") return comparePublicationsByRecent(left, right);

    return (
      publicationEngagementScore(right) - publicationEngagementScore(left) ||
      comparePublicationsByRecent(left, right)
    );
  });

const filterPublication = (
  item: AdminPsychologistPublicationItem,
  query: ReturnType<typeof normalizePublicationQuery>,
) => {
  if (query.type !== "all" && item.type !== query.type) return false;
  if (
    query.community !== "all" &&
    item.community.id !== query.community &&
    item.community.slug !== query.community
  ) {
    return false;
  }
  if (!query.q) return true;

  const needle = normalizeString(query.q);
  return normalizeString(`${item.title} ${item.excerpt} ${item.community.name}`).includes(needle);
};

const mapPostPublication = (
  post: AdminPsychologistEngagementPost,
  maps: {
    commentsReceivedByPost: Map<string, number>;
    postSavesByPost: Map<string, number>;
    postSharesByPost: Map<string, number>;
    postViewsByPost: Map<string, number>;
    postWhatsappClicksByPost: Map<string, number>;
  },
): AdminPsychologistPublicationItem => {
  const views = maps.postViewsByPost.get(post.id) ?? 0;
  return {
    community: {
      avatar_url: post.community.avatar_url,
      color: post.community.visual_primary_color,
      id: post.community.id,
      name: post.community.name,
      slug: post.community.slug,
    },
    created_at: post.createdAt,
    excerpt: excerpt(post.content),
    id: post.id,
    media: mediaFromPost(post),
    metrics: {
      comments: metric({
        id: "comments",
        label: "Comentários",
        source: "post_reply.post_id",
        value: maps.commentsReceivedByPost.get(post.id) ?? post.replies_count,
      }),
      downvotes: metric({
        id: "downvotes",
        label: "Downvotes",
        source: "community_post.downvotes_count/post_vote",
        value: post.downvotes_count,
      }),
      reports: metric({
        id: "reports",
        label: "Denúncias",
        source: "post_report.post_id",
        value: post.reports.length,
      }),
      saves: metric({
        id: "saves",
        label: "Salvamentos",
        source: "post_save",
        value: maps.postSavesByPost.get(post.id) ?? post.saves_count,
      }),
      shares: metric({
        id: "shares",
        label: "Compartilhamentos",
        source: "post_share",
        value: maps.postSharesByPost.get(post.id) ?? 0,
      }),
      upvotes: metric({
        id: "upvotes",
        label: "Upvotes",
        source: "community_post.upvotes_count/post_vote",
        value: post.upvotes_count,
      }),
      views: metric({
        id: "views",
        label: "Visualizações",
        source: "page_view_event.target_type=post/community_post",
        value: views,
      }),
      whatsapp_clicks: metric({
        id: "whatsapp_clicks",
        label: "Cliques WhatsApp",
        source: "important_action_event.action_type=whatsapp_click+target_type=post/community_post",
        value: maps.postWhatsappClicksByPost.get(post.id) ?? 0,
      }),
    },
    public_url: `/community/${post.community.slug}/post/${post.id}`,
    source: "community_post",
    title: post.title,
    type: "post",
  };
};

const mapReplyPublication = (
  reply: AdminPsychologistEngagementReply,
  maps: {
    replyChildrenByReply: Map<string, number>;
    replySavesByReply: Map<string, number>;
    replySharesByReply: Map<string, number>;
    replyViewsByReply: Map<string, number>;
    replyWhatsappClicksByReply: Map<string, number>;
  },
): AdminPsychologistPublicationItem => ({
  community: {
    avatar_url: reply.post.community.avatar_url,
    color: reply.post.community.visual_primary_color,
    id: reply.post.community.id,
    name: reply.post.community.name,
    slug: reply.post.community.slug,
  },
  created_at: reply.createdAt,
  excerpt: excerpt(reply.content),
  id: reply.id,
  media: mediaFromReply(reply),
  metrics: {
    comments: metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply.parent_reply_id",
      value: maps.replyChildrenByReply.get(reply.id) ?? 0,
    }),
    downvotes: metric({
      id: "downvotes",
      label: "Downvotes",
      source: "post_reply.downvotes_count/post_vote",
      value: reply.downvotes_count,
    }),
    reports: metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report.reply_id",
      value: reply.reports.length,
    }),
    saves: metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_reply_save",
      value: maps.replySavesByReply.get(reply.id) ?? 0,
    }),
    shares: metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share.reply_id",
      value: maps.replySharesByReply.get(reply.id) ?? 0,
    }),
    upvotes: metric({
      id: "upvotes",
      label: "Upvotes",
      source: "post_reply.upvotes_count/post_vote",
      value: reply.upvotes_count,
    }),
    views: metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=reply/post_reply",
      value: maps.replyViewsByReply.get(reply.id) ?? 0,
    }),
    whatsapp_clicks: metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click+target_type=reply/post_reply",
      value: maps.replyWhatsappClicksByReply.get(reply.id) ?? 0,
    }),
  },
  public_url: `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`,
  source: "post_reply",
  title: reply.title || `Resposta em: ${reply.post.title}`,
  type: "reply",
});

export const showAdminPsychologistPublications = async (
  data: IAdminPsychologistPublicationsDTO,
): Promise<Resolve> => {
  const query = normalizePublicationQuery(data.q ?? {});
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(
    { from: query.from, period: query.period, to: query.to },
    profile.user.createdAt,
  );
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [posts, replies] = await Promise.all([
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
  ]);
  const postIds = posts.map((post) => post.id);
  const replyIds = replies.map((reply) => reply.id);
  const [
    postSaves,
    replySaves,
    commentsReceived,
    postShares,
    replyShares,
    postViews,
    replyViews,
    postWhatsappClicks,
    replyWhatsappClicks,
    replyChildren,
  ] = await Promise.all([
    repository.listPostSaves(postIds),
    repository.listReplySaves(replyIds),
    repository.listCommentsReceived(postIds, userId),
    repository.countPostShares(postIds),
    repository.countReplyShares(replyIds),
    repository.countPostViews(postIds),
    repository.countReplyViews(replyIds),
    repository.countPostWhatsappClicks(postIds),
    repository.countReplyWhatsappClicks(replyIds),
    repository.countReplyChildren(replyIds),
  ]);

  const commentsReceivedByPost = toCountMap(commentsReceived, "post_id");
  const postSavesByPost = toCountMap(postSaves, "post_id");
  const replySavesByReply = toCountMap(replySaves, "reply_id");
  const postSharesByPost = groupCountMap(postShares, (item) => item.post_id);
  const replySharesByReply = groupCountMap(replyShares, (item) => item.reply_id);
  const postViewsByPost = groupCountMap(postViews, (item) => item.target_id);
  const replyViewsByReply = groupCountMap(replyViews, (item) => item.target_id);
  const postWhatsappClicksByPost = groupCountMap(postWhatsappClicks, (item) => item.target_id);
  const replyWhatsappClicksByReply = groupCountMap(replyWhatsappClicks, (item) => item.target_id);
  const replyChildrenByReply = groupCountMap(replyChildren, (item) => item.parent_reply_id);

  const allItems = [
    ...posts.map((post) =>
      mapPostPublication(post, {
        commentsReceivedByPost,
        postSavesByPost,
        postSharesByPost,
        postViewsByPost,
        postWhatsappClicksByPost,
      }),
    ),
    ...replies.map((reply) =>
      mapReplyPublication(reply, {
        replyChildrenByReply,
        replySavesByReply,
        replySharesByReply,
        replyViewsByReply,
        replyWhatsappClicksByReply,
      }),
    ),
  ];

  const filtered = sortPublications(
    allItems.filter((item) => filterPublication(item, query)),
    query.sort,
  );
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const communities = new Map<string, { id: string; label: string; slug: string }>();
  for (const item of allItems) {
    communities.set(item.community.id, {
      id: item.community.id,
      label: item.community.name,
      slug: item.community.slug,
    });
  }

  const cards = [
    metric({
      id: "posts",
      label: "Posts",
      source: "community_post.author_id",
      value: posts.length,
    }),
    metric({
      id: "replies",
      label: "Respostas",
      source: "post_reply.author_id",
      value: replies.length,
    }),
    metric({
      id: "upvotes",
      label: "Upvotes",
      source: "community_post/post_reply upvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.upvotes.value ?? 0)),
    }),
    metric({
      id: "downvotes",
      label: "Downvotes",
      source: "community_post/post_reply downvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.downvotes.value ?? 0)),
    }),
    metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply",
      value: sum(allItems.map((item) => item.metrics.comments.value ?? 0)),
    }),
    metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=post/community_post",
      value: sum(allItems.map((item) => item.metrics.views.value ?? 0)),
    }),
    metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_save+post_reply_save",
      value: sum(allItems.map((item) => item.metrics.saves.value ?? 0)),
    }),
    metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share",
      value: sum(allItems.map((item) => item.metrics.shares.value ?? 0)),
    }),
    metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click",
      value: sum(allItems.map((item) => item.metrics.whatsapp_clicks.value ?? 0)),
    }),
    metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report",
      value: sum(allItems.map((item) => item.metrics.reports.value ?? 0)),
    }),
  ];
  const unavailable: AdminPsychologistPublicationsDTO["unavailable"] = [];

  const response: AdminPsychologistPublicationsDTO = {
    active_filters_count: [
      query.q,
      query.community !== "all" ? query.community : "",
      query.type !== "all" ? query.type : "",
      (query.period && query.period !== "all") || (query.from && query.to) ? "period" : "",
      query.sort !== "engagement" ? "sort" : "",
    ].filter(Boolean).length,
    count,
    data: dataSlice,
    filters: {
      communities: [...communities.values()].sort((left, right) =>
        left.label.localeCompare(right.label, "pt-BR"),
      ),
      types: [
        { id: "all", label: "Todos" },
        { id: "post", label: "Posts" },
        { id: "reply", label: "Respostas" },
      ],
    },
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report",
    totals: { cards },
    unavailable,
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
