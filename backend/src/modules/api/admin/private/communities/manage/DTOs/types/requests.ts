export type AdminCommunityManageParams = {
  id: string;
  ruleId?: string;
  targetId?: string;
  targetType?: "comment" | "post" | "reply";
};

export type AdminCommunityPaginationQuery = {
  limit?: number;
  page?: number;
  q?: string;
};

export type AdminCommunitiesListSort = "activity" | "members" | "name" | "posts" | "recent";

export type AdminCommunitiesListQuery = AdminCommunityPaginationQuery & {
  category?: string;
  sort?: AdminCommunitiesListSort;
};

export type AdminCommunityContentQuery = AdminCommunityPaginationQuery & {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  sort?: "engagement" | "oldest" | "recent";
  status?: "all" | "blocked" | "published" | "removed";
  to?: string;
  type?:
    | "all"
    | "anonymous_post"
    | "comments"
    | "patient_comment"
    | "posts"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
};

export type AdminCommunityContentDetailQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityRankingQuery = AdminCommunityPaginationQuery & {
  period?: "30d";
};

export type AdminCommunityReportsQuery = AdminCommunityPaginationQuery & {
  from?: string;
  status?:
    | "all"
    | "dismissed"
    | "em_analise"
    | "pending"
    | "pendente"
    | "rejeitada"
    | "resolvida"
    | "upheld"
    | string;
  to?: string;
  type?:
    | "all"
    | "comment"
    | "patient_comment"
    | "patient_post"
    | "post"
    | "reply"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply"
    | string;
};

export type AdminCommunityActivitiesQuery = AdminCommunityPaginationQuery & {
  area?: string;
  from?: string;
  to?: string;
  type?: string;
};

export type AdminCommunityStatisticsQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityUpdateBody = {
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
  visual_primary_color?: string | null;
  visual_primary_dark_color?: string | null;
  visual_soft_color?: string | null;
  visual_text_color?: string | null;
  visual_gradient_color?: string | null;
};

export type AdminCommunityCreateBody = AdminCommunityUpdateBody & {
  category?: string | null;
  name: string;
  slug?: string | null;
};

export type AdminCommunityRuleBody = {
  title: string;
  description: string;
  position?: number;
  active?: boolean;
};

export type AdminCommunityRemoveContentBody = {
  confirmation: string;
  reason: string;
};

export type AdminCommunityResolveReportsBody = {
  confirmation: string;
  reason: string;
  resolution: "dismissed" | "pending" | "upheld";
};

export type AdminCommunityStatusBody = {
  active: boolean;
  confirmation: string;
  reason: string;
};
