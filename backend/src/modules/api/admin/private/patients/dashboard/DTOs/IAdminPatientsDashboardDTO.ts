import type { Request } from "express";

export type AdminPatientsDashboardQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPatientsDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminPatientsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminPatientsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPatientsDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminPatientsDashboardTrend;
  unit: "count";
  unavailable: boolean;
  value: number;
};

export type AdminPatientsDashboardDailyPoint = {
  active_patients: number;
  date: string;
  inactive_patients: number;
  new_signups: number;
  total_patients: number;
};

export type AdminPatientsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminPatientsDashboardLocationItem = AdminPatientsDashboardBreakdownItem;

export type AdminPatientsDashboardRecentActivity = {
  description: string;
  detail_url: string | null;
  label: string;
  occurred_at: Date;
  source: string;
  type: string;
};

export type AdminPatientsDashboardRecentPatient = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: Date;
  detail_url: string;
  email: string;
  gender: string | null;
  id: string;
  last_location_at: Date | null;
  name: string;
  provider: string;
  provider_label: string;
  recent_activity: AdminPatientsDashboardRecentActivity | null;
  state: string | null;
  status: "active" | "inactive";
  status_label: "Ativo" | "Inativo";
};

export type AdminPatientsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientsDashboardPlatformUsage = {
  active_patients_count: number;
  active_patients_rate: number | null;
  average_access_days: number | null;
  average_duration_seconds: number | null;
  average_sessions: number | null;
  duration_unavailable_reason: string | null;
  eligible_patients_count: number;
  pageviews_count: number;
  pwa_installed_patients_count: number;
  pwa_installed_patients_rate: number | null;
  series: {
    active_patients: number;
    date: string;
    pageviews: number;
    sessions: number;
  }[];
  sessions_count: number;
  source: "page_view_event+important_action_event";
  top_pages: {
    count: number;
    label: string;
    percentage: number;
  }[];
  top_pages_by_average_duration: {
    average_duration_seconds: number;
    count: number;
    duration_samples_count: number;
    label: string;
  }[];
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type AdminPatientsDashboardDeviceUsageItem = {
  active_patients_count: number;
  count: number;
  device_type: AdminPatientsDashboardDeviceType;
  id: AdminPatientsDashboardDeviceType;
  label: string;
  operating_systems: AdminPatientsDashboardOperatingSystemUsageItem[];
  percentage: number;
};

export type AdminPatientsDashboardDeviceUsage = {
  items: AdminPatientsDashboardDeviceUsageItem[];
  source: "visitor_session.device_type+visitor_session.os+user.role=paciente";
  total_active_patients: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardOperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "other"
  | "unknown"
  | "windows";

export type AdminPatientsDashboardOperatingSystemUsageItem = {
  active_patients_count: number;
  count: number;
  id: AdminPatientsDashboardOperatingSystem;
  label: string;
  operating_system: AdminPatientsDashboardOperatingSystem;
  percentage: number;
};

export type AdminPatientsDashboardOperatingSystemUsage = {
  items: AdminPatientsDashboardOperatingSystemUsageItem[];
  source: "visitor_session.os+visitor_session.device_type+user.role=paciente";
  total_active_patients: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardIntentSegmentId =
  | "cold"
  | "curious"
  | "objective"
  | "very_qualified";

export type AdminPatientsDashboardIntentSegment = {
  count: number;
  description: string;
  id: AdminPatientsDashboardIntentSegmentId;
  label: "Curiosos" | "Frios" | "Interessados" | "Qualificados";
  percentage: number;
};

export type AdminPatientsDashboardIntentAnalysis = {
  coverage_note: string;
  items: AdminPatientsDashboardIntentSegment[];
  patients_with_signals: number;
  privacy_note: string;
  signal_totals: {
    favorites: number;
    profile_views: number;
    repeated_profile_views: number;
    whatsapp_clicks: number;
  };
  source: "profile_view_event+psychologist_favorite+contact_request";
  total_patients: number;
  total_signals: number;
};

export type AdminPatientsDashboardEngagementSegmentId =
  | "engaged"
  | "low_engagement"
  | "no_engagement"
  | "very_engaged";

export type AdminPatientsDashboardEngagementSegment = {
  count: number;
  id: AdminPatientsDashboardEngagementSegmentId;
  label: "Engajados" | "Muito engajados" | "Pouco engajados" | "Sem engajamento";
  percentage: number;
};

export type AdminPatientsDashboardEngagementAnalysis = {
  coverage_note: string;
  items: AdminPatientsDashboardEngagementSegment[];
  patients_with_engagement: number;
  privacy_note: string;
  source: "community_post+post_reply+post_vote+post_save+post_reply_save";
  thresholds: {
    engaged_score_30d: number;
    minimum_signal_score_30d: number;
    passive_saves_score_cap_30d: number;
    passive_votes_score_cap_30d: number;
    very_engaged_score_30d: number;
    weights: {
      posts: number;
      replies: number;
      saves: number;
      votes: number;
    };
  };
  total_patients: number;
};

export type AdminPatientsDashboardIntentEngagementCellId =
  `${AdminPatientsDashboardIntentSegmentId}_${AdminPatientsDashboardEngagementSegmentId}`;

export type AdminPatientsDashboardIntentEngagementCell = {
  column_percentage: number;
  count: number;
  engagement_id: AdminPatientsDashboardEngagementSegmentId;
  engagement_label: AdminPatientsDashboardEngagementSegment["label"];
  id: AdminPatientsDashboardIntentEngagementCellId;
  intent_id: AdminPatientsDashboardIntentSegmentId;
  intent_label: AdminPatientsDashboardIntentSegment["label"];
  percentage: number;
  row_percentage: number;
};

export type AdminPatientsDashboardIntentEngagementRate = {
  high_intent_count: number;
  high_intent_rate: number | null;
  patients: number;
};

export type AdminPatientsDashboardIntentEngagement = {
  cells: AdminPatientsDashboardIntentEngagementCell[];
  comparison: {
    high_engagement: AdminPatientsDashboardIntentEngagementRate;
    low_engagement: AdminPatientsDashboardIntentEngagementRate;
    rate_difference_points: number | null;
  };
  description: string;
  source: "profile_view_event+psychologist_favorite+contact_request+community_post+post_reply+post_vote+post_save+post_reply_save";
  totals: {
    high_engagement_patients: number;
    high_intent_patients: number;
    low_engagement_patients: number;
    patients: number;
  };
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardIntentFilterId = "all" | AdminPatientsDashboardIntentSegmentId;

export type AdminPatientsDashboardIntentFilterOption = {
  count: number;
  id: AdminPatientsDashboardIntentFilterId;
  label: "Curiosos" | "Frios" | "Interessados" | "Qualificados" | "Todos";
};

export type AdminPatientsDashboardIntentFilteredMetrics = {
  demographics: {
    gender: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  device_usage: AdminPatientsDashboardDeviceUsage;
  locations: {
    cities: AdminPatientsDashboardLocationItem[];
    countries: AdminPatientsDashboardLocationItem[];
    source: "visitor_location";
    states: AdminPatientsDashboardLocationItem[];
    total: number;
  };
  platform_usage: AdminPatientsDashboardPlatformUsage;
};

export type AdminPatientsDashboardIntentFilters = {
  breakdowns: Record<
    AdminPatientsDashboardIntentFilterId,
    AdminPatientsDashboardIntentFilteredMetrics
  >;
  default_filter: "all";
  options: AdminPatientsDashboardIntentFilterOption[];
  source: "profile_view_event+psychologist_favorite+contact_request";
};

export type AdminPatientsDashboardAnonymousConversionBucketId =
  | "days_1_3"
  | "days_4_7"
  | "days_8_30"
  | "no_history"
  | "over_30"
  | "same_day";

export type AdminPatientsDashboardAnonymousConversionBucket = {
  count: number;
  id: AdminPatientsDashboardAnonymousConversionBucketId;
  label: string;
  percentage: number;
};

export type AdminPatientsDashboardAnonymousConversionFirstTouch = {
  average_days: number | null;
  id: string;
  label: string;
  patients_count: number;
  percentage: number;
  sample_sufficient: boolean;
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardAnonymousConversion = {
  anonymous_sessions_count: number;
  average_days: number | null;
  buckets: AdminPatientsDashboardAnonymousConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  coverage_note: string;
  first_touch_pages: AdminPatientsDashboardAnonymousConversionFirstTouch[];
  history_coverage_rate: number | null;
  median_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  patients_with_anonymous_history_count: number;
  patients_without_anonymous_history_count: number;
  registered_patients_count: number;
  source: "user.createdAt+user_background+page_view_event+visitor_session";
  unavailable_reason: string | null;
};

export type AdminPatientsDashboardSummary = {
  anonymous_conversion: AdminPatientsDashboardAnonymousConversion;
  cards: {
    active_patients: AdminPatientsDashboardMetric;
    inactive_patients: AdminPatientsDashboardMetric;
    new_signups: AdminPatientsDashboardMetric;
    total_patients: AdminPatientsDashboardMetric;
  };
  coverage_notes: string[];
  demographics: {
    gender: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  device_usage: AdminPatientsDashboardDeviceUsage;
  engagement_analysis: AdminPatientsDashboardEngagementAnalysis;
  export: {
    available: false;
    reason: string;
  };
  intent_filters: AdminPatientsDashboardIntentFilters;
  intent_engagement: AdminPatientsDashboardIntentEngagement;
  intent_analysis: AdminPatientsDashboardIntentAnalysis;
  locations: {
    cities: AdminPatientsDashboardLocationItem[];
    countries: AdminPatientsDashboardLocationItem[];
    source: "visitor_location";
    states: AdminPatientsDashboardLocationItem[];
    total: number;
  };
  operating_system_usage: AdminPatientsDashboardOperatingSystemUsage;
  period: AdminPatientsDashboardPeriod;
  platform_usage: AdminPatientsDashboardPlatformUsage;
  recent_patients: {
    items: AdminPatientsDashboardRecentPatient[];
    source: "user+patient_profile+visitor_location+community_activity";
    total: number;
  };
  series: {
    points: AdminPatientsDashboardDailyPoint[];
    source: "user.createdAt+user.active";
  };
  unavailable: AdminPatientsDashboardUnavailableMetric[];
};

export type IAdminPatientsDashboardDTO = Request & {
  q: AdminPatientsDashboardQuery;
};
