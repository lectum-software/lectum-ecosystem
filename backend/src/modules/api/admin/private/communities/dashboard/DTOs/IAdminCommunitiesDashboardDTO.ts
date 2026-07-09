import type { Request } from "express";

export type AdminCommunitiesDashboardQuery = {
  from?: string;
  to?: string;
};

export type AdminCommunitiesDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminCommunitiesDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminCommunitiesDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminCommunitiesDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminCommunitiesDashboardTrend;
  unit: "count";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type AdminCommunitiesDashboardDailyPoint = {
  date: string;
  value: number;
};

export type AdminCommunitiesDashboardActivitySeries = {
  color: string;
  id: string;
  label: string;
  points: AdminCommunitiesDashboardDailyPoint[];
  source: string;
};

export type AdminCommunitiesDashboardSeverity = "alta" | "baixa" | "media";

export type AdminCommunitiesDashboardPatientPostsBreakdown = {
  anonymous: {
    count: number;
    percentage: number;
  };
  identified: {
    count: number;
    percentage: number;
  };
  source: "community_post.anonymous";
  total: number;
};

export type AdminCommunitiesDashboardPriorityAlert = {
  community_name: string | null;
  community_slug: string | null;
  created_at: Date;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string | null;
  severity: AdminCommunitiesDashboardSeverity;
  status: string;
  target_id: string;
  target_title: string;
  target_type: string;
};

export type AdminCommunitiesDashboardRecentPost = {
  anonymous: boolean;
  author_name: string;
  author_role: string;
  comments_count: number;
  community_id: string;
  community_name: string;
  community_slug: string;
  created_at: Date;
  discussion_status: "iniciada" | "nao_iniciada";
  id: string;
  title: string;
};

export type AdminCommunitiesDashboardTopCommunity = {
  activity_count: number;
  id: string;
  members_count: number;
  name: string;
  posts_count: number;
  slug: string;
  visual_primary_color: string | null;
};

export type AdminCommunitiesDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminCommunitiesDashboardSummary = {
  activity_series: AdminCommunitiesDashboardActivitySeries[];
  cards: {
    active_members: AdminCommunitiesDashboardMetric;
    patient_comments: AdminCommunitiesDashboardMetric;
    patient_posts: AdminCommunitiesDashboardMetric;
    psychologist_posts: AdminCommunitiesDashboardMetric;
    psychologist_replies: AdminCommunitiesDashboardMetric;
  };
  patient_posts_breakdown: AdminCommunitiesDashboardPatientPostsBreakdown;
  period: AdminCommunitiesDashboardPeriod;
  priority_alerts: {
    items: AdminCommunitiesDashboardPriorityAlert[];
    source: "post_report.status=pendente";
    total: number;
  };
  recent_posts: {
    items: AdminCommunitiesDashboardRecentPost[];
    source: "community_post";
    total: number;
  };
  top_communities: {
    items: AdminCommunitiesDashboardTopCommunity[];
    source: "community+community_member+community_post+post_reply+post_vote+post_save";
    total: number;
  };
  unavailable: AdminCommunitiesDashboardUnavailableMetric[];
};

export type IAdminCommunitiesDashboardDTO = Request & {
  q: AdminCommunitiesDashboardQuery;
};
