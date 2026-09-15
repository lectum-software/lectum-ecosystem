import {
  ADMIN_PROFILE_CONVERSION_ABSOLUTE_THRESHOLDS,
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_PLATFORM_POSITION_CONFIG,
  ADMIN_PROFILE_CONVERSION_QUALITY_CONFIG,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  type buildAdminProfileConversionBenchmark,
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
import {
  daysBetweenInclusive,
  endOfDate,
  buildDateLabels as labelsFromRange,
  resolveCalendarPeriod,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminPsychologistAvailabilityMetric,
  AdminPsychologistBusinessProfileConversion,
  AdminPsychologistBusinessProfileConversionCategoryId,
  AdminPsychologistContentFormatDistribution,
  AdminPsychologistContentFormatId,
  AdminPsychologistMetricComparison,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistStatisticsDTO,
  AdminPsychologistStatisticsPeriod,
  AdminPsychologistTrafficQualityLevelId,
  AdminPsychologistVisibilityDiagnosis,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import type {
  AdminPsychologistEngagementPost,
  AdminPsychologistEngagementReply,
} from "../../repositories/AdminPsychologistEngagementRepository";
import { earlierDate, normalizeSeconds, sum } from "./statistics-utils";

export const DEFAULT_PERIOD_DAYS = 30;

export const MAX_PERIOD_DAYS = 3660;

export const TRAFFIC_QUALITY_SOURCE =
  "page_view_event+psychologist_favorite+contact_request+important_action_event" as const;

export const PROFILE_VISIBILITY_TEMPORAL_SOURCE =
  "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds" as const;

export const PROFILE_VISIBILITY_DETAILED_SOURCE =
  "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds+profile_view_event+page_view_event.target_type" as const;

export const PRESENTATION_VIDEO_ANALYSIS_SOURCE =
  "profile_video_watch_session+important_action_event+profile_view_event.search_result_position" as const;

export const VIDEO_EXPLORE_POSITION_SOURCE =
  "profile_view_event.source=search_result.search_result_position" as const;

export const ACTIVITY_ACTIONS_SOURCE = "community_post.author_id+post_reply.author_id" as const;

export const PATIENT_POST_REPLY_COVERAGE_SOURCE =
  "post_reply.author_id+post_reply.post.author.role=paciente+post_reply.media_type" as const;

export const TRAFFIC_QUALITY_LEVEL_CONFIG = {
  interested: {
    description: "Retornou ao perfil ou favoritou este psicólogo antes do WhatsApp.",
    label: "Interessado",
  },
  qualified: {
    description: "Clicou no WhatsApp deste psicólogo no período.",
    label: "Qualificado",
  },
  unidentified: {
    description: "Sinal sem informações suficientes para identificar a origem.",
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

export const TRAFFIC_QUALITY_LEVEL_ORDER: AdminPsychologistTrafficQualityLevelId[] = [
  "visited",
  "interested",
  "qualified",
  "unidentified",
];

export type AdminPsychologistPublicationsSort = NonNullable<
  AdminPsychologistPublicationsQuery["sort"]
>;

export const PSYCHOLOGIST_PUBLICATIONS_SORTS = new Set<AdminPsychologistPublicationsSort>([
  "engagement",
  "oldest",
  "recent",
]);

export const BUSINESS_PROFILE_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminPsychologistBusinessProfileConversionCategoryId,
    { description: string; label: string }
  >;

export const BUSINESS_VISIBILITY_DIAGNOSIS_CONFIG = {
  high_exposure: {
    description:
      "Psicólogo fora da adaptação com tempo de visibilidade acima da faixa padrão da plataforma no período selecionado.",
    label: "Alta Visibilidade",
  },
  insufficient_data: {
    description:
      "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a Visibilidade ainda não é comparada com a plataforma.",
    label: "Dados Insuficientes",
  },
  low_exposure: {
    description:
      "Psicólogo fora da adaptação, com algum tempo de visibilidade, mas abaixo da faixa padrão da plataforma no período selecionado.",
    label: "Baixa Visibilidade",
  },
  no_exposure: {
    description:
      "Psicólogo fora da adaptação sem tempo de visibilidade no perfil, no vídeo de apresentação ou em conteúdo autoral na comunidade no período selecionado.",
    label: "Sem Visibilidade",
  },
  standard_exposure: {
    description:
      "Psicólogo fora da adaptação com tempo de visibilidade dentro da faixa padrão da plataforma no período selecionado.",
    label: "Visibilidade Padrão",
  },
} as const satisfies Record<
  AdminProfileExposureAggregateCategoryId,
  { description: string; label: string }
>;

export type PeriodResult =
  | {
      current: { end: Date; start: Date };
      labels: string[];
      period: AdminPsychologistStatisticsPeriod;
      previous: { end: Date; start: Date };
      success: true;
    }
  | { code: string; success: false };

export const resolvePeriod = (
  query: { from?: string; period?: string; to?: string } = {},
  allPeriodStartDate?: Date,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, previousEnd, previousStart, start } = resolved;
  return {
    current: { end, start },
    labels: labelsFromRange(start, days),
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
    success: true,
  };
};

export const metric = (input: {
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

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const safePercentage = (count: number, total: number) =>
  total > 0 ? roundPercent((count / total) * 100) : 0;

export type BusinessProfileConversionSignals = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

export const classifyBusinessProfileConversionCategory = (
  signals: BusinessProfileConversionSignals,
): AdminPsychologistBusinessProfileConversionCategoryId => {
  return classifyAdminProfileConversionCategory(signals);
};

export const getProfileActiveDaysInStatisticsRange = (
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

export const getProfileAgeDaysUntil = (profileCreatedAt: Date, date: Date) => {
  const profileStart = startOfDate(profileCreatedAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

export const buildBusinessProfileConversion = (input: {
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

export type VisibilityAttentionSecondsByPsychologistRecord = {
  attention_seconds: number | null;
  psychologist_id: string | null;
};

export const sumAttentionByPsychologist = (
  records: VisibilityAttentionSecondsByPsychologistRecord[],
) => {
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

export const sumCommunityAttentionByPsychologist = sumAttentionByPsychologist;

export const sumVideoAttentionByPsychologist = sumAttentionByPsychologist;

export const visibilitySecondsFromAttention = (input: {
  communityContentSeconds: number;
  presentationVideoSeconds: number;
  profileSeconds: number;
}) =>
  roundAdminProfileExposureNumber(
    Math.max(0, input.communityContentSeconds) +
      Math.max(0, Math.max(input.profileSeconds, input.presentationVideoSeconds)),
  );

export const buildBusinessVisibilityDiagnosis = (input: {
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

export const CONTENT_FORMAT_ORDER = ["text", "video", "image", "image_carousel"] as const;

export const CONTENT_FORMAT_LABELS = {
  image: "Imagem",
  image_carousel: "Carrossel de imagens",
  text: "Apenas texto",
  video: "Vídeo",
} satisfies Record<
  AdminPsychologistContentFormatId,
  AdminPsychologistContentFormatDistribution["items"][number]["label"]
>;

export const emptyContentFormatCounts = () =>
  ({
    image: 0,
    image_carousel: 0,
    text: 0,
    video: 0,
  }) satisfies Record<AdminPsychologistContentFormatId, number>;

export const normalizeContentMediaType = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const classifyPostContentFormat = (
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

export const classifyReplyContentFormat = (
  reply: AdminPsychologistEngagementReply,
): AdminPsychologistContentFormatId => {
  const mediaType = reply.media_url ? normalizeContentMediaType(reply.media_type) : "";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "image";

  return "text";
};

export type PatientPostReplyCoverageKind = "text" | "video";

export type PatientPostReplyCoverageEntry = {
  createdAt: Date;
  kind: PatientPostReplyCoverageKind;
};

export const buildPatientPostReplyCoverageEntries = (
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

export const countPatientPostReplyCoverage = (
  entries: PatientPostReplyCoverageEntry[],
  kind: PatientPostReplyCoverageKind,
) => entries.filter((entry) => entry.kind === kind).length;

export const buildContentFormatDistribution = <T extends { id: string }>(
  items: T[],
  classify: (item: T) => AdminPsychologistContentFormatId,
  whatsappClicksByItemId = new Map<string, number>(),
): AdminPsychologistContentFormatDistribution => {
  const counts = emptyContentFormatCounts();
  const whatsappClicks = emptyContentFormatCounts();

  for (const item of items) {
    const format = classify(item);
    counts[format] += 1;
    whatsappClicks[format] += whatsappClicksByItemId.get(item.id) ?? 0;
  }

  const total = items.length;
  const totalWhatsappClicks = sum(Object.values(whatsappClicks));

  return {
    items: CONTENT_FORMAT_ORDER.map((id) => ({
      count: counts[id],
      id,
      label: CONTENT_FORMAT_LABELS[id],
      percentage: total > 0 ? roundPercent((counts[id] / total) * 100) : 0,
      whatsapp_clicks: whatsappClicks[id],
    })),
    total,
    total_whatsapp_clicks: totalWhatsappClicks,
  };
};

export const COMMUNITY_VIDEO_RATE_SOURCE =
  "community_post.media_type+community_post_media+post_reply.media_type" as const;

export const emptyCommunityVideoRate =
  (): AdminPsychologistStatisticsDTO["community"]["communities"][number]["posts_video_rate"] => ({
    source: COMMUNITY_VIDEO_RATE_SOURCE,
    with_video: {
      count: 0,
      rate_percent: 0,
    },
    without_video: {
      count: 0,
      rate_percent: 0,
    },
  });

export const incrementCommunityVideoRate = (
  rate: AdminPsychologistStatisticsDTO["community"]["communities"][number]["posts_video_rate"],
  hasVideo: boolean,
) => {
  if (hasVideo) {
    rate.with_video.count += 1;
    return;
  }

  rate.without_video.count += 1;
};

export const finalizeCommunityVideoRate = (
  rate: AdminPsychologistStatisticsDTO["community"]["communities"][number]["posts_video_rate"],
) => {
  const total = rate.with_video.count + rate.without_video.count;

  return {
    ...rate,
    with_video: {
      ...rate.with_video,
      rate_percent: total > 0 ? roundPercent((rate.with_video.count / total) * 100) : 0,
    },
    without_video: {
      ...rate.without_video,
      rate_percent: total > 0 ? roundPercent((rate.without_video.count / total) * 100) : 0,
    },
  };
};
