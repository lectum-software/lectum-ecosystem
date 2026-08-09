import type { AdminPublicSource } from "@/api/public-response";
import type { PsychologistsListProfileConversionCategoryId } from "./list";

export type PsychologistsDashboardQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type PsychologistsListSort =
  | "favorites"
  | "name"
  | "rating"
  | "recent"
  | "relevance"
  | "whatsapp";

export type PsychologistsListStatus = "free" | "pending" | "unpublished" | "verified";

export type PsychologistsListEngagementId = "ativo" | "muito_ativo" | "pouco_ativo" | "sem_base";

export type PsychologistsListProfileConversionEngagementCategoryId = Exclude<
  PsychologistsListProfileConversionCategoryId,
  "insufficient_data"
>;

export type PsychologistsListProfileConversionEngagementLevelId =
  | "engaged"
  | "low_engaged"
  | "no_engagement"
  | "very_engaged";

export type PsychologistsListProfileConversionEngagementQuadrantId =
  `${PsychologistsListProfileConversionEngagementCategoryId}_${PsychologistsListProfileConversionEngagementLevelId}`;

export type PsychologistsListExperience = "0_4" | "5_9" | "10_plus" | "unknown";

export type PsychologistsListQuery = {
  accepts_insurance?: boolean;
  approach?: string;
  available_today?: boolean;
  city?: string;
  discount_first_session?: boolean;
  engagement?: PsychologistsListEngagementId;
  experience?: PsychologistsListExperience;
  gender?: string;
  language?: string;
  limit?: number;
  modality?: string;
  more_experienced?: boolean;
  page?: number;
  plan?: string;
  profile_status?: string;
  q?: string;
  race_color?: string;
  registry_status?: string;
  religion?: string;
  service?: string;
  social_value?: boolean;
  sort?: PsychologistsListSort;
  specialty?: string;
  state?: string;
  status?: PsychologistsListStatus;
  target_audience?: string;
  profile_conversion?: PsychologistsListProfileConversionCategoryId;
  profile_conversion_engagement?: PsychologistsListProfileConversionEngagementQuadrantId;
  verified?: boolean;
};

export type PsychologistsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type PsychologistsDashboardMetric = {
  change_percent: number | null;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous_value: number;
  previous_value_count?: number;
  source: string;
  trend: PsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
  value_count?: number;
};

export type PsychologistsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type PsychologistsDashboardDailyPoint = {
  churn: number;
  courtesy_psychologists: number;
  date: string;
  free_psychologists: number;
  new_signups: number;
  subscriber_psychologists: number;
  total_psychologists: number;
};

export type PsychologistsDashboardPsychologist = {
  avatar: string | null;
  city: string | null;
  created_at: string;
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

export type PsychologistsDashboardRankingItem = {
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

export type PsychologistsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type PsychologistsDashboardDirectoryFilterItem = {
  category_id?: string | null;
  category_label?: string | null;
  id: string;
  label: string;
  position?: number | null;
  slug: string;
};

export type PsychologistsDashboardDirectoryFilters = {
  approaches: PsychologistsDashboardDirectoryFilterItem[];
  features: PsychologistsDashboardDirectoryFilterItem[];
  genders: PsychologistsDashboardDirectoryFilterItem[];
  languages: PsychologistsDashboardDirectoryFilterItem[];
  modalities: PsychologistsDashboardDirectoryFilterItem[];
  race_colors: PsychologistsDashboardDirectoryFilterItem[];
  religions: PsychologistsDashboardDirectoryFilterItem[];
  services: PsychologistsDashboardDirectoryFilterItem[];
  specialties: PsychologistsDashboardDirectoryFilterItem[];
  states: PsychologistsDashboardDirectoryFilterItem[];
  target_audiences: PsychologistsDashboardDirectoryFilterItem[];
};

export type PsychologistsDashboardBooleanBreakdown = {
  false_count: number;
  false_label: string;
  source: string;
  true_count: number;
  true_label: string;
  true_percentage: number;
};

export type PsychologistsDashboardStatistics = {
  accepts_insurance: PsychologistsDashboardBooleanBreakdown;
  approaches: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_approach">;
    total: number;
  };
  discount_first_session: PsychologistsDashboardBooleanBreakdown;
  experience_over_10_years: PsychologistsDashboardBooleanBreakdown;
  gender: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.gender">;
    total: number;
  };
  cities: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.professional_address_city+professional_address_state">;
    total: number;
  };
  features: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile+professional_subscription">;
    total: number;
  };
  languages: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.languages">;
    total: number;
  };
  modalities: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.modality">;
    total: number;
  };
  services: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_service">;
    total: number;
  };
  specialties: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_specialty">;
    total: number;
  };
  race_colors: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.race_color">;
    total: number;
  };
  religions: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.religion">;
    total: number;
  };
  social_value: PsychologistsDashboardBooleanBreakdown;
  states: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.professional_address_state">;
    total: number;
  };
  target_audience: {
    items: PsychologistsDashboardBreakdownItem[];
    source: AdminPublicSource<"psychologist_profile.target_audience">;
    total: number;
  };
};

export type PsychologistsDashboardFilterSearchDimension = {
  items: PsychologistsDashboardBreakdownItem[];
  source: AdminPublicSource<"important_action_event.action_type=psychologist_directory_filter_search">;
  total: number;
};

export type PsychologistsDashboardFilterSearches = {
  available: true;
  description: string;
  dimensions: {
    approaches: PsychologistsDashboardFilterSearchDimension;
    cities: PsychologistsDashboardFilterSearchDimension;
    features: PsychologistsDashboardFilterSearchDimension;
    genders: PsychologistsDashboardFilterSearchDimension;
    languages: PsychologistsDashboardFilterSearchDimension;
    modalities: PsychologistsDashboardFilterSearchDimension;
    race_colors: PsychologistsDashboardFilterSearchDimension;
    religions: PsychologistsDashboardFilterSearchDimension;
    services: PsychologistsDashboardFilterSearchDimension;
    specialties: PsychologistsDashboardFilterSearchDimension;
    states: PsychologistsDashboardFilterSearchDimension;
    target_audiences: PsychologistsDashboardFilterSearchDimension;
  };
  minimum_city_searches: number;
  source: AdminPublicSource<"important_action_event.action_type=psychologist_directory_filter_search">;
};

export type PsychologistsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type PsychologistsDashboardConversionBucket = {
  count: number;
  id: "days_1_3" | "days_4_7" | "days_8_30" | "not_converted" | "over_30" | "same_day";
  label: string;
  percentage: number;
};

export type PsychologistsDashboardConversion = {
  average_days: number | null;
  buckets: PsychologistsDashboardConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  conversion_rate: number | null;
  converted_paid_count: number;
  median_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  registered_count: number;
  source: AdminPublicSource<"user.createdAt+professional_subscription+subscription_plan">;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardPreSignupConversionBucket = {
  count: number;
  id: "days_1_3" | "days_4_7" | "days_8_30" | "no_history" | "over_30" | "same_day";
  label: string;
  percentage: number;
};

export type PsychologistsDashboardPreSignupFirstTouchPage = {
  average_days: number | null;
  id: string;
  label: string;
  percentage: number;
  psychologists_count: number;
  sample_sufficient: boolean;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardPreSignupConversion = {
  anonymous_sessions_count: number;
  average_days: number | null;
  buckets: PsychologistsDashboardPreSignupConversionBucket[];
  cohort_from: string;
  cohort_to: string;
  coverage_note: string;
  first_touch_pages: PsychologistsDashboardPreSignupFirstTouchPage[];
  history_coverage_rate: number | null;
  median_days: number | null;
  p75_days: number | null;
  p90_days: number | null;
  psychologists_with_anonymous_history_count: number;
  psychologists_without_anonymous_history_count: number;
  registered_psychologists_count: number;
  source: AdminPublicSource<"user.createdAt+user_background+page_view_event+visitor_session">;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardSignupMethodItem = {
  count: number;
  id: "email_password" | "google";
  label: string;
  percentage: number;
};

export type PsychologistsDashboardSignupMethod = {
  items: PsychologistsDashboardSignupMethodItem[];
  source: AdminPublicSource<"user.provider">;
  total: number;
  unknown_count: number;
};

export type PsychologistsDashboardConversionBySignupMethodItem = {
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

export type PsychologistsDashboardPlatformUsage = {
  active_psychologists_count: number;
  active_psychologists_rate: number | null;
  average_access_days: number | null;
  average_duration_seconds: number | null;
  average_sessions: number | null;
  duration_unavailable_reason: string | null;
  eligible_psychologists_count: number;
  pwa_installed_psychologists_count: number;
  pwa_installed_psychologists_rate: number | null;
  source: AdminPublicSource<"page_view_event+important_action_event">;
  series: {
    active_psychologists: number;
    date: string;
    pageviews: number;
    sessions: number;
  }[];
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

export type PsychologistsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type PsychologistsDashboardDeviceUsageItem = {
  active_psychologists_count: number;
  count: number;
  device_type: PsychologistsDashboardDeviceType;
  id: PsychologistsDashboardDeviceType;
  label: string;
  operating_systems: PsychologistsDashboardOperatingSystemUsageItem[];
  percentage: number;
};

export type PsychologistsDashboardDeviceUsage = {
  items: PsychologistsDashboardDeviceUsageItem[];
  source: AdminPublicSource<"visitor_session.device_type+visitor_session.os+user.role=psicologo">;
  total_active_psychologists: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardOperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "other"
  | "unknown"
  | "windows";

export type PsychologistsDashboardOperatingSystemUsageItem = {
  active_psychologists_count: number;
  count: number;
  id: PsychologistsDashboardOperatingSystem;
  label: string;
  operating_system: PsychologistsDashboardOperatingSystem;
  percentage: number;
};

export type PsychologistsDashboardOperatingSystemUsage = {
  items: PsychologistsDashboardOperatingSystemUsageItem[];
  source: AdminPublicSource<"visitor_session.os+visitor_session.device_type+user.role=psicologo">;
  total_active_psychologists: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardTrafficSourceItem = {
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
  platform_metrics:
    | {
        id:
          | "average_visibility"
          | "average_retention"
          | "comments"
          | "downvotes"
          | "favorites"
          | "profile_accesses"
          | "profile_openings"
          | "profile_stay_time"
          | "profile_publications_tab_opens"
          | "profile_reviews_tab_opens"
          | "presentation_video_views"
          | "presentation_video_retention"
          | "replay_rate"
          | "saves"
          | "shares"
          | "upvotes"
          | "views";
        label: string;
        source: string;
        unavailable_reason: string | null;
        unit: "count" | "percentage" | "seconds";
        value: number | null;
      }[]
    | null;
  profile_views: number;
  sessions: number;
  whatsapp_click_actor_breakdown: {
    author_clicks: number;
    author_percentage: number;
    other_users_clicks: number;
    other_users_percentage: number;
    source: AdminPublicSource<"important_action_event.user_id+community_post.author_id+post_reply.author_id">;
  } | null;
  whatsapp_clicks: number;
};

export type PsychologistsDashboardTrafficSources = {
  attribution_unavailable_reason: string | null;
  description: string;
  source: AdminPublicSource<"important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click">;
  sources: PsychologistsDashboardTrafficSourceItem[];
  total_profile_views: number;
  total_sessions: number;
  unavailable_reason: string | null;
  updated_at: string | null;
};
