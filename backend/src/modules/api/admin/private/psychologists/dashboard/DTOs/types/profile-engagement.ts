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

import type { AdminPsychologistsDashboardProfileConversionCategoryId } from "./profile-performance";

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
