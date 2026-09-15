import type {
  AdminPsychologistWhatsappTrafficClickActorBreakdown,
  AdminPsychologistWhatsappTrafficPlatformMetric,
} from "@/utils/admin-psychologist-analytics";

export type AdminPsychologistsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPsychologistsDashboardConversionBucket = {
  count: number;
  id: "days_1_3" | "days_4_7" | "days_8_30" | "not_converted" | "over_30" | "same_day";
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardConversion = {
  average_days: number | null;
  buckets: AdminPsychologistsDashboardConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  conversion_rate: number | null;
  converted_paid_count: number;
  median_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  registered_count: number;
  source: "user.createdAt+professional_subscription+subscription_plan";
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardPreSignupConversionBucket = {
  count: number;
  id: "days_1_3" | "days_4_7" | "days_8_30" | "no_history" | "over_30" | "same_day";
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardPreSignupFirstTouchPage = {
  average_days: number | null;
  id: string;
  label: string;
  percentage: number;
  psychologists_count: number;
  sample_sufficient: boolean;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardPreSignupConversion = {
  anonymous_sessions_count: number;
  average_days: number | null;
  buckets: AdminPsychologistsDashboardPreSignupConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  coverage_note: string;
  first_touch_pages: AdminPsychologistsDashboardPreSignupFirstTouchPage[];
  history_coverage_rate: number | null;
  median_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  psychologists_with_anonymous_history_count: number;
  psychologists_without_anonymous_history_count: number;
  registered_psychologists_count: number;
  source: "user.createdAt+user_background+page_view_event+visitor_session";
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardSignupMethodItem = {
  count: number;
  id: "email_password" | "google";
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardSignupMethod = {
  items: AdminPsychologistsDashboardSignupMethodItem[];
  source: "user.provider";
  total: number;
  unknown_count: number;
};

export type AdminPsychologistsDashboardConversionBySignupMethodItem = {
  average_days: number | null;
  conversion_rate: number | null;
  converted_paid_count: number;
  id: "email_password" | "google";
  label: string;
  median_days: number | null;
  registered_count: number;
  sample_sufficient: boolean;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardPlatformUsageTopPage = {
  count: number;
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardPlatformUsageDurationPage = {
  average_duration_seconds: number;
  count: number;
  duration_samples_count: number;
  label: string;
};

export type AdminPsychologistsDashboardPlatformUsageSeriesPoint = {
  active_psychologists: number;
  date: string;
  pageviews: number;
  sessions: number;
};

export type AdminPsychologistsDashboardPlatformUsage = {
  active_psychologists_count: number;
  active_psychologists_rate: number | null;
  average_access_days: number | null;
  average_duration_seconds: number | null;
  average_sessions: number | null;
  duration_unavailable_reason: string | null;
  eligible_psychologists_count: number;
  pwa_installed_psychologists_count: number;
  pwa_installed_psychologists_rate: number | null;
  source: "page_view_event+important_action_event";
  series: AdminPsychologistsDashboardPlatformUsageSeriesPoint[];
  top_pages: AdminPsychologistsDashboardPlatformUsageTopPage[];
  top_pages_by_average_duration: AdminPsychologistsDashboardPlatformUsageDurationPage[];
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type AdminPsychologistsDashboardDeviceUsageItem = {
  active_psychologists_count: number;
  count: number;
  device_type: AdminPsychologistsDashboardDeviceType;
  id: AdminPsychologistsDashboardDeviceType;
  label: string;
  operating_systems: AdminPsychologistsDashboardOperatingSystemUsageItem[];
  percentage: number;
};

export type AdminPsychologistsDashboardDeviceUsage = {
  items: AdminPsychologistsDashboardDeviceUsageItem[];
  source: "visitor_session.device_type+visitor_session.os+user.role=psicologo";
  total_active_psychologists: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardOperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "other"
  | "unknown"
  | "windows";

export type AdminPsychologistsDashboardOperatingSystemUsageItem = {
  active_psychologists_count: number;
  count: number;
  id: AdminPsychologistsDashboardOperatingSystem;
  label: string;
  operating_system: AdminPsychologistsDashboardOperatingSystem;
  percentage: number;
};

export type AdminPsychologistsDashboardOperatingSystemUsage = {
  items: AdminPsychologistsDashboardOperatingSystemUsageItem[];
  source: "visitor_session.os+visitor_session.device_type+user.role=psicologo";
  total_active_psychologists: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardTrafficSourceItem = {
  badge: "primary_source" | null;
  considered_count: number | null;
  description: string;
  id:
    | "community_post_text"
    | "community_post_video"
    | "community_reply_text"
    | "community_reply_video"
    | "community_top_mentors"
    | "explore"
    | "favorites"
    | "profile"
    | "search_filters";
  label: string;
  percentage: number;
  platform_metrics: AdminPsychologistWhatsappTrafficPlatformMetric[] | null;
  profile_views: number;
  sessions: number;
  whatsapp_click_actor_breakdown: AdminPsychologistWhatsappTrafficClickActorBreakdown | null;
  whatsapp_clicks: number;
};

export type AdminPsychologistsDashboardTrafficSources = {
  attribution_unavailable_reason: string | null;
  description: string;
  source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click";
  sources: AdminPsychologistsDashboardTrafficSourceItem[];
  total_profile_views: number;
  total_sessions: number;
  unavailable_reason: string | null;
  updated_at: Date | null;
};
