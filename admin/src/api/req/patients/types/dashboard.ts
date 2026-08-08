export type PatientsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type PatientsDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: PatientsDashboardTrend;
  unit: "count";
  unavailable: boolean;
  value: number;
};

export type PatientsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type PatientsDashboardDailyPoint = {
  active_patients: number;
  date: string;
  inactive_patients: number;
  new_signups: number;
  total_patients: number;
};

export type PatientsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type PatientsDashboardRecentActivity = {
  description: string;
  detail_url: string | null;
  label: string;
  occurred_at: string;
  source: string;
  type: string;
};

export type PatientsDashboardRecentPatient = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  detail_url: string;
  email: string;
  gender: string | null;
  id: string;
  last_location_at: string | null;
  name: string;
  provider: string;
  provider_label: string;
  recent_activity: PatientsDashboardRecentActivity | null;
  state: string | null;
  status: "active" | "inactive";
  status_label: "Ativo" | "Inativo";
};

export type PatientsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type PatientsDashboardPlatformUsage = {
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

export type PatientsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type PatientsDashboardDeviceUsageItem = {
  active_patients_count: number;
  count: number;
  device_type: PatientsDashboardDeviceType;
  id: PatientsDashboardDeviceType;
  label: string;
  operating_systems: PatientsDashboardOperatingSystemUsageItem[];
  percentage: number;
};

export type PatientsDashboardDeviceUsage = {
  items: PatientsDashboardDeviceUsageItem[];
  source: "visitor_session.device_type+visitor_session.os+user.role=paciente";
  total_active_patients: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type PatientsDashboardOperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "other"
  | "unknown"
  | "windows";

export type PatientsDashboardOperatingSystemUsageItem = {
  active_patients_count: number;
  count: number;
  id: PatientsDashboardOperatingSystem;
  label: string;
  operating_system: PatientsDashboardOperatingSystem;
  percentage: number;
};

export type PatientsDashboardOperatingSystemUsage = {
  items: PatientsDashboardOperatingSystemUsageItem[];
  source: "visitor_session.os+visitor_session.device_type+user.role=paciente";
  total_active_patients: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type PatientsDashboardIntentSegmentId = "cold" | "curious" | "objective" | "very_qualified";

export type PatientsDashboardIntentSegment = {
  count: number;
  description: string;
  id: PatientsDashboardIntentSegmentId;
  label: "Curiosos" | "Frios" | "Interessados" | "Qualificados";
  percentage: number;
};

export type PatientsDashboardIntentAnalysis = {
  coverage_note: string;
  items: PatientsDashboardIntentSegment[];
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

export type PatientsDashboardEngagementSegmentId =
  | "engaged"
  | "low_engagement"
  | "no_engagement"
  | "very_engaged";

export type PatientsDashboardEngagementSegment = {
  count: number;
  id: PatientsDashboardEngagementSegmentId;
  label: "Engajados" | "Muito engajados" | "Pouco engajados" | "Sem engajamento";
  percentage: number;
};

export type PatientsDashboardEngagementAnalysis = {
  coverage_note: string;
  items: PatientsDashboardEngagementSegment[];
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

export type PatientsDashboardIntentEngagementCellId =
  `${PatientsDashboardIntentSegmentId}_${PatientsDashboardEngagementSegmentId}`;

export type PatientsDashboardIntentEngagementCell = {
  column_percentage: number;
  count: number;
  engagement_id: PatientsDashboardEngagementSegmentId;
  engagement_label: PatientsDashboardEngagementSegment["label"];
  id: PatientsDashboardIntentEngagementCellId;
  intent_id: PatientsDashboardIntentSegmentId;
  intent_label: PatientsDashboardIntentSegment["label"];
  percentage: number;
  row_percentage: number;
};

export type PatientsDashboardIntentEngagementRate = {
  high_intent_count: number;
  high_intent_rate: number | null;
  patients: number;
};

export type PatientsDashboardIntentEngagement = {
  cells: PatientsDashboardIntentEngagementCell[];
  comparison: {
    high_engagement: PatientsDashboardIntentEngagementRate;
    low_engagement: PatientsDashboardIntentEngagementRate;
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

export type PatientsDashboardIntentFilterId = "all" | PatientsDashboardIntentSegmentId;

export type PatientsDashboardIntentFilterOption = {
  count: number;
  id: PatientsDashboardIntentFilterId;
  label: "Curiosos" | "Frios" | "Interessados" | "Qualificados" | "Todos";
};

export type PatientsDashboardIntentFilteredMetrics = {
  demographics: {
    gender: {
      items: PatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: PatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  device_usage: PatientsDashboardDeviceUsage;
  locations: {
    cities: PatientsDashboardBreakdownItem[];
    countries: PatientsDashboardBreakdownItem[];
    source: "visitor_location";
    states: PatientsDashboardBreakdownItem[];
    total: number;
  };
  platform_usage: PatientsDashboardPlatformUsage;
};

export type PatientsDashboardIntentFilters = {
  breakdowns: Record<PatientsDashboardIntentFilterId, PatientsDashboardIntentFilteredMetrics>;
  default_filter: "all";
  options: PatientsDashboardIntentFilterOption[];
  source: "profile_view_event+psychologist_favorite+contact_request";
};

export type PatientsDashboardAnonymousConversionBucketId =
  | "days_1_3"
  | "days_4_7"
  | "days_8_30"
  | "no_history"
  | "over_30"
  | "same_day";

export type PatientsDashboardAnonymousConversionBucket = {
  count: number;
  id: PatientsDashboardAnonymousConversionBucketId;
  label: string;
  percentage: number;
};

export type PatientsDashboardAnonymousConversionFirstTouch = {
  average_days: number | null;
  id: string;
  label: string;
  patients_count: number;
  percentage: number;
  sample_sufficient: boolean;
  unavailable_reason: string | null;
};

export type PatientsDashboardAnonymousConversion = {
  anonymous_sessions_count: number;
  average_days: number | null;
  buckets: PatientsDashboardAnonymousConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  coverage_note: string;
  first_touch_pages: PatientsDashboardAnonymousConversionFirstTouch[];
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

export type AdminPatientsDashboard = {
  anonymous_conversion: PatientsDashboardAnonymousConversion;
  cards: {
    active_patients: PatientsDashboardMetric;
    inactive_patients: PatientsDashboardMetric;
    new_signups: PatientsDashboardMetric;
    total_patients: PatientsDashboardMetric;
  };
  coverage_notes: string[];
  demographics: {
    gender: {
      items: PatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: PatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  device_usage: PatientsDashboardDeviceUsage;
  engagement_analysis: PatientsDashboardEngagementAnalysis;
  export: {
    available: false;
    reason: string;
  };
  intent_filters: PatientsDashboardIntentFilters;
  intent_engagement: PatientsDashboardIntentEngagement;
  intent_analysis: PatientsDashboardIntentAnalysis;
  locations: {
    cities: PatientsDashboardBreakdownItem[];
    countries: PatientsDashboardBreakdownItem[];
    source: "visitor_location";
    states: PatientsDashboardBreakdownItem[];
    total: number;
  };
  operating_system_usage: PatientsDashboardOperatingSystemUsage;
  period: PatientsDashboardPeriod;
  platform_usage: PatientsDashboardPlatformUsage;
  recent_patients: {
    items: PatientsDashboardRecentPatient[];
    source: "user+patient_profile+visitor_location+community_activity";
    total: number;
  };
  series: {
    points: PatientsDashboardDailyPoint[];
    source: "user.createdAt+user.active";
  };
  unavailable: PatientsDashboardUnavailableMetric[];
};
