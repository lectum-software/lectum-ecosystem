import type { IAdminPsychologistsListRepository } from "./interfaces/IAdminPsychologistsListRepository";
import { AdminPsychologistsListEngagementRepository } from "./queries/AdminPsychologistsListEngagementRepository";
import { AdminPsychologistsListProfilesRepository } from "./queries/AdminPsychologistsListProfilesRepository";
import { AdminPsychologistsListVisibilityRepository } from "./queries/AdminPsychologistsListVisibilityRepository";

export class AdminPsychologistsListRepository implements IAdminPsychologistsListRepository {
  private readonly profilesRepository = new AdminPsychologistsListProfilesRepository();

  private readonly visibilityRepository = new AdminPsychologistsListVisibilityRepository();

  private readonly engagementRepository = new AdminPsychologistsListEngagementRepository();

  listSpecialtyCatalog(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listSpecialtyCatalog"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listSpecialtyCatalog"]> {
    return this.profilesRepository.listSpecialtyCatalog(...args);
  }

  listPsychologistProfiles(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listPsychologistProfiles"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listPsychologistProfiles"]> {
    return this.profilesRepository.listPsychologistProfiles(...args);
  }

  listPublicRankingCandidates(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listPublicRankingCandidates"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listPublicRankingCandidates"]> {
    return this.profilesRepository.listPublicRankingCandidates(...args);
  }

  listCommunityPostCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listCommunityPostCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listCommunityPostCounts"]> {
    return this.profilesRepository.listCommunityPostCounts(...args);
  }

  listCommunityReplyCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listCommunityReplyCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listCommunityReplyCounts"]> {
    return this.profilesRepository.listCommunityReplyCounts(...args);
  }

  listPatientReplyCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listPatientReplyCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listPatientReplyCounts"]> {
    return this.profilesRepository.listPatientReplyCounts(...args);
  }

  listCommunityVoteCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listCommunityVoteCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listCommunityVoteCounts"]> {
    return this.profilesRepository.listCommunityVoteCounts(...args);
  }

  listProfileViewCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listProfileViewCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listProfileViewCounts"]> {
    return this.profilesRepository.listProfileViewCounts(...args);
  }

  listSearchResultImpressionCounts(
    ...args: Parameters<
      AdminPsychologistsListProfilesRepository["listSearchResultImpressionCounts"]
    >
  ): ReturnType<AdminPsychologistsListProfilesRepository["listSearchResultImpressionCounts"]> {
    return this.profilesRepository.listSearchResultImpressionCounts(...args);
  }

  listQualifiedVideoViewCounts(
    ...args: Parameters<AdminPsychologistsListProfilesRepository["listQualifiedVideoViewCounts"]>
  ): ReturnType<AdminPsychologistsListProfilesRepository["listQualifiedVideoViewCounts"]> {
    return this.profilesRepository.listQualifiedVideoViewCounts(...args);
  }

  listCommunityPostViewCounts(
    ...args: Parameters<AdminPsychologistsListVisibilityRepository["listCommunityPostViewCounts"]>
  ): ReturnType<AdminPsychologistsListVisibilityRepository["listCommunityPostViewCounts"]> {
    return this.visibilityRepository.listCommunityPostViewCounts(...args);
  }

  listCommunityReplyViewCounts(
    ...args: Parameters<AdminPsychologistsListVisibilityRepository["listCommunityReplyViewCounts"]>
  ): ReturnType<AdminPsychologistsListVisibilityRepository["listCommunityReplyViewCounts"]> {
    return this.visibilityRepository.listCommunityReplyViewCounts(...args);
  }

  listFavoriteCounts(
    ...args: Parameters<AdminPsychologistsListVisibilityRepository["listFavoriteCounts"]>
  ): ReturnType<AdminPsychologistsListVisibilityRepository["listFavoriteCounts"]> {
    return this.visibilityRepository.listFavoriteCounts(...args);
  }

  listReceivedEngagementCounts(
    ...args: Parameters<AdminPsychologistsListEngagementRepository["listReceivedEngagementCounts"]>
  ): ReturnType<AdminPsychologistsListEngagementRepository["listReceivedEngagementCounts"]> {
    return this.engagementRepository.listReceivedEngagementCounts(...args);
  }

  listWhatsappClickCounts(
    ...args: Parameters<AdminPsychologistsListEngagementRepository["listWhatsappClickCounts"]>
  ): ReturnType<AdminPsychologistsListEngagementRepository["listWhatsappClickCounts"]> {
    return this.engagementRepository.listWhatsappClickCounts(...args);
  }
}
