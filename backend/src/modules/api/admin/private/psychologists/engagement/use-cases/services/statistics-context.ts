import {
  bestAdminCommunityEngagementDiagnosis,
  formatAdminPsychologistCommunityEngagementDiagnosis,
} from "@/utils/admin-community-engagement-diagnosis";
import {
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
} from "@/utils/admin-profile-conversion";
import {
  summarizePlatformHourlyActivity,
  summarizePlatformHourlyActivityByWeekday,
  summarizePlatformPeakActivityHours,
  summarizePlatformUsage,
} from "@/utils/admin-psychologist-analytics";
import { buildDateLabels as labelsFromRange, toDateKey } from "@/utils/date-range";
import type { AdminPsychologistAvailabilityMetric } from "../../DTOs/IAdminPsychologistEngagementDTO";
import {
  buildBusinessProfileConversion,
  buildBusinessVisibilityDiagnosis,
  buildContentFormatDistribution,
  buildPatientPostReplyCoverageEntries,
  classifyPostContentFormat,
  classifyReplyContentFormat,
  countPatientPostReplyCoverage,
  getProfileActiveDaysInStatisticsRange,
  getProfileAgeDaysUntil,
} from "./business-content";
import {
  buildCommunityItems,
  buildCoverageRatePercentByDate,
  countCoveredPatientPosts,
  countPatientPostsByCommunity,
  coverageRatePercent,
  withCommunityRankings,
} from "./community-coverage";
import {
  type AdminPsychologistStatisticsDataInput,
  loadAdminPsychologistStatisticsData,
} from "./statistics-data";
import { buildTrafficQuality, buildTrafficSources } from "./traffic-quality";
import { filterCurrentPresentationVideoSessions } from "./video";
import {
  buildPlatformDeviceUsage,
  buildSeries,
  buildVisibilityBreakdownMapsByDate,
  buildVisibilityBreakdownSeries,
  buildVisibilitySecondsByDate,
  groupCountMap,
  latestPlatformAccessAt,
  sum,
  sumMapValues,
  sumVisibilitySecondsByDate,
} from "./visibility-series";

export const buildAdminPsychologistStatisticsContext = async (
  input: AdminPsychologistStatisticsDataInput,
) => {
  const { period, profile, repository } = input;
  const {
    allPosts,
    allReplies,
    benchmarkCommunityContentAttentionSeconds,
    benchmarkProfileAttentionSeconds,
    benchmarkProfileVideoAttentionSeconds,
    benchmarkProfiles,
    benchmarkWhatsappClickCounts,
    commentsReceived,
    communityContentAttentionSessions,
    communityContentAttentionSessionsForFilter,
    communityPosts,
    communityReplies,
    communityTrafficPlatformMetricDataset,
    contentPostWhatsappClicks,
    contentReplyWhatsappClicks,
    favorites,
    importantWhatsappActions,
    memberships,
    patientPostsForCoverage,
    patientPostsForCoverageFilter,
    platformPageViews,
    platformPostSaves,
    platformPostShares,
    platformPostVotes,
    platformReplySaves,
    platformReplyShares,
    platformReplyVotes,
    platformReports,
    platformSessions,
    postSaves,
    postShares,
    postVotes,
    posts,
    previousCommentsReceived,
    previousCommunityContentAttentionSessions,
    previousCommunityContentAttentionSessionsForFilter,
    previousCommunityPosts,
    previousCommunityReplies,
    previousFavorites,
    previousPatientPostsForCoverageFilter,
    previousPostSaves,
    previousPostShares,
    previousPostVotes,
    previousProfileAttentionSessions,
    previousProfileViews,
    previousReplySaves,
    previousReplyShares,
    previousReplyVotes,
    previousReviews,
    previousSearchResults,
    previousVideoActionEvents,
    previousVideoSessions,
    previousWhatsappClicks,
    profileAttentionSessions,
    profileTrafficPlatformMetricDataset,
    profileViews,
    pwaInstallAction,
    replies,
    replySaves,
    replyShares,
    replyVotes,
    reviews,
    searchResults,
    trafficPageViews,
    userId,
    videoActionEvents,
    videoSessions,
    visibilityPostViews,
    visibilityReplyViews,
    whatsappClicks,
    whatsappTrafficActions,
  } = await loadAdminPsychologistStatisticsData(input);

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

  const contentPostWhatsappClicksByPost = groupCountMap(
    contentPostWhatsappClicks,
    (item) => item.target_id,
  );

  const contentReplyWhatsappClicksByReply = groupCountMap(
    contentReplyWhatsappClicks,
    (item) => item.target_id,
  );

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
    posts: buildContentFormatDistribution(
      communityPosts,
      classifyPostContentFormat,
      contentPostWhatsappClicksByPost,
    ),
    replies: buildContentFormatDistribution(
      communityReplies,
      classifyReplyContentFormat,
      contentReplyWhatsappClicksByReply,
    ),
    source:
      "community_post.media_type+community_post_media+post_reply.media_type+important_action_event.action_type=whatsapp_click" as const,
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

  return {
    activityActions,
    businessProfileConversion,
    businessSeries,
    businessVisibilityDiagnosis,
    commentsReceived,
    communityContentDistribution,
    communityContentSeconds,
    communityEngagementDiagnosis,
    communityItems,
    communityPosts,
    communityReplies,
    communitySeries,
    communityVisibilitySeconds,
    contentViewsCount,
    coverageRate,
    currentPresentationVideoSessions,
    detailedVisibilitySeconds,
    downvotesCount,
    favorites,
    patientPostTextReplyCoverageCount,
    patientPostVideoReplyCoverageCount,
    period,
    platformUsage,
    presentationVideoSeconds,
    previousActivityActions,
    previousCommentsReceived,
    previousCommunityContentSeconds,
    previousCommunityPosts,
    previousCommunityReplies,
    previousCommunityVisibilitySeconds,
    previousCoverageRate,
    previousDownvotesCount,
    previousFavorites,
    previousPatientPostTextReplyCoverageCount,
    previousPatientPostVideoReplyCoverageCount,
    previousPresentationVideoSeconds,
    previousProfileViews,
    previousProfileVisibilitySeconds,
    previousReviews,
    previousSavesCount,
    previousSearchResults,
    previousSharesCount,
    previousUpvotesCount,
    previousVideoActionEvents,
    previousVideoSessions,
    previousVisibilitySeconds,
    previousWhatsappClicks,
    profile,
    profileViews,
    profileVisibilitySeconds,
    reviews,
    savesCount,
    searchResults,
    sharesCount,
    trafficQuality,
    trafficSources,
    unavailable,
    upvotesCount,
    videoActionEvents,
    videoSessions,
    visibilityBreakdownSeries,
    visibilitySeconds,
    whatsappClicks,
  };
};

export type AdminPsychologistStatisticsContext = Awaited<
  ReturnType<typeof buildAdminPsychologistStatisticsContext>
>;
