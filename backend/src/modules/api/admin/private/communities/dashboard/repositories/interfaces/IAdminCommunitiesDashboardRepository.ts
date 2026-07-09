import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";

export type CommunityPostRecord = {
  anonymous: boolean;
  author: {
    id: string;
    name: string;
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
  status: string;
  title: string;
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
  listCommunities(): Promise<CommunityRecord[]>;
  listCommunityMembers(): Promise<CommunityMemberRecord[]>;
  listCommunityPosts(range: AdminCommunitiesDashboardDateRange): Promise<CommunityPostRecord[]>;
  listMemberActivity(range: AdminCommunitiesDashboardDateRange): Promise<MemberActivityRecord[]>;
  listPendingReports(range: AdminCommunitiesDashboardDateRange): Promise<PendingReportRecord[]>;
  listPostReplies(range: AdminCommunitiesDashboardDateRange): Promise<PostReplyRecord[]>;
}
