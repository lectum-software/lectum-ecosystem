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

export type AdminCommunityUpdateInput = {
  description?: string | null;
  name: string;
  visual_gradient_color?: string | null;
  visual_primary_color?: string | null;
  visual_primary_dark_color?: string | null;
  visual_soft_color?: string | null;
  visual_text_color?: string | null;
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

export const getAdminCommunitiesDashboard = async (input: CommunitiesDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesDashboard>>(
    "/api/admin/private/communities/dashboard",
    {
      params: cleanParams(input),
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
