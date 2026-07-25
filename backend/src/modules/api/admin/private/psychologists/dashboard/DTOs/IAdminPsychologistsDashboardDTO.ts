import type { Request } from "express";

export type AdminPsychologistsDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPsychologistsDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminPsychologistsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminPsychologistsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPsychologistsDashboardMetric = {
  change_percent: number | null;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous_value: number;
  previous_value_count?: number;
  source: string;
  trend: AdminPsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
  value_count?: number;
};

export type AdminPsychologistsDashboardDailyPoint = {
  churn: number;
  courtesy_psychologists: number;
  date: string;
  free_psychologists: number;
  new_signups: number;
  subscriber_psychologists: number;
  total_psychologists: number;
};

export type AdminPsychologistsDashboardPsychologist = {
  avatar: string | null;
  city: string | null;
  created_at: Date;
  crp: string | null;
  email: string;
  id: string;
  name: string;
  plan_name: string | null;
  plan_slug: string | null;
  published: boolean;
  state: string | null;
  status: "gratuito" | "nao_publicado" | "pendente" | "verificado";
  verified: boolean;
};

export type AdminPsychologistsDashboardRankingItem = {
  avatar: string | null;
  base_score: number;
  crp: string | null;
  id: string;
  name: string;
  position: number;
  public_profile_url: string;
  score: number;
  verified: boolean;
};

export type AdminPsychologistsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardDirectoryFilterItem = {
  category_id?: string | null;
  category_label?: string | null;
  id: string;
  label: string;
  position?: number | null;
  slug: string;
};

export type AdminPsychologistsDashboardDirectoryFilters = {
  approaches: AdminPsychologistsDashboardDirectoryFilterItem[];
  features: AdminPsychologistsDashboardDirectoryFilterItem[];
  genders: AdminPsychologistsDashboardDirectoryFilterItem[];
  languages: AdminPsychologistsDashboardDirectoryFilterItem[];
  modalities: AdminPsychologistsDashboardDirectoryFilterItem[];
  race_colors: AdminPsychologistsDashboardDirectoryFilterItem[];
  religions: AdminPsychologistsDashboardDirectoryFilterItem[];
  services: AdminPsychologistsDashboardDirectoryFilterItem[];
  specialties: AdminPsychologistsDashboardDirectoryFilterItem[];
  states: AdminPsychologistsDashboardDirectoryFilterItem[];
  target_audiences: AdminPsychologistsDashboardDirectoryFilterItem[];
};

export type AdminPsychologistsDashboardBooleanBreakdown = {
  false_count: number;
  false_label: string;
  source: string;
  true_count: number;
  true_label: string;
  true_percentage: number;
};

export type AdminPsychologistsDashboardStatistics = {
  accepts_insurance: AdminPsychologistsDashboardBooleanBreakdown;
  approaches: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_approach";
    total: number;
  };
  discount_first_session: AdminPsychologistsDashboardBooleanBreakdown;
  experience_over_10_years: AdminPsychologistsDashboardBooleanBreakdown;
  gender: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.gender";
    total: number;
  };
  cities: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_city+professional_address_state";
    total: number;
  };
  features: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile+professional_subscription";
    total: number;
  };
  languages: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.languages";
    total: number;
  };
  modalities: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.modality";
    total: number;
  };
  services: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_service";
    total: number;
  };
  specialties: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_specialty";
    total: number;
  };
  race_colors: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.race_color";
    total: number;
  };
  religions: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.religion";
    total: number;
  };
  social_value: AdminPsychologistsDashboardBooleanBreakdown;
  states: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_state";
    total: number;
  };
  target_audience: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.target_audience";
    total: number;
  };
};

export type AdminPsychologistsDashboardFilterSearchDimension = {
  items: AdminPsychologistsDashboardBreakdownItem[];
  source: "important_action_event.action_type=psychologist_directory_filter_search";
  total: number;
};

export type AdminPsychologistsDashboardFilterSearches = {
  available: true;
  description: string;
  dimensions: {
    approaches: AdminPsychologistsDashboardFilterSearchDimension;
    cities: AdminPsychologistsDashboardFilterSearchDimension;
    features: AdminPsychologistsDashboardFilterSearchDimension;
    genders: AdminPsychologistsDashboardFilterSearchDimension;
    languages: AdminPsychologistsDashboardFilterSearchDimension;
    modalities: AdminPsychologistsDashboardFilterSearchDimension;
    race_colors: AdminPsychologistsDashboardFilterSearchDimension;
    religions: AdminPsychologistsDashboardFilterSearchDimension;
    services: AdminPsychologistsDashboardFilterSearchDimension;
    specialties: AdminPsychologistsDashboardFilterSearchDimension;
    states: AdminPsychologistsDashboardFilterSearchDimension;
    target_audiences: AdminPsychologistsDashboardFilterSearchDimension;
  };
  minimum_city_searches: number;
  source: "important_action_event.action_type=psychologist_directory_filter_search";
};

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
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type AdminPsychologistsDashboardDeviceUsageItem = {
  active_psychologists_count: number;
  count: number;
  device_type: AdminPsychologistsDashboardDeviceType;
  id: AdminPsychologistsDashboardDeviceType;
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardDeviceUsage = {
  items: AdminPsychologistsDashboardDeviceUsageItem[];
  source: "visitor_session.device_type+user.role=psicologo";
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
  description: string;
  id: "communities" | "direct_link" | "explore" | "favorites" | "search_filters";
  label: string;
  percentage: number;
  profile_views: number;
  sessions: number;
  whatsapp_clicks: number | null;
};

export type AdminPsychologistsDashboardTrafficSources = {
  attribution_unavailable_reason: string | null;
  description: string;
  source: "page_view_event.traffic_source+target_type=psychologist";
  sources: AdminPsychologistsDashboardTrafficSourceItem[];
  total_profile_views: number;
  total_sessions: number;
  unavailable_reason: string | null;
  updated_at: Date | null;
};

export type AdminPsychologistsDashboardSummary = {
  cards: {
    churn: AdminPsychologistsDashboardMetric;
    courtesy_psychologists: AdminPsychologistsDashboardMetric;
    free_psychologists: AdminPsychologistsDashboardMetric;
    new_signups: AdminPsychologistsDashboardMetric;
    subscriber_psychologists: AdminPsychologistsDashboardMetric;
    total_psychologists: AdminPsychologistsDashboardMetric;
  };
  conversion: AdminPsychologistsDashboardConversion;
  conversion_by_signup_method: AdminPsychologistsDashboardConversionBySignupMethodItem[];
  device_usage: AdminPsychologistsDashboardDeviceUsage;
  filters_searches: AdminPsychologistsDashboardFilterSearches;
  directory_filters: AdminPsychologistsDashboardDirectoryFilters;
  operating_system_usage: AdminPsychologistsDashboardOperatingSystemUsage;
  period: AdminPsychologistsDashboardPeriod;
  platform_usage: AdminPsychologistsDashboardPlatformUsage;
  psychologists: {
    items: AdminPsychologistsDashboardPsychologist[];
    source: "user+psychologist_profile+professional_subscription";
    total: number;
  };
  ranking: {
    formula: "public_directory_psychologist_ranking";
    items: AdminPsychologistsDashboardRankingItem[];
    source: "shared_psychologist_public_ranking_helper";
    total: number;
  };
  signup_method: AdminPsychologistsDashboardSignupMethod;
  statistics: AdminPsychologistsDashboardStatistics;
  timeline: {
    points: AdminPsychologistsDashboardDailyPoint[];
    source: "user+professional_subscription";
  };
  traffic_sources: AdminPsychologistsDashboardTrafficSources;
  unavailable: AdminPsychologistsDashboardUnavailableMetric[];
};

export type IAdminPsychologistsDashboardDTO = Request & {
  q: AdminPsychologistsDashboardQuery;
};
