import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type CommunitiesDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: "down" | "flat" | "unavailable" | "up";
  unit: "count";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type CommunitiesDashboardQuery = {
  from?: string;
  to?: string;
};

export type CommunitiesDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type CommunitiesDashboardDailyPoint = {
  date: string;
  value: number;
};

export type CommunitiesDashboardActivitySeries = {
  color: string;
  id: string;
  label: string;
  points: CommunitiesDashboardDailyPoint[];
  source: string;
};

export type CommunitiesDashboardSeverity = "alta" | "baixa" | "media";

export type CommunitiesDashboardPriorityAlert = {
  community_name: string | null;
  community_slug: string | null;
  created_at: string;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string | null;
  severity: CommunitiesDashboardSeverity;
  status: string;
  target_id: string;
  target_title: string;
  target_type: string;
};

export type CommunitiesDashboardModerationAlert = {
  categories: string[];
  community_name: string | null;
  community_slug: string | null;
  content_excerpt: string;
  created_at: string;
  decision: string;
  id: string;
  reason_code: string;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
};

export type CommunitiesDashboardRecentPost = {
  anonymous: boolean;
  author_name: string;
  author_role: string;
  comments_count: number;
  community_id: string;
  community_name: string;
  community_slug: string;
  created_at: string;
  discussion_status: "iniciada" | "nao_iniciada";
  id: string;
  title: string;
};

export type CommunitiesDashboardTopCommunity = {
  activity_count: number;
  id: string;
  members_count: number;
  name: string;
  posts_count: number;
  slug: string;
  visual_primary_color: string | null;
};

export type CommunitiesDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminCommunitiesDashboard = {
  activity_series: CommunitiesDashboardActivitySeries[];
  cards: {
    active_members: CommunitiesDashboardMetric;
    patient_comments: CommunitiesDashboardMetric;
    patient_posts: CommunitiesDashboardMetric;
    psychologist_posts: CommunitiesDashboardMetric;
    psychologist_replies: CommunitiesDashboardMetric;
  };
  patient_posts_breakdown: {
    anonymous: { count: number; percentage: number };
    identified: { count: number; percentage: number };
    source: "community_post.anonymous";
    total: number;
  };
  period: CommunitiesDashboardPeriod;
  priority_alerts: {
    items: CommunitiesDashboardPriorityAlert[];
    source: "post_report.status=pendente";
    total: number;
  };
  moderation_alerts: {
    items: CommunitiesDashboardModerationAlert[];
    source: "content_moderation_event.status=pending|reviewing";
    total: number;
    urgent_total: number;
  };
  recent_posts: {
    items: CommunitiesDashboardRecentPost[];
    source: "community_post";
    total: number;
  };
  top_communities: {
    items: CommunitiesDashboardTopCommunity[];
    source: "community+community_member+community_post+post_reply+post_vote+post_save";
    total: number;
  };
  unavailable: CommunitiesDashboardUnavailableMetric[];
};

export type AdminCommunityIdentity = {
  avatar_url: string | null;
  category: string | null;
  created_at: string;
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

export type AdminCommunityRule = {
  active: boolean;
  created_at: string;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: string;
};

export type AdminCommunitySummary = {
  comments_count: number;
  members_count: number;
  popular_posts_count: number;
  posts_count: number;
};

export type AdminCommunityPerformanceMetric = {
  change_percent: number | null;
  label: string;
  trend: "down" | "flat" | "unavailable" | "up";
  value: number;
};

export type AdminCommunityPerformancePoint = {
  comments: number;
  date: string;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityTopMentor = {
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

export type AdminCommunityPopularPost = {
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: string;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetail = {
  community: AdminCommunityIdentity;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetric;
      new_members: AdminCommunityPerformanceMetric;
      new_posts: AdminCommunityPerformanceMetric;
      reports: AdminCommunityPerformanceMetric;
    };
    points: AdminCommunityPerformancePoint[];
  };
  popular_posts: AdminCommunityPopularPost[];
  rules: AdminCommunityRule[];
  summary: AdminCommunitySummary;
  top_mentors: AdminCommunityTopMentor[];
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

export type AdminCommunitiesListFilterOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItem = {
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: string;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: string | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: string;
  visual_primary_color: string | null;
};

export type AdminCommunitiesList = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItem[];
  filters: {
    categories: AdminCommunitiesListFilterOption[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};

export type AdminCommunityContentQuery = AdminCommunityPaginationQuery & {
  status?: "all" | "published" | "removed";
  type?: "all" | "comments" | "posts";
};

export type AdminCommunityContentItem = {
  author: {
    avatar: string | null;
    gender: string | null;
    id: string;
    name: string;
    role: string;
    verified: boolean;
  };
  content_kind:
    | "patient_comment"
    | "patient_post"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
  content_kind_label: string;
  content_id: string;
  created_at: string;
  deleted_at: string | null;
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
    upvotes_count: number;
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

export type AdminCommunityContent = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityContentItem[];
  page: number;
  pages: number;
  per_page: number;
  source: "community_post+post_reply";
};

export type AdminCommunityRemoveContentInput = {
  confirmation: string;
  reason: string;
};

export type AdminCommunityRemoveContentResult = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
  type: "comment" | "post";
};

export type AdminCommunityRankingQuery = AdminCommunityPaginationQuery & {
  period?: "30d";
};

export type AdminCommunityRankingItem = {
  membership_created_at: string;
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

export type AdminCommunityRanking = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityRankingItem[];
  formula: Record<string, unknown>;
  page: number;
  pages: number;
  per_page: number;
  period: {
    current_from: string;
    current_to: string;
    days: 30;
    label: "Últimos 30 dias";
    previous_from: string;
    previous_to: string;
  };
  source: "community_member+community_post+post_reply+post_vote+post_save+post_share";
};

export type AdminCommunityReportsQuery = AdminCommunityPaginationQuery & {
  status?: "all" | "em_analise" | "pendente" | "rejeitada" | "resolvida";
  type?: "all" | "comment" | "post" | "reply";
};

export type AdminCommunityReportItem = {
  content: {
    available: boolean;
    excerpt: string;
    id: string;
    post_id: string;
    title: string | null;
    type: "comment" | "post";
  };
  created_at: string;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string;
  status: string;
};

export type AdminCommunityReports = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityReportItem[];
  page: number;
  pages: number;
  per_page: number;
  source: "post_report";
};

export type AdminCommunityActivitiesQuery = AdminCommunityPaginationQuery & {
  type?: string;
};

export type AdminCommunityActivityItem = {
  action: string;
  actor: string;
  area: string;
  created_at: string;
  id: string;
  reason: string | null;
  source: string;
  summary: string;
};

export type AdminCommunityActivities = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityActivityItem[];
  page: number;
  pages: number;
  per_page: number;
  source: "admin_activity_log";
};

export type AdminCommunityUpdateInput = {
  description?: string | null;
  name: string;
  visual_primary_color?: string | null;
};

export type AdminCommunityCreateInput = AdminCommunityUpdateInput & {
  category?: string | null;
  slug?: string | null;
};

export type AdminCommunityRuleInput = {
  active?: boolean;
  description: string;
  position?: number;
  title: string;
};

export type AdminCommunityRulesResponse = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRule[];
};

export type AdminCommunityAvatarResponse = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

const cleanParams = (input: CommunitiesDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanPaginationParams = <T extends AdminCommunityPaginationQuery>(input: T = {} as T) => ({
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([key, value]) => !["limit", "page", "q"].includes(key) && value !== undefined,
    ),
  ),
});

export const getAdminCommunitiesDashboard = async (input: CommunitiesDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesDashboard>>(
    "/api/admin/private/communities/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunitiesList = async (input: AdminCommunitiesListQuery = {}) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesList>>(
    "/api/admin/private/communities",
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityDetail>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunity = async (input: AdminCommunityCreateInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityIdentity>>(
    "/api/admin/private/communities",
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityContent = async (id: string, input: AdminCommunityContentQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContent>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const removeAdminCommunityContent = async (
  id: string,
  targetType: "comment" | "post",
  targetId: string,
  input: AdminCommunityRemoveContentInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRemoveContentResult>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/remove`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRanking = async (id: string, input: AdminCommunityRankingQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRanking>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/ranking`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityReports = async (id: string, input: AdminCommunityReportsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityReports>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/reports`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityActivities = async (
  id: string,
  input: AdminCommunityActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityActivities>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/activities`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunity = async (id: string, input: AdminCommunityUpdateInput) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityIdentity>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const uploadAdminCommunityAvatar = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await adminApi.post<ApiResponse<AdminCommunityAvatarResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/avatar`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRules = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRulesResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunityRule = async (id: string, input: AdminCommunityRuleInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunityRule = async (
  id: string,
  ruleId: string,
  input: AdminCommunityRuleInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminCommunityRule = async (id: string, ruleId: string) => {
  const response = await adminApi.delete<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
  );

  return resolveApiData(response.data);
};
