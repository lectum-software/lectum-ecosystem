import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

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
  period?: "all" | "custom" | "month" | "week" | "year";
  status?: "all" | "published" | "removed";
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
  period?: "all" | "custom" | "month" | "week" | "year";
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

export type AdminCommunityIdentity = {
  active: boolean;
  avatar_url: string | null;
  category: string | null;
  created_at: Date;
  deactivated_at: Date | null;
  description: string | null;
  id: string;
  members_count: number;
  name: string;
  slug: string;
  visual_gradient_color: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
};

export type AdminCommunityRuleDTO = {
  active: boolean;
  created_at: Date;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: Date;
};

export type AdminCommunitySummaryDTO = {
  comments_count: number;
  members_count: number;
  posts_count: number;
  popular_posts_count: number;
};

export type AdminCommunityPerformancePointDTO = {
  date: string;
  comments: number;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityPerformanceMetricDTO = {
  label: string;
  value: number;
  change_percent: number | null;
  trend: "down" | "flat" | "unavailable" | "up";
};

export type AdminCommunityTopMentorDTO = {
  avatar: string | null;
  crp: string | null;
  id: string;
  name: string;
  position: number;
  rating_avg: number;
  replies_count: number;
  score: number;
  upvotes_count: number;
  verified: boolean;
};

export type AdminCommunityPopularPostDTO = {
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: Date;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetailDTO = {
  community: AdminCommunityIdentity;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetricDTO;
      new_members: AdminCommunityPerformanceMetricDTO;
      new_posts: AdminCommunityPerformanceMetricDTO;
      reports: AdminCommunityPerformanceMetricDTO;
    };
    points: AdminCommunityPerformancePointDTO[];
  };
  popular_posts: AdminCommunityPopularPostDTO[];
  rules: AdminCommunityRuleDTO[];
  summary: AdminCommunitySummaryDTO;
  top_mentors: AdminCommunityTopMentorDTO[];
};

export type AdminCommunityContentItemDTO = {
  author: {
    anonymous: boolean;
    avatar: string | null;
    gender: string | null;
    id: string;
    name: string;
    role: string;
    verified: boolean;
  };
  content_kind:
    | "anonymous_post"
    | "patient_comment"
    | "patient_post"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
  content_kind_label: string;
  content_id: string;
  created_at: Date;
  deleted_at: Date | null;
  excerpt: string;
  media: {
    media_type: string;
    media_url: string;
  } | null;
  metrics: {
    comments_count: number;
    downvotes_count: number;
    reports_count: number;
    saves_count: number;
    shares_count: number;
    upvotes_count: number;
    views_count: number;
    whatsapp_clicks_count: number;
  };
  origin_preview: {
    excerpt: string;
    label: string;
    title: string | null;
    type: "comment" | "post";
  } | null;
  parent_post_title: string | null;
  post_id: string;
  public_url: string;
  status: "published" | "removed";
  title: string | null;
  type: "comment" | "post";
};

export type AdminCommunityContentDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityContentItemDTO[];
  page: number;
  pages: number;
  per_page: number;
  source: "community_post+post_reply+post_share+page_view_event+important_action_event";
};

export type AdminCommunityRankingItemDTO = {
  membership_created_at: Date;
  mentor: {
    avatar: string | null;
    crp: string | null;
    headline: string | null;
    id: string;
    name: string;
    profile_url: string;
    rating_avg: number;
    rating_count: number;
    verified: boolean;
  };
  metrics: {
    active_days: number;
    comments_received: number;
    community_whatsapp_clicks: number;
    downvotes_received: number;
    participation_events: number;
    posts_published: number;
    removed_posts: number;
    removed_posts_penalty: number;
    replies_published: number;
    saves_received: number;
    shares_received: number;
    upvotes_received: number;
  };
  position: number;
  position_delta: number | null;
  previous_position: number | null;
  score: number;
  score_breakdown: {
    active_days_points: number;
    comments_points: number;
    community_whatsapp_points: number;
    downvotes_penalty: number;
    posts_points: number;
    removed_posts_penalty: number;
    replies_points: number;
    saves_points: number;
    shares_points: number;
    upvotes_points: number;
  };
  trend: "down" | "flat" | "new" | "up";
};

export type AdminCommunityRankingDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityRankingItemDTO[];
  formula: Record<string, unknown>;
  page: number;
  pages: number;
  per_page: number;
  period: {
    current_from: Date;
    current_to: Date;
    days: 30;
    label: "Últimos 30 dias";
    previous_from: Date;
    previous_to: Date;
  };
  source: "community_member+community_post+post_reply+post_vote+post_save+post_share";
};

export type AdminCommunityReportItemDTO = {
  capabilities: {
    can_review_resolution: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  content: {
    available: boolean;
    body: string;
    content_kind:
      | "patient_comment"
      | "patient_post"
      | "unverified_psychologist_post"
      | "unverified_psychologist_reply"
      | "verified_psychologist_post"
      | "verified_psychologist_reply";
    content_kind_label: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    post_id: string;
    public_url: string | null;
    title: string | null;
    type: "comment" | "post";
    unavailable_reason: string | null;
  };
  created_at: Date;
  description: string | null;
  first_reported_at: Date;
  id: string;
  last_reported_at: Date;
  report_count: number;
  reporters: {
    created_at: Date;
    description: string | null;
    id: string;
    reason: string;
    reason_label: string;
    reporter: {
      id: string;
      label: string;
      name: string;
      role: string;
    };
    status: string;
    status_group: "dismissed" | "pending" | "upheld";
    status_label: string;
  }[];
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    role: string;
  };
  status: string;
  status_counts: {
    dismissed: number;
    pending: number;
    upheld: number;
  };
  status_group: "dismissed" | "pending" | "upheld";
  status_label: string;
};

export type AdminCommunityReportsDTO = {
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityReportItemDTO[];
  filters: {
    statuses: {
      count: number;
      id: "all" | "dismissed" | "pending" | "upheld";
      label: string;
    }[];
    types: {
      count: number;
      id:
        | "all"
        | "patient_comment"
        | "patient_post"
        | "unverified_psychologist_post"
        | "unverified_psychologist_reply"
        | "verified_psychologist_post"
        | "verified_psychologist_reply";
      label: string;
    }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "post_report+community_post+post_reply";
};

export type AdminCommunityActivityItemDTO = {
  action: string;
  actor: string;
  area: string;
  created_at: Date;
  id: string;
  reason: string | null;
  source: string;
  summary: string;
};

export type AdminCommunityActivitiesFilterOptionDTO = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunityActivitiesDTO = {
  active_filters_count: number;
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityActivityItemDTO[];
  filters: {
    areas: AdminCommunityActivitiesFilterOptionDTO[];
    types: AdminCommunityActivitiesFilterOptionDTO[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: "admin_activity_log";
};

export type AdminCommunityStatisticsSplitDTO = {
  id: string;
  label: string;
  source: string;
  value: number;
};

export type AdminCommunityStatisticsDailyPointDTO = {
  active_patients: number;
  active_psychologists: number;
  active_users: number;
  anonymous_posts: number;
  date: string;
  followers_patients: number;
  followers_psychologists: number;
  new_active_patients: number;
  new_active_psychologists: number;
  new_active_users: number;
  patient_comments: number;
  patient_posts: number;
  posts: number;
  psychologist_posts: number;
  replies: number;
  reports: number;
  unverified_psychologist_replies: number;
  verified_psychologist_replies: number;
};

export type AdminCommunityStatisticsDTO = {
  charts: {
    active_users_split: AdminCommunityStatisticsSplitDTO[];
    daily: AdminCommunityStatisticsDailyPointDTO[];
    followers_split: AdminCommunityStatisticsSplitDTO[];
    posts_by_author: AdminCommunityStatisticsSplitDTO[];
    replies_by_author: AdminCommunityStatisticsSplitDTO[];
  };
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  counters: {
    active_users: {
      patients: number;
      psychologists: number;
      source: "community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    anonymous_posts: {
      source: "community_post.anonymous";
      total: number;
    };
    followers: {
      patients: number;
      psychologists: number;
      source: "community_member";
      total: number;
    };
    new_active_users: {
      patients: number;
      psychologists: number;
      source: "first_activity:community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    posts: {
      patients: number;
      patient_posts_answered_by_verified_psychologists: number;
      psychologists: number;
      source: "community_post+post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    replies: {
      patient_comments: number;
      source: "post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    reports: {
      source: "post_report";
      total: number;
    };
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "community_member+community_post+post_reply+post_report+page_view_event";
};

export type AdminCommunityRemoveContentDTO = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
  type: "comment" | "post";
};

export type AdminCommunityResolveReportsDTO = {
  affected_reports_count: number;
  content_id: string;
  post_id: string;
  report: AdminCommunityReportItemDTO;
  resolution: "dismissed" | "pending" | "upheld";
  type: "comment" | "post";
};

export type AdminCommunityRulesResponseDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRuleDTO[];
};

export type AdminCommunityAvatarResponseDTO = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

export type AdminCommunitiesListFilterOptionDTO = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItemDTO = {
  active: boolean;
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: Date;
  deactivated_at: Date | null;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: Date | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: Date;
  visual_primary_color: string | null;
};

export type AdminCommunitiesListDTO = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItemDTO[];
  filters: {
    categories: AdminCommunitiesListFilterOptionDTO[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};

export type IAdminCommunitiesListDTO = Request & {
  q: AdminCommunitiesListQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityShowDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityPaginationQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityContentDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityContentQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRankingDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityRankingQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityReportsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityReportsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityActivitiesDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityActivitiesQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatisticsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityStatisticsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRemoveContentDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRemoveContentBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityResolveReportsDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityResolveReportsBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatusDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityStatusBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityUpdateDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityUpdateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityCreateDTO = Request & {
  b: AdminCommunityCreateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityAvatarDTO = Request & {
  p: AdminCommunityManageParams;
  admin?: admin;
  auth?: admin;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IAdminCommunityRuleDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRuleBody;
  admin?: admin;
  auth?: admin;
};
