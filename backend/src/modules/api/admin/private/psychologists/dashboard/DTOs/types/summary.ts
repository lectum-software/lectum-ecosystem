import type { Request } from "express";

import type {
  AdminPsychologistsDashboardConversion,
  AdminPsychologistsDashboardConversionBySignupMethodItem,
  AdminPsychologistsDashboardDeviceUsage,
  AdminPsychologistsDashboardOperatingSystemUsage,
  AdminPsychologistsDashboardPlatformUsage,
  AdminPsychologistsDashboardPreSignupConversion,
  AdminPsychologistsDashboardSignupMethod,
  AdminPsychologistsDashboardTrafficSources,
  AdminPsychologistsDashboardUnavailableMetric,
} from "./conversion-platform";
import type {
  AdminPsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults,
  AdminPsychologistsDashboardProfileConversionEngagementResults,
  AdminPsychologistsDashboardProfileConversionVisibilityMatrixResults,
  AdminPsychologistsDashboardProfileEngagementFavoritesResults,
  AdminPsychologistsDashboardProfileExposureResults,
} from "./profile-engagement";

import type {
  AdminPsychologistsDashboardProfileActivityResults,
  AdminPsychologistsDashboardProfileConversionActivityMatrixResults,
  AdminPsychologistsDashboardProfileConversionBehaviorResults,
  AdminPsychologistsDashboardProfileConversionGoalResults,
  AdminPsychologistsDashboardProfileConversionResults,
  AdminPsychologistsDashboardProfileCoverageResults,
} from "./profile-performance";
import type {
  AdminPsychologistsDashboardDailyPoint,
  AdminPsychologistsDashboardDirectoryFilters,
  AdminPsychologistsDashboardFilterSearches,
  AdminPsychologistsDashboardMetric,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPsychologist,
  AdminPsychologistsDashboardQuery,
  AdminPsychologistsDashboardRankingItem,
  AdminPsychologistsDashboardStatistics,
} from "./statistics";

export type AdminPsychologistsDashboardProfileCrossMatrixAxisId =
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
  profile_conversion_goal: AdminPsychologistsDashboardProfileConversionGoalResults;
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
  profile_conversion_goal: AdminPsychologistsDashboardProfileConversionGoalResults;
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
