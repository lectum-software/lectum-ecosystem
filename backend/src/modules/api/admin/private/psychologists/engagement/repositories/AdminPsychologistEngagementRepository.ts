import { AdminPsychologistEngagementContentRepository } from "./queries/AdminPsychologistEngagementContentRepository";
import { AdminPsychologistEngagementProfileRepository } from "./queries/AdminPsychologistEngagementProfileRepository";
import { AdminPsychologistEngagementRankingRepository } from "./queries/AdminPsychologistEngagementRankingRepository";
import { AdminPsychologistEngagementTrafficRepository } from "./queries/AdminPsychologistEngagementTrafficRepository";

export class AdminPsychologistEngagementRepository {
  private readonly profileRepository = new AdminPsychologistEngagementProfileRepository();

  private readonly trafficRepository = new AdminPsychologistEngagementTrafficRepository();

  private readonly contentRepository = new AdminPsychologistEngagementContentRepository();

  private readonly rankingRepository = new AdminPsychologistEngagementRankingRepository();

  findPsychologist(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["findPsychologist"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["findPsychologist"]> {
    return this.profileRepository.findPsychologist(...args);
  }

  listProfileConversionBenchmarkProfiles(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listProfileConversionBenchmarkProfiles"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listProfileConversionBenchmarkProfiles"]
  > {
    return this.profileRepository.listProfileConversionBenchmarkProfiles(...args);
  }

  listWhatsappClickCountsByPsychologist(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listWhatsappClickCountsByPsychologist"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listWhatsappClickCountsByPsychologist"]
  > {
    return this.profileRepository.listWhatsappClickCountsByPsychologist(...args);
  }

  listPublicProfileAttentionSecondsByPsychologists(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listPublicProfileAttentionSecondsByPsychologists"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listPublicProfileAttentionSecondsByPsychologists"]
  > {
    return this.profileRepository.listPublicProfileAttentionSecondsByPsychologists(...args);
  }

  listCommunityContentAttentionSecondsByPsychologists(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listCommunityContentAttentionSecondsByPsychologists"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listCommunityContentAttentionSecondsByPsychologists"]
  > {
    return this.profileRepository.listCommunityContentAttentionSecondsByPsychologists(...args);
  }

  listProfileVideoAttentionSecondsByPsychologists(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listProfileVideoAttentionSecondsByPsychologists"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listProfileVideoAttentionSecondsByPsychologists"]
  > {
    return this.profileRepository.listProfileVideoAttentionSecondsByPsychologists(...args);
  }

  listProfileViews(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listProfileViews"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listProfileViews"]> {
    return this.profileRepository.listProfileViews(...args);
  }

  listPlatformPageViews(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listPlatformPageViews"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listPlatformPageViews"]> {
    return this.profileRepository.listPlatformPageViews(...args);
  }

  listPlatformSessions(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listPlatformSessions"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listPlatformSessions"]> {
    return this.profileRepository.listPlatformSessions(...args);
  }

  findPwaInstallAction(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["findPwaInstallAction"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["findPwaInstallAction"]> {
    return this.profileRepository.findPwaInstallAction(...args);
  }

  listPublicProfilePageViews(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listPublicProfilePageViews"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listPublicProfilePageViews"]> {
    return this.profileRepository.listPublicProfilePageViews(...args);
  }

  listPublicProfileAttentionSessions(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listPublicProfileAttentionSessions"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listPublicProfileAttentionSessions"]
  > {
    return this.profileRepository.listPublicProfileAttentionSessions(...args);
  }

  listCommunityContentAttentionSessions(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listCommunityContentAttentionSessions"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listCommunityContentAttentionSessions"]
  > {
    return this.profileRepository.listCommunityContentAttentionSessions(...args);
  }

  listSearchResultImpressions(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listSearchResultImpressions"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listSearchResultImpressions"]> {
    return this.profileRepository.listSearchResultImpressions(...args);
  }

  listWhatsappClicks(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listWhatsappClicks"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listWhatsappClicks"]> {
    return this.profileRepository.listWhatsappClicks(...args);
  }

  listFavorites(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listFavorites"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listFavorites"]> {
    return this.profileRepository.listFavorites(...args);
  }

  listImportantPsychologistWhatsappActions(
    ...args: Parameters<
      AdminPsychologistEngagementProfileRepository["listImportantPsychologistWhatsappActions"]
    >
  ): ReturnType<
    AdminPsychologistEngagementProfileRepository["listImportantPsychologistWhatsappActions"]
  > {
    return this.profileRepository.listImportantPsychologistWhatsappActions(...args);
  }

  listWhatsappTrafficActions(
    ...args: Parameters<AdminPsychologistEngagementProfileRepository["listWhatsappTrafficActions"]>
  ): ReturnType<AdminPsychologistEngagementProfileRepository["listWhatsappTrafficActions"]> {
    return this.profileRepository.listWhatsappTrafficActions(...args);
  }

  listCommunityTrafficPlatformMetricDataset(
    ...args: Parameters<
      AdminPsychologistEngagementTrafficRepository["listCommunityTrafficPlatformMetricDataset"]
    >
  ): ReturnType<
    AdminPsychologistEngagementTrafficRepository["listCommunityTrafficPlatformMetricDataset"]
  > {
    return this.trafficRepository.listCommunityTrafficPlatformMetricDataset(...args);
  }

  listProfileTrafficPlatformMetricDataset(
    ...args: Parameters<
      AdminPsychologistEngagementTrafficRepository["listProfileTrafficPlatformMetricDataset"]
    >
  ): ReturnType<
    AdminPsychologistEngagementTrafficRepository["listProfileTrafficPlatformMetricDataset"]
  > {
    return this.trafficRepository.listProfileTrafficPlatformMetricDataset(...args);
  }

  listReviews(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReviews"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReviews"]> {
    return this.contentRepository.listReviews(...args);
  }

  listVideoSessions(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listVideoSessions"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listVideoSessions"]> {
    return this.contentRepository.listVideoSessions(...args);
  }

  listVideoActionEvents(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listVideoActionEvents"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listVideoActionEvents"]> {
    return this.contentRepository.listVideoActionEvents(...args);
  }

  listAuthoredPosts(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listAuthoredPosts"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listAuthoredPosts"]> {
    return this.contentRepository.listAuthoredPosts(...args);
  }

  listAuthoredReplies(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listAuthoredReplies"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listAuthoredReplies"]> {
    return this.contentRepository.listAuthoredReplies(...args);
  }

  countPatientPostsByCommunity(
    ...args: Parameters<
      AdminPsychologistEngagementContentRepository["countPatientPostsByCommunity"]
    >
  ): ReturnType<AdminPsychologistEngagementContentRepository["countPatientPostsByCommunity"]> {
    return this.contentRepository.countPatientPostsByCommunity(...args);
  }

  listPatientPostsByCommunityForCoverage(
    ...args: Parameters<
      AdminPsychologistEngagementContentRepository["listPatientPostsByCommunityForCoverage"]
    >
  ): ReturnType<
    AdminPsychologistEngagementContentRepository["listPatientPostsByCommunityForCoverage"]
  > {
    return this.contentRepository.listPatientPostsByCommunityForCoverage(...args);
  }

  listPostSaves(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostSaves"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostSaves"]> {
    return this.contentRepository.listPostSaves(...args);
  }

  listReplySaves(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplySaves"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplySaves"]> {
    return this.contentRepository.listReplySaves(...args);
  }

  listCommentsReceived(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listCommentsReceived"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listCommentsReceived"]> {
    return this.contentRepository.listCommentsReceived(...args);
  }

  listPostVotes(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostVotes"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostVotes"]> {
    return this.contentRepository.listPostVotes(...args);
  }

  listReplyVotes(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplyVotes"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplyVotes"]> {
    return this.contentRepository.listReplyVotes(...args);
  }

  listPostShareEvents(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostShareEvents"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostShareEvents"]> {
    return this.contentRepository.listPostShareEvents(...args);
  }

  listReplyShareEvents(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplyShareEvents"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplyShareEvents"]> {
    return this.contentRepository.listReplyShareEvents(...args);
  }

  listPostSavesByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostSavesByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostSavesByUser"]> {
    return this.contentRepository.listPostSavesByUser(...args);
  }

  listReplySavesByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplySavesByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplySavesByUser"]> {
    return this.contentRepository.listReplySavesByUser(...args);
  }

  listPostVotesByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostVotesByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostVotesByUser"]> {
    return this.contentRepository.listPostVotesByUser(...args);
  }

  listReplyVotesByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplyVotesByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplyVotesByUser"]> {
    return this.contentRepository.listReplyVotesByUser(...args);
  }

  listPostShareEventsByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listPostShareEventsByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listPostShareEventsByUser"]> {
    return this.contentRepository.listPostShareEventsByUser(...args);
  }

  listReplyShareEventsByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReplyShareEventsByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReplyShareEventsByUser"]> {
    return this.contentRepository.listReplyShareEventsByUser(...args);
  }

  listReportsByUser(
    ...args: Parameters<AdminPsychologistEngagementContentRepository["listReportsByUser"]>
  ): ReturnType<AdminPsychologistEngagementContentRepository["listReportsByUser"]> {
    return this.contentRepository.listReportsByUser(...args);
  }

  countReplyChildren(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countReplyChildren"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countReplyChildren"]> {
    return this.rankingRepository.countReplyChildren(...args);
  }

  countPostShares(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countPostShares"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countPostShares"]> {
    return this.rankingRepository.countPostShares(...args);
  }

  countReplyShares(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countReplyShares"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countReplyShares"]> {
    return this.rankingRepository.countReplyShares(...args);
  }

  countPostViews(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countPostViews"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countPostViews"]> {
    return this.rankingRepository.countPostViews(...args);
  }

  countReplyViews(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countReplyViews"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countReplyViews"]> {
    return this.rankingRepository.countReplyViews(...args);
  }

  countPostWhatsappClicks(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countPostWhatsappClicks"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countPostWhatsappClicks"]> {
    return this.rankingRepository.countPostWhatsappClicks(...args);
  }

  countReplyWhatsappClicks(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["countReplyWhatsappClicks"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["countReplyWhatsappClicks"]> {
    return this.rankingRepository.countReplyWhatsappClicks(...args);
  }

  listCommunities(
    ...args: Parameters<AdminPsychologistEngagementRankingRepository["listCommunities"]>
  ): ReturnType<AdminPsychologistEngagementRankingRepository["listCommunities"]> {
    return this.rankingRepository.listCommunities(...args);
  }

  listCommunityPsychologistParticipantIds(
    ...args: Parameters<
      AdminPsychologistEngagementRankingRepository["listCommunityPsychologistParticipantIds"]
    >
  ): ReturnType<
    AdminPsychologistEngagementRankingRepository["listCommunityPsychologistParticipantIds"]
  > {
    return this.rankingRepository.listCommunityPsychologistParticipantIds(...args);
  }

  getCommunityMentorRankingSignals(
    ...args: Parameters<
      AdminPsychologistEngagementRankingRepository["getCommunityMentorRankingSignals"]
    >
  ): ReturnType<AdminPsychologistEngagementRankingRepository["getCommunityMentorRankingSignals"]> {
    return this.rankingRepository.getCommunityMentorRankingSignals(...args);
  }

  listTopMentorEligiblePsychologistIds(
    ...args: Parameters<
      AdminPsychologistEngagementRankingRepository["listTopMentorEligiblePsychologistIds"]
    >
  ): ReturnType<
    AdminPsychologistEngagementRankingRepository["listTopMentorEligiblePsychologistIds"]
  > {
    return this.rankingRepository.listTopMentorEligiblePsychologistIds(...args);
  }
}

export type {
  AdminPsychologistCoveragePatientPost,
  AdminPsychologistEngagementPost,
  AdminPsychologistEngagementProfile,
  AdminPsychologistEngagementReply,
  AdminPsychologistPlatformSessionRecord,
  CountByDateRecord,
  ProfileVideoActionType,
} from "./support/engagement-selects";

export { PROFILE_VIDEO_ACTION_TYPES } from "./support/engagement-selects";
