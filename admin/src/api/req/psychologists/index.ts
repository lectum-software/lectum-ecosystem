import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

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
    source: "psychologist_approach";
    total: number;
  };
  discount_first_session: PsychologistsDashboardBooleanBreakdown;
  experience_over_10_years: PsychologistsDashboardBooleanBreakdown;
  gender: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.gender";
    total: number;
  };
  cities: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_city+professional_address_state";
    total: number;
  };
  features: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile+professional_subscription";
    total: number;
  };
  languages: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.languages";
    total: number;
  };
  modalities: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.modality";
    total: number;
  };
  services: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_service";
    total: number;
  };
  specialties: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_specialty";
    total: number;
  };
  race_colors: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.race_color";
    total: number;
  };
  religions: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.religion";
    total: number;
  };
  social_value: PsychologistsDashboardBooleanBreakdown;
  states: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_state";
    total: number;
  };
  target_audience: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.target_audience";
    total: number;
  };
};

export type PsychologistsDashboardFilterSearchDimension = {
  items: PsychologistsDashboardBreakdownItem[];
  source: "important_action_event.action_type=psychologist_directory_filter_search";
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
  source: "important_action_event.action_type=psychologist_directory_filter_search";
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
  source: "user.createdAt+professional_subscription+subscription_plan";
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
  source: "user.createdAt+user_background+page_view_event+visitor_session";
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
  source: "user.provider";
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
  source: "page_view_event+important_action_event";
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
  source: "visitor_session.device_type+visitor_session.os+user.role=psicologo";
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
  source: "visitor_session.os+visitor_session.device_type+user.role=psicologo";
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
  whatsapp_clicks: number;
};

export type PsychologistsDashboardTrafficSources = {
  attribution_unavailable_reason: string | null;
  description: string;
  source: "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click";
  sources: PsychologistsDashboardTrafficSourceItem[];
  total_profile_views: number;
  total_sessions: number;
  unavailable_reason: string | null;
  updated_at: string | null;
};

export type PsychologistsDashboardProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type PsychologistsDashboardProfileConversionCategory = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionCategoryId;
  label: string;
  percentage: number;
  totals: {
    whatsapp_clicks: number;
  };
};

export type PsychologistsProfileConversionSource =
  "contact_request.channel=whatsapp+user.createdAt+platform_percentiles";

export type PsychologistsProfileConversionThresholds = {
  adaptation_period_days: number;
};

export type PsychologistsProfileConversionBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_whatsapp_clicks_outside_adaptation_period";
  eligible_psychologists: number;
  non_zero_whatsapp_psychologists: number;
  p25_whatsapp_clicks: number | null;
  p50_whatsapp_clicks: number | null;
  p75_whatsapp_clicks: number | null;
  standard_max_whatsapp_clicks: number | null;
  standard_min_whatsapp_clicks: number | null;
};

export type PsychologistsDashboardProfileConversionResults = {
  benchmark: PsychologistsProfileConversionBenchmark;
  categories: PsychologistsDashboardProfileConversionCategory[];
  description: string;
  source: PsychologistsProfileConversionSource;
  thresholds: PsychologistsProfileConversionThresholds;
  totals: {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    non_zero_whatsapp_psychologists: number;
    psychologists: number;
    whatsapp_clicks: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileActivityCategoryId =
  | "ativo"
  | "muito_ativo"
  | "pouco_ativo"
  | "sem_base";

export type PsychologistsDashboardProfileActivityTotals = {
  actions: number;
  posts: number;
  replies: number;
};

export type PsychologistsDashboardProfileActivityCategory = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileActivityCategoryId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileActivityTotals;
};

export type PsychologistsDashboardProfileActivityThresholds = {
  active_min_actions: number;
  low_activity_min_actions: number;
  very_active_min_actions: number;
};

export type PsychologistsDashboardProfileActivityResults = {
  categories: PsychologistsDashboardProfileActivityCategory[];
  description: string;
  source: "community_post.author_id+post_reply.author_id";
  thresholds: PsychologistsDashboardProfileActivityThresholds;
  totals: PsychologistsDashboardProfileActivityTotals & {
    psychologists: number;
    psychologists_with_actions: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileExposureCommunityCategoryId =
  | "high_community"
  | "low_community"
  | "no_community"
  | "standard_community";

export type PsychologistsDashboardProfileExposureVideoCategoryId =
  | "high_video"
  | "low_video"
  | "no_video"
  | "standard_video";

export type PsychologistsDashboardProfileExposureCategoryId =
  | `${PsychologistsDashboardProfileExposureCommunityCategoryId}_${PsychologistsDashboardProfileExposureVideoCategoryId}`
  | "insufficient_data";

export type PsychologistsProfileExposureAggregateCategoryId =
  | "high_exposure"
  | "insufficient_data"
  | "low_exposure"
  | "no_exposure"
  | "standard_exposure";

export type PsychologistsDashboardProfileExposureTotals = {
  community_post_attention_seconds: number;
  community_post_views: number;
  community_reply_attention_seconds: number;
  community_reply_views: number;
  exposure_score: number;
  profile_attention_seconds: number;
  profile_surface_attention_seconds: number;
  profile_video_attention_seconds: number;
  profile_views: number;
  qualified_video_views: number;
  search_result_impressions: number;
  visibility_seconds: number;
};

export type PsychologistsDashboardProfileExposureCategory = {
  community_id: PsychologistsDashboardProfileExposureCommunityCategoryId | null;
  community_label: string | null;
  count: number;
  description: string;
  id: PsychologistsDashboardProfileExposureCategoryId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileExposureTotals;
  video_id: PsychologistsDashboardProfileExposureVideoCategoryId | null;
  video_label: string | null;
};

export type PsychologistsProfileExposureSource =
  "content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds";

export type PsychologistsProfileExposureThresholds = {
  adaptation_period_days: number;
  attention_unit_seconds: number;
  content_attention_min_visible_pixels: number;
  content_attention_min_visible_ratio: number;
  max_attention_seconds_per_session: number;
};

export type PsychologistsProfileExposureSurfaceBenchmark = {
  basis:
    | "non_zero_community_attention_seconds_outside_adaptation_period"
    | "non_zero_presentation_video_attention_seconds_outside_adaptation_period";
  eligible_psychologists: number;
  p25_visibility_seconds: number | null;
  p50_visibility_seconds: number | null;
  p75_visibility_seconds: number | null;
  standard_max_visibility_seconds: number | null;
  standard_min_visibility_seconds: number | null;
  visible_psychologists: number;
};

export type PsychologistsProfileExposureBenchmark = {
  adaptation_period_days: number;
  basis: "non_zero_attention_seconds_outside_adaptation_period";
  community_visibility: PsychologistsProfileExposureSurfaceBenchmark & {
    basis: "non_zero_community_attention_seconds_outside_adaptation_period";
  };
  eligible_psychologists: number;
  exposed_psychologists: number;
  p25_exposure_score: number | null;
  p25_visibility_seconds: number | null;
  p50_exposure_score: number | null;
  p50_visibility_seconds: number | null;
  p75_exposure_score: number | null;
  p75_visibility_seconds: number | null;
  presentation_video: PsychologistsProfileExposureSurfaceBenchmark & {
    basis: "non_zero_presentation_video_attention_seconds_outside_adaptation_period";
  };
  standard_max_exposure_score: number | null;
  standard_max_visibility_seconds: number | null;
  standard_min_exposure_score: number | null;
  standard_min_visibility_seconds: number | null;
};

export type PsychologistsDashboardProfileExposureResults = {
  benchmark: PsychologistsProfileExposureBenchmark;
  categories: PsychologistsDashboardProfileExposureCategory[];
  description: string;
  source: PsychologistsProfileExposureSource;
  thresholds: PsychologistsProfileExposureThresholds;
  totals: PsychologistsDashboardProfileExposureTotals & {
    adaptation_psychologists: number;
    community_visible_psychologists: number;
    eligible_psychologists: number;
    exposed_psychologists: number;
    psychologists: number;
    video_visible_psychologists: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileEngagementFavoritesCommunityCategoryId =
  | "high_engagement"
  | "low_engagement"
  | "no_engagement"
  | "standard_engagement";

export type PsychologistsDashboardProfileEngagementFavoritesFavoriteCategoryId =
  | "high_favorites"
  | "low_favorites"
  | "no_favorites"
  | "standard_favorites";

export type PsychologistsDashboardProfileEngagementFavoritesCategoryId =
  | `${PsychologistsDashboardProfileEngagementFavoritesCommunityCategoryId}_${PsychologistsDashboardProfileEngagementFavoritesFavoriteCategoryId}`
  | "insufficient_data";

export type PsychologistsDashboardProfileEngagementFavoritesTotals = {
  comments_received: number;
  community_engagement_score: number;
  content_saves: number;
  content_shares: number;
  favorites: number;
  positive_votes: number;
  received_community_interactions: number;
  whatsapp_clicks: number;
};

export type PsychologistsDashboardProfileEngagementFavoritesCategory = {
  count: number;
  description: string;
  engagement_id: PsychologistsDashboardProfileEngagementFavoritesCommunityCategoryId | null;
  engagement_label: string | null;
  favorites_id: PsychologistsDashboardProfileEngagementFavoritesFavoriteCategoryId | null;
  favorites_label: string | null;
  id: PsychologistsDashboardProfileEngagementFavoritesCategoryId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type PsychologistsProfileEngagementFavoritesSource =
  "psychologist_favorite.user.role=paciente+post_reply.received.user.role=paciente+post_vote.value=1.received.user.role=paciente+post_save.received.user.role=paciente+post_reply_save.received.user.role=paciente+post_share.received.user.role=paciente";

export type PsychologistsProfileEngagementFavoritesBenchmark = {
  adaptation_period_days: number;
  community_engagement: {
    basis: "non_zero_patient_community_engagement_score_outside_adaptation_period";
    eligible_psychologists: number;
    engaged_psychologists: number;
    p25_engagement_score: number | null;
    p50_engagement_score: number | null;
    p75_engagement_score: number | null;
    standard_max_engagement_score: number | null;
    standard_min_engagement_score: number | null;
  };
  favorites: {
    basis: "non_zero_patient_favorites_outside_adaptation_period";
    eligible_psychologists: number;
    favorited_psychologists: number;
    p25_favorites: number | null;
    p50_favorites: number | null;
    p75_favorites: number | null;
    standard_max_favorites: number | null;
    standard_min_favorites: number | null;
  };
};

export type PsychologistsProfileEngagementFavoritesThresholds = {
  adaptation_period_days: number;
  score: {
    weights: {
      comments_received: number;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
    };
  };
};

export type PsychologistsDashboardProfileEngagementFavoritesResults = {
  benchmark: PsychologistsProfileEngagementFavoritesBenchmark;
  categories: PsychologistsDashboardProfileEngagementFavoritesCategory[];
  description: string;
  source: PsychologistsProfileEngagementFavoritesSource;
  thresholds: PsychologistsProfileEngagementFavoritesThresholds;
  totals: PsychologistsDashboardProfileEngagementFavoritesTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    engaged_psychologists: number;
    favorited_psychologists: number;
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileConversionEngagementCategoryId = Exclude<
  PsychologistsDashboardProfileConversionCategoryId,
  "insufficient_data"
>;

export type PsychologistsDashboardProfileConversionEngagementLevelId =
  | "engaged"
  | "low_engaged"
  | "no_engagement"
  | "very_engaged";

export type PsychologistsDashboardProfileConversionEngagementQuadrantId =
  `${PsychologistsDashboardProfileConversionEngagementCategoryId}_${PsychologistsDashboardProfileConversionEngagementLevelId}`;

export type PsychologistsDashboardProfileConversionEngagementQuadrant = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionEngagementQuadrantId;
  label: string;
  percentage: number;
  totals: {
    comments_received: number;
    content_saves: number;
    content_shares: number;
    positive_votes: number;
    profile_favorites: number;
    profile_follows: number;
    received_interactions: number;
    whatsapp_clicks: number;
  };
};

export type PsychologistsDashboardProfileConversionEngagementRate = {
  psychologists: number;
  strong_conversion_count: number;
  strong_conversion_rate: number | null;
};

export type PsychologistsDashboardProfileConversionEngagementResults = {
  comparison: {
    engaged: PsychologistsDashboardProfileConversionEngagementRate;
    high_engagement: PsychologistsDashboardProfileConversionEngagementRate;
    low_engaged: PsychologistsDashboardProfileConversionEngagementRate;
    low_engagement: PsychologistsDashboardProfileConversionEngagementRate;
    engaged_vs_low_rate_difference_points: number | null;
    engaged_vs_no_rate_difference_points: number | null;
    no_engagement: PsychologistsDashboardProfileConversionEngagementRate;
    rate_difference_points: number | null;
    very_engaged: PsychologistsDashboardProfileConversionEngagementRate;
    very_vs_low_rate_difference_points: number | null;
    very_vs_no_rate_difference_points: number | null;
  };
  description: string;
  quadrants: PsychologistsDashboardProfileConversionEngagementQuadrant[];
  source: "contact_request.channel=whatsapp+user.createdAt+platform_percentiles+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share";
  thresholds: {
    engaged_score_30d: number;
    engaged_interactions_30d: number;
    high_engagement_interactions_30d: number;
    highly_engaged_score_30d: number;
    highly_engaged_interactions_30d: number;
    minimum_active_days: number;
    minimum_signal_score_30d: number;
    minimum_signal_interactions_30d: number;
    score_caps_30d: {
      comments_received: null;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: null;
      profile_follows: null;
    };
    profile_conversion_adaptation_period_days: number;
    weights: {
      comments_received: number;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: number;
      profile_follows: number;
    };
  };
  totals: {
    comments_received: number;
    content_saves: number;
    content_shares: number;
    engaged_psychologists: number;
    high_engagement_psychologists: number;
    insufficient_data_psychologists: number;
    low_engaged_psychologists: number;
    low_engagement_psychologists: number;
    no_engagement_psychologists: number;
    positive_votes: number;
    profile_favorites: number;
    profile_follows: number;
    psychologists: number;
    received_interactions: number;
    strong_conversion_psychologists: number;
    very_engaged_psychologists: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileConversionMatrixCategoryId = Exclude<
  PsychologistsDashboardProfileConversionCategoryId,
  "insufficient_data"
>;

export type PsychologistsDashboardProfileConversionMatrixRow = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionMatrixCategoryId;
  label: string;
  percentage: number;
  totals: {
    whatsapp_clicks: number;
  };
};

export type PsychologistsDashboardProfileConversionActivityColumnId =
  PsychologistsDashboardProfileActivityCategoryId;

export type PsychologistsDashboardProfileConversionActivityMatrixColumn = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionActivityColumnId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileActivityTotals;
};

export type PsychologistsDashboardProfileConversionActivityMatrixQuadrantId =
  `${PsychologistsDashboardProfileConversionMatrixCategoryId}_${PsychologistsDashboardProfileConversionActivityColumnId}`;

export type PsychologistsDashboardProfileConversionActivityMatrixQuadrant = {
  column_id: PsychologistsDashboardProfileConversionActivityColumnId;
  column_label: string;
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionActivityMatrixQuadrantId;
  label: string;
  percentage: number;
  row_id: PsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: PsychologistsDashboardProfileActivityTotals;
};

export type PsychologistsDashboardProfileConversionActivityMatrixResults = {
  columns: PsychologistsDashboardProfileConversionActivityMatrixColumn[];
  description: string;
  quadrants: PsychologistsDashboardProfileConversionActivityMatrixQuadrant[];
  rows: PsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: PsychologistsDashboardProfileActivityTotals & {
    psychologists: number;
    psychologists_with_actions: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileConversionEngagementFavoritesColumnId = Exclude<
  PsychologistsDashboardProfileEngagementFavoritesCategoryId,
  "insufficient_data"
>;

export type PsychologistsDashboardProfileConversionEngagementFavoritesMatrixColumn = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionEngagementFavoritesColumnId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type PsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrant = {
  column_id: PsychologistsDashboardProfileConversionEngagementFavoritesColumnId;
  column_label: string;
  count: number;
  description: string;
  id: `${PsychologistsDashboardProfileConversionMatrixCategoryId}_${PsychologistsDashboardProfileConversionEngagementFavoritesColumnId}`;
  label: string;
  percentage: number;
  row_id: PsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: PsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults = {
  columns: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixColumn[];
  description: string;
  quadrants: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrant[];
  rows: PsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: PsychologistsDashboardProfileEngagementFavoritesTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileConversionVisibilityColumnId = Exclude<
  PsychologistsDashboardProfileExposureCategoryId,
  "insufficient_data"
>;

export type PsychologistsDashboardProfileConversionVisibilityMatrixColumn = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionVisibilityColumnId;
  label: string;
  percentage: number;
  totals: PsychologistsDashboardProfileExposureTotals;
};

export type PsychologistsDashboardProfileConversionVisibilityMatrixQuadrant = {
  column_id: PsychologistsDashboardProfileConversionVisibilityColumnId;
  column_label: string;
  count: number;
  description: string;
  id: `${PsychologistsDashboardProfileConversionMatrixCategoryId}_${PsychologistsDashboardProfileConversionVisibilityColumnId}`;
  label: string;
  percentage: number;
  row_id: PsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: PsychologistsDashboardProfileExposureTotals & {
    whatsapp_clicks: number;
  };
};

export type PsychologistsDashboardProfileConversionVisibilityMatrixResults = {
  columns: PsychologistsDashboardProfileConversionVisibilityMatrixColumn[];
  description: string;
  quadrants: PsychologistsDashboardProfileConversionVisibilityMatrixQuadrant[];
  rows: PsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: PsychologistsDashboardProfileExposureTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    psychologists: number;
    whatsapp_clicks: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardPlanSegment = "all" | "courtesy" | "free" | "subscribers";

export type PsychologistsDashboardPlanSegmentSummary = {
  device_usage: PsychologistsDashboardDeviceUsage;
  id: PsychologistsDashboardPlanSegment;
  label: string;
  platform_usage: PsychologistsDashboardPlatformUsage;
  pre_signup_conversion: PsychologistsDashboardPreSignupConversion;
  psychologists_count: number;
  signup_method: PsychologistsDashboardSignupMethod;
  statistics: PsychologistsDashboardStatistics;
  profile_activity: PsychologistsDashboardProfileActivityResults;
  profile_conversion_activity: PsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion: PsychologistsDashboardProfileConversionResults;
  profile_engagement_favorites: PsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion_engagement: PsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: PsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: PsychologistsDashboardProfileExposureResults;
  traffic_sources: PsychologistsDashboardTrafficSources;
};

export type PsychologistsListOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminRegistryVerificationSource =
  | "admin_grant"
  | "api_automatica"
  | "manual_admin"
  | "pendente";

export type AdminRegistryVerificationStatus =
  | "api_indisponivel"
  | "aprovado"
  | "em_analise"
  | "limite_tentativas"
  | "pendente"
  | "rejeitado";

export type AdminRegistryVerificationActor = {
  email: string | null;
  id: string | null;
  name: string | null;
};

export type AdminPsychologistRegistryVerificationSummary = {
  source: AdminRegistryVerificationSource;
  source_label: string;
  status: AdminRegistryVerificationStatus;
  status_label: string;
};

export type PsychologistsListProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type PsychologistsListProfileConversion = {
  benchmark: PsychologistsProfileConversionBenchmark;
  description: string;
  id: PsychologistsListProfileConversionCategoryId;
  label: string;
  signals: {
    active_days: number;
    profile_age_days: number;
    whatsapp_clicks: number;
  };
  source: PsychologistsProfileConversionSource;
  thresholds: PsychologistsProfileConversionThresholds;
};

export type PsychologistsListEngagement = {
  id: PsychologistsListEngagementId;
  label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem base";
  signals: {
    active_days: number;
    comments_received: number;
    content_saves: number;
    content_shares: number;
    interactions: number;
    normalized_interactions_30d: number;
    normalized_weighted_score_30d: number;
    positive_votes: number;
    profile_favorites: number;
    profile_follows: number;
    uncapped_normalized_weighted_score_30d: number;
  };
  source: "psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share";
  thresholds: {
    active_interactions_30d: number;
    active_score_30d: number;
    highly_active_interactions_30d: number;
    highly_active_score_30d: number;
    minimum_signal_interactions_30d: number;
    minimum_signal_score_30d: number;
    score_caps_30d: {
      comments_received: null;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: null;
      profile_follows: null;
    };
    weights: {
      comments_received: number;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: number;
      profile_follows: number;
    };
  };
};

export type PsychologistsListFilters = {
  approaches: PsychologistsListOption[];
  cities: PsychologistsListOption[];
  experience_ranges: PsychologistsListOption[];
  genders: PsychologistsListOption[];
  languages: PsychologistsListOption[];
  modalities: PsychologistsListOption[];
  plans: PsychologistsListOption[];
  race_colors: PsychologistsListOption[];
  religions: PsychologistsListOption[];
  services: PsychologistsListOption[];
  specialties: PsychologistsListOption[];
  states: PsychologistsListOption[];
  statuses: PsychologistsListOption[];
  target_audience: PsychologistsListOption[];
};

export type PsychologistsListItem = {
  accepts_insurance: boolean;
  avatar: string | null;
  city: string | null;
  created_at: string;
  crp: string | null;
  detail_url: string;
  discount_first_session: boolean;
  email: string;
  engagement: PsychologistsListEngagement;
  experience_years: number | null;
  favorites_count: number;
  gender: string | null;
  id: string;
  name: string;
  plan_name: string | null;
  plan_slug: string | null;
  public_profile_url: string;
  published: boolean;
  ranking_position: number | null;
  ranking_score: number | null;
  rating_avg: number;
  rating_count: number;
  social_value: boolean;
  state: string | null;
  status: PsychologistsListStatus;
  profile_conversion: PsychologistsListProfileConversion;
  registry_verification: AdminPsychologistRegistryVerificationSummary;
  verified: boolean;
  whatsapp_clicks_count: number;
};

export type AdminPsychologistsList = {
  active_filters_count: number;
  count: number;
  data: PsychologistsListItem[];
  filters: PsychologistsListFilters;
  page: number;
  pages: number;
  per_page: number;
  sort: PsychologistsListSort;
  source: "user+psychologist_profile+professional_subscription+public_ranking+contact_request+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share";
};

export type AdminPsychologistDetailStatus = "free" | "pending" | "unpublished" | "verified";

export type AdminPsychologistCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type AdminPsychologistDetailMetric = {
  id: string;
  label: string;
  source: string;
  unit: "count" | "decimal" | "position";
  value: number | null;
};

export type AdminPsychologistDetailEvent = {
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  created_at: string;
  description: string;
  id: string;
  label: string;
  source: string;
  type: string;
};

export type AdminPsychologistIntegrationStatus = {
  checked_at: string | null;
  id: "email" | "mercado_pago" | "registry" | "subscription" | "whatsapp";
  label: string;
  source: string;
  status: "active" | "configured" | "missing" | "pending" | "synced" | "unavailable";
  status_label: string;
};

export type AdminPsychologistDetail = {
  general: {
    account_history: AdminPsychologistDetailEvent[];
    integrations: AdminPsychologistIntegrationStatus[];
    metrics: AdminPsychologistDetailMetric[];
    recent_activity: AdminPsychologistDetailEvent[];
    subscription: {
      current_period_end: string | null;
      gateway: string | null;
      gateway_label: string | null;
      id: string | null;
      interval: string | null;
      payment_method: {
        brand: string | null;
        exp_month: number | null;
        exp_year: number | null;
        gateway: string;
        last4: string | null;
      } | null;
      plan_name: string | null;
      plan_slug: string | null;
      price_cents: number | null;
      source: string | null;
      started_at: string | null;
      status: string | null;
      time_to_first_paid_subscription: {
        days: number | null;
        first_paid_subscription_at: string | null;
        label: string;
        registered_at: string | null;
        status: "converted" | "courtesy_only" | "free_only" | "not_converted" | "unavailable";
      };
    };
  };
  header: {
    active: boolean;
    avatar: string | null;
    created_at: string;
    crp: string | null;
    id: string;
    last_access_at: string | null;
    name: string;
    plan_name: string | null;
    plan_slug: string | null;
    public_profile_url: string;
    published: boolean;
    rating_avg: number;
    rating_count: number;
    status: AdminPsychologistDetailStatus;
    status_label: string;
    verified: boolean;
  };
  profile: {
    academic: {
      formations: string[];
      graduation_year: string | null;
      institution: string | null;
      title: string | null;
    };
    content: {
      bio: string | null;
      cover_image_url: string | null;
      headline: string | null;
      video_cover_url: string | null;
      video_url: string | null;
    };
    features: {
      accepts_insurance: boolean;
      discount_first_session: boolean;
      social_value: boolean;
    };
    personal: {
      address: {
        city: string | null;
        complement: string | null;
        district: string | null;
        full: string | null;
        number: string | null;
        state: string | null;
        street: string | null;
        zip: string | null;
      };
      birthdate: string | null;
      cpf: string | null;
      email: string;
      full_name: string;
      phone: string | null;
      provider: string;
    };
    professional: {
      approaches: AdminPsychologistCatalogItem[];
      crp: string | null;
      crp_registration_date: string | null;
      crp_status: string;
      experience_years: number | null;
      gender: string | null;
      languages: string[];
      modality: string | null;
      race_color: string | null;
      regional_crp: string | null;
      registration_number: string | null;
      religion: string | null;
      services: AdminPsychologistCatalogItem[];
      specialties: AdminPsychologistCatalogItem[];
      target_audience: string[];
    };
  };
  source: "user+psychologist_profile+catalogs+subscriptions+metrics+events";
};

export type AdminPsychologistUpdatePersonalDataInput = {
  address_city?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_number?: string | null;
  address_state?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  birthdate?: string | null;
  confirm_cpf_change?: boolean;
  cpf?: string | null;
  gender?: string | null;
  race_color?: string | null;
  reason: string;
  religion?: string | null;
  whatsapp?: string | null;
};

export type AdminPsychologistUpdateProfessionalDataInput = {
  approach_ids?: string[];
  languages?: string[];
  modality?: "hibrido" | "online" | "presencial" | null;
  reason: string;
  service_ids?: string[];
  specialty_ids?: string[];
  target_audience?: string[];
};

export type AdminPsychologistAccount = {
  active: boolean;
  account_status_expires_at: string | null;
  account_status: "active" | "deactivated" | "deleted" | "suspended";
  account_status_changed_at: string | null;
  account_status_label: string;
  capabilities: {
    can_change_email: boolean;
    can_deactivate_account: boolean;
    can_delete_account: boolean;
    can_send_email_confirmation: boolean;
    can_send_password_reset: boolean;
    can_set_temporary_password: boolean;
    can_suspend_account: boolean;
    can_revoke_sessions: boolean;
  };
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  delete_blocked_reason: string | null;
  deleted: boolean;
  deleted_at: string | null;
  email: string;
  has_password: boolean;
  last_access_at: string | null;
  need_reset: boolean;
  provider: string;
  provider_label: string;
  sessions: {
    active_count: number;
    devices_count: number;
    last_access_at: string | null;
    source: "user_token";
  };
  source: "user+user_token";
};

export type AdminPsychologistAccountReasonInput = {
  reason: string;
};

export type AdminPsychologistChangeEmailInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  email: string;
};

export type AdminPsychologistSetTemporaryPasswordInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  password: string;
  password_confirm: string;
};

export type AdminPsychologistRevokeSessionsInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
};

export type AdminPsychologistAccountStatusActionInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  suspension_duration_days?: number;
};

export type AdminPsychologistAccountDeleteResponse = {
  deleted: true;
  id: string;
  source: "user+psychologist_profile+admin_activity_log";
};

export type AdminPsychologistBillingPaymentHistoryItem = {
  amount_cents: number | null;
  description: string;
  external_id: string;
  gateway: string;
  id: string;
  occurred_at: string | null;
  status: "cancelado" | "pago" | "pendente" | "processado" | "recusado";
  status_label: string;
  title: string;
};

export type AdminPsychologistBilling = {
  courtesy: {
    active_grant_id: string | null;
    blocked_reason: string | null;
    can_grant: boolean;
    can_revoke: boolean;
    cpf: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    period_options: { days: number; label: string }[];
    regional_crp: string | null;
    registration_number: string | null;
    requires_crp_registration_date: boolean;
  };
  payment_history: {
    available: boolean;
    items: AdminPsychologistBillingPaymentHistoryItem[];
    reason: string | null;
    source: "payment_event";
  };
  payment_method: {
    brand: string | null;
    exp_month: number | null;
    exp_year: number | null;
    gateway: string;
    last4: string | null;
  } | null;
  plan: {
    can_cancel: false;
    can_change_payment_method: false;
    current_period_end: string | null;
    gateway: string | null;
    gateway_label: string | null;
    grant_notes: string | null;
    grant_reason: string | null;
    grant_started_at: string | null;
    granted_by: string | null;
    has_external_billing: boolean;
    id: string | null;
    interval: string | null;
    is_courtesy: boolean;
    is_paid: boolean;
    lifetime_value_available: boolean;
    lifetime_value_cents: number | null;
    lifetime_value_unavailable_reason: string | null;
    paid_installments_count: number;
    plan_name: string | null;
    plan_slug: string | null;
    price_cents: number | null;
    source: string | null;
    source_label: string | null;
    started_at: string | null;
    status: string | null;
  };
  source: "professional_subscription+payment_method+payment_event+admin_grant_service";
};

export type AdminPsychologistGrantCourtesyInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes: string;
  period_days: number;
  regional_crp: string;
};

export type AdminPsychologistGrantCourtesyResponse = {
  billing: AdminPsychologistBilling;
  grant: {
    crp_registration_date: string | null;
    granted_to: {
      email: string;
      name: string;
      profileId: string;
      userId: string;
    };
    identity_override: {
      cpf: string | null;
      crp: string | null;
      crp_number: string | null;
      crp_region: string | null;
    } | null;
    subscription: {
      current_period_end: string;
      id: string;
      plan: {
        id: string;
        name: string;
        slug: string;
      };
      source: string;
      status: string;
    };
  };
};

export type AdminPsychologistRevokeCourtesyResponse = {
  billing: AdminPsychologistBilling;
  revoked: {
    id: string;
    status: "cancelada";
  };
};

export type AdminPsychologistRegistryVerificationAttempt = {
  checked_at: string;
  cpf_masked: string | null;
  found: boolean;
  id: string;
  notes: string | null;
  reason: string | null;
  regional_crp: string | null;
  registration_number: string | null;
  result_label: string;
  source: Exclude<AdminRegistryVerificationSource, "admin_grant" | "pendente">;
  source_label: string;
  responsible_admin: AdminRegistryVerificationActor | null;
};

export type AdminPsychologistRegistryVerification = {
  actions: {
    can_approve_manually: boolean;
    can_reject_manually: boolean;
    strong_approve_confirmation: "APROVAR CRP";
    strong_reject_confirmation: "REJEITAR CRP";
    strong_save_confirmation: "SALVAR REGISTRO";
  };
  identity: {
    cpf: string | null;
    cpf_masked: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    experience_years: number | null;
    regional_crp: string | null;
    registration_number: string | null;
  };
  latest_attempts: AdminPsychologistRegistryVerificationAttempt[];
  source: "psychologist_profile+professional_registry_check";
  summary: AdminPsychologistRegistryVerificationSummary & {
    approval_label: "Ativo" | "Pendente";
    cfp_verified_at: string | null;
    crp_status: string;
    latest_manual_admin: AdminRegistryVerificationActor | null;
    latest_manual_checked_at: string | null;
    latest_manual_notes: string | null;
    latest_manual_reason: string | null;
    plan_label: "Cortesia" | "Gratuito" | "Profissional";
    plan_type: "cortesia" | "gratuito" | "profissional";
  };
};

export type AdminPsychologistApproveRegistryVerificationInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes?: string | null;
  regional_crp: string;
  situation_confirmed: boolean;
};

export type AdminPsychologistRejectRegistryVerificationInput = {
  confirmation: string;
  reason: string;
};

export type AdminPsychologistUpdateRegistryIdentityInput = {
  confirmation: string;
  crp: string;
  crp_registration_date: string;
  regional_crp: string;
};

export type AdminPsychologistEngagementMetric = {
  available: boolean;
  comparison?: {
    change_percent: number | null;
    previous_from: string;
    previous_to: string;
    previous_value: number;
    trend: PsychologistsDashboardTrend;
  } | null;
  id: string;
  label: string;
  source: string;
  unit: "count" | "percentage" | "position" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminCommunityEngagementDiagnosis = {
  id: "ativo" | "muito_ativo" | "pouco_ativo" | "sem_base";
  label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem base";
  source: string;
};

export type AdminPsychologistBusinessProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type AdminPsychologistBusinessProfileConversionQualityId =
  | "excellent_conversion"
  | "good_conversion"
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion";

export type AdminPsychologistBusinessProfileConversionPlatformPositionId =
  | "above_reference"
  | "at_reference"
  | "below_reference"
  | "insufficient_data"
  | "unavailable";

export type AdminPsychologistContentFormatId = "image" | "image_carousel" | "text" | "video";

export type AdminPsychologistContentFormatDistribution = {
  items: {
    count: number;
    id: AdminPsychologistContentFormatId;
    label: "Apenas texto" | "Carrossel de imagens" | "Imagem" | "Vídeo";
    percentage: number;
  }[];
  total: number;
};

export type AdminPsychologistVisibilityDiagnosis = {
  benchmark: PsychologistsProfileExposureBenchmark;
  description: string;
  id: PsychologistsProfileExposureAggregateCategoryId;
  label: string;
  signals: {
    community_content_seconds: number;
    presentation_video_seconds: number;
    profile_age_days: number;
    profile_seconds: number;
    visibility_seconds: number;
  };
  source: "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds";
  thresholds: PsychologistsProfileExposureThresholds;
};

export type AdminPsychologistStatistics = {
  business: {
    cards: AdminPsychologistEngagementMetric[];
    series: AdminPsychologistStatisticsPoint[];
    profile_conversion: {
      benchmark: PsychologistsProfileConversionBenchmark;
      description: string;
      headline: string;
      id: AdminPsychologistBusinessProfileConversionCategoryId;
      label: string;
      platform_position: {
        description: string;
        id: AdminPsychologistBusinessProfileConversionPlatformPositionId;
        label: string;
        reference_whatsapp_clicks: number | null;
      };
      quality: {
        description: string;
        id: AdminPsychologistBusinessProfileConversionQualityId;
        label: string;
        normalized_whatsapp_clicks_30d: number;
        thresholds: {
          excellent_whatsapp_clicks_30d: number;
          good_whatsapp_clicks_30d: number;
        };
      };
      signals: {
        active_days: number;
        normalized_whatsapp_clicks_30d: number;
        profile_age_days: number;
        whatsapp_clicks: number;
      };
      source: PsychologistsProfileConversionSource;
      thresholds: PsychologistsProfileConversionThresholds;
    };
    visibility: {
      cards: AdminPsychologistEngagementMetric[];
      counters: AdminPsychologistVisibilityCounter[];
      diagnosis: AdminPsychologistVisibilityDiagnosis;
      series: AdminPsychologistVisibilityPoint[];
      source: "page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds+profile_view_event+page_view_event.target_type";
      total_seconds: number;
    };
  };
  community: {
    cards: AdminPsychologistEngagementMetric[];
    communities: {
      avatar_url: string | null;
      color: string | null;
      coverage: {
        covered_patient_posts: number;
        patient_posts: number;
        rate_percent: number | null;
        source: "community_post.author.role=paciente+post_reply.author_id";
      };
      downvotes: number;
      engagement_diagnosis?: AdminCommunityEngagementDiagnosis;
      following: boolean;
      id: string;
      interactions: number;
      member_since: string | null;
      name: string;
      posts: number;
      ranking: {
        position: number;
        score: number;
      } | null;
      replies: number;
      slug: string;
      upvotes: number;
    }[];
    content_distribution: {
      posts: AdminPsychologistContentFormatDistribution;
      replies: AdminPsychologistContentFormatDistribution;
      source: "community_post.media_type+community_post_media+post_reply.media_type";
    };
    engagement_diagnosis: AdminCommunityEngagementDiagnosis;
    series: AdminPsychologistStatisticsPoint[];
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    previous_from: string;
    previous_to: string;
    timezone: "server-local";
    to: string;
  };
  platform_usage: {
    access_days_count: number;
    average_duration_seconds: number | null;
    device_usage: {
      items: {
        count: number;
        device_type: "desktop" | "mobile" | "tablet" | "unknown";
        id: "desktop" | "mobile" | "tablet" | "unknown";
        label: string;
        operating_systems: {
          count: number;
          id: PsychologistsDashboardOperatingSystem;
          label: string;
          operating_system: PsychologistsDashboardOperatingSystem;
          percentage: number;
        }[];
        percentage: number;
      }[];
      source: "visitor_session.device_type+visitor_session.os+user_id";
      total_sessions: number;
      unavailable_reason: string | null;
    };
    duration_unavailable_reason: string | null;
    hourly_activity?: {
      accesses: number;
      count: number;
      engagement: number;
      hour: number;
      label: string;
      percentage: number;
      posts: number;
      replies: number;
      reports: number;
      total: number;
    }[];
    hourly_activity_by_weekday?: {
      day: number;
      hours: {
        accesses: number;
        count: number;
        engagement: number;
        hour: number;
        label: string;
        percentage: number;
        posts: number;
        replies: number;
        reports: number;
        total: number;
      }[];
      label: string;
    }[];
    last_access_at: string | null;
    period_from: string;
    period_to: string;
    peak_activity_hours: {
      count: number;
      hour: number;
      label: string;
      percentage: number;
    }[];
    pwa_installation_recorded: boolean;
    pwa_installed_at: string | null;
    sessions_count: number;
    source: "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report";
    top_pages: {
      count: number;
      label: string;
      percentage: number;
    }[];
    unavailable_reason: string | null;
  };
  source: "profile_events+community_activity+video_sessions+search_impressions+professional_review+page_view_event+important_action_event+content_attention_session";
  traffic_quality: {
    absorption_rate: number | null;
    attributed_whatsapp_clicks: number;
    attribution_note: string;
    flows: {
      count: number;
      id: `${string}_${"interested" | "qualified" | "unidentified" | "visited"}`;
      origin_id: string;
      origin_label: string;
      percentage: number;
      quality_id: "interested" | "qualified" | "unidentified" | "visited";
      quality_label: string;
    }[];
    origins: {
      actors: number;
      id: string;
      label: string;
      percentage: number;
      profile_views: number;
      qualified_actors: number;
    }[];
    predominant_quality: {
      count: number;
      description: string;
      id: "interested" | "qualified" | "unidentified" | "visited";
      label: string;
      percentage: number;
    } | null;
    primary_qualified_origin: {
      actors: number;
      id: string;
      label: string;
      percentage: number;
      profile_views: number;
      qualified_actors: number;
    } | null;
    quality_levels: {
      count: number;
      description: string;
      id: "interested" | "qualified" | "unidentified" | "visited";
      label: string;
      percentage: number;
    }[];
    source: "page_view_event+psychologist_favorite+contact_request+important_action_event";
    total_actors: number;
    total_profile_views: number;
    total_whatsapp_clicks: number;
    unattributed_whatsapp_clicks: number;
    unavailable_reason: string | null;
  };
  traffic_sources: {
    attribution_unavailable_reason: string | null;
    description: string;
    source: "page_view_event.traffic_source+target_type=psychologist";
    sources: {
      badge: "primary_source" | null;
      conversion_rate: number | null;
      description: string;
      id: string;
      label: string;
      percentage: number;
      profile_views: number;
      sessions: number;
      whatsapp_clicks: number | null;
    }[];
    total_profile_views: number;
    total_sessions: number;
    unavailable_reason: string | null;
    updated_at: string | null;
  };
  unavailable: AdminPsychologistEngagementMetric[];
  video: {
    available: boolean;
    comparisons: {
      average_retention_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      favorites_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      profile_accesses_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      replay_rate_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      shares_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      sessions: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      whatsapp_clicks_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
    };
    cover_url: string | null;
    duration_seconds: number | null;
    explore_position: AdminPsychologistEngagementMetric;
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
    source: "profile_video_watch_session+important_action_event+profile_view_event.search_result_position";
    unavailable_reason: string | null;
    video_url: string | null;
  };
};

export type AdminPsychologistStatisticsPeriodFilter =
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "custom"
  | "month"
  | "today"
  | "week"
  | "year";

export type AdminPsychologistStatisticsQuery = {
  community?: string;
  from?: string;
  period?: AdminPsychologistStatisticsPeriodFilter;
  to?: string;
};

export type AdminPsychologistStatisticsPoint = {
  comments_received: number;
  coverage_rate_percent: number;
  date: string;
  downvotes: number;
  favorites: number;
  patient_post_reply_coverage?: number;
  patient_post_text_reply_coverage?: number;
  patient_post_video_reply_coverage?: number;
  profile_views: number;
  replies: number;
  reviews: number;
  saves: number;
  search_results: number;
  shares: number;
  visibility_seconds: number;
  whatsapp_clicks: number;
  upvotes: number;
  posts: number;
};

export type AdminPsychologistVisibilityPoint = {
  community_content_seconds: number;
  date: string;
  presentation_video_seconds: number;
  profile_seconds: number;
  total_seconds: number;
};

export type AdminPsychologistVisibilityCounter = {
  id:
    | "content_views"
    | "presentation_video_explore_views"
    | "profile_opens"
    | "search_result_views";
  label: string;
  source: string;
  value: number;
};

export type AdminPsychologistPublicationMetric = AdminPsychologistEngagementMetric;

export type AdminPsychologistPublicationItem = {
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
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

export type AdminPsychologistPublicationsQuery = {
  community?: string;
  from?: string;
  limit?: number;
  page?: number;
  period?: AdminPsychologistStatisticsPeriodFilter;
  q?: string;
  sort?: "engagement" | "oldest" | "recent";
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistPublications = {
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
  period: AdminPsychologistStatistics["period"];
  source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report";
  totals: {
    cards: AdminPsychologistEngagementMetric[];
  };
  unavailable: AdminPsychologistEngagementMetric[];
};

export type AdminPsychologistReviewsQuery = {
  limit?: number;
  page?: number;
  rating?: number;
  status?: string;
};

export type AdminPsychologistReviewItem = {
  author: {
    avatar: string | null;
    id: string;
    name: string;
    role: string;
  };
  comment: string | null;
  created_at: string;
  id: string;
  rating: number;
  response: string | null;
  responded_at: string | null;
  status: string;
  status_label: string;
};

export type AdminPsychologistReviews = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  count: number;
  data: AdminPsychologistReviewItem[];
  filters: {
    ratings: { count: number; id: string; label: string }[];
    statuses: { count: number; id: string; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  source: "professional_review";
  summary: {
    distribution: { count: number; percentage: number; rating: 1 | 2 | 3 | 4 | 5 }[];
    rating_avg: number;
    rating_count: number;
    statuses: { count: number; id: string; label: string }[];
  };
};

export type AdminPsychologistReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPsychologistReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPsychologistReportsStatusGroup;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistReportItem = {
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
    };
    available: boolean;
    body: string;
    community: {
      id: string;
      name: string;
      slug: string;
    };
    created_at: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    public_url: string | null;
    title: string;
    type: "post" | "reply";
    unavailable_reason: string | null;
  };
  capabilities: {
    can_review_resolution: boolean;
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  created_at: string;
  description: string | null;
  id: string;
  moderation: {
    status: string;
    status_label: string;
  };
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    name: string;
    role: string;
  };
  status: string;
  status_group: AdminPsychologistReportsStatusGroup;
  status_label: string;
};

export type AdminPsychologistReports = {
  access: {
    mode: "moderation";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  count: number;
  data: AdminPsychologistReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | AdminPsychologistReportsStatusGroup;
      label: string;
    }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatistics["period"];
  source: "post_report+community_post+post_reply";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistReportResolveInput = {
  confirmation: string;
  measure?: "none" | "remove_content";
  reason: string;
  resolution: "dismissed" | "pending" | "upheld";
};

export type AdminPsychologistReportActionResponse = {
  affected_reports_count: number;
  content_already_unavailable: boolean;
  content_removed: boolean;
  report: AdminPsychologistReportItem;
  source: "post_report+admin_activity_log";
};

export type AdminPsychologistActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPsychologistActivityItem = {
  actor: {
    id: string;
    name: string;
    role: string;
  } | null;
  area: {
    id: string;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: string;
  type: {
    id: string;
    label: string;
  };
};

export type AdminPsychologistActivities = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPsychologistActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: { count: number; id: string; label: string }[];
    types: { count: number; id: string; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report+admin_activity_log";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistsDashboard = {
  cards: {
    churn: PsychologistsDashboardMetric;
    courtesy_psychologists: PsychologistsDashboardMetric;
    free_psychologists: PsychologistsDashboardMetric;
    new_signups: PsychologistsDashboardMetric;
    subscriber_psychologists: PsychologistsDashboardMetric;
    total_psychologists: PsychologistsDashboardMetric;
  };
  conversion: PsychologistsDashboardConversion;
  conversion_by_signup_method: PsychologistsDashboardConversionBySignupMethodItem[];
  device_usage: PsychologistsDashboardDeviceUsage;
  filters_searches: PsychologistsDashboardFilterSearches;
  pre_signup_conversion: PsychologistsDashboardPreSignupConversion;
  directory_filters: PsychologistsDashboardDirectoryFilters;
  operating_system_usage: PsychologistsDashboardOperatingSystemUsage;
  plan_segments: Record<
    PsychologistsDashboardPlanSegment,
    PsychologistsDashboardPlanSegmentSummary
  >;
  period: PsychologistsDashboardPeriod;
  platform_usage: PsychologistsDashboardPlatformUsage;
  psychologists: {
    items: PsychologistsDashboardPsychologist[];
    source: "user+psychologist_profile+professional_subscription";
    total: number;
  };
  ranking: {
    formula: "public_directory_psychologist_ranking";
    items: PsychologistsDashboardRankingItem[];
    source: "shared_psychologist_public_ranking_helper";
    total: number;
  };
  signup_method: PsychologistsDashboardSignupMethod;
  statistics: PsychologistsDashboardStatistics;
  timeline: {
    points: PsychologistsDashboardDailyPoint[];
    source: "user+professional_subscription";
  };
  profile_activity: PsychologistsDashboardProfileActivityResults;
  profile_conversion_activity: PsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion: PsychologistsDashboardProfileConversionResults;
  profile_engagement_favorites: PsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion_engagement: PsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: PsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: PsychologistsDashboardProfileExposureResults;
  traffic_sources: PsychologistsDashboardTrafficSources;
  unavailable: PsychologistsDashboardUnavailableMetric[];
};

const cleanDashboardParams = (input: PsychologistsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanListParams = (input: PsychologistsListQuery) => ({
  ...(input.accepts_insurance ? { accepts_insurance: input.accepts_insurance } : {}),
  ...(input.approach ? { approach: input.approach } : {}),
  ...(input.available_today ? { available_today: input.available_today } : {}),
  ...(input.city ? { city: input.city } : {}),
  ...(input.discount_first_session ? { discount_first_session: input.discount_first_session } : {}),
  ...(input.engagement ? { engagement: input.engagement } : {}),
  ...(input.experience ? { experience: input.experience } : {}),
  ...(input.gender ? { gender: input.gender } : {}),
  ...(input.language ? { language: input.language } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.modality ? { modality: input.modality } : {}),
  ...(input.more_experienced ? { more_experienced: input.more_experienced } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.plan ? { plan: input.plan } : {}),
  ...(input.profile_status ? { profile_status: input.profile_status } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.race_color ? { race_color: input.race_color } : {}),
  ...(input.registry_status ? { registry_status: input.registry_status } : {}),
  ...(input.religion ? { religion: input.religion } : {}),
  ...(input.service ? { service: input.service } : {}),
  ...(input.social_value ? { social_value: input.social_value } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.specialty ? { specialty: input.specialty } : {}),
  ...(input.state ? { state: input.state } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.target_audience ? { target_audience: input.target_audience } : {}),
  ...(input.profile_conversion ? { profile_conversion: input.profile_conversion } : {}),
  ...(input.profile_conversion_engagement
    ? { profile_conversion_engagement: input.profile_conversion_engagement }
    : {}),
  ...(input.verified ? { verified: input.verified } : {}),
});

const cleanPublicationsParams = (input: AdminPsychologistPublicationsQuery) => ({
  ...(input.community ? { community: input.community } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

const cleanStatisticsParams = (input: AdminPsychologistStatisticsQuery = {}) => ({
  ...(input.community ? { community: input.community } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanReviewsParams = (input: AdminPsychologistReviewsQuery) => ({
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.rating ? { rating: input.rating } : {}),
  ...(input.status ? { status: input.status } : {}),
});

const cleanReportsParams = (input: AdminPsychologistReportsQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

const cleanActivitiesParams = (input: AdminPsychologistActivitiesQuery) => ({
  ...(input.area ? { area: input.area } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

export const getAdminPsychologistsDashboard = async (input: PsychologistsDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsDashboard>>(
    "/api/admin/private/psychologists/dashboard",
    {
      params: cleanDashboardParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistsList = async (input: PsychologistsListQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsList>>(
    "/api/admin/private/psychologists",
    {
      params: cleanListParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistPersonalData = async (
  id: string,
  input: AdminPsychologistUpdatePersonalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/personal-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistProfessionalData = async (
  id: string,
  input: AdminPsychologistUpdateProfessionalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/professional-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistAccount = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account`,
  );

  return resolveApiData(response.data);
};

export const changeAdminPsychologistAccountEmail = async (
  id: string,
  input: AdminPsychologistChangeEmailInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/change-email`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountEmailConfirmation = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-email-confirmation`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountPasswordReset = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-password-reset`,
    input,
  );

  return resolveApiData(response.data);
};

export const setAdminPsychologistAccountTemporaryPassword = async (
  id: string,
  input: AdminPsychologistSetTemporaryPasswordInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/set-temporary-password`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistAccountSessions = async (
  id: string,
  input: AdminPsychologistRevokeSessionsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/revoke-sessions`,
    input,
  );

  return resolveApiData(response.data);
};

export const suspendAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/suspend`,
    input,
  );

  return resolveApiData(response.data);
};

export const deactivateAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/deactivate`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminPsychologistAccount = async (
  id: string,
  input: AdminPsychologistAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccountDeleteResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/delete`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistBilling = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistBilling>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistRegistryVerification = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistStatistics = async (
  id: string,
  input: AdminPsychologistStatisticsQuery = {},
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistStatistics>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/statistics`,
    {
      params: cleanStatisticsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistPublications = async (
  id: string,
  input: AdminPsychologistPublicationsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistPublications>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/publications`,
    {
      params: cleanPublicationsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReviews = async (
  id: string,
  input: AdminPsychologistReviewsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReviews>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reviews`,
    {
      params: cleanReviewsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReports = async (
  id: string,
  input: AdminPsychologistReportsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReports>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports`,
    {
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const resolveAdminPsychologistReport = async (
  id: string,
  reportId: string,
  input: AdminPsychologistReportResolveInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistReportActionResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports/${encodeURIComponent(
      reportId,
    )}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistActivities = async (
  id: string,
  input: AdminPsychologistActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistActivities>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/activities`,
    {
      params: cleanActivitiesParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const grantAdminPsychologistCourtesy = async (
  id: string,
  input: AdminPsychologistGrantCourtesyInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistGrantCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/grant-courtesy`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistCourtesy = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRevokeCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/revoke-courtesy`,
  );

  return resolveApiData(response.data);
};

export const approveAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistApproveRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/approve`,
    input,
  );

  return resolveApiData(response.data);
};

export const rejectAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistRejectRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/reject`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistRegistryIdentity = async (
  id: string,
  input: AdminPsychologistUpdateRegistryIdentityInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/identity`,
    input,
  );

  return resolveApiData(response.data);
};
