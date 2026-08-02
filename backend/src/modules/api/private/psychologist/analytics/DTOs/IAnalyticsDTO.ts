import type { user } from "@/interfaces/objects";

export type PsychologistAnalyticsPeriodKey = "7d" | "30d" | "90d" | "365d" | "custom";

export type PsychologistAnalyticsMetricId =
  | "profile_views"
  | "whatsapp_clicks"
  | "reviews_received"
  | "rating_average"
  | "posts_published"
  | "post_engagement";

export type PsychologistAnalyticsMetricSource =
  | "profile_view_event"
  | "contact_request"
  | "professional_review"
  | "psychologist_profile"
  | "community_post";

export type PsychologistAnalyticsMetricUnit = "count" | "rating";

export type PsychologistAnalyticsMetric = {
  id: PsychologistAnalyticsMetricId;
  label: string;
  value: number;
  source: PsychologistAnalyticsMetricSource;
  unit: PsychologistAnalyticsMetricUnit;
  description: string;
};

export type PsychologistAnalyticsUnavailableMetric = {
  id: "profile_views";
  label: string;
  source: "profile_view_event";
  reason: "source_not_available";
  description: string;
};

export type PsychologistAnalyticsPeriod = {
  key: PsychologistAnalyticsPeriodKey;
  label: string;
  start_at: Date;
  end_at: Date;
};

export type PsychologistAnalyticsMetrics = {
  profile_views: number;
  whatsapp_clicks: number;
  reviews_received: number;
  rating_average: number;
  rating_count_total: number;
  posts_published: number;
  post_engagement: number;
  post_upvotes: number;
  post_replies: number;
};

export type PsychologistAnalyticsVideoMetricId =
  | "views"
  | "average_watch_seconds"
  | "completion_rate"
  | "replay_rate"
  | "abandonment_rate";

export type PsychologistAnalyticsPresentationVideoMetric = {
  id: PsychologistAnalyticsVideoMetricId;
  label: string;
  value: number;
  unit: "count" | "percent" | "seconds";
  description: string;
};

export type PsychologistAnalyticsPresentationVideoRetentionPoint = {
  milestone: number;
  rate: number;
  viewers: number;
};

export type PsychologistAnalyticsPresentationVideoRetentionDropoff = {
  from_milestone: number;
  to_milestone: number;
  rate_drop: number;
  from_seconds: number;
  to_seconds: number;
};

export type PsychologistAnalyticsPresentationVideo = {
  updated_at: Date | null;
  video_url: string | null;
  video_cover_url: string | null;
  duration_seconds: number | null;
  metrics: {
    views: number;
    average_watch_seconds: number;
    completion_rate: number;
    replay_rate: number;
    abandonment_rate: number;
    profile_accesses_from_video: number;
    favorites_from_video: number;
    whatsapp_clicks_from_video: number;
    shares_from_video: number;
  };
  cards: PsychologistAnalyticsPresentationVideoMetric[];
  retention: {
    average_retention_rate: number;
    dropoff: PsychologistAnalyticsPresentationVideoRetentionDropoff | null;
    points: PsychologistAnalyticsPresentationVideoRetentionPoint[];
    source: "bucket_5_percent";
  };
};

export type PsychologistAnalyticsTrafficSourceId =
  | "communities"
  | "direct_link"
  | "favorites"
  | "presentation_video";

export type PsychologistAnalyticsTrafficSource = {
  id: PsychologistAnalyticsTrafficSourceId;
  label: string;
  description: string;
  profile_views: number;
  whatsapp_clicks: number;
  conversion_rate: number;
  badge: "best_conversion" | "primary_source" | null;
};

export type PsychologistAnalyticsTrafficSources = {
  updated_at: Date | null;
  description: string;
  source: "traffic_origin_events";
  sources: PsychologistAnalyticsTrafficSource[];
};

export type PsychologistAnalyticsResponse = {
  access: {
    has_professional_entitlement: boolean;
    mode: "full" | "preview";
  };
  period: PsychologistAnalyticsPeriod;
  metrics: PsychologistAnalyticsMetrics;
  cards: PsychologistAnalyticsMetric[];
  presentation_video: PsychologistAnalyticsPresentationVideo;
  traffic_sources: PsychologistAnalyticsTrafficSources;
  unavailable: PsychologistAnalyticsUnavailableMetric[];
};

export interface IPsychologistAnalyticsIndexDTO {
  q: {
    end_at?: string;
    period?: PsychologistAnalyticsPeriodKey;
    start_at?: string;
  };
  auth: user;
}
