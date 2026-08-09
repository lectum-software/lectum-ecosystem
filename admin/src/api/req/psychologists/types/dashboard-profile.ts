import type { AdminPublicSource } from "@/api/public-response";
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

export type PsychologistsDashboardProfileConversionGoalCategoryId =
  | "excellent_conversion"
  | "good_conversion"
  | "insufficient_data"
  | "low_conversion";

export type PsychologistsDashboardProfileConversionGoalCategory = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileConversionGoalCategoryId;
  label: string;
  percentage: number;
  totals: {
    normalized_whatsapp_clicks_30d: number;
    whatsapp_clicks: number;
  };
};

export type PsychologistsProfileConversionAbsoluteThresholds = {
  excellent_whatsapp_clicks_30d: number;
  good_whatsapp_clicks_30d: number;
};

export type PsychologistsDashboardProfileConversionGoalResults = {
  categories: PsychologistsDashboardProfileConversionGoalCategory[];
  description: string;
  source: PsychologistsProfileConversionSource;
  thresholds: PsychologistsProfileConversionThresholds & {
    absolute: PsychologistsProfileConversionAbsoluteThresholds;
  };
  totals: {
    adaptation_psychologists: number;
    excellent_goal_psychologists: number;
    goal_psychologists: number;
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
  source: AdminPublicSource<"community_post.author_id+post_reply.author_id">;
  thresholds: PsychologistsDashboardProfileActivityThresholds;
  totals: PsychologistsDashboardProfileActivityTotals & {
    psychologists: number;
    psychologists_with_actions: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileCoverageCategoryId =
  | "above_average_coverage"
  | "average_coverage"
  | "below_average_coverage"
  | "no_coverage";

export type PsychologistsDashboardProfileCoverageCategory = {
  count: number;
  description: string;
  id: PsychologistsDashboardProfileCoverageCategoryId;
  label: string;
  percentage: number;
  totals: {
    patient_posts_answered: number;
  };
};

export type PsychologistsDashboardProfileCoverageResults = {
  categories: PsychologistsDashboardProfileCoverageCategory[];
  description: string;
  source: AdminPublicSource<"post_reply.author_id+post_reply.post.author.role=paciente+distinct(post_id)">;
  totals: {
    average_patient_posts_answered: number;
    patient_posts_answered: number;
    psychologists: number;
    psychologists_with_coverage: number;
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
