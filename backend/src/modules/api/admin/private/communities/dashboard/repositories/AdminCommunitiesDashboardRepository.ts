import type { IAdminCommunitiesDashboardRepository } from "./interfaces/IAdminCommunitiesDashboardRepository";
import { AdminCommunitiesDashboardCoreRepository } from "./queries/AdminCommunitiesDashboardCoreRepository";
import { AdminCommunitiesDashboardModerationRepository } from "./queries/AdminCommunitiesDashboardModerationRepository";
import { AdminCommunitiesDashboardStatisticsRepository } from "./queries/AdminCommunitiesDashboardStatisticsRepository";

export class AdminCommunitiesDashboardRepository implements IAdminCommunitiesDashboardRepository {
  private readonly coreRepository = new AdminCommunitiesDashboardCoreRepository();

  private readonly statisticsRepository = new AdminCommunitiesDashboardStatisticsRepository();

  private readonly moderationRepository = new AdminCommunitiesDashboardModerationRepository();

  findEarliestDashboardEventDate(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["findEarliestDashboardEventDate"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["findEarliestDashboardEventDate"]> {
    return this.coreRepository.findEarliestDashboardEventDate(...args);
  }

  countPendingReports(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["countPendingReports"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["countPendingReports"]> {
    return this.coreRepository.countPendingReports(...args);
  }

  countPendingModerationEvents(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["countPendingModerationEvents"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["countPendingModerationEvents"]> {
    return this.coreRepository.countPendingModerationEvents(...args);
  }

  countUrgentModerationEvents(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["countUrgentModerationEvents"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["countUrgentModerationEvents"]> {
    return this.coreRepository.countUrgentModerationEvents(...args);
  }

  listCommunities(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["listCommunities"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["listCommunities"]> {
    return this.coreRepository.listCommunities(...args);
  }

  listCommunityMembers(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["listCommunityMembers"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["listCommunityMembers"]> {
    return this.coreRepository.listCommunityMembers(...args);
  }

  listCommunityPosts(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["listCommunityPosts"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["listCommunityPosts"]> {
    return this.coreRepository.listCommunityPosts(...args);
  }

  countPostViews(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["countPostViews"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["countPostViews"]> {
    return this.coreRepository.countPostViews(...args);
  }

  countCommunityViews(
    ...args: Parameters<AdminCommunitiesDashboardCoreRepository["countCommunityViews"]>
  ): ReturnType<AdminCommunitiesDashboardCoreRepository["countCommunityViews"]> {
    return this.coreRepository.countCommunityViews(...args);
  }

  listMemberActivity(
    ...args: Parameters<AdminCommunitiesDashboardStatisticsRepository["listMemberActivity"]>
  ): ReturnType<AdminCommunitiesDashboardStatisticsRepository["listMemberActivity"]> {
    return this.statisticsRepository.listMemberActivity(...args);
  }

  listGlobalStatisticsDataset(
    ...args: Parameters<
      AdminCommunitiesDashboardStatisticsRepository["listGlobalStatisticsDataset"]
    >
  ): ReturnType<AdminCommunitiesDashboardStatisticsRepository["listGlobalStatisticsDataset"]> {
    return this.statisticsRepository.listGlobalStatisticsDataset(...args);
  }

  listPendingReports(
    ...args: Parameters<AdminCommunitiesDashboardModerationRepository["listPendingReports"]>
  ): ReturnType<AdminCommunitiesDashboardModerationRepository["listPendingReports"]> {
    return this.moderationRepository.listPendingReports(...args);
  }

  listPendingModerationEvents(
    ...args: Parameters<
      AdminCommunitiesDashboardModerationRepository["listPendingModerationEvents"]
    >
  ): ReturnType<AdminCommunitiesDashboardModerationRepository["listPendingModerationEvents"]> {
    return this.moderationRepository.listPendingModerationEvents(...args);
  }

  listPostReplies(
    ...args: Parameters<AdminCommunitiesDashboardModerationRepository["listPostReplies"]>
  ): ReturnType<AdminCommunitiesDashboardModerationRepository["listPostReplies"]> {
    return this.moderationRepository.listPostReplies(...args);
  }
}
