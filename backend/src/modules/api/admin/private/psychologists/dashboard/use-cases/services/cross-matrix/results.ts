import {
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionQuality,
} from "@/utils/admin-profile-conversion";
import {
  ADMIN_PROFILE_ENGAGEMENT_FAVORITES_THRESHOLDS,
  buildAdminProfileEngagementFavoritesBenchmark,
  classifyAdminProfileEngagementFavoritesCommunityCategory,
  classifyAdminProfileEngagementFavoritesFavoriteCategory,
} from "@/utils/admin-profile-engagement-favorites";
import {
  ADMIN_PROFILE_EXPOSURE_THRESHOLDS,
  buildAdminProfileExposureBenchmark,
  classifyAdminProfileExposureCommunityCategory,
  classifyAdminProfileExposureVideoCategory,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardProfileActivityTotals,
  AdminPsychologistsDashboardProfileCrossMatrixResults,
  AdminPsychologistsDashboardProfileEngagementFavoritesTotals,
  AdminPsychologistsDashboardProfileExposureTotals,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistAttentionRecord,
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistEventRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
  AdminPsychologistReceivedEngagementEventRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { dateInRange } from "../pre-signup/conversion";
import {
  buildProfileCoverageCountsByPsychologistId,
  classifyProfileActivityCategory,
  classifyProfileCoverageCategory,
  emptyProfileActivityTotals,
} from "../profile/activity";
import {
  countEventsByPsychologist,
  getProfileActiveDaysInRange,
  getProfileAgeDaysUntil,
} from "../profile/conversion";
import {
  buildProfileEngagementFavoritesSignalTotals,
  countReceivedEngagementEventsByPsychologist,
  emptyProfileEngagementFavoritesTotals,
  emptyReceivedEngagementSignalCounts,
} from "../profile/engagement-favorites";
import {
  buildProfileExposureSignalTotals,
  emptyProfileExposureTotals,
  getProfileExposureCommunityVisibilitySeconds,
  getProfileExposureVideoVisibilitySeconds,
} from "../profile/exposure";
import { classifyProfileConversionMatrixCategory } from "../profile/favorites-matrix";
import { normalizeProfileConversionGoalCategory } from "../support/constants";
import { percentileValue, safePercentage } from "../support/metrics";
import { isCommunityTrafficVideoMedia, roundTrafficMetricPercent } from "../traffic/community";
import { hasProfileTrafficVideoViewSignal } from "../traffic/profile";
import type {
  CommunityContentFormatSignals,
  ProfileCrossMatrixAssignments,
  ProfileOpeningCategoryId,
  ReviewsCategoryId,
} from "./config";
import {
  addProfileCrossMatrixCount,
  classifyCommunityContentFormatCategory,
  classifyPresentationVideoPositionCategory,
  classifyProfileCrossMatrixCountCategory,
  classifyProfileVideoRetentionCategory,
  emptyCommunityContentFormatSignals,
  PROFILE_CROSS_MATRIX_AXIS_DEFINITIONS,
  PROFILE_CROSS_MATRIX_DEFAULT_COLUMN_AXIS_ID,
  PROFILE_CROSS_MATRIX_DEFAULT_ROW_AXIS_ID,
  PROFILE_CROSS_MATRIX_SOURCE,
} from "./config";

export const buildProfileCrossMatrixResults = (params: {
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
    const conversionGoalCategory = normalizeProfileConversionGoalCategory(
      classifyAdminProfileConversionQuality({
        activeDays,
        profileAgeDays,
        whatsappClicks,
      }),
    );
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
      conversion_goal: conversionGoalCategory,
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
          description: `Matriz observacional entre ${rowAxis.label} e ${columnAxis.label}, calculada por psicólogo a partir dos eventos do período selecionado.`,
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
