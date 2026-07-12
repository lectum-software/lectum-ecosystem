import type { Request } from "express";

export type AdminPsychologistEngagementQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "week" | "year";
  to?: string;
};

export type AdminPsychologistPublicationsQuery = AdminPsychologistEngagementQuery & {
  community?: string;
  limit?: number;
  page?: number;
  q?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistAvailabilityMetric = {
  available: boolean;
  id: string;
  label: string;
  source: string;
  unit: "count" | "percentage" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminPsychologistStatisticsPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  timezone: "server-local";
  to: string;
};

export type AdminPsychologistStatisticsSeriesPoint = {
  comments_received: number;
  date: string;
  favorites: number;
  profile_views: number;
  replies: number;
  saves: number;
  search_results: number;
  whatsapp_clicks: number;
  posts: number;
};

export type AdminPsychologistStatisticsVideo = {
  available: boolean;
  cover_url: string | null;
  metrics: {
    average_retention_percent: number;
    completions: number;
    replay_rate_percent: number;
    sessions: number;
  };
  retention: { label: string; percentage: number; position_percent: number }[];
  source: "profile_video_watch_session";
  unavailable_reason: string | null;
  video_url: string | null;
};

export type AdminPsychologistStatisticsCommunityItem = {
  color: string | null;
  id: string;
  member_since: Date | null;
  name: string;
  posts: number;
  replies: number;
  slug: string;
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
  source: "profile_events+community_activity+video_sessions+search_impressions";
  unavailable: AdminPsychologistAvailabilityMetric[];
  video: AdminPsychologistStatisticsVideo;
};

export type AdminPsychologistPublicationMetric = AdminPsychologistAvailabilityMetric;

export type AdminPsychologistPublicationItem = {
  community: {
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
    saves: AdminPsychologistPublicationMetric;
    shares: AdminPsychologistPublicationMetric;
    upvotes: AdminPsychologistPublicationMetric;
    views: AdminPsychologistPublicationMetric;
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
  source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event";
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
