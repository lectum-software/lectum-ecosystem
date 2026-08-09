import type { AdminPublicSource } from "@/api/public-response";
import type {
  PsychologistsDashboardDeviceUsage,
  PsychologistsDashboardPlatformUsage,
  PsychologistsDashboardPreSignupConversion,
  PsychologistsDashboardSignupMethod,
  PsychologistsDashboardStatistics,
  PsychologistsDashboardTrafficSources,
} from "./dashboard-core";
import type {
  PsychologistsDashboardProfileActivityCategoryId,
  PsychologistsDashboardProfileActivityResults,
  PsychologistsDashboardProfileActivityTotals,
  PsychologistsDashboardProfileConversionCategoryId,
  PsychologistsDashboardProfileConversionGoalResults,
  PsychologistsDashboardProfileConversionResults,
  PsychologistsDashboardProfileCoverageResults,
  PsychologistsDashboardProfileEngagementFavoritesCategoryId,
  PsychologistsDashboardProfileEngagementFavoritesResults,
  PsychologistsDashboardProfileEngagementFavoritesTotals,
  PsychologistsDashboardProfileExposureCategoryId,
  PsychologistsDashboardProfileExposureResults,
  PsychologistsDashboardProfileExposureTotals,
} from "./dashboard-profile";

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
  source: AdminPublicSource<"contact_request.channel=whatsapp+user.createdAt+platform_percentiles+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share">;
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

export type PsychologistsDashboardProfileConversionBehaviorElementId =
  | "communities"
  | "favorite"
  | "profile"
  | "presentation_video";

export type PsychologistsDashboardProfileConversionBehaviorMetric = {
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

export type PsychologistsDashboardProfileConversionBehaviorColumn = {
  description: string;
  id: PsychologistsDashboardProfileConversionBehaviorElementId;
  label: string;
};

export type PsychologistsDashboardProfileConversionBehaviorCell = {
  element_id: PsychologistsDashboardProfileConversionBehaviorElementId;
  headline: string;
  id: `${PsychologistsDashboardProfileConversionMatrixCategoryId}_${PsychologistsDashboardProfileConversionBehaviorElementId}`;
  metrics: PsychologistsDashboardProfileConversionBehaviorMetric[];
  row_id: PsychologistsDashboardProfileConversionMatrixCategoryId;
  source: string;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileConversionBehaviorResults = {
  cells: PsychologistsDashboardProfileConversionBehaviorCell[];
  columns: PsychologistsDashboardProfileConversionBehaviorColumn[];
  description: string;
  rows: PsychologistsDashboardProfileConversionMatrixRow[];
  source: string;
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

export type PsychologistsDashboardProfileCrossMatrixAxisId =
  | "activity"
  | "community_content_format"
  | "community_visibility"
  | "coverage"
  | "conversion"
  | "conversion_goal"
  | "engagement"
  | "favorites"
  | "presentation_video_position"
  | "presentation_video_retention"
  | "presentation_video_visibility"
  | "profile_opening"
  | "reviews";

export type PsychologistsDashboardProfileCrossMatrixCategory = {
  color: string;
  count: number;
  description: string;
  id: string;
  label: string;
  percentage: number;
};

export type PsychologistsDashboardProfileCrossMatrixAxis = {
  categories: PsychologistsDashboardProfileCrossMatrixCategory[];
  description: string;
  id: PsychologistsDashboardProfileCrossMatrixAxisId;
  label: string;
  source: string;
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileCrossMatrixQuadrant = {
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

export type PsychologistsDashboardProfileCrossMatrix = {
  column_axis_id: PsychologistsDashboardProfileCrossMatrixAxisId;
  columns: PsychologistsDashboardProfileCrossMatrixCategory[];
  description: string;
  id: string;
  quadrants: PsychologistsDashboardProfileCrossMatrixQuadrant[];
  row_axis_id: PsychologistsDashboardProfileCrossMatrixAxisId;
  rows: PsychologistsDashboardProfileCrossMatrixCategory[];
  source: string;
  title: string;
  totals: {
    psychologists: number;
  };
  unavailable_reason: string | null;
};

export type PsychologistsDashboardProfileCrossMatrixResults = {
  axes: PsychologistsDashboardProfileCrossMatrixAxis[];
  default_column_axis_id: PsychologistsDashboardProfileCrossMatrixAxisId;
  default_row_axis_id: PsychologistsDashboardProfileCrossMatrixAxisId;
  description: string;
  matrices: PsychologistsDashboardProfileCrossMatrix[];
  source: string;
  totals: {
    psychologists: number;
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
  profile_coverage: PsychologistsDashboardProfileCoverageResults;
  profile_conversion_activity: PsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion_behavior: PsychologistsDashboardProfileConversionBehaviorResults;
  profile_conversion_goal: PsychologistsDashboardProfileConversionGoalResults;
  profile_cross_matrix: PsychologistsDashboardProfileCrossMatrixResults;
  profile_conversion: PsychologistsDashboardProfileConversionResults;
  profile_engagement_favorites: PsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion_engagement: PsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: PsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: PsychologistsDashboardProfileExposureResults;
  traffic_sources: PsychologistsDashboardTrafficSources;
};
