import type { Request } from "express";

export type AdminPsychologistEngagementQuery = {
  community?: string;
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPsychologistPublicationsQuery = AdminPsychologistEngagementQuery & {
  community?: string;
  limit?: number;
  page?: number;
  q?: string;
  sort?: "engagement" | "oldest" | "recent";
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistEngagementTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPsychologistMetricComparison = {
  change_percent: number | null;
  previous_from: string;
  previous_to: string;
  previous_value: number;
  trend: AdminPsychologistEngagementTrend;
};

export type AdminPsychologistAvailabilityMetric = {
  available: boolean;
  comparison?: AdminPsychologistMetricComparison | null;
  id: string;
  label: string;
  source: string;
  unit: "count" | "percentage" | "position" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminPsychologistStatisticsPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminPsychologistStatisticsSeriesPoint = {
  comments_received: number;
  date: string;
  downvotes: number;
  favorites: number;
  profile_views: number;
  replies: number;
  reviews: number;
  saves: number;
  search_results: number;
  shares: number;
  whatsapp_clicks: number;
  upvotes: number;
  posts: number;
};

export type AdminPsychologistStatisticsVideo = {
  available: boolean;
  comparisons: {
    average_retention_percent: AdminPsychologistMetricComparison;
    favorites_from_video: AdminPsychologistMetricComparison;
    profile_accesses_from_video: AdminPsychologistMetricComparison;
    replay_rate_percent: AdminPsychologistMetricComparison;
    shares_from_video: AdminPsychologistMetricComparison;
    sessions: AdminPsychologistMetricComparison;
    whatsapp_clicks_from_video: AdminPsychologistMetricComparison;
  };
  cover_url: string | null;
  duration_seconds: number | null;
  retention_dropoff: {
    from_milestone: number;
    to_milestone: number;
    rate_drop: number;
    from_seconds: number;
    to_seconds: number;
  } | null;
  metrics: {
    average_watch_seconds: number;
    average_retention_percent: number;
    completions: number;
    favorites_from_video: number;
    profile_accesses_from_video: number;
    replay_rate_percent: number;
    sessions: number;
    shares_from_video: number;
    whatsapp_clicks_from_video: number;
  };
  retention: { label: string; percentage: number; position_percent: number }[];
  source: "profile_video_watch_session+important_action_event";
  unavailable_reason: string | null;
  video_url: string | null;
};

export type AdminPsychologistStatisticsCommunityItem = {
  avatar_url: string | null;
  color: string | null;
  id: string;
  member_since: Date | null;
  name: string;
  posts: number;
  ranking: {
    position: number;
    score: number;
  } | null;
  replies: number;
  slug: string;
};

export type AdminPsychologistPlatformUsageTopPage = {
  count: number;
  label: string;
  percentage: number;
};

export type AdminPsychologistPlatformUsagePeakActivityHour = {
  count: number;
  hour: number;
  label: string;
  percentage: number;
};

export type AdminPsychologistPlatformUsage = {
  access_days_count: number;
  average_duration_seconds: number | null;
  duration_unavailable_reason: string | null;
  hourly_activity: AdminPsychologistPlatformUsagePeakActivityHour[];
  last_access_at: Date | null;
  period_from: string;
  period_to: string;
  pwa_installation_recorded: boolean;
  pwa_installed_at: Date | null;
  sessions_count: number;
  source: "page_view_event+important_action_event";
  peak_activity_hours: AdminPsychologistPlatformUsagePeakActivityHour[];
  top_pages: AdminPsychologistPlatformUsageTopPage[];
  unavailable_reason: string | null;
};

export type AdminPsychologistTrafficSourceItem = {
  badge: "primary_source" | null;
  conversion_rate: number | null;
  description: string;
  id: string;
  label: string;
  percentage: number;
  profile_views: number;
  sessions: number;
  whatsapp_clicks: number | null;
};

export type AdminPsychologistTrafficSources = {
  attribution_unavailable_reason: string | null;
  description: string;
  source: "page_view_event.traffic_source+target_type=psychologist";
  sources: AdminPsychologistTrafficSourceItem[];
  total_profile_views: number;
  total_sessions: number;
  unavailable_reason: string | null;
  updated_at: Date | null;
};

export type AdminPsychologistStatisticsDTO = {
  business: {
    cards: AdminPsychologistAvailabilityMetric[];
    series: AdminPsychologistStatisticsSeriesPoint[];
  };
  community: {
    cards: AdminPsychologistAvailabilityMetric[];
    communities: AdminPsychologistStatisticsCommunityItem[];
    series: AdminPsychologistStatisticsSeriesPoint[];
  };
  period: AdminPsychologistStatisticsPeriod;
  platform_usage: AdminPsychologistPlatformUsage;
  source: "profile_events+community_activity+video_sessions+search_impressions+professional_review+page_view_event+important_action_event";
  traffic_sources: AdminPsychologistTrafficSources;
  unavailable: AdminPsychologistAvailabilityMetric[];
  video: AdminPsychologistStatisticsVideo;
};

export type AdminPsychologistPublicationMetric = AdminPsychologistAvailabilityMetric;

export type AdminPsychologistPublicationItem = {
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  created_at: Date;
  excerpt: string;
  id: string;
  media: {
    type: string | null;
    url: string | null;
  } | null;
  metrics: {
    comments: AdminPsychologistPublicationMetric;
    downvotes: AdminPsychologistPublicationMetric;
    reports: AdminPsychologistPublicationMetric;
    saves: AdminPsychologistPublicationMetric;
    shares: AdminPsychologistPublicationMetric;
    upvotes: AdminPsychologistPublicationMetric;
    views: AdminPsychologistPublicationMetric;
    whatsapp_clicks: AdminPsychologistPublicationMetric;
  };
  public_url: string;
  source: "community_post" | "post_reply";
  title: string;
  type: "post" | "reply";
};

export type AdminPsychologistPublicationsDTO = {
  active_filters_count: number;
  count: number;
  data: AdminPsychologistPublicationItem[];
  filters: {
    communities: { id: string; label: string; slug: string }[];
    types: { id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatisticsPeriod;
  source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report";
  totals: {
    cards: AdminPsychologistAvailabilityMetric[];
  };
  unavailable: AdminPsychologistAvailabilityMetric[];
};

export type IAdminPsychologistStatisticsDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPsychologistEngagementQuery;
};

export type IAdminPsychologistPublicationsDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPsychologistPublicationsQuery;
};
