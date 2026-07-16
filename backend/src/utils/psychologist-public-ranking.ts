import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const QUALIFIED_VIDEO_WATCH_SECONDS = 3;
const VIDEO_LEARNING_QUALIFIED_VIEWS = 30;
const DEFAULT_NEW_VIDEO_SCORE = 0.5;
const VIDEO_RETENTION_SCORE_WEIGHT = 0.85;
const VIDEO_COMPLETION_SCORE_WEIGHT = 0.15;
const WHATSAPP_CTR_SMOOTHING_EXPOSURES = 10;
const WHATSAPP_CTR_SMOOTHING_CLICKS = 0.5;
const FAVORITES_SCORE_TARGET = 20;
const REVIEW_COUNT_SCORE_TARGET = 30;
const RATING_PRIOR_COUNT = 5;
const RATING_PRIOR_SCORE = 0.8;
const RECENCY_WINDOW_DAYS = 90;
const CONTROLLED_RANDOMIZATION_RANGE = 0.08;
const SEARCH_RESULT_SOURCE = "search_result";

const PROFESSIONAL_COLD_START_MIN_DAYS = 30;
const PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS = 500;
const PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS = 30;
const PROFESSIONAL_COLD_START_RESERVED_SLOT_RATIO = 0.3;

export const psychologistPublicRankingWeights = {
  video: 0.25,
  whatsapp: 0.25,
  favorites: 0.15,
  reviewCount: 0.12,
  weightedRating: 0.12,
  completeness: 0.07,
  recency: 0.04,
} as const;

type VideoWatchSessionForRanking = {
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

type CountGroup = {
  _count: {
    _all: number;
  };
  _max?: {
    createdAt: Date | null;
  };
  psychologist_id: string;
};

type VideoRankingStats = {
  latestAt: Date | null;
  qualifiedViews: number;
  score: number;
};

type RankingContext = {
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

type RankedPsychologistCandidate<T extends PsychologistRankingCandidate> = {
  item: T;
  ranking: PsychologistRanking;
};

const clampScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
};

const hasText = (value?: string | null) => Boolean(value?.trim());

const hasJsonItems = (value: Prisma.JsonValue | null) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;

  return false;
};

const scoreByTarget = (value: number, target: number) => {
  if (value <= 0) return 0;

  return clampScore(1 - Math.exp(-value / target));
};

const hashToUnit = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
};

const isQualifiedVideoView = (session: VideoWatchSessionForRanking) =>
  session.watched_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS ||
  session.max_position_seconds >= QUALIFIED_VIDEO_WATCH_SECONDS;

const calculateSingleVideoScore = (sessions: VideoWatchSessionForRanking[]) => {
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

const calculateVideoScoreWithLearningWindow = (
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

const calculateWhatsappConversionScore = (clicks: number, qualifiedViews: number) => {
  const denominator = Math.max(qualifiedViews, clicks, 0) + WHATSAPP_CTR_SMOOTHING_EXPOSURES;
  const numerator = clicks + WHATSAPP_CTR_SMOOTHING_CLICKS;

  return clampScore(numerator / denominator);
};

const calculateWeightedRatingScore = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0 || ratingAvg <= 0) return 0;

  const normalizedRating = clampScore(ratingAvg / 500);

  return clampScore(
    (normalizedRating * ratingCount + RATING_PRIOR_SCORE * RATING_PRIOR_COUNT) /
      (ratingCount + RATING_PRIOR_COUNT),
  );
};

const calculateCompletenessScore = (candidate: PsychologistRankingCandidate) => {
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

const calculateRecencyScore = (latestActivityAt: Date | null, now: Date) => {
  if (!latestActivityAt) return 0;

  const daysSinceActivity = Math.max(0, (now.getTime() - latestActivityAt.getTime()) / MS_PER_DAY);

  return clampScore(1 - daysSinceActivity / RECENCY_WINDOW_DAYS);
};

const pickLatestDate = (...dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    if (!latest || date > latest) return date;

    return latest;
  }, null);

const parseDate = (value?: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getProfessionalStartDate = (candidate: PsychologistRankingCandidate) =>
  candidate.subscriptions.reduce<Date | null>((earliest, subscription) => {
    const startedAt = parseDate(subscription.grant_started_at) ?? parseDate(subscription.createdAt);

    if (!startedAt) return earliest;
    if (!earliest || startedAt < earliest) return startedAt;

    return earliest;
  }, null);

const countSearchImpressionsSinceStart = (
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

const mergeLatestActivity = (
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

const mapGroupCounts = (groups: CountGroup[]) =>
  new Map(groups.map((group) => [group.psychologist_id, group._count._all]));

const getRankingContext = async (
  candidates: PsychologistRankingCandidate[],
  viewerId: string | null,
): Promise<RankingContext> => {
  const now = new Date();
  const latestActivityAt = new Map<string, Date>();
  const psychologistIds = candidates.map((item) => item.user.id);
  const professionalStartDates = new Map(
    candidates
      .map((item) => [item.user.id, getProfessionalStartDate(item)] as const)
      .filter((entry): entry is readonly [string, Date] => Boolean(entry[1])),
  );
  const earliestProfessionalStart = [...professionalStartDates.values()].reduce<Date | null>(
    (earliest, startedAt) => {
      if (!earliest || startedAt < earliest) return startedAt;

      return earliest;
    },
    null,
  );

  if (psychologistIds.length === 0) {
    return {
      favoriteCounts: new Map(),
      latestActivityAt,
      now,
      professionalStartDates,
      qualifiedVideoViewsSinceProfessionalStart: new Map(),
      seedDate: now.toISOString().slice(0, 10),
      searchImpressionsSinceProfessionalStart: new Map(),
      videoStats: new Map(),
      viewerId,
      whatsappClickCounts: new Map(),
    };
  }

  const [favoriteGroups, whatsappGroups, reviewGroups, videoSessions, searchImpressions] =
    await Promise.all([
      prisma.psychologist_favorite.groupBy({
        by: ["psychologist_id"],
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.contact_request.groupBy({
        by: ["psychologist_id"],
        where: {
          channel: "whatsapp",
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["psychologist_id"],
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
          status: "publicada",
        },
        _count: {
          _all: true,
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.profile_video_watch_session.findMany({
        where: {
          deleted: false,
          psychologist_id: {
            in: psychologistIds,
          },
          OR: [
            {
              watched_seconds: {
                gt: 0,
              },
            },
            {
              max_position_seconds: {
                gt: 0,
              },
            },
          ],
        },
        select: {
          completed: true,
          createdAt: true,
          duration_seconds: true,
          last_event_at: true,
          max_position_seconds: true,
          milestone_100: true,
          psychologist_id: true,
          video_url: true,
          watched_seconds: true,
        },
      }),
      earliestProfessionalStart
        ? prisma.profile_view_event.findMany({
            where: {
              createdAt: {
                gte: earliestProfessionalStart,
              },
              deleted: false,
              psychologist_id: {
                in: psychologistIds,
              },
              source: SEARCH_RESULT_SOURCE,
            },
            select: {
              createdAt: true,
              psychologist_id: true,
            },
          })
        : Promise.resolve([]),
    ]);

  for (const group of [...favoriteGroups, ...whatsappGroups, ...reviewGroups]) {
    mergeLatestActivity(latestActivityAt, group.psychologist_id, group._max?.createdAt);
  }

  const sessionsByPsychologist = new Map<string, VideoWatchSessionForRanking[]>();
  const qualifiedVideoViewsSinceProfessionalStart = new Map<string, number>();

  for (const session of videoSessions) {
    const sessions = sessionsByPsychologist.get(session.psychologist_id) ?? [];
    sessions.push(session);
    sessionsByPsychologist.set(session.psychologist_id, sessions);
    mergeLatestActivity(latestActivityAt, session.psychologist_id, session.last_event_at);

    const professionalStartedAt = professionalStartDates.get(session.psychologist_id);

    if (
      professionalStartedAt &&
      session.createdAt >= professionalStartedAt &&
      isQualifiedVideoView(session)
    ) {
      qualifiedVideoViewsSinceProfessionalStart.set(
        session.psychologist_id,
        (qualifiedVideoViewsSinceProfessionalStart.get(session.psychologist_id) ?? 0) + 1,
      );
    }
  }

  const videoStats = new Map<string, VideoRankingStats>();

  for (const candidate of candidates) {
    videoStats.set(
      candidate.user.id,
      calculateVideoScoreWithLearningWindow(
        candidate.video_url,
        sessionsByPsychologist.get(candidate.user.id) ?? [],
      ),
    );
  }

  return {
    favoriteCounts: mapGroupCounts(favoriteGroups),
    latestActivityAt,
    now,
    professionalStartDates,
    qualifiedVideoViewsSinceProfessionalStart,
    seedDate: now.toISOString().slice(0, 10),
    searchImpressionsSinceProfessionalStart: countSearchImpressionsSinceStart(
      searchImpressions,
      professionalStartDates,
    ),
    videoStats,
    viewerId,
    whatsappClickCounts: mapGroupCounts(whatsappGroups),
  };
};

const calculateRanking = (
  candidate: PsychologistRankingCandidate,
  context: RankingContext,
): PsychologistRanking => {
  const psychologistId = candidate.user.id;
  const isVerified = isVerifiedProfessionalEntitlement(candidate);
  const videoStats = context.videoStats.get(psychologistId) ?? {
    latestAt: null,
    qualifiedViews: 0,
    score: DEFAULT_NEW_VIDEO_SCORE,
  };
  const favoriteCount = context.favoriteCounts.get(psychologistId) ?? 0;
  const whatsappClicks = context.whatsappClickCounts.get(psychologistId) ?? 0;
  const professionalStartedAt = context.professionalStartDates.get(psychologistId) ?? null;
  const daysSinceProfessionalStart = professionalStartedAt
    ? Math.max(0, (context.now.getTime() - professionalStartedAt.getTime()) / MS_PER_DAY)
    : null;
  const professionalSearchImpressions =
    context.searchImpressionsSinceProfessionalStart.get(psychologistId) ?? 0;
  const professionalQualifiedVideoViews =
    context.qualifiedVideoViewsSinceProfessionalStart.get(psychologistId) ?? 0;
  const hasProfessionalColdStartExposure =
    professionalSearchImpressions >= PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS ||
    professionalQualifiedVideoViews >= PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS;
  const hasCompletedProfessionalColdStart =
    daysSinceProfessionalStart !== null &&
    daysSinceProfessionalStart >= PROFESSIONAL_COLD_START_MIN_DAYS &&
    hasProfessionalColdStartExposure;
  const isProfessionalColdStart =
    isVerified && Boolean(professionalStartedAt) && !hasCompletedProfessionalColdStart;
  const components: PsychologistRankingComponents = {
    completeness: calculateCompletenessScore(candidate),
    favorites: scoreByTarget(favoriteCount, FAVORITES_SCORE_TARGET),
    recency: calculateRecencyScore(
      pickLatestDate(
        candidate.updatedAt,
        context.latestActivityAt.get(psychologistId),
        videoStats.latestAt,
      ),
      context.now,
    ),
    review_count: scoreByTarget(candidate.rating_count, REVIEW_COUNT_SCORE_TARGET),
    video: videoStats.score,
    weighted_rating: calculateWeightedRatingScore(candidate.rating_avg, candidate.rating_count),
    whatsapp: calculateWhatsappConversionScore(whatsappClicks, videoStats.qualifiedViews),
  };
  const baseScore =
    components.video * psychologistPublicRankingWeights.video +
    components.whatsapp * psychologistPublicRankingWeights.whatsapp +
    components.favorites * psychologistPublicRankingWeights.favorites +
    components.review_count * psychologistPublicRankingWeights.reviewCount +
    components.weighted_rating * psychologistPublicRankingWeights.weightedRating +
    components.completeness * psychologistPublicRankingWeights.completeness +
    components.recency * psychologistPublicRankingWeights.recency;
  const randomUnit = hashToUnit(
    `${context.seedDate}:${context.viewerId ?? "anonymous"}:${psychologistId}`,
  );
  const multiplier = 1 + (randomUnit - 0.5) * CONTROLLED_RANDOMIZATION_RANGE;

  return {
    baseScore: clampScore(baseScore),
    components,
    isProfessionalColdStart,
    isVerified,
    score: clampScore(baseScore * multiplier),
  };
};

const compareRankedPsychologistCandidates = <T extends PsychologistRankingCandidate>(
  a: RankedPsychologistCandidate<T>,
  b: RankedPsychologistCandidate<T>,
) => {
  if (a.ranking.isVerified !== b.ranking.isVerified) {
    return Number(b.ranking.isVerified) - Number(a.ranking.isVerified);
  }

  if (b.ranking.score !== a.ranking.score) {
    return b.ranking.score - a.ranking.score;
  }

  if (b.ranking.baseScore !== a.ranking.baseScore) {
    return b.ranking.baseScore - a.ranking.baseScore;
  }

  if (b.item.rating_count !== a.item.rating_count) {
    return b.item.rating_count - a.item.rating_count;
  }

  if (b.item.rating_avg !== a.item.rating_avg) {
    return b.item.rating_avg - a.item.rating_avg;
  }

  return b.item.createdAt.getTime() - a.item.createdAt.getTime();
};

const applyProfessionalColdStartReservation = <T extends PsychologistRankingCandidate>(
  verifiedCandidates: Array<RankedPsychologistCandidate<T>>,
) => {
  const coldStartCandidates = verifiedCandidates
    .filter(({ ranking }) => ranking.isProfessionalColdStart)
    .sort(compareRankedPsychologistCandidates);
  const establishedCandidates = verifiedCandidates
    .filter(({ ranking }) => !ranking.isProfessionalColdStart)
    .sort(compareRankedPsychologistCandidates);

  if (coldStartCandidates.length === 0 || establishedCandidates.length === 0) {
    return [...establishedCandidates, ...coldStartCandidates];
  }

  const ranked: Array<RankedPsychologistCandidate<T>> = [];
  let coldStartIndex = 0;
  let establishedIndex = 0;

  while (
    coldStartIndex < coldStartCandidates.length ||
    establishedIndex < establishedCandidates.length
  ) {
    const nextPosition = ranked.length + 1;
    const reservedColdStartSlots = Math.floor(
      nextPosition * PROFESSIONAL_COLD_START_RESERVED_SLOT_RATIO,
    );
    const shouldUseColdStartSlot =
      coldStartIndex < coldStartCandidates.length && coldStartIndex < reservedColdStartSlots;

    if (shouldUseColdStartSlot || establishedIndex >= establishedCandidates.length) {
      ranked.push(coldStartCandidates[coldStartIndex]);
      coldStartIndex += 1;
      continue;
    }

    ranked.push(establishedCandidates[establishedIndex]);
    establishedIndex += 1;
  }

  return ranked;
};

export const rankPsychologistCandidates = async <T extends PsychologistRankingCandidate>(
  candidates: T[],
  viewerId: string | null,
) => {
  const context = await getRankingContext(candidates, viewerId);

  const rankedCandidates = candidates
    .map(
      (item): RankedPsychologistCandidate<T> => ({
        item,
        ranking: calculateRanking(item, context),
      }),
    )
    .sort(compareRankedPsychologistCandidates);
  const verifiedCandidates = rankedCandidates.filter(({ ranking }) => ranking.isVerified);
  const unverifiedCandidates = rankedCandidates.filter(({ ranking }) => !ranking.isVerified);

  return [
    ...applyProfessionalColdStartReservation(verifiedCandidates),
    ...unverifiedCandidates.sort(compareRankedPsychologistCandidates),
  ];
};
