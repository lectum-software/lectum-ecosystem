import type { Request } from "express";

export type AdminCommunitiesDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
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

export type AdminCommunitiesDashboardStatisticsSplit = {
  id: string;
  label: string;
  source: string;
  value: number;
};

export type AdminCommunitiesDashboardStatisticsDailyPoint = {
  active_patients: number;
  active_psychologists: number;
  active_users: number;
  anonymous_posts: number;
  date: string;
  downvotes: number;
  followers_patients: number;
  followers_psychologists: number;
  profile_accesses: number;
  new_active_patients: number;
  new_active_psychologists: number;
  new_active_users: number;
  patient_comments: number;
  patient_posts: number;
  posts: number;
  psychologist_posts: number;
  replies: number;
  reports: number;
  saves: number;
  unverified_psychologist_replies: number;
  upvotes: number;
  verified_psychologist_replies: number;
  whatsapp_clicks: number;
};

export type AdminCommunitiesDashboardHourlyActivityPoint = {
  accesses: number;
  engagement: number;
  hour: number;
  label: string;
  posts: number;
  replies: number;
  reports: number;
  total: number;
};

export type AdminCommunitiesDashboardGlobalStatistics = {
  charts: {
    active_users_split: AdminCommunitiesDashboardStatisticsSplit[];
    daily: AdminCommunitiesDashboardStatisticsDailyPoint[];
    followers_split: AdminCommunitiesDashboardStatisticsSplit[];
    hourly_activity: AdminCommunitiesDashboardHourlyActivityPoint[];
    posts_by_author: AdminCommunitiesDashboardStatisticsSplit[];
    replies_by_author: AdminCommunitiesDashboardStatisticsSplit[];
  };
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
    content_engagement: {
      downvotes: number;
      profile_accesses: number;
      saves: number;
      source: "post_vote+post_save+post_reply_save+important_action_event+page_view_event";
      upvotes: number;
      whatsapp_clicks: number;
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
  source: "community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event";
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

export type AdminCommunitiesDashboardModerationAlert = {
  categories: string[];
  community_name: string | null;
  community_slug: string | null;
  content_excerpt: string;
  created_at: Date;
  decision: string;
  id: string;
  reason_code: string;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
};

export type AdminCommunitiesDashboardPostAuthor = {
  anonymous: boolean;
  avatar: string | null;
  gender: string | null;
  id: string;
  name: string;
  role: string;
  verified: boolean;
};

export type AdminCommunitiesDashboardRecentPost = {
  anonymous: boolean;
  author: AdminCommunitiesDashboardPostAuthor;
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
  views_count: number;
};

export type AdminCommunitiesDashboardPopularPost = AdminCommunitiesDashboardRecentPost & {
  engagement_score: number;
  saves_count: number;
  upvotes_count: number;
};

export type AdminCommunitiesDashboardTopCommunity = {
  accesses_count: number;
  activity_count: number;
  avatar_url: string | null;
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
  global_statistics: {
    current: AdminCommunitiesDashboardGlobalStatistics;
    previous: AdminCommunitiesDashboardGlobalStatistics;
  };
  patient_posts_breakdown: AdminCommunitiesDashboardPatientPostsBreakdown;
  period: AdminCommunitiesDashboardPeriod;
  priority_alerts: {
    items: AdminCommunitiesDashboardPriorityAlert[];
    source: "post_report.status=pendente";
    total: number;
  };
  moderation_alerts: {
    items: AdminCommunitiesDashboardModerationAlert[];
    source: "content_moderation_event.status=pending|reviewing";
    total: number;
    urgent_total: number;
  };
  recent_posts: {
    items: AdminCommunitiesDashboardRecentPost[];
    source: "community_post+page_view_event";
    total: number;
  };
  popular_posts: {
    items: AdminCommunitiesDashboardPopularPost[];
    source: "community_post+post_reply+post_vote+post_save+page_view_event";
    total: number;
  };
  top_communities: {
    items: AdminCommunitiesDashboardTopCommunity[];
    source: "community+community_member+community_post+post_reply+post_vote+post_save+page_view_event";
    total: number;
  };
  unavailable: AdminCommunitiesDashboardUnavailableMetric[];
};

export type IAdminCommunitiesDashboardDTO = Request & {
  q: AdminCommunitiesDashboardQuery;
};
