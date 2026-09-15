import type { IAdminModerationRepository } from "./interfaces/IAdminModerationRepository";
import { AdminModerationEngagementRepository } from "./queries/AdminModerationEngagementRepository";
import { AdminModerationMutationSupportRepository } from "./queries/AdminModerationMutationSupportRepository";
import { AdminModerationOverviewRepository } from "./queries/AdminModerationOverviewRepository";
import { AdminModerationResolutionRepository } from "./queries/AdminModerationResolutionRepository";

export class AdminModerationRepository implements IAdminModerationRepository {
  private readonly mutationSupportRepository = new AdminModerationMutationSupportRepository();

  private readonly overviewRepository = new AdminModerationOverviewRepository();

  private readonly engagementRepository = new AdminModerationEngagementRepository();

  private readonly resolutionRepository = new AdminModerationResolutionRepository(
    this.mutationSupportRepository,
  );

  countPending(
    ...args: Parameters<AdminModerationOverviewRepository["countPending"]>
  ): ReturnType<AdminModerationOverviewRepository["countPending"]> {
    return this.overviewRepository.countPending(...args);
  }

  countPendingPostReports(
    ...args: Parameters<AdminModerationOverviewRepository["countPendingPostReports"]>
  ): ReturnType<AdminModerationOverviewRepository["countPendingPostReports"]> {
    return this.overviewRepository.countPendingPostReports(...args);
  }

  countRegistrationFailureUsers(
    ...args: Parameters<AdminModerationOverviewRepository["countRegistrationFailureUsers"]>
  ): ReturnType<AdminModerationOverviewRepository["countRegistrationFailureUsers"]> {
    return this.overviewRepository.countRegistrationFailureUsers(...args);
  }

  countUrgentPending(
    ...args: Parameters<AdminModerationOverviewRepository["countUrgentPending"]>
  ): ReturnType<AdminModerationOverviewRepository["countUrgentPending"]> {
    return this.overviewRepository.countUrgentPending(...args);
  }

  countUncoveredPatientPosts(
    ...args: Parameters<AdminModerationOverviewRepository["countUncoveredPatientPosts"]>
  ): ReturnType<AdminModerationOverviewRepository["countUncoveredPatientPosts"]> {
    return this.overviewRepository.countUncoveredPatientPosts(...args);
  }

  listEvents(
    ...args: Parameters<AdminModerationOverviewRepository["listEvents"]>
  ): ReturnType<AdminModerationOverviewRepository["listEvents"]> {
    return this.overviewRepository.listEvents(...args);
  }

  listLatestPending(
    ...args: Parameters<AdminModerationOverviewRepository["listLatestPending"]>
  ): ReturnType<AdminModerationOverviewRepository["listLatestPending"]> {
    return this.overviewRepository.listLatestPending(...args);
  }

  listPendingPostReports(
    ...args: Parameters<AdminModerationOverviewRepository["listPendingPostReports"]>
  ): ReturnType<AdminModerationOverviewRepository["listPendingPostReports"]> {
    return this.overviewRepository.listPendingPostReports(...args);
  }

  listPostReports(
    ...args: Parameters<AdminModerationOverviewRepository["listPostReports"]>
  ): ReturnType<AdminModerationOverviewRepository["listPostReports"]> {
    return this.overviewRepository.listPostReports(...args);
  }

  listRegistrationFailureUsers(
    ...args: Parameters<AdminModerationOverviewRepository["listRegistrationFailureUsers"]>
  ): ReturnType<AdminModerationOverviewRepository["listRegistrationFailureUsers"]> {
    return this.overviewRepository.listRegistrationFailureUsers(...args);
  }

  listUncoveredPatientPosts(
    ...args: Parameters<AdminModerationOverviewRepository["listUncoveredPatientPosts"]>
  ): ReturnType<AdminModerationOverviewRepository["listUncoveredPatientPosts"]> {
    return this.overviewRepository.listUncoveredPatientPosts(...args);
  }

  listOperationalPsychologistProfiles(
    ...args: Parameters<AdminModerationOverviewRepository["listOperationalPsychologistProfiles"]>
  ): ReturnType<AdminModerationOverviewRepository["listOperationalPsychologistProfiles"]> {
    return this.overviewRepository.listOperationalPsychologistProfiles(...args);
  }

  countProfileViewsByPsychologist(
    ...args: Parameters<AdminModerationOverviewRepository["countProfileViewsByPsychologist"]>
  ): ReturnType<AdminModerationOverviewRepository["countProfileViewsByPsychologist"]> {
    return this.overviewRepository.countProfileViewsByPsychologist(...args);
  }

  countWhatsappClicksByPsychologist(
    ...args: Parameters<AdminModerationOverviewRepository["countWhatsappClicksByPsychologist"]>
  ): ReturnType<AdminModerationOverviewRepository["countWhatsappClicksByPsychologist"]> {
    return this.overviewRepository.countWhatsappClicksByPsychologist(...args);
  }

  listPatientCommunityEngagementSignals(
    ...args: Parameters<
      AdminModerationEngagementRepository["listPatientCommunityEngagementSignals"]
    >
  ): ReturnType<AdminModerationEngagementRepository["listPatientCommunityEngagementSignals"]> {
    return this.engagementRepository.listPatientCommunityEngagementSignals(...args);
  }

  findEvent(
    ...args: Parameters<AdminModerationResolutionRepository["findEvent"]>
  ): ReturnType<AdminModerationResolutionRepository["findEvent"]> {
    return this.resolutionRepository.findEvent(...args);
  }

  findPostReport(
    ...args: Parameters<AdminModerationResolutionRepository["findPostReport"]>
  ): ReturnType<AdminModerationResolutionRepository["findPostReport"]> {
    return this.resolutionRepository.findPostReport(...args);
  }

  listReplyTargets(
    ...args: Parameters<AdminModerationResolutionRepository["listReplyTargets"]>
  ): ReturnType<AdminModerationResolutionRepository["listReplyTargets"]> {
    return this.resolutionRepository.listReplyTargets(...args);
  }

  resolveReportDismissed(
    ...args: Parameters<AdminModerationResolutionRepository["resolveReportDismissed"]>
  ): ReturnType<AdminModerationResolutionRepository["resolveReportDismissed"]> {
    return this.resolutionRepository.resolveReportDismissed(...args);
  }

  resolveReportUpheld(
    ...args: Parameters<AdminModerationResolutionRepository["resolveReportUpheld"]>
  ): ReturnType<AdminModerationResolutionRepository["resolveReportUpheld"]> {
    return this.resolutionRepository.resolveReportUpheld(...args);
  }

  markReviewing(
    ...args: Parameters<AdminModerationResolutionRepository["markReviewing"]>
  ): ReturnType<AdminModerationResolutionRepository["markReviewing"]> {
    return this.resolutionRepository.markReviewing(...args);
  }

  resolveEvent(
    ...args: Parameters<AdminModerationResolutionRepository["resolveEvent"]>
  ): ReturnType<AdminModerationResolutionRepository["resolveEvent"]> {
    return this.resolutionRepository.resolveEvent(...args);
  }
}

export type {
  AdminModerationReportAudit,
  AdminModerationReportMutationResult,
} from "./support/moderation-query";
