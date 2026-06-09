export type PsychologistAnalyticsPeriodKey = "7d" | "30d" | "90d" | "365d";

export type PsychologistAnalyticsQuery = {
  period?: PsychologistAnalyticsPeriodKey;
};

export type PsychologistAnalyticsMetricId =
  | "whatsapp_clicks"
  | "reviews_received"
  | "rating_average"
  | "posts_published"
  | "post_engagement";

export type PsychologistAnalyticsMetricSource =
  | "contact_request"
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
  whatsapp_clicks: number;
  reviews_received: number;
  rating_average: number;
  rating_count_total: number;
  posts_published: number;
  post_engagement: number;
  post_upvotes: number;
  post_replies: number;
};

export type PsychologistAnalyticsResponse = {
  period: PsychologistAnalyticsPeriod;
  metrics: PsychologistAnalyticsMetrics;
  cards: PsychologistAnalyticsMetric[];
  unavailable: PsychologistAnalyticsUnavailableMetric[];
};
