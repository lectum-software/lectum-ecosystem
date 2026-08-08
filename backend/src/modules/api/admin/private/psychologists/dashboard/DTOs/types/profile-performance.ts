import type {
  AdminProfileConversionAbsoluteThresholds,
  AdminProfileConversionBenchmark,
  AdminProfileConversionQualityId,
  AdminProfileConversionSource,
  AdminProfileConversionThresholds,
} from "@/utils/admin-profile-conversion";

import type {
  AdminPsychologistsDashboardProfileConversionMatrixCategoryId,
  AdminPsychologistsDashboardProfileConversionMatrixRow,
} from "./profile-engagement";

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

export type AdminPsychologistsDashboardProfileConversionGoalCategoryId = Exclude<
  AdminProfileConversionQualityId,
  "no_conversion"
>;

export type AdminPsychologistsDashboardProfileConversionGoalCategory = {
  count: number;
  description: string;
  id: AdminPsychologistsDashboardProfileConversionGoalCategoryId;
  label: string;
  percentage: number;
  totals: {
    normalized_whatsapp_clicks_30d: number;
    whatsapp_clicks: number;
  };
};

export type AdminPsychologistsDashboardProfileConversionGoalResults = {
  categories: AdminPsychologistsDashboardProfileConversionGoalCategory[];
  description: string;
  source: AdminProfileConversionSource;
  thresholds: AdminProfileConversionThresholds & {
    absolute: AdminProfileConversionAbsoluteThresholds;
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
