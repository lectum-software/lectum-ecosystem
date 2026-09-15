import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import { getRankingContext } from "./context";
import {
  CONTROLLED_RANDOMIZATION_RANGE,
  calculateCompletenessScore,
  calculateRecencyScore,
  calculateWeightedRatingScore,
  calculateWhatsappConversionScore,
  clampScore,
  DEFAULT_NEW_VIDEO_SCORE,
  FAVORITES_SCORE_TARGET,
  hashToUnit,
  MS_PER_DAY,
  PROFESSIONAL_COLD_START_MIN_DAYS,
  PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS,
  PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS,
  PROFESSIONAL_COLD_START_RESERVED_SLOT_RATIO,
  type PsychologistRanking,
  type PsychologistRankingCandidate,
  type PsychologistRankingComponents,
  pickLatestDate,
  psychologistPublicRankingWeights,
  type RankedPsychologistCandidate,
  type RankingContext,
  REVIEW_COUNT_SCORE_TARGET,
  scoreByTarget,
} from "./scoring";

export const calculateRanking = (
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

export const compareRankedPsychologistCandidates = <T extends PsychologistRankingCandidate>(
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

export const applyProfessionalColdStartReservation = <T extends PsychologistRankingCandidate>(
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
