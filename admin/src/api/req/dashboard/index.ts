import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type DashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: "down" | "flat" | "unavailable" | "up";
  unit: "count" | "currency_cents";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type DashboardSummaryQuery = {
  from?: string;
  period?: DashboardPeriodPreset | "custom";
  to?: string;
};

export type DashboardPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "year"
  | "7d"
  | "30d"
  | "90d"
  | "all";

export type DashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type DashboardDailyPoint = {
  count: number;
  date: string;
};

export type DashboardFinancialPoint = {
  active_subscriptions: number;
  date: string;
  value_cents: number;
};

export type DashboardDeviceItem = {
  count: number;
  device_type: "desktop" | "mobile" | "tablet" | "unknown";
  label: string;
  percentage: number;
};

export type DashboardLocationItem = {
  count: number;
  country: string;
  percentage: number;
};

export type DashboardPendingReport = {
  community_name: string | null;
  created_at: string;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string | null;
  severity: "alta" | "baixa" | "media";
  status: string;
  target_id: string;
  target_title: string;
  target_type: string;
};

export type DashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type DashboardIntentConversionIntentId = "curious" | "objective" | "very_qualified";

export type DashboardIntentConversionCategoryId =
  | "low_conversion"
  | "strong_conversion"
  | "unconverted_interest"
  | "unconverted_traffic";

export type DashboardIntentConversionNode = {
  count: number;
  description: string;
  id: string;
  label: string;
  percentage: number;
};

export type DashboardIntentConversionFlowItem = {
  conversion_id: DashboardIntentConversionCategoryId;
  conversion_label: string;
  conversion_percentage: number;
  count: number;
  id: `${DashboardIntentConversionIntentId}_${DashboardIntentConversionCategoryId}`;
  intent_id: DashboardIntentConversionIntentId;
  intent_label: string;
  intent_percentage: number;
  percentage: number;
};

export type DashboardIntentConversionInsight = {
  count: number;
  description: string;
  id: "exploratory_loss" | "healthy_absorption" | "retained_intention";
  label: string;
  percentage: number;
};

export type DashboardIntentConversionFlow = {
  coverage_note: string;
  flows: DashboardIntentConversionFlowItem[];
  insights: DashboardIntentConversionInsight[];
  intents: DashboardIntentConversionNode[];
  psychologist_conversions: DashboardIntentConversionNode[];
  privacy_note: string;
  source: "profile_view_event+psychologist_favorite+contact_request";
  total_pairs: number;
  unavailable_reason: string | null;
};

export type AdminDashboardSummary = {
  cards: {
    patients: DashboardMetric;
    pending_reports: DashboardMetric;
    psychologists: DashboardMetric;
    revenue: DashboardMetric;
    sessions: DashboardMetric;
  };
  community_activity: {
    comments: DashboardDailyPoint[];
    patient_comments: DashboardDailyPoint[];
    patient_posts: DashboardDailyPoint[];
    posts: DashboardDailyPoint[];
    psychologist_posts: DashboardDailyPoint[];
    psychologist_replies: DashboardDailyPoint[];
    source: "community_post+post_reply+user.role";
  };
  devices: {
    items: DashboardDeviceItem[];
    source: "visitor_session.device_type";
    total: number;
  };
  financial: {
    confirmed_revenue_available: boolean;
    daily: DashboardFinancialPoint[];
    label: string;
    mrr_cents: number;
    period_estimate_cents: number;
    source: "active_subscription_estimate";
    unavailable_reason: string | null;
  };
  intent_conversion_flow: DashboardIntentConversionFlow;
  locations: {
    items: DashboardLocationItem[];
    source: "visitor_location.country";
    total: number;
  };
  pending_reports: {
    items: DashboardPendingReport[];
    source: "post_report";
    total: number;
  };
  period: DashboardPeriod;
  unavailable: DashboardUnavailableMetric[];
};

const cleanParams = (input: DashboardSummaryQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const resolveFilename = (header?: string) => {
  if (!header) return null;

  const filenameMatch = header.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? null;
};

export const getAdminDashboardSummary = async (input: DashboardSummaryQuery) => {
  const response = await adminApi.get<ApiResponse<AdminDashboardSummary>>(
    "/api/admin/private/dashboard/summary",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const exportAdminDashboardSummary = async (input: DashboardSummaryQuery) => {
  const response = await adminApi.get<Blob>("/api/admin/private/dashboard/export", {
    params: cleanParams(input),
    responseType: "blob",
  });
  const filename =
    resolveFilename(response.headers["content-disposition"]) ||
    `lectum-admin-dashboard-${input.from || "default"}-${input.to || "default"}.csv`;

  return {
    blob: response.data,
    filename,
  };
};
