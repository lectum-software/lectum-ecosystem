import type { AdminPsychologistEngagementRepository } from "../../repositories/AdminPsychologistEngagementRepository";
import type { resolvePeriod } from "./business-content";
import {
  filterCommunityContentAttentionSessions,
  filterPatientPostsByCommunity,
  filterPostsByCommunity,
  filterRepliesByCommunity,
  type normalizeStatisticsQuery,
  resolveCommunityFilterIds,
  uniqueCommunityReferences,
} from "./community-coverage";

type StatisticsProfile = NonNullable<
  Awaited<ReturnType<AdminPsychologistEngagementRepository["findPsychologist"]>>
>;
type StatisticsPeriod = Extract<ReturnType<typeof resolvePeriod>, { success: true }>;
type StatisticsQuery = ReturnType<typeof normalizeStatisticsQuery>;

export type AdminPsychologistStatisticsDataInput = {
  period: StatisticsPeriod;
  profile: StatisticsProfile;
  query: StatisticsQuery;
  repository: AdminPsychologistEngagementRepository;
};

export const loadAdminPsychologistStatisticsData = async ({
  period,
  profile,
  query,
  repository,
}: AdminPsychologistStatisticsDataInput) => {
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
    contentPostWhatsappClicks,
    contentReplyWhatsappClicks,
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
    repository.countPostWhatsappClicks(postIds, period.current.start, period.current.end),
    repository.countReplyWhatsappClicks(replyIds, period.current.start, period.current.end),
  ]);

  return {
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
  };
};
