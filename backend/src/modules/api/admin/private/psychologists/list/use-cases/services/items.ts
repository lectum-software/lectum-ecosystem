import {
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  type buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionCategory,
} from "@/utils/admin-profile-conversion";
import {
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG,
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS,
  calculateAdminProfileReceivedEngagementScore,
  diagnoseAdminProfileReceivedEngagement,
  normalizeAdminProfileReceivedEngagementToThirtyDays,
} from "@/utils/admin-profile-received-engagement";
import { daysBetweenInclusive, startOfDate } from "@/utils/date-range";
import { crpExperienceYears } from "@/utils/professional-experience";
import type {
  AdminPsychologistsListItem,
  AdminPsychologistsListProfileConversionCategoryId,
  AdminPsychologistsListProfileConversionEngagementQuadrantId,
  AdminPsychologistsListQuery,
  AdminPsychologistsListSort,
} from "../../DTOs/IAdminPsychologistsListDTO";
import type {
  AdminPsychologistListProfileRecord,
  AdminPsychologistReceivedEngagementCountsRecord,
} from "../../repositories/interfaces/IAdminPsychologistsListRepository";
import { emptyReceivedEngagementCounts } from "./filters";
import {
  buildRegistryVerification,
  COMMUNITY_ENGAGEMENT_ACTIVE_30D,
  COMMUNITY_ENGAGEMENT_HIGHLY_ACTIVE_30D,
  COMMUNITY_ENGAGEMENT_MINIMUM_SIGNAL_30D,
  COMMUNITY_ENGAGEMENT_SOURCE,
  mapStatus,
  normalizeName,
  PROFILE_CONVERSION_CATEGORY_CONFIG,
  pickCurrentPlan,
} from "./list-support";

export const roundScore = (value: number) => Math.round(value * 1000) / 10;

export const ratingAverage = (value: number) => Math.round((value / 100) * 10) / 10;

export const profileActiveDaysUntil = (profileCreatedAt: Date, date: Date) => {
  const createdAt = startOfDate(profileCreatedAt);
  const until = startOfDate(date);

  if (createdAt > until) return 0;

  return daysBetweenInclusive(createdAt, until);
};

export type ProfileConversionSignalCounts = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

export const classifyProfileConversionCategory = (
  signals: ProfileConversionSignalCounts,
): AdminPsychologistsListProfileConversionCategoryId => {
  return classifyAdminProfileConversionCategory(signals);
};

export const buildProfileConversionSummary = (input: {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
}): AdminPsychologistsListItem["profile_conversion"] => {
  const signals = {
    activeDays: input.activeDays,
    benchmark: input.benchmark,
    profileAgeDays: input.profileAgeDays,
    whatsappClicks: input.whatsappClicks,
  };
  const categoryId = classifyProfileConversionCategory(signals);
  const config = PROFILE_CONVERSION_CATEGORY_CONFIG[categoryId];

  return {
    benchmark: input.benchmark,
    description: config.description,
    id: categoryId,
    label: config.label,
    signals: {
      active_days: signals.activeDays,
      profile_age_days: signals.profileAgeDays,
      whatsapp_clicks: signals.whatsappClicks,
    },
    source: ADMIN_PROFILE_CONVERSION_SOURCE,
    thresholds: ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  };
};

export const buildEngagementSummary = (input: {
  activeDays: number;
  commentsReceived: number;
  contentSaves: number;
  contentShares: number;
  positiveVotes: number;
  profileFavorites: number;
  profileFollows: number;
}): AdminPsychologistsListItem["engagement"] => {
  const interactions =
    input.commentsReceived +
    input.contentSaves +
    input.contentShares +
    input.positiveVotes +
    input.profileFavorites +
    input.profileFollows;
  const weightedScore = calculateAdminProfileReceivedEngagementScore({
    activeDays: input.activeDays,
    commentsReceived: input.commentsReceived,
    contentSaves: input.contentSaves,
    contentShares: input.contentShares,
    positiveVotes: input.positiveVotes,
    profileFavorites: input.profileFavorites,
    profileFollows: input.profileFollows,
  });
  const normalizedInteractions = normalizeAdminProfileReceivedEngagementToThirtyDays(
    interactions,
    input.activeDays,
  );
  const diagnosis = diagnoseAdminProfileReceivedEngagement({
    activeDays: input.activeDays,
    commentsReceived: input.commentsReceived,
    contentSaves: input.contentSaves,
    contentShares: input.contentShares,
    positiveVotes: input.positiveVotes,
    profileFavorites: input.profileFavorites,
    profileFollows: input.profileFollows,
    source: COMMUNITY_ENGAGEMENT_SOURCE,
  });

  return {
    id: diagnosis.id,
    label: diagnosis.label,
    signals: {
      active_days: input.activeDays,
      comments_received: input.commentsReceived,
      content_saves: input.contentSaves,
      content_shares: input.contentShares,
      interactions,
      normalized_interactions_30d: normalizedInteractions,
      normalized_weighted_score_30d: weightedScore.weighted_score_30d,
      positive_votes: input.positiveVotes,
      profile_favorites: input.profileFavorites,
      profile_follows: input.profileFollows,
      uncapped_normalized_weighted_score_30d: weightedScore.uncapped_weighted_score_30d,
    },
    source: COMMUNITY_ENGAGEMENT_SOURCE,
    thresholds: {
      active_interactions_30d: COMMUNITY_ENGAGEMENT_ACTIVE_30D,
      active_score_30d: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.engaged_score_30d,
      highly_active_interactions_30d: COMMUNITY_ENGAGEMENT_HIGHLY_ACTIVE_30D,
      highly_active_score_30d:
        ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.very_engaged_score_30d,
      minimum_signal_interactions_30d: COMMUNITY_ENGAGEMENT_MINIMUM_SIGNAL_30D,
      minimum_signal_score_30d:
        ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS.minimum_signal_score_30d,
      score_caps_30d: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG.caps_30d,
      weights: ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG.weights,
    },
  };
};

export const buildItem = (
  profile: AdminPsychologistListProfileRecord,
  params: {
    benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
    date: Date;
    favoriteCounts: Map<string, number>;
    rankingById: Map<string, { position: number; score: number }>;
    receivedEngagementCounts: Map<string, AdminPsychologistReceivedEngagementCountsRecord>;
    whatsappCounts: Map<string, number>;
  },
): AdminPsychologistsListItem => {
  const plan = pickCurrentPlan(profile, params.date);
  const userId = profile.user.id;
  const ranking = params.rankingById.get(userId);
  const status = mapStatus(profile, params.date);
  const activeDays = profileActiveDaysUntil(profile.user.createdAt, params.date);
  const favorites = params.favoriteCounts.get(userId) ?? 0;
  const profileAgeDays = profileActiveDaysUntil(profile.user.createdAt, params.date);
  const whatsappClicks = params.whatsappCounts.get(userId) ?? 0;
  const receivedEngagement =
    params.receivedEngagementCounts.get(userId) ?? emptyReceivedEngagementCounts(userId);

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
      commentsReceived: receivedEngagement.comments_received,
      contentSaves: receivedEngagement.content_saves,
      contentShares: receivedEngagement.content_shares,
      positiveVotes: receivedEngagement.positive_votes,
      profileFavorites: receivedEngagement.profile_favorites,
      profileFollows: receivedEngagement.profile_follows,
    }),
    experience_years: crpExperienceYears(profile.crp_registration_date),
    favorites_count: favorites,
    gender: profile.gender,
    id: userId,
    name: normalizeName(profile.user.name),
    plan_name: plan?.plan.name ?? null,
    plan_slug: plan?.plan.slug ?? null,
    public_profile_url: `/psicologos/${userId}`,
    published: profile.published,
    ranking_position: ranking?.position ?? null,
    ranking_score: ranking?.score ?? null,
    rating_avg: ratingAverage(profile.rating_avg),
    rating_count: profile.rating_count,
    social_value: profile.social_value,
    state: profile.professional_address_state,
    status,
    profile_conversion: buildProfileConversionSummary({
      activeDays,
      benchmark: params.benchmark,
      profileAgeDays,
      whatsappClicks,
    }),
    registry_verification: buildRegistryVerification(profile, params.date),
    verified: status === "verified",
    whatsapp_clicks_count: whatsappClicks,
  };
};

export type ListProfileConversionEngagementLevel =
  | "engaged"
  | "low_engaged"
  | "no_engagement"
  | "very_engaged";

export const listEngagementLevelFromItem = (
  item: AdminPsychologistsListItem,
): ListProfileConversionEngagementLevel => {
  if (item.engagement.signals.interactions <= 0) return "no_engagement";
  if (item.engagement.id === "muito_ativo") return "very_engaged";
  if (item.engagement.id === "ativo") return "engaged";

  return "low_engaged";
};

export const resolveProfileConversionEngagementQuadrant = (
  item: AdminPsychologistsListItem,
): AdminPsychologistsListProfileConversionEngagementQuadrantId => {
  const engagementLevel = listEngagementLevelFromItem(item);
  const profileConversionPrefix =
    item.profile_conversion.id === "insufficient_data"
      ? "standard_conversion"
      : item.profile_conversion.id;
  const quadrantId = `${profileConversionPrefix}_${engagementLevel}`;

  return quadrantId as AdminPsychologistsListProfileConversionEngagementQuadrantId;
};

export const matchesSignalFilters = (
  item: AdminPsychologistsListItem,
  query: AdminPsychologistsListQuery,
) =>
  (!query.profile_conversion || item.profile_conversion.id === query.profile_conversion) &&
  (!query.engagement || item.engagement.id === query.engagement) &&
  (!query.profile_conversion_engagement ||
    resolveProfileConversionEngagementQuadrant(item) === query.profile_conversion_engagement);

export const sortItems = (
  items: AdminPsychologistsListItem[],
  sort: AdminPsychologistsListSort,
) => {
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
