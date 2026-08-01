import type { Request } from "express";
import type {
  AdminProfileConversionBenchmark,
  AdminProfileConversionSource,
  AdminProfileConversionThresholds,
} from "@/utils/admin-profile-conversion";
import type {
  AdminProfileEngagementFavoritesBenchmark,
  AdminProfileEngagementFavoritesCategoryId,
  AdminProfileEngagementFavoritesCombinationId,
  AdminProfileEngagementFavoritesCommunityCategoryId,
  AdminProfileEngagementFavoritesFavoriteCategoryId,
  AdminProfileEngagementFavoritesScoreConfig,
  AdminProfileEngagementFavoritesSource,
  AdminProfileEngagementFavoritesThresholds,
} from "@/utils/admin-profile-engagement-favorites";
import type {
  AdminProfileExposureBenchmark,
  AdminProfileExposureCategoryId,
  AdminProfileExposureCombinationId,
  AdminProfileExposureCommunityCategoryId,
  AdminProfileExposureSource,
  AdminProfileExposureThresholds,
  AdminProfileExposureVideoCategoryId,
} from "@/utils/admin-profile-exposure";
import type {
  AdminPsychologistWhatsappTrafficClickActorBreakdown,
  AdminPsychologistWhatsappTrafficPlatformMetric,
} from "@/utils/admin-psychologist-analytics";

export type AdminPsychologistsDashboardQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
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

export type AdminPsychologistsDashboardProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type AdminPsychologistsDashboardProfileConversionCategory = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionCategoryId;
  label: string;
  percentage: number;
  totals: {
    whatsapp_clicks: number;
  };
};

export type AdminPsychologistsDashboardProfileConversionResults = {
  benchmark: AdminProfileConversionBenchmark;
  categories: AdminPsychologistsDashboardProfileConversionCategory[];
  description: string;
  source: AdminProfileConversionSource;
  thresholds: AdminProfileConversionThresholds;
  totals: {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    non_zero_whatsapp_psychologists: number;
    psychologists: number;
    whatsapp_clicks: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileActivityCategoryId =
  | "ativo"
  | "muito_ativo"
  | "pouco_ativo"
  | "sem_base";

export type AdminPsychologistsDashboardProfileActivityTotals = {
  actions: number;
  posts: number;
  replies: number;
};

export type AdminPsychologistsDashboardProfileActivityCategory = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileActivityCategoryId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileActivityTotals;
};

export type AdminPsychologistsDashboardProfileActivityThresholds = {
  active_min_actions: number;
  low_activity_min_actions: number;
  very_active_min_actions: number;
};

export type AdminPsychologistsDashboardProfileActivityResults = {
  categories: AdminPsychologistsDashboardProfileActivityCategory[];
  description: string;
  source: "community_post.author_id+post_reply.author_id";
  thresholds: AdminPsychologistsDashboardProfileActivityThresholds;
  totals: AdminPsychologistsDashboardProfileActivityTotals & {
    psychologists: number;
    psychologists_with_actions: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileCoverageCategoryId =
  | "above_average_coverage"
  | "average_coverage"
  | "below_average_coverage"
  | "no_coverage";

export type AdminPsychologistsDashboardProfileCoverageCategory = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileCoverageCategoryId;
  label: string;
  percentage: number;
  totals: {
    patient_posts_answered: number;
  };
};

export type AdminPsychologistsDashboardProfileCoverageResults = {
  categories: AdminPsychologistsDashboardProfileCoverageCategory[];
  description: string;
  source: "post_reply.author_id+post_reply.post.author.role=paciente+distinct(post_id)";
  totals: {
    average_patient_posts_answered: number;
    patient_posts_answered: number;
    psychologists: number;
    psychologists_with_coverage: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionActivityColumnId =
  AdminPsychologistsDashboardProfileActivityCategoryId;

export type AdminPsychologistsDashboardProfileConversionActivityMatrixColumn = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionActivityColumnId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileActivityTotals;
};

export type AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId =
  `${AdminPsychologistsDashboardProfileConversionMatrixCategoryId}_${AdminPsychologistsDashboardProfileConversionActivityColumnId}`;

export type AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrant = {
  column_id: AdminPsychologistsDashboardProfileConversionActivityColumnId;
  column_label: string;
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrantId;
  label: string;
  percentage: number;
  row_id: AdminPsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: AdminPsychologistsDashboardProfileActivityTotals;
};

export type AdminPsychologistsDashboardProfileConversionActivityMatrixResults = {
  columns: AdminPsychologistsDashboardProfileConversionActivityMatrixColumn[];
  description: string;
  quadrants: AdminPsychologistsDashboardProfileConversionActivityMatrixQuadrant[];
  rows: AdminPsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: AdminPsychologistsDashboardProfileActivityTotals & {
    psychologists: number;
    psychologists_with_actions: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionBehaviorElementId =
  | "communities"
  | "favorite"
  | "profile"
  | "presentation_video";

export type AdminPsychologistsDashboardProfileConversionBehaviorMetric = {
  description: string;
  display_value: string | null;
  id: string;
  label: string;
  source: string;
  tone: "above" | "below" | "standard" | "zero";
  unit: "count" | "percentage" | "position" | "score" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminPsychologistsDashboardProfileConversionBehaviorColumn = {
  description: string;
  id: AdminPsychologistsDashboardProfileConversionBehaviorElementId;
  label: string;
};

export type AdminPsychologistsDashboardProfileConversionBehaviorCell = {
  element_id: AdminPsychologistsDashboardProfileConversionBehaviorElementId;
  headline: string;
  id: `${AdminPsychologistsDashboardProfileConversionMatrixCategoryId}_${AdminPsychologistsDashboardProfileConversionBehaviorElementId}`;
  metrics: AdminPsychologistsDashboardProfileConversionBehaviorMetric[];
  row_id: AdminPsychologistsDashboardProfileConversionMatrixCategoryId;
  source: string;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionBehaviorResults = {
  cells: AdminPsychologistsDashboardProfileConversionBehaviorCell[];
  columns: AdminPsychologistsDashboardProfileConversionBehaviorColumn[];
  description: string;
  rows: AdminPsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileExposureCommunityCategoryId =
  AdminProfileExposureCommunityCategoryId;

export type AdminPsychologistsDashboardProfileExposureVideoCategoryId =
  AdminProfileExposureVideoCategoryId;

export type AdminPsychologistsDashboardProfileExposureCategoryId = AdminProfileExposureCategoryId;

export type AdminPsychologistsDashboardProfileExposureTotals = {
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

export type AdminPsychologistsDashboardProfileExposureCategory = {
  community_id: AdminPsychologistsDashboardProfileExposureCommunityCategoryId | null;
  community_label: string | null;
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileExposureCategoryId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileExposureTotals;
  video_id: AdminPsychologistsDashboardProfileExposureVideoCategoryId | null;
  video_label: string | null;
};

export type AdminPsychologistsDashboardProfileExposureResults = {
  benchmark: AdminProfileExposureBenchmark;
  categories: AdminPsychologistsDashboardProfileExposureCategory[];
  description: string;
  source: AdminProfileExposureSource;
  thresholds: AdminProfileExposureThresholds;
  totals: AdminPsychologistsDashboardProfileExposureTotals & {
    adaptation_psychologists: number;
    community_visible_psychologists: number;
    eligible_psychologists: number;
    exposed_psychologists: number;
    psychologists: number;
    video_visible_psychologists: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionEngagementCategoryId = Exclude<
  AdminPsychologistsDashboardProfileConversionCategoryId,
  "insufficient_data"
>;

export type AdminPsychologistsDashboardProfileConversionEngagementLevelId =
  | "engaged"
  | "low_engaged"
  | "no_engagement"
  | "very_engaged";

export type AdminPsychologistsDashboardProfileConversionEngagementQuadrantId =
  `${AdminPsychologistsDashboardProfileConversionEngagementCategoryId}_${AdminPsychologistsDashboardProfileConversionEngagementLevelId}`;

export type AdminPsychologistsDashboardProfileConversionEngagementQuadrant = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionEngagementQuadrantId;
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

export type AdminPsychologistsDashboardProfileConversionEngagementRate = {
  psychologists: number;
  strong_conversion_count: number;
  strong_conversion_rate: number | null;
};

export type AdminPsychologistsDashboardProfileConversionEngagementResults = {
  comparison: {
    engaged: AdminPsychologistsDashboardProfileConversionEngagementRate;
    high_engagement: AdminPsychologistsDashboardProfileConversionEngagementRate;
    low_engaged: AdminPsychologistsDashboardProfileConversionEngagementRate;
    low_engagement: AdminPsychologistsDashboardProfileConversionEngagementRate;
    engaged_vs_low_rate_difference_points: number | null;
    engaged_vs_no_rate_difference_points: number | null;
    no_engagement: AdminPsychologistsDashboardProfileConversionEngagementRate;
    rate_difference_points: number | null;
    very_engaged: AdminPsychologistsDashboardProfileConversionEngagementRate;
    very_vs_low_rate_difference_points: number | null;
    very_vs_no_rate_difference_points: number | null;
  };
  description: string;
  quadrants: AdminPsychologistsDashboardProfileConversionEngagementQuadrant[];
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

export type AdminPsychologistsDashboardProfileConversionMatrixCategoryId = Exclude<
  AdminPsychologistsDashboardProfileConversionCategoryId,
  "insufficient_data"
>;

export type AdminPsychologistsDashboardProfileConversionMatrixRow = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionMatrixCategoryId;
  label: string;
  percentage: number;
  totals: {
    whatsapp_clicks: number;
  };
};

export type AdminPsychologistsDashboardProfileEngagementFavoritesTotals = {
  comments_received: number;
  community_engagement_score: number;
  content_saves: number;
  content_shares: number;
  favorites: number;
  positive_votes: number;
  received_community_interactions: number;
  whatsapp_clicks: number;
};

export type AdminPsychologistsDashboardProfileEngagementFavoritesCategory = {
  count: number;
  description: string;
  engagement_id: AdminProfileEngagementFavoritesCommunityCategoryId | null;
  engagement_label: string | null;
  favorites_id: AdminProfileEngagementFavoritesFavoriteCategoryId | null;
  favorites_label: string | null;
  id: AdminProfileEngagementFavoritesCategoryId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type AdminPsychologistsDashboardProfileEngagementFavoritesResults = {
  benchmark: AdminProfileEngagementFavoritesBenchmark;
  categories: AdminPsychologistsDashboardProfileEngagementFavoritesCategory[];
  description: string;
  source: AdminProfileEngagementFavoritesSource;
  thresholds: AdminProfileEngagementFavoritesThresholds & {
    score: AdminProfileEngagementFavoritesScoreConfig;
  };
  totals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    engaged_psychologists: number;
    favorited_psychologists: number;
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionEngagementFavoritesColumnId =
  AdminProfileEngagementFavoritesCombinationId;

export type AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixColumn = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionEngagementFavoritesColumnId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId =
  `${AdminPsychologistsDashboardProfileConversionMatrixCategoryId}_${AdminPsychologistsDashboardProfileConversionEngagementFavoritesColumnId}`;

export type AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrant = {
  column_id: AdminPsychologistsDashboardProfileConversionEngagementFavoritesColumnId;
  column_label: string;
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrantId;
  label: string;
  percentage: number;
  row_id: AdminPsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals;
};

export type AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults = {
  columns: AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixColumn[];
  description: string;
  quadrants: AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixQuadrant[];
  rows: AdminPsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: AdminPsychologistsDashboardProfileEngagementFavoritesTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileConversionVisibilityColumnId =
  AdminProfileExposureCombinationId;

export type AdminPsychologistsDashboardProfileConversionVisibilityMatrixColumn = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionVisibilityColumnId;
  label: string;
  percentage: number;
  totals: AdminPsychologistsDashboardProfileExposureTotals;
};

export type AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId =
  `${AdminPsychologistsDashboardProfileConversionMatrixCategoryId}_${AdminPsychologistsDashboardProfileConversionVisibilityColumnId}`;

export type AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrant = {
  column_id: AdminPsychologistsDashboardProfileConversionVisibilityColumnId;
  column_label: string;
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrantId;
  label: string;
  percentage: number;
  row_id: AdminPsychologistsDashboardProfileConversionMatrixCategoryId;
  row_label: string;
  totals: AdminPsychologistsDashboardProfileExposureTotals & {
    whatsapp_clicks: number;
  };
};

export type AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults = {
  columns: AdminPsychologistsDashboardProfileConversionVisibilityMatrixColumn[];
  description: string;
  quadrants: AdminPsychologistsDashboardProfileConversionVisibilityMatrixQuadrant[];
  rows: AdminPsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
  totals: AdminPsychologistsDashboardProfileExposureTotals & {
    adaptation_psychologists: number;
    eligible_psychologists: number;
    psychologists: number;
    whatsapp_clicks: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileCrossMatrixAxisId =
  | "activity"
  | "community_content_format"
  | "community_visibility"
  | "coverage"
  | "conversion"
  | "engagement"
  | "favorites"
  | "presentation_video_position"
  | "presentation_video_retention"
  | "presentation_video_visibility"
  | "profile_opening"
  | "reviews";

export type AdminPsychologistsDashboardProfileCrossMatrixCategory = {
  color: string;
  count: number;
  description: string;
  id: string;
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardProfileCrossMatrixAxis = {
  categories: AdminPsychologistsDashboardProfileCrossMatrixCategory[];
  description: string;
  id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  label: string;
  source: string;
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileCrossMatrixQuadrant = {
  column_id: string;
  column_label: string;
  count: number;
  description: string;
  id: string;
  label: string;
  percentage: number;
  row_id: string;
  row_label: string;
};

export type AdminPsychologistsDashboardProfileCrossMatrix = {
  column_axis_id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  columns: AdminPsychologistsDashboardProfileCrossMatrixCategory[];
  description: string;
  id: string;
  quadrants: AdminPsychologistsDashboardProfileCrossMatrixQuadrant[];
  row_axis_id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  rows: AdminPsychologistsDashboardProfileCrossMatrixCategory[];
  source: string;
  title: string;
  totals: {
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardProfileCrossMatrixResults = {
  axes: AdminPsychologistsDashboardProfileCrossMatrixAxis[];
  default_column_axis_id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  default_row_axis_id: AdminPsychologistsDashboardProfileCrossMatrixAxisId;
  description: string;
  matrices: AdminPsychologistsDashboardProfileCrossMatrix[];
  source: string;
  totals: {
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type AdminPsychologistsDashboardPlanSegment = "all" | "courtesy" | "free" | "subscribers";

export type AdminPsychologistsDashboardPlanSegmentSummary = {
  device_usage: AdminPsychologistsDashboardDeviceUsage;
  id: AdminPsychologistsDashboardPlanSegment;
  label: string;
  platform_usage: AdminPsychologistsDashboardPlatformUsage;
  pre_signup_conversion: AdminPsychologistsDashboardPreSignupConversion;
  psychologists_count: number;
  signup_method: AdminPsychologistsDashboardSignupMethod;
  statistics: AdminPsychologistsDashboardStatistics;
  profile_activity: AdminPsychologistsDashboardProfileActivityResults;
  profile_coverage: AdminPsychologistsDashboardProfileCoverageResults;
  profile_conversion_activity: AdminPsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion_behavior: AdminPsychologistsDashboardProfileConversionBehaviorResults;
  profile_cross_matrix: AdminPsychologistsDashboardProfileCrossMatrixResults;
  profile_engagement_favorites: AdminPsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion: AdminPsychologistsDashboardProfileConversionResults;
  profile_conversion_engagement: AdminPsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: AdminPsychologistsDashboardProfileExposureResults;
  traffic_sources: AdminPsychologistsDashboardTrafficSources;
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
  pre_signup_conversion: AdminPsychologistsDashboardPreSignupConversion;
  directory_filters: AdminPsychologistsDashboardDirectoryFilters;
  operating_system_usage: AdminPsychologistsDashboardOperatingSystemUsage;
  plan_segments: Record<
    AdminPsychologistsDashboardPlanSegment,
    AdminPsychologistsDashboardPlanSegmentSummary
  >;
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
  profile_activity: AdminPsychologistsDashboardProfileActivityResults;
  profile_coverage: AdminPsychologistsDashboardProfileCoverageResults;
  profile_conversion_activity: AdminPsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion_behavior: AdminPsychologistsDashboardProfileConversionBehaviorResults;
  profile_cross_matrix: AdminPsychologistsDashboardProfileCrossMatrixResults;
  profile_engagement_favorites: AdminPsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion: AdminPsychologistsDashboardProfileConversionResults;
  profile_conversion_engagement: AdminPsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: AdminPsychologistsDashboardProfileExposureResults;
  traffic_sources: AdminPsychologistsDashboardTrafficSources;
  unavailable: AdminPsychologistsDashboardUnavailableMetric[];
};

export type IAdminPsychologistsDashboardDTO = Request & {
  q: AdminPsychologistsDashboardQuery;
};
