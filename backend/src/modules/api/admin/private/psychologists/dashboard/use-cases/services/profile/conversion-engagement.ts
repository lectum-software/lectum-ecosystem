import {
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import {
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_CONFIG,
  ADMIN_PROFILE_RECEIVED_ENGAGEMENT_SCORE_THRESHOLDS,
  calculateAdminProfileReceivedEngagementScore,
  diagnoseAdminProfileReceivedEngagement,
  normalizeAdminProfileReceivedEngagementToThirtyDays,
} from "@/utils/admin-profile-received-engagement";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileConversionCategoryId,
  AdminPsychologistsDashboardProfileConversionEngagementLevelId,
  AdminPsychologistsDashboardProfileConversionEngagementQuadrantId,
  AdminPsychologistsDashboardProfileConversionEngagementResults,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistReceivedEngagementEventRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  buildProfileConversionEngagementQuadrantId,
  getProfileConversionEngagementQuadrantConfig,
  mapProfileConversionCategoryToEngagementAxis,
  PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER,
  PROFILE_CONVERSION_ENGAGEMENT_ENGAGED_INTERACTIONS_30D,
  PROFILE_CONVERSION_ENGAGEMENT_LEVEL_ORDER,
  PROFILE_CONVERSION_ENGAGEMENT_MIN_ACTIVE_DAYS,
  PROFILE_CONVERSION_ENGAGEMENT_MINIMUM_SIGNAL_30D,
  PROFILE_CONVERSION_ENGAGEMENT_QUADRANT_ORDER,
  PROFILE_CONVERSION_ENGAGEMENT_VERY_ENGAGED_INTERACTIONS_30D,
  RECEIVED_ENGAGEMENT_SOURCE,
} from "../support/constants";
import { roundPercent, safeNullablePercentage, safePercentage } from "../support/metrics";
import {
  classifyProfileConversionCategory,
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "./conversion";
import {
  countReceivedEngagementEventsByPsychologist,
  emptyReceivedEngagementSignalCounts,
} from "./engagement-favorites";

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

export const buildProfileConversionEngagementResults = (params: {
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
