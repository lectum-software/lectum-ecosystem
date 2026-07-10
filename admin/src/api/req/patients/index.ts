import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type PatientsDashboardQuery = {
  from?: string;
  to?: string;
};

export type PatientsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type PatientsDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: PatientsDashboardTrend;
  unit: "count";
  unavailable: boolean;
  value: number;
};

export type PatientsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type PatientsDashboardDailyPoint = {
  active_patients: number;
  date: string;
  inactive_patients: number;
  new_signups: number;
  total_patients: number;
};

export type PatientsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type PatientsDashboardRecentActivity = {
  description: string;
  detail_url: string | null;
  label: string;
  occurred_at: string;
  source: string;
  type: string;
};

export type PatientsDashboardRecentPatient = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  detail_url: string;
  email: string;
  gender: string | null;
  id: string;
  last_location_at: string | null;
  name: string;
  provider: string;
  provider_label: string;
  recent_activity: PatientsDashboardRecentActivity | null;
  state: string | null;
  status: "active" | "inactive";
  status_label: "Ativo" | "Inativo";
};

export type PatientsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientsDashboard = {
  cards: {
    active_patients: PatientsDashboardMetric;
    inactive_patients: PatientsDashboardMetric;
    new_signups: PatientsDashboardMetric;
    total_patients: PatientsDashboardMetric;
  };
  coverage_notes: string[];
  demographics: {
    gender: {
      items: PatientsDashboardBreakdownItem[];
      source: "patient_profile.gender";
      total: number;
    };
    signup_sources: {
      items: PatientsDashboardBreakdownItem[];
      source: "user.provider";
      total: number;
    };
  };
  export: {
    available: false;
    reason: string;
  };
  locations: {
    cities: PatientsDashboardBreakdownItem[];
    countries: PatientsDashboardBreakdownItem[];
    source: "visitor_location";
    states: PatientsDashboardBreakdownItem[];
    total: number;
  };
  period: PatientsDashboardPeriod;
  recent_patients: {
    items: PatientsDashboardRecentPatient[];
    source: "user+patient_profile+visitor_location+community_activity";
    total: number;
  };
  series: {
    points: PatientsDashboardDailyPoint[];
    source: "user.createdAt+user.active";
  };
  unavailable: PatientsDashboardUnavailableMetric[];
};

const cleanParams = (input: PatientsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const getAdminPatientsDashboard = async (input: PatientsDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientsDashboard>>(
    "/api/admin/private/patients/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};
