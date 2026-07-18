import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";

export type CommunityPostRecord = {
  anonymous: boolean;
  author: {
    avatar: string | null;
    id: string;
    name: string;
    psychologist_profile: {
      cfp_verified_at: Date | null;
      crp_status: string | null;
      gender: string | null;
      professional_first_name: string | null;
      professional_last_name: string | null;
      subscriptions: Array<{
        id: string;
        source: string;
      }>;
    } | null;
    role: string;
  };
  author_id: string;
  community: {
    id: string;
    name: string;
    slug: string;
  };
  community_id: string;
  content: string;
  createdAt: Date;
  id: string;
  replies_count: number;
  saves_count: number;
  status: string;
  title: string;
  upvotes_count: number;
};

export type PostReplyRecord = {
  author: {
    id: string;
    role: string;
  };
  author_id: string;
  createdAt: Date;
  id: string;
  post: {
    community_id: string;
  };
};

export type MemberActivityRecord = {
  community_id: string | null;
  user_id: string;
};

export type PendingReportRecord = {
  createdAt: Date;
  description: string | null;
  id: string;
  reason: string;
  status: string;
  target_id: string;
  target_type: string;
  post: {
    content: string;
    title: string;
    community: {
      name: string;
      slug: string;
    };
  };
  reply: {
    content: string;
    title: string | null;
    post: {
      title: string;
      community: {
        name: string;
        slug: string;
      };
    };
  } | null;
  reporter: {
    role: string;
  };
};

export type ModerationEventRecord = {
  categories: unknown;
  community: {
    name: string;
    slug: string;
  } | null;
  content_excerpt: string;
  createdAt: Date;
  decision: string;
  id: string;
  reason_code: string;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
};

export type CommunityRecord = {
  id: string;
  members_count: number;
  name: string;
  slug: string;
  visual_primary_color: string | null;
};

export type CommunityMemberRecord = {
  community_id: string;
  user_id: string;
};

export interface IAdminCommunitiesDashboardRepository {
  countPendingReports(range: AdminCommunitiesDashboardDateRange): Promise<number>;
  countPendingModerationEvents(range: AdminCommunitiesDashboardDateRange): Promise<number>;
  countUrgentModerationEvents(range: AdminCommunitiesDashboardDateRange): Promise<number>;
  listCommunities(): Promise<CommunityRecord[]>;
  listCommunityMembers(): Promise<CommunityMemberRecord[]>;
  listCommunityPosts(range: AdminCommunitiesDashboardDateRange): Promise<CommunityPostRecord[]>;
  listMemberActivity(range: AdminCommunitiesDashboardDateRange): Promise<MemberActivityRecord[]>;
  listPendingReports(range: AdminCommunitiesDashboardDateRange): Promise<PendingReportRecord[]>;
  listPendingModerationEvents(
    range: AdminCommunitiesDashboardDateRange,
  ): Promise<ModerationEventRecord[]>;
  listPostReplies(range: AdminCommunitiesDashboardDateRange): Promise<PostReplyRecord[]>;
}
