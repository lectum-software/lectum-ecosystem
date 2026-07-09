import type {
  AdminCommunityRuleBody,
  AdminCommunityUpdateBody,
} from "../../DTOs/IAdminCommunityManageDTO";

export interface IAdminCommunityManageRepository {
  addRule(communityId: string, data: Required<AdminCommunityRuleBody>): Promise<unknown>;
  countComments(communityId: string): Promise<number>;
  countPopularPosts(communityId: string): Promise<number>;
  countPublishedPosts(communityId: string): Promise<number>;
  findCommunity(idOrSlug: string): Promise<unknown | null>;
  listPerformance(communityId: string, from: Date, to: Date): Promise<unknown>;
  listPopularPosts(communityId: string): Promise<unknown[]>;
  listRules(communityId: string, includeInactive?: boolean): Promise<unknown[]>;
  listTopMentors(communityId: string, from: Date, to: Date): Promise<unknown[]>;
  softDeleteRule(communityId: string, ruleId: string): Promise<unknown | null>;
  updateCommunity(communityId: string, data: AdminCommunityUpdateBody): Promise<unknown>;
  updateRule(
    communityId: string,
    ruleId: string,
    data: Partial<Required<AdminCommunityRuleBody>>,
  ): Promise<unknown | null>;
}
