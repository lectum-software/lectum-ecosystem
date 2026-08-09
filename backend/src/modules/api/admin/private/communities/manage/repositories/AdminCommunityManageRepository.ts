import { AdminCommunityManageActivityRepository } from "./queries/AdminCommunityManageActivityRepository";
import { AdminCommunityManageContentMutationRepository } from "./queries/AdminCommunityManageContentMutationRepository";
import { AdminCommunityManageContentRepository } from "./queries/AdminCommunityManageContentRepository";
import { AdminCommunityManageCoreRepository } from "./queries/AdminCommunityManageCoreRepository";
import { AdminCommunityManageMentorRepository } from "./queries/AdminCommunityManageMentorRepository";
import { AdminCommunityManagePerformanceRepository } from "./queries/AdminCommunityManagePerformanceRepository";
import { AdminCommunityManageReportRepository } from "./queries/AdminCommunityManageReportRepository";
import { AdminCommunityManageStatisticsRepository } from "./queries/AdminCommunityManageStatisticsRepository";

export class AdminCommunityManageRepository {
  private readonly coreRepository = new AdminCommunityManageCoreRepository();

  private readonly performanceRepository = new AdminCommunityManagePerformanceRepository();

  private readonly contentRepository = new AdminCommunityManageContentRepository();

  private readonly contentMutationRepository = new AdminCommunityManageContentMutationRepository(
    this.coreRepository,
  );

  private readonly mentorRepository = new AdminCommunityManageMentorRepository();

  private readonly reportRepository = new AdminCommunityManageReportRepository(this.coreRepository);

  private readonly statisticsRepository = new AdminCommunityManageStatisticsRepository();

  private readonly activityRepository = new AdminCommunityManageActivityRepository();

  findCommunity(
    ...args: Parameters<AdminCommunityManageCoreRepository["findCommunity"]>
  ): ReturnType<AdminCommunityManageCoreRepository["findCommunity"]> {
    return this.coreRepository.findCommunity(...args);
  }

  listCommunities(
    ...args: Parameters<AdminCommunityManageCoreRepository["listCommunities"]>
  ): ReturnType<AdminCommunityManageCoreRepository["listCommunities"]> {
    return this.coreRepository.listCommunities(...args);
  }

  createCommunity(
    ...args: Parameters<AdminCommunityManageCoreRepository["createCommunity"]>
  ): ReturnType<AdminCommunityManageCoreRepository["createCommunity"]> {
    return this.coreRepository.createCommunity(...args);
  }

  updateCommunity(
    ...args: Parameters<AdminCommunityManageCoreRepository["updateCommunity"]>
  ): ReturnType<AdminCommunityManageCoreRepository["updateCommunity"]> {
    return this.coreRepository.updateCommunity(...args);
  }

  updateCommunityStatus(
    ...args: Parameters<AdminCommunityManageCoreRepository["updateCommunityStatus"]>
  ): ReturnType<AdminCommunityManageCoreRepository["updateCommunityStatus"]> {
    return this.coreRepository.updateCommunityStatus(...args);
  }

  listRules(
    ...args: Parameters<AdminCommunityManageCoreRepository["listRules"]>
  ): ReturnType<AdminCommunityManageCoreRepository["listRules"]> {
    return this.coreRepository.listRules(...args);
  }

  addRule(
    ...args: Parameters<AdminCommunityManageCoreRepository["addRule"]>
  ): ReturnType<AdminCommunityManageCoreRepository["addRule"]> {
    return this.coreRepository.addRule(...args);
  }

  updateRule(
    ...args: Parameters<AdminCommunityManageCoreRepository["updateRule"]>
  ): ReturnType<AdminCommunityManageCoreRepository["updateRule"]> {
    return this.coreRepository.updateRule(...args);
  }

  softDeleteRule(
    ...args: Parameters<AdminCommunityManageCoreRepository["softDeleteRule"]>
  ): ReturnType<AdminCommunityManageCoreRepository["softDeleteRule"]> {
    return this.coreRepository.softDeleteRule(...args);
  }

  countPublishedPosts(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["countPublishedPosts"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["countPublishedPosts"]> {
    return this.performanceRepository.countPublishedPosts(...args);
  }

  countComments(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["countComments"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["countComments"]> {
    return this.performanceRepository.countComments(...args);
  }

  countPopularPosts(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["countPopularPosts"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["countPopularPosts"]> {
    return this.performanceRepository.countPopularPosts(...args);
  }

  listPopularPosts(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["listPopularPosts"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["listPopularPosts"]> {
    return this.performanceRepository.listPopularPosts(...args);
  }

  listTopMentors(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["listTopMentors"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["listTopMentors"]> {
    return this.performanceRepository.listTopMentors(...args);
  }

  listPerformance(
    ...args: Parameters<AdminCommunityManagePerformanceRepository["listPerformance"]>
  ): ReturnType<AdminCommunityManagePerformanceRepository["listPerformance"]> {
    return this.performanceRepository.listPerformance(...args);
  }

  listContent(
    ...args: Parameters<AdminCommunityManageContentRepository["listContent"]>
  ): ReturnType<AdminCommunityManageContentRepository["listContent"]> {
    return this.contentRepository.listContent(...args);
  }

  countContentPostShares(
    ...args: Parameters<AdminCommunityManageContentRepository["countContentPostShares"]>
  ): ReturnType<AdminCommunityManageContentRepository["countContentPostShares"]> {
    return this.contentRepository.countContentPostShares(...args);
  }

  countContentReplyShares(
    ...args: Parameters<AdminCommunityManageContentRepository["countContentReplyShares"]>
  ): ReturnType<AdminCommunityManageContentRepository["countContentReplyShares"]> {
    return this.contentRepository.countContentReplyShares(...args);
  }

  countContentViews(
    ...args: Parameters<AdminCommunityManageContentRepository["countContentViews"]>
  ): ReturnType<AdminCommunityManageContentRepository["countContentViews"]> {
    return this.contentRepository.countContentViews(...args);
  }

  countContentWhatsappClicks(
    ...args: Parameters<AdminCommunityManageContentRepository["countContentWhatsappClicks"]>
  ): ReturnType<AdminCommunityManageContentRepository["countContentWhatsappClicks"]> {
    return this.contentRepository.countContentWhatsappClicks(...args);
  }

  findPostContent(
    ...args: Parameters<AdminCommunityManageContentRepository["findPostContent"]>
  ): ReturnType<AdminCommunityManageContentRepository["findPostContent"]> {
    return this.contentRepository.findPostContent(...args);
  }

  findReplyContent(
    ...args: Parameters<AdminCommunityManageContentRepository["findReplyContent"]>
  ): ReturnType<AdminCommunityManageContentRepository["findReplyContent"]> {
    return this.contentRepository.findReplyContent(...args);
  }

  listContentDetailDataset(
    ...args: Parameters<AdminCommunityManageContentRepository["listContentDetailDataset"]>
  ): ReturnType<AdminCommunityManageContentRepository["listContentDetailDataset"]> {
    return this.contentRepository.listContentDetailDataset(...args);
  }

  removePostContent(
    ...args: Parameters<AdminCommunityManageContentMutationRepository["removePostContent"]>
  ): ReturnType<AdminCommunityManageContentMutationRepository["removePostContent"]> {
    return this.contentMutationRepository.removePostContent(...args);
  }

  removeReplyContent(
    ...args: Parameters<AdminCommunityManageContentMutationRepository["removeReplyContent"]>
  ): ReturnType<AdminCommunityManageContentMutationRepository["removeReplyContent"]> {
    return this.contentMutationRepository.removeReplyContent(...args);
  }

  listPsychologistMembers(
    ...args: Parameters<AdminCommunityManageContentMutationRepository["listPsychologistMembers"]>
  ): ReturnType<AdminCommunityManageContentMutationRepository["listPsychologistMembers"]> {
    return this.contentMutationRepository.listPsychologistMembers(...args);
  }

  buildMentorMetrics(
    ...args: Parameters<AdminCommunityManageMentorRepository["buildMentorMetrics"]>
  ): ReturnType<AdminCommunityManageMentorRepository["buildMentorMetrics"]> {
    return this.mentorRepository.buildMentorMetrics(...args);
  }

  listReports(
    ...args: Parameters<AdminCommunityManageReportRepository["listReports"]>
  ): ReturnType<AdminCommunityManageReportRepository["listReports"]> {
    return this.reportRepository.listReports(...args);
  }

  resolveReportsForTarget(
    ...args: Parameters<AdminCommunityManageReportRepository["resolveReportsForTarget"]>
  ): ReturnType<AdminCommunityManageReportRepository["resolveReportsForTarget"]> {
    return this.reportRepository.resolveReportsForTarget(...args);
  }

  listStatisticsDataset(
    ...args: Parameters<AdminCommunityManageStatisticsRepository["listStatisticsDataset"]>
  ): ReturnType<AdminCommunityManageStatisticsRepository["listStatisticsDataset"]> {
    return this.statisticsRepository.listStatisticsDataset(...args);
  }

  listActivities(
    ...args: Parameters<AdminCommunityManageActivityRepository["listActivities"]>
  ): ReturnType<AdminCommunityManageActivityRepository["listActivities"]> {
    return this.activityRepository.listActivities(...args);
  }
}

export type {
  AdminCommunityActivityRecord,
  AdminCommunityContentModerationEventRecord,
  AdminCommunityContentPostRecord,
  AdminCommunityContentReplyRecord,
  AdminCommunityContentVideoWatchRecord,
  AdminCommunityListRecord,
  AdminCommunityMemberRecord,
  AdminCommunityMentorMetrics,
  AdminCommunityRecord,
  AdminCommunityReportRecord,
  AdminCommunityRuleRecord,
  AdminCommunityStatisticsMemberRecord,
  AdminCommunityStatisticsPageViewRecord,
  AdminCommunityStatisticsPostRecord,
  AdminCommunityStatisticsReplyRecord,
  AdminCommunityStatisticsReportRecord,
} from "./support/manage-selects";

export {
  adminCommunityMentorFormula,
  adminCommunityMentorRemovedPostsPenalty,
  adminCommunityMentorScore,
  adminCommunityMentorScoreBreakdown,
  adminCommunityRuleSelect,
  adminCommunitySelect,
  emptyAdminCommunityMentorMetrics,
} from "./support/manage-selects";
