import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type PatientsDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type PatientsDetailQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
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

export type PatientsDashboardPlatformUsage = {
  active_patients_count: number;
  active_patients_rate: number | null;
  average_access_days: number | null;
  average_duration_seconds: number | null;
  average_sessions: number | null;
  duration_unavailable_reason: string | null;
  eligible_patients_count: number;
  pageviews_count: number;
  pwa_installed_patients_count: number;
  pwa_installed_patients_rate: number | null;
  series: {
    active_patients: number;
    date: string;
    pageviews: number;
    sessions: number;
  }[];
  sessions_count: number;
  source: "page_view_event+important_action_event";
  top_pages: {
    count: number;
    label: string;
    percentage: number;
  }[];
  unavailable_reason: string | null;
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
  platform_usage: PatientsDashboardPlatformUsage;
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

export type PatientsDetailMetric = {
  change_percent: number | null;
  description: string;
  id:
    | "comments_created"
    | "downvotes_received"
    | "posts_created"
    | "responses_received"
    | "upvotes_received";
  label: string;
  previous_value: number;
  source: string;
  trend: PatientsDashboardTrend;
  unit: "count";
  value: number;
};

export type PatientsDetailPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "America/Sao_Paulo";
  to: string;
};

export type PatientsDetailSeriesPoint = {
  comments_created: number;
  date: string;
  downvotes_received: number;
  posts_created: number;
  responses_received: number;
  upvotes_received: number;
};

export type PatientsDetailActivity = {
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source:
    | "community_member"
    | "community_post"
    | "post_reply"
    | "post_reply_save"
    | "post_save"
    | "post_vote"
    | "professional_review";
  title: string;
  type:
    | "community_joined"
    | "post_created"
    | "post_reply_created"
    | "post_reply_saved"
    | "post_saved"
    | "post_vote"
    | "professional_review_created";
};

export type PatientsDetailCommunity = {
  avatar_url: string | null;
  color: string | null;
  id: string;
  interactions: number;
  is_member: boolean;
  member_since: string | null;
  name: string;
  slug: string;
};

export type PatientsDetailHeatmapCell = {
  count: number;
  day: string;
  day_index: number;
  hour: number;
  hour_label: string;
};

export type PatientsDetailUnavailable = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientDetail = {
  activities: {
    coverage_note: string;
    items: PatientsDetailActivity[];
    source: "community_activity+professional_review";
  };
  communities: {
    items: PatientsDetailCommunity[];
    source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save";
  };
  coverage_notes: string[];
  header: {
    active: boolean;
    avatar: string | null;
    created_at: string;
    email: string;
    gender: string | null;
    id: string;
    location: {
      captured_at: string;
      city: string | null;
      country: string | null;
      source: string;
      state: string | null;
    } | null;
    name: string;
    onboarding_completed_at: string | null;
    provider: string;
    provider_label: string;
    status: "active" | "inactive";
    status_label: "Ativo" | "Inativo";
  };
  heatmap: {
    available: boolean;
    cells: PatientsDetailHeatmapCell[];
    max_count: number;
    source: "community_post+post_reply+post_vote+post_save+post_reply_save";
    timezone: "America/Sao_Paulo";
    total_events: number;
    unavailable_reason: string | null;
  };
  metrics: PatientsDetailMetric[];
  period: PatientsDetailPeriod;
  privacy: {
    omitted_fields: string[];
    visible_fields: string[];
  };
  series: {
    points: PatientsDetailSeriesPoint[];
    source: "community_post+post_reply+post_vote+responses";
  };
  source: "user+patient_profile+visitor_location+community_activity+professional_review";
  unavailable: PatientsDetailUnavailable[];
};

const cleanParams = (input: PatientsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
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

export const getAdminPatientDetail = async (id: string, input: PatientsDetailQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientDetail>>(
    `/api/admin/private/patients/${id}`,
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};
