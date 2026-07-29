import type { Request } from "express";

export type AdminDashboardQuery = {
  from?: string;
  period?: AdminDashboardPeriodPreset | "custom";
  to?: string;
};

export type AdminDashboardPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "year"
  | "7d"
  | "30d"
  | "90d"
  | "all";

export type AdminDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminDashboardTrend;
  unit: "count" | "currency_cents";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type AdminDashboardDailyPoint = {
  count: number;
  date: string;
};

export type AdminDashboardFinancialPoint = {
  active_subscriptions: number;
  date: string;
  value_cents: number;
};

export type AdminDashboardSeverity = "alta" | "baixa" | "media";

export type AdminDashboardLocationItem = {
  count: number;
  country: string;
  percentage: number;
};

export type AdminDashboardDeviceItem = {
  count: number;
  device_type: "desktop" | "mobile" | "tablet" | "unknown";
  label: string;
  percentage: number;
};

export type AdminDashboardPendingReport = {
  community_name: string | null;
  created_at: Date;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string | null;
  severity: AdminDashboardSeverity;
  status: string;
  target_id: string;
  target_title: string;
  target_type: string;
};

export type AdminDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminDashboardIntentConversionIntentId = "curious" | "objective" | "very_qualified";

export type AdminDashboardIntentConversionCategoryId =
  | "low_conversion"
  | "strong_conversion"
  | "unconverted_interest"
  | "unconverted_traffic";

export type AdminDashboardIntentConversionNode = {
  count: number;
  description: string;
  id: string;
  label: string;
  percentage: number;
};

export type AdminDashboardIntentConversionFlowItem = {
  conversion_id: AdminDashboardIntentConversionCategoryId;
  conversion_label: string;
  conversion_percentage: number;
  count: number;
  id: `${AdminDashboardIntentConversionIntentId}_${AdminDashboardIntentConversionCategoryId}`;
  intent_id: AdminDashboardIntentConversionIntentId;
  intent_label: string;
  intent_percentage: number;
  percentage: number;
};

export type AdminDashboardIntentConversionInsight = {
  count: number;
  description: string;
  id: "exploratory_loss" | "healthy_absorption" | "retained_intention";
  label: string;
  percentage: number;
};

export type AdminDashboardIntentConversionFlow = {
  coverage_note: string;
  flows: AdminDashboardIntentConversionFlowItem[];
  insights: AdminDashboardIntentConversionInsight[];
  intents: AdminDashboardIntentConversionNode[];
  psychologist_conversions: AdminDashboardIntentConversionNode[];
  privacy_note: string;
  source: "profile_view_event+psychologist_favorite+contact_request";
  total_pairs: number;
  unavailable_reason: string | null;
};

export type AdminDashboardSummary = {
  cards: {
    patients: AdminDashboardMetric;
    pending_reports: AdminDashboardMetric;
    psychologists: AdminDashboardMetric;
    revenue: AdminDashboardMetric;
    sessions: AdminDashboardMetric;
  };
  community_activity: {
    comments: AdminDashboardDailyPoint[];
    patient_comments: AdminDashboardDailyPoint[];
    patient_posts: AdminDashboardDailyPoint[];
    posts: AdminDashboardDailyPoint[];
    psychologist_posts: AdminDashboardDailyPoint[];
    psychologist_replies: AdminDashboardDailyPoint[];
    source: "community_post+post_reply+user.role";
  };
  devices: {
    items: AdminDashboardDeviceItem[];
    source: "visitor_session.device_type";
    total: number;
  };
  financial: {
    confirmed_revenue_available: boolean;
    daily: AdminDashboardFinancialPoint[];
    label: string;
    mrr_cents: number;
    period_estimate_cents: number;
    source: "active_subscription_estimate";
    unavailable_reason: string | null;
  };
  intent_conversion_flow: AdminDashboardIntentConversionFlow;
  locations: {
    items: AdminDashboardLocationItem[];
    source: "visitor_location.country";
    total: number;
  };
  pending_reports: {
    items: AdminDashboardPendingReport[];
    source: "post_report";
    total: number;
  };
  period: AdminDashboardPeriod;
  unavailable: AdminDashboardUnavailableMetric[];
};

export type IAdminDashboardSummaryDTO = Request & {
  q: AdminDashboardQuery;
};
