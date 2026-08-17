import type { IAdminPsychologistsDashboardRepository } from "./interfaces/IAdminPsychologistsDashboardRepository";
import { AdminPsychologistsDashboardDirectoryRepository } from "./queries/AdminPsychologistsDashboardDirectoryRepository";
import { AdminPsychologistsDashboardEngagementRepository } from "./queries/AdminPsychologistsDashboardEngagementRepository";
import { AdminPsychologistsDashboardMetricsRepository } from "./queries/AdminPsychologistsDashboardMetricsRepository";
import { AdminPsychologistsDashboardTrafficRepository } from "./queries/AdminPsychologistsDashboardTrafficRepository";

export class AdminPsychologistsDashboardRepository
  implements IAdminPsychologistsDashboardRepository
{
  private readonly directoryRepository = new AdminPsychologistsDashboardDirectoryRepository();

  private readonly trafficRepository = new AdminPsychologistsDashboardTrafficRepository();

  private readonly engagementRepository = new AdminPsychologistsDashboardEngagementRepository();

  private readonly metricsRepository = new AdminPsychologistsDashboardMetricsRepository();

  listDirectoryFilters(
    ...args: Parameters<AdminPsychologistsDashboardDirectoryRepository["listDirectoryFilters"]>
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listDirectoryFilters"]> {
    return this.directoryRepository.listDirectoryFilters(...args);
  }

  listPsychologistProfiles(
    ...args: Parameters<AdminPsychologistsDashboardDirectoryRepository["listPsychologistProfiles"]>
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPsychologistProfiles"]> {
    return this.directoryRepository.listPsychologistProfiles(...args);
  }

  listDeletedPsychologistAccounts(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listDeletedPsychologistAccounts"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listDeletedPsychologistAccounts"]> {
    return this.directoryRepository.listDeletedPsychologistAccounts(...args);
  }

  listPublicRankingCandidates(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPublicRankingCandidates"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPublicRankingCandidates"]> {
    return this.directoryRepository.listPublicRankingCandidates(...args);
  }

  listPlatformPageViews(
    ...args: Parameters<AdminPsychologistsDashboardDirectoryRepository["listPlatformPageViews"]>
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPlatformPageViews"]> {
    return this.directoryRepository.listPlatformPageViews(...args);
  }

  listPlatformSessions(
    ...args: Parameters<AdminPsychologistsDashboardDirectoryRepository["listPlatformSessions"]>
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPlatformSessions"]> {
    return this.directoryRepository.listPlatformSessions(...args);
  }

  listPreSignupConversionLinkedPageViews(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionLinkedPageViews"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionLinkedPageViews"]
  > {
    return this.directoryRepository.listPreSignupConversionLinkedPageViews(...args);
  }

  listPreSignupConversionLinkedSessions(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionLinkedSessions"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionLinkedSessions"]
  > {
    return this.directoryRepository.listPreSignupConversionLinkedSessions(...args);
  }

  listPreSignupConversionPageViewsByVisitorIds(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionPageViewsByVisitorIds"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionPageViewsByVisitorIds"]
  > {
    return this.directoryRepository.listPreSignupConversionPageViewsByVisitorIds(...args);
  }

  listPreSignupConversionSessionsByVisitorIds(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionSessionsByVisitorIds"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionSessionsByVisitorIds"]
  > {
    return this.directoryRepository.listPreSignupConversionSessionsByVisitorIds(...args);
  }

  listPreSignupConversionSignupIdentities(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionSignupIdentities"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listPreSignupConversionSignupIdentities"]
  > {
    return this.directoryRepository.listPreSignupConversionSignupIdentities(...args);
  }

  listPlatformPwaInstallActions(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPlatformPwaInstallActions"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPlatformPwaInstallActions"]> {
    return this.directoryRepository.listPlatformPwaInstallActions(...args);
  }

  listDirectoryFilterSearchActions(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listDirectoryFilterSearchActions"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardDirectoryRepository["listDirectoryFilterSearchActions"]
  > {
    return this.directoryRepository.listDirectoryFilterSearchActions(...args);
  }

  listPublicProfilePageViews(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listPublicProfilePageViews"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listPublicProfilePageViews"]> {
    return this.directoryRepository.listPublicProfilePageViews(...args);
  }

  listWhatsappTrafficActions(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listWhatsappTrafficActions"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listWhatsappTrafficActions"]> {
    return this.directoryRepository.listWhatsappTrafficActions(...args);
  }

  listTrafficCommunityPosts(
    ...args: Parameters<AdminPsychologistsDashboardDirectoryRepository["listTrafficCommunityPosts"]>
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listTrafficCommunityPosts"]> {
    return this.directoryRepository.listTrafficCommunityPosts(...args);
  }

  listTrafficCommunityReplies(
    ...args: Parameters<
      AdminPsychologistsDashboardDirectoryRepository["listTrafficCommunityReplies"]
    >
  ): ReturnType<AdminPsychologistsDashboardDirectoryRepository["listTrafficCommunityReplies"]> {
    return this.directoryRepository.listTrafficCommunityReplies(...args);
  }

  listCommunityTrafficPlatformMetricDataset(
    ...args: Parameters<
      AdminPsychologistsDashboardTrafficRepository["listCommunityTrafficPlatformMetricDataset"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardTrafficRepository["listCommunityTrafficPlatformMetricDataset"]
  > {
    return this.trafficRepository.listCommunityTrafficPlatformMetricDataset(...args);
  }

  listProfileTrafficPlatformMetricDataset(
    ...args: Parameters<
      AdminPsychologistsDashboardTrafficRepository["listProfileTrafficPlatformMetricDataset"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardTrafficRepository["listProfileTrafficPlatformMetricDataset"]
  > {
    return this.trafficRepository.listProfileTrafficPlatformMetricDataset(...args);
  }

  listReceivedEngagementEvents(
    ...args: Parameters<
      AdminPsychologistsDashboardEngagementRepository["listReceivedEngagementEvents"]
    >
  ): ReturnType<AdminPsychologistsDashboardEngagementRepository["listReceivedEngagementEvents"]> {
    return this.engagementRepository.listReceivedEngagementEvents(...args);
  }

  listFavoriteEvents(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listFavoriteEvents"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listFavoriteEvents"]> {
    return this.metricsRepository.listFavoriteEvents(...args);
  }

  listProfileViews(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listProfileViews"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listProfileViews"]> {
    return this.metricsRepository.listProfileViews(...args);
  }

  listProfileAttentionSeconds(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listProfileAttentionSeconds"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listProfileAttentionSeconds"]> {
    return this.metricsRepository.listProfileAttentionSeconds(...args);
  }

  listProfileVideoAttentionSeconds(
    ...args: Parameters<
      AdminPsychologistsDashboardMetricsRepository["listProfileVideoAttentionSeconds"]
    >
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listProfileVideoAttentionSeconds"]> {
    return this.metricsRepository.listProfileVideoAttentionSeconds(...args);
  }

  listCommunityContentAttentionSeconds(
    ...args: Parameters<
      AdminPsychologistsDashboardMetricsRepository["listCommunityContentAttentionSeconds"]
    >
  ): ReturnType<
    AdminPsychologistsDashboardMetricsRepository["listCommunityContentAttentionSeconds"]
  > {
    return this.metricsRepository.listCommunityContentAttentionSeconds(...args);
  }

  listSearchResultImpressionCounts(
    ...args: Parameters<
      AdminPsychologistsDashboardMetricsRepository["listSearchResultImpressionCounts"]
    >
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listSearchResultImpressionCounts"]> {
    return this.metricsRepository.listSearchResultImpressionCounts(...args);
  }

  listQualifiedVideoViewCounts(
    ...args: Parameters<
      AdminPsychologistsDashboardMetricsRepository["listQualifiedVideoViewCounts"]
    >
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listQualifiedVideoViewCounts"]> {
    return this.metricsRepository.listQualifiedVideoViewCounts(...args);
  }

  listCommunityPostViewCounts(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listCommunityPostViewCounts"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listCommunityPostViewCounts"]> {
    return this.metricsRepository.listCommunityPostViewCounts(...args);
  }

  listCommunityReplyViewCounts(
    ...args: Parameters<
      AdminPsychologistsDashboardMetricsRepository["listCommunityReplyViewCounts"]
    >
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listCommunityReplyViewCounts"]> {
    return this.metricsRepository.listCommunityReplyViewCounts(...args);
  }

  listPublishedReviews(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listPublishedReviews"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listPublishedReviews"]> {
    return this.metricsRepository.listPublishedReviews(...args);
  }

  listWhatsappContactRequests(
    ...args: Parameters<AdminPsychologistsDashboardMetricsRepository["listWhatsappContactRequests"]>
  ): ReturnType<AdminPsychologistsDashboardMetricsRepository["listWhatsappContactRequests"]> {
    return this.metricsRepository.listWhatsappContactRequests(...args);
  }
}
