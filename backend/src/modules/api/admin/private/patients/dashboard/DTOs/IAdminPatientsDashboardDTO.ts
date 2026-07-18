import type { Request } from "express";

export type AdminPatientsDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPatientsDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminPatientsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminPatientsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPatientsDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminPatientsDashboardTrend;
  unit: "count";
  unavailable: boolean;
  value: number;
};

export type AdminPatientsDashboardDailyPoint = {
  active_patients: number;
  date: string;
  inactive_patients: number;
  new_signups: number;
  total_patients: number;
};

export type AdminPatientsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminPatientsDashboardLocationItem = AdminPatientsDashboardBreakdownItem;

export type AdminPatientsDashboardRecentActivity = {
  description: string;
  detail_url: string | null;
  label: string;
  occurred_at: Date;
  source: string;
  type: string;
};

export type AdminPatientsDashboardRecentPatient = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: Date;
  detail_url: string;
  email: string;
  gender: string | null;
  id: string;
  last_location_at: Date | null;
  name: string;
  provider: string;
  provider_label: string;
  recent_activity: AdminPatientsDashboardRecentActivity | null;
  state: string | null;
  status: "active" | "inactive";
  status_label: "Ativo" | "Inativo";
};

export type AdminPatientsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientsDashboardPlatformUsage = {
  average_duration_seconds: number | null;
  duration_unavailable_reason: string | null;
  pageviews_count: number;
  sessions_count: number;
  source: "page_view_event";
};

export type AdminPatientsDashboardSummary = {
  cards: {
    active_patients: AdminPatientsDashboardMetric;
    inactive_patients: AdminPatientsDashboardMetric;
    new_signups: AdminPatientsDashboardMetric;
    total_patients: AdminPatientsDashboardMetric;
  };
  coverage_notes: string[];
  demographics: {
    gender: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: AdminPatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  export: {
    available: false;
    reason: string;
  };
  locations: {
    cities: AdminPatientsDashboardLocationItem[];
    countries: AdminPatientsDashboardLocationItem[];
    source: "visitor_location";
    states: AdminPatientsDashboardLocationItem[];
    total: number;
  };
  period: AdminPatientsDashboardPeriod;
  platform_usage: AdminPatientsDashboardPlatformUsage;
  recent_patients: {
    items: AdminPatientsDashboardRecentPatient[];
    source: "user+patient_profile+visitor_location+community_activity";
    total: number;
  };
  series: {
    points: AdminPatientsDashboardDailyPoint[];
    source: "user.createdAt+user.active";
  };
  unavailable: AdminPatientsDashboardUnavailableMetric[];
};

export type IAdminPatientsDashboardDTO = Request & {
  q: AdminPatientsDashboardQuery;
};
