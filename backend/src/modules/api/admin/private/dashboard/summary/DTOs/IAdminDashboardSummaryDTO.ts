import type { Request } from "express";

export type AdminDashboardQuery = {
  from?: string;
  to?: string;
};

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
    posts: AdminDashboardDailyPoint[];
    source: "community_post+post_reply";
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
