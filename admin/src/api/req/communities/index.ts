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
