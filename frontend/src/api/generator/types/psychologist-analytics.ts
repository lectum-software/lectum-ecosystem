export type PsychologistAnalyticsPeriodKey = "7d" | "30d" | "90d" | "365d" | "custom";

export type PsychologistAnalyticsQuery = {
  period?: PsychologistAnalyticsPeriodKey;
  end_at?: string;
  start_at?: string;
};

export type PsychologistAnalyticsMetricId =
  | "favorites_received"
  | "search_results"
  | "profile_views"
  | "whatsapp_clicks"
  | "reviews_received"
  | "rating_average"
  | "posts_published"
  | "post_engagement";

export type PsychologistAnalyticsMetricSource =
  | "profile_view_event"
  | "contact_request"
  | "psychologist_favorite"
  | "professional_review"
  | "psychologist_profile"
  | "community_post";

export type PsychologistAnalyticsMetric = {
  id: PsychologistAnalyticsMetricId;
  label: string;
  value: number;
  source: PsychologistAnalyticsMetricSource;
  unit: "count" | "rating";
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
  start_at: string;
  end_at: string;
};

export type PsychologistAnalyticsMetrics = {
  search_results: number;
  profile_views: number;
  favorites_received: number;
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

export type PsychologistAnalyticsPresentationVideoSearchTerm = {
  term: string;
  impressions: number;
  percentage: number;
};

export type PsychologistAnalyticsPresentationVideo = {
  updated_at: string | null;
  video_url: string | null;
  video_cover_url: string | null;
  duration_seconds: number | null;
  metrics: {
    views: number;
    total_watch_seconds: number;
    average_watch_seconds: number;
    completed_views: number;
    completion_rate: number;
    replay_rate: number;
    abandonment_rate: number;
    search_results_from_video: number;
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
  search_terms: PsychologistAnalyticsPresentationVideoSearchTerm[];
};

export type PsychologistAnalyticsTrafficSourceId =
  | "communities"
  | "favorites"
  | "profile"
  | "presentation_video";

export type PsychologistAnalyticsTrafficSourceBreakdownId =
  | "explore"
  | "favorites_from_profile"
  | "favorites_from_video"
  | "post_with_video"
  | "post_without_video"
  | "profile_accesses"
  | "reply_with_video"
  | "reply_without_video"
  | "search_results";

export type PsychologistAnalyticsTrafficSourceBreakdownMetric =
  | "favorites"
  | "profile_views"
  | "whatsapp_clicks";

export type PsychologistAnalyticsTrafficSearchTerm = {
  term: string;
  whatsapp_clicks: number;
  percentage: number;
};

export type PsychologistAnalyticsTrafficSourceBreakdownItem = {
  id: PsychologistAnalyticsTrafficSourceBreakdownId;
  label: string;
  description: string;
  metric: PsychologistAnalyticsTrafficSourceBreakdownMetric;
  value: number;
  whatsapp_clicks: number;
  percentage: number;
  top_search_terms: PsychologistAnalyticsTrafficSearchTerm[];
};

export type PsychologistAnalyticsTrafficSource = {
  id: PsychologistAnalyticsTrafficSourceId;
  label: string;
  description: string;
  profile_views: number;
  whatsapp_clicks: number;
  conversion_rate: number;
  badge: "best_conversion" | "primary_source" | null;
  breakdown: PsychologistAnalyticsTrafficSourceBreakdownItem[] | null;
};

export type PsychologistAnalyticsTrafficSources = {
  updated_at: string | null;
  description: string;
  source: "traffic_origin_events";
  sources: PsychologistAnalyticsTrafficSource[];
};

export type PsychologistAnalyticsCommunityActivityLevel = "high" | "low" | "moderate" | "none";

export type PsychologistAnalyticsCommunityActivityDiagnosis = {
  active_communities: number;
  description: string;
  label: string;
  level: PsychologistAnalyticsCommunityActivityLevel;
  score: number;
  source: "community_member+community_post+post_reply+important_action_event";
  total_posts: number;
  total_replies: number;
  total_whatsapp_clicks: number;
};

export type PsychologistAnalyticsCommunityContentMediaScope = "with_video" | "without_video";

export type PsychologistAnalyticsCommunityContentType = "post" | "reply";

export type PsychologistAnalyticsCommunityContentBreakdownId =
  | "post_with_video"
  | "post_without_video"
  | "reply_with_video"
  | "reply_without_video";

export type PsychologistAnalyticsCommunityContentTotals = {
  total: number;
  with_video: number;
  without_video: number;
};

export type PsychologistAnalyticsCommunityContentBreakdownItem = {
  id: PsychologistAnalyticsCommunityContentBreakdownId;
  label: string;
  content_type: PsychologistAnalyticsCommunityContentType;
  media_scope: PsychologistAnalyticsCommunityContentMediaScope;
  content_count: number;
  whatsapp_clicks: number;
};

export type PsychologistAnalyticsCommunityContentSummary = {
  posts: PsychologistAnalyticsCommunityContentTotals;
  replies: PsychologistAnalyticsCommunityContentTotals;
  whatsapp_clicks_by_content: PsychologistAnalyticsCommunityContentBreakdownItem[];
};

export type PsychologistAnalyticsCommunities = {
  content: PsychologistAnalyticsCommunityContentSummary;
  description: string;
  diagnosis: PsychologistAnalyticsCommunityActivityDiagnosis;
  following_communities: number;
  participating_communities: number;
  source: "community_member+community_post+post_reply+important_action_event";
  updated_at: string | null;
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
  communities: PsychologistAnalyticsCommunities;
  traffic_sources: PsychologistAnalyticsTrafficSources;
  unavailable: PsychologistAnalyticsUnavailableMetric[];
};
