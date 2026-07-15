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
  status?: "all" | "published" | "removed";
  type?: "all" | "comments" | "posts";
};

export type AdminCommunityRankingQuery = AdminCommunityPaginationQuery & {
  period?: "30d";
};

export type AdminCommunityReportsQuery = AdminCommunityPaginationQuery & {
  status?: "all" | "em_analise" | "pendente" | "rejeitada" | "resolvida";
  type?: "all" | "comment" | "post" | "reply";
};

export type AdminCommunityActivitiesQuery = AdminCommunityPaginationQuery & {
  type?: string;
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

export type AdminCommunityIdentity = {
  avatar_url: string | null;
  category: string | null;
  created_at: Date;
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
    avatar: string | null;
    id: string;
    name: string;
    role: string;
  };
  content_id: string;
  created_at: Date;
  deleted_at: Date | null;
  excerpt: string;
  metrics: {
    comments_count: number;
    downvotes_count: number;
    reports_count: number;
    saves_count: number;
    upvotes_count: number;
  };
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
  source: "community_post+post_reply";
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
  content: {
    available: boolean;
    excerpt: string;
    id: string;
    post_id: string;
    title: string | null;
    type: "comment" | "post";
  };
  created_at: Date;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string;
  status: string;
};

export type AdminCommunityReportsDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityReportItemDTO[];
  page: number;
  pages: number;
  per_page: number;
  source: "post_report";
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

export type AdminCommunityActivitiesDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityActivityItemDTO[];
  page: number;
  pages: number;
  per_page: number;
  source: "admin_activity_log";
};

export type AdminCommunityRemoveContentDTO = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
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
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: Date;
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

export type IAdminCommunityRemoveContentDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRemoveContentBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityUpdateDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityUpdateBody;
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
