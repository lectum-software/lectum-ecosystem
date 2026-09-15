import type { Prisma } from "@/external/generated/prisma/client";

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const QUALIFIED_VIDEO_WATCH_SECONDS = 3;

export const VIDEO_LEARNING_QUALIFIED_VIEWS = 30;

export const DEFAULT_NEW_VIDEO_SCORE = 0.5;

export const VIDEO_RETENTION_SCORE_WEIGHT = 0.85;

export const VIDEO_COMPLETION_SCORE_WEIGHT = 0.15;

export const WHATSAPP_CTR_SMOOTHING_EXPOSURES = 10;

export const WHATSAPP_CTR_SMOOTHING_CLICKS = 0.5;

export const FAVORITES_SCORE_TARGET = 20;

export const REVIEW_COUNT_SCORE_TARGET = 30;

export const RATING_PRIOR_COUNT = 5;

export const RATING_PRIOR_SCORE = 0.8;

export const RECENCY_WINDOW_DAYS = 90;

export const CONTROLLED_RANDOMIZATION_RANGE = 0.08;

export const SEARCH_RESULT_SOURCE = "search_result";

export const PROFESSIONAL_COLD_START_MIN_DAYS = 30;

export const PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS = 500;

export const PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS = 30;

export const PROFESSIONAL_COLD_START_RESERVED_SLOT_RATIO = 0.3;

export const psychologistPublicRankingWeights = {
  video: 0.25,
  whatsapp: 0.25,
  favorites: 0.15,
  reviewCount: 0.12,
  weightedRating: 0.12,
  completeness: 0.07,
  recency: 0.04,
} as const;

export type VideoWatchSessionForRanking = {
  completed: boolean;
  createdAt: Date;
  duration_seconds: number;
  last_event_at: Date;
  max_position_seconds: number;
  milestone_100: boolean;
  psychologist_id: string;
  video_url: string | null;
  watched_seconds: number;
};

export type CountGroup = {
  _count: {
    _all: number;
  };
  _max?: {
    createdAt: Date | null;
  };
  psychologist_id: string;
};

export type VideoRankingStats = {
  latestAt: Date | null;
  qualifiedViews: number;
  score: number;
};

export type RankingContext = {
  favoriteCounts: Map<string, number>;
  latestActivityAt: Map<string, Date>;
  now: Date;
  professionalStartDates: Map<string, Date>;
  qualifiedVideoViewsSinceProfessionalStart: Map<string, number>;
  seedDate: string;
  searchImpressionsSinceProfessionalStart: Map<string, number>;
  videoStats: Map<string, VideoRankingStats>;
  viewerId: string | null;
  whatsappClickCounts: Map<string, number>;
};

export type PsychologistRankingCandidate = {
  academic_formations: Prisma.JsonValue | null;
  academic_graduation_year: string | null;
  academic_institution: string | null;
  academic_title: string | null;
  available_days: Prisma.JsonValue | null;
  bio: string | null;
  cfp_verified_at: Date | null;
  cover_image_url: string | null;
  cpf: string | null;
  createdAt: Date;
  crp: string | null;
  crp_status?: string | null;
  gender: string | null;
  headline: string | null;
  languages: Prisma.JsonValue | null;
  modality: string | null;
  professional_address_city: string | null;
  professional_address_state: string | null;
  rating_avg: number;
  rating_count: number;
  subscriptions: {
    createdAt?: Date | string | null;
    grant_started_at?: Date | string | null;
    id?: string | null;
    source?: string | null;
  }[];
  target_audience: Prisma.JsonValue | null;
  updatedAt: Date;
  user: {
    avatar: string | null;
    id: string;
    psychologist_approaches: unknown[];
    psychologist_services: unknown[];
    psychologist_specialties: unknown[];
  };
  user_id: string;
  video_url: string | null;
  whatsapp: string | null;
};

export type PsychologistRankingComponents = {
  completeness: number;
  favorites: number;
  recency: number;
  review_count: number;
  video: number;
  weighted_rating: number;
  whatsapp: number;
};

export type PsychologistRanking = {
  baseScore: number;
  components: PsychologistRankingComponents;
  isProfessionalColdStart: boolean;
  isVerified: boolean;
  score: number;
};

export type RankedPsychologistCandidate<T extends PsychologistRankingCandidate> = {
  item: T;
  ranking: PsychologistRanking;
};

export const clampScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
};

export const hasText = (value?: string | null) => Boolean(value?.trim());

export const hasJsonItems = (value: Prisma.JsonValue | null) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;

  return false;
};

export const scoreByTarget = (value: number, target: number) => {
  if (value <= 0) return 0;

  return clampScore(1 - Math.exp(-value / target));
};

export const hashToUnit = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
};

export const isQualifiedVideoView = (session: VideoWatchSessionForRanking) =>
  session.watched_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS ||
  session.max_position_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS;

export const calculateSingleVideoScore = (sessions: VideoWatchSessionForRanking[]) => {
  const views = sessions.length;

  if (views === 0) {
    return {
      latestAt: null as Date | null,
      qualifiedViews: 0,
      score: 0,
    };
  }

  const durationSeconds = sessions.reduce(
    (max, session) => Math.max(max, session.duration_seconds),
    0,
  );
  const totalWatchedSeconds = sessions.reduce((sum, session) => sum + session.watched_seconds, 0);
  const completedViews = sessions.filter((session) => {
    if (session.completed || session.milestone_100) return true;
    if (durationSeconds <= 0) return false;

    return session.max_position_seconds / durationSeconds >= 0.98;
  }).length;
  const averageWatchedSeconds = totalWatchedSeconds / views;
  const retentionScore =
    durationSeconds > 0 ? clampScore(averageWatchedSeconds / durationSeconds) : 0;
  const completionScore = views > 0 ? completedViews / views : 0;
  const latestAt = sessions.reduce<Date | null>((latest, session) => {
    if (!latest || session.last_event_at > latest) return session.last_event_at;

    return latest;
  }, null);

  return {
    latestAt,
    qualifiedViews: sessions.filter(isQualifiedVideoView).length,
    score: clampScore(
      retentionScore * VIDEO_RETENTION_SCORE_WEIGHT +
        completionScore * VIDEO_COMPLETION_SCORE_WEIGHT,
    ),
  };
};

export const calculateVideoScoreWithLearningWindow = (
  currentVideoUrl: string | null,
  sessions: VideoWatchSessionForRanking[],
) => {
  const currentSessions = currentVideoUrl
    ? sessions.filter((session) => session.video_url === currentVideoUrl)
    : [];
  const historicalSessions = currentVideoUrl
    ? sessions.filter((session) => session.video_url !== currentVideoUrl)
    : sessions;
  const current = calculateSingleVideoScore(currentSessions);
  const historical = calculateSingleVideoScore(historicalSessions);
  const baseline = historical.qualifiedViews > 0 ? historical.score : DEFAULT_NEW_VIDEO_SCORE;
  const confidence = clampScore(current.qualifiedViews / VIDEO_LEARNING_QUALIFIED_VIEWS);
  const currentSignal = current.qualifiedViews > 0 ? current.score : baseline;

  return {
    latestAt: current.latestAt ?? historical.latestAt,
    qualifiedViews: current.qualifiedViews + historical.qualifiedViews,
    score: clampScore(baseline * (1 - confidence) + currentSignal * confidence),
  };
};

export const calculateWhatsappConversionScore = (clicks: number, qualifiedViews: number) => {
  const denominator = Math.max(qualifiedViews, clicks, 0) + WHATSAPP_CTR_SMOOTHING_EXPOSURES;
  const numerator = clicks + WHATSAPP_CTR_SMOOTHING_CLICKS;

  return clampScore(numerator / denominator);
};

export const calculateWeightedRatingScore = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0 || ratingAvg <= 0) return 0;

  const normalizedRating = clampScore(ratingAvg / 500);

  return clampScore(
    (normalizedRating * ratingCount + RATING_PRIOR_SCORE * RATING_PRIOR_COUNT) /
      (ratingCount + RATING_PRIOR_COUNT),
  );
};

export const calculateCompletenessScore = (candidate: PsychologistRankingCandidate) => {
  const checks = [
    hasText(candidate.user.avatar),
    hasText(candidate.cover_image_url),
    hasText(candidate.headline),
    hasText(candidate.bio),
    hasText(candidate.video_url),
    hasText(candidate.whatsapp),
    hasJsonItems(candidate.languages),
    hasText(candidate.modality),
    hasText(candidate.gender),
    hasText(candidate.cpf),
    hasText(candidate.crp),
    hasText(candidate.professional_address_city) && hasText(candidate.professional_address_state),
    hasJsonItems(candidate.target_audience),
    hasText(candidate.academic_title) ||
      hasText(candidate.academic_institution) ||
      hasText(candidate.academic_graduation_year) ||
      hasJsonItems(candidate.academic_formations),
    candidate.user.psychologist_specialties.length > 0,
    candidate.user.psychologist_services.length > 0,
    candidate.user.psychologist_approaches.length > 0,
    hasJsonItems(candidate.available_days),
  ];

  return checks.filter(Boolean).length / checks.length;
};

export const calculateRecencyScore = (latestActivityAt: Date | null, now: Date) => {
  if (!latestActivityAt) return 0;

  const daysSinceActivity = Math.max(0, (now.getTime() - latestActivityAt.getTime()) / MS_PER_DAY);

  return clampScore(1 - daysSinceActivity / RECENCY_WINDOW_DAYS);
};

export const pickLatestDate = (...dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    if (!latest || date > latest) return date;

    return latest;
  }, null);

export const parseDate = (value?: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getProfessionalStartDate = (candidate: PsychologistRankingCandidate) =>
  candidate.subscriptions.reduce<Date | null>((earliest, subscription) => {
    const startedAt = parseDate(subscription.grant_started_at) ?? parseDate(subscription.createdAt);

    if (!startedAt) return earliest;
    if (!earliest || startedAt < earliest) return startedAt;

    return earliest;
  }, null);

export const countSearchImpressionsSinceStart = (
  impressions: Array<{ createdAt: Date; psychologist_id: string }>,
  professionalStartDates: Map<string, Date>,
) => {
  const counts = new Map<string, number>();

  for (const impression of impressions) {
    const startedAt = professionalStartDates.get(impression.psychologist_id);

    if (!startedAt || impression.createdAt < startedAt) continue;

    counts.set(impression.psychologist_id, (counts.get(impression.psychologist_id) ?? 0) + 1);
  }

  return counts;
};

export const mergeLatestActivity = (
  map: Map<string, Date>,
  psychologistId: string,
  date: Date | null | undefined,
) => {
  if (!date) return;

  const current = map.get(psychologistId);
  if (!current || date > current) {
    map.set(psychologistId, date);
  }
};

export const mapGroupCounts = (groups: CountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));
