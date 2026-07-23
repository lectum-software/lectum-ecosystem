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

export type AdminPatientUpdatePersonalDataInput = {
  display_name?: string;
  gender?: string | null;
  reason: string;
};

export type AdminPatientAccount = {
  active: boolean;
  account_status_expires_at: string | null;
  account_status: "active" | "deactivated" | "deleted" | "suspended";
  account_status_changed_at: string | null;
  account_status_label: string;
  capabilities: {
    can_change_email: boolean;
    can_deactivate_account: boolean;
    can_delete_account: boolean;
    can_send_email_confirmation: boolean;
    can_send_password_reset: boolean;
    can_set_temporary_password: boolean;
    can_suspend_account: boolean;
    can_revoke_sessions: boolean;
  };
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  delete_blocked_reason: string | null;
  deleted: boolean;
  deleted_at: string | null;
  email: string;
  has_password: boolean;
  last_access_at: string | null;
  need_reset: boolean;
  provider: string;
  provider_label: string;
  sessions: {
    active_count: number;
    devices_count: number;
    last_access_at: string | null;
    source: "user_token";
  };
  source: "user+user_token";
};

export type AdminPatientAccountReasonInput = {
  reason: string;
};

export type AdminPatientChangeEmailInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  email: string;
};

export type AdminPatientSetTemporaryPasswordInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  password: string;
  password_confirm: string;
};

export type AdminPatientRevokeSessionsInput = AdminPatientAccountReasonInput & {
  confirmation: string;
};

export type AdminPatientAccountStatusActionInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  suspension_duration_days?: number;
};

export type AdminPatientAccountDeleteResponse = {
  deleted: true;
  id: string;
  source: "user+patient_profile+admin_activity_log";
};

export type AdminPatientActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPatientReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPatientReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPatientReportsStatusGroup;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPatientReportItem = {
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
    };
    available: boolean;
    body: string;
    community: {
      id: string;
      name: string;
      slug: string;
    };
    created_at: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    public_url: string | null;
    title: string;
    type: "post" | "reply";
    unavailable_reason: string | null;
  };
  capabilities: {
    can_review_resolution: boolean;
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  created_at: string;
  description: string | null;
  id: string;
  moderation: {
    status: string;
    status_label: string;
  };
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    name: string;
    role: string;
  };
  status: string;
  status_group: AdminPatientReportsStatusGroup;
  status_label: string;
};

export type AdminPatientReports = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  count: number;
  data: AdminPatientReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | AdminPatientReportsStatusGroup;
      label: string;
    }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    days: number | null;
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: "user+post_report+community_post+post_reply";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPatientActivityItem = {
  actor: {
    id: string;
    name: string;
    role: string;
  } | null;
  area: {
    id: string;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: string;
  type: {
    id: string;
    label: string;
  };
};

export type AdminPatientActivities = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPatientActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: {
      count: number;
      id: string;
      label: string;
    }[];
    types: {
      count: number;
      id: string;
      label: string;
    }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: "user+patient_profile+community_member+community_post+post_reply+post_vote+post_save+post_reply_save+professional_review+admin_activity_log";
  unavailable: {
    description: string;
    id: string;
    label: string;
    source: string;
  }[];
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

export type PatientsDashboardDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type PatientsDashboardDeviceUsageItem = {
  active_patients_count: number;
  count: number;
  device_type: PatientsDashboardDeviceType;
  id: PatientsDashboardDeviceType;
  label: string;
  percentage: number;
};

export type PatientsDashboardDeviceUsage = {
  items: PatientsDashboardDeviceUsageItem[];
  source: "visitor_session.device_type+user.role=paciente";
  total_active_patients: number;
  total_sessions: number;
  unavailable_reason: string | null;
};

export type PatientsDashboardIntentSegmentId = "cold" | "curious" | "objective" | "very_qualified";

export type PatientsDashboardIntentSegment = {
  count: number;
  description: string;
  id: PatientsDashboardIntentSegmentId;
  label: "Curiosos" | "Frios" | "Interessados" | "Qualificados";
  percentage: number;
};

export type PatientsDashboardIntentAnalysis = {
  coverage_note: string;
  items: PatientsDashboardIntentSegment[];
  patients_with_signals: number;
  privacy_note: string;
  signal_totals: {
    favorites: number;
    profile_views: number;
    repeated_profile_views: number;
    whatsapp_clicks: number;
  };
  source: "profile_view_event+psychologist_favorite+contact_request";
  total_patients: number;
  total_signals: number;
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
  device_usage: PatientsDashboardDeviceUsage;
  export: {
    available: false;
    reason: string;
  };
  intent_analysis: PatientsDashboardIntentAnalysis;
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
    | "reports_received"
    | "saves_received"
    | "shares_received"
    | "verified_psychologist_responses"
    | "upvotes_received";
  label: string;
  previous_value: number;
  source: string;
  trend: PatientsDashboardTrend;
  unit: "count";
  value: number;
};

export type PatientsDetailIntentMetric = {
  change_percent: number | null;
  description: string;
  id: "favorites" | "profile_views" | "repeated_profile_views" | "whatsapp_clicks";
  label: string;
  previous_value: number;
  score_contribution: number;
  score_weight: number;
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
  reports_received: number;
  saves_received: number;
  shares_received: number;
  verified_psychologist_responses: number;
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
  comments: number;
  color: string | null;
  downvotes?: number;
  engagement_diagnosis?: {
    id: "ativo" | "muito_ativo" | "pouco_ativo" | "sem_base";
    label: "Ativo" | "Muito ativo" | "Pouco ativo" | "Sem base";
    source: string;
  };
  id: string;
  interactions: number;
  is_member: boolean;
  member_since: string | null;
  name: string;
  posts: number;
  saves: number;
  slug: string;
  upvotes?: number;
  votes: number;
};

export type PatientsDetailPublicationMetric = {
  available: boolean;
  id: "comments" | "downvotes" | "reports" | "saves" | "shares" | "upvotes" | "views";
  label: string;
  source: string;
  unit: "count";
  unavailable_reason: string | null;
  value: number;
};

export type PatientsDetailPublication = {
  admin_statistics_url: string;
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  content: string;
  created_at: string;
  excerpt: string;
  id: string;
  metrics: {
    comments: PatientsDetailPublicationMetric;
    downvotes: PatientsDetailPublicationMetric;
    reports: PatientsDetailPublicationMetric;
    saves: PatientsDetailPublicationMetric;
    shares: PatientsDetailPublicationMetric;
    upvotes: PatientsDetailPublicationMetric;
    views: PatientsDetailPublicationMetric;
  };
  public_url: string;
  source: "community_post";
  title: string;
  type: "post";
  type_label: "Post";
};

export type PatientsDetailHeatmapCell = {
  count: number;
  day: string;
  day_index: number;
  hour: number;
  hour_label: string;
};

export type PatientPlatformUsageHourlyActivityPoint = {
  accesses: number;
  count: number;
  engagement: number;
  hour: number;
  label: string;
  percentage: number;
  posts: number;
  replies: number;
  reviews: number;
  total: number;
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
    last_access_at: string | null;
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
  intent_analysis: {
    coverage_note: string;
    last_signal_at: string | null;
    level: {
      id: "high" | "low" | "medium" | "no_signals";
      label: "Curioso" | "Frio" | "Interessado" | "Qualificado";
      tone: "cool" | "hot" | "neutral" | "warm";
    };
    max_score: 100;
    metrics: PatientsDetailIntentMetric[];
    privacy_note: string;
    score: number;
    source: "profile_view_event+psychologist_favorite+contact_request";
    summary: string;
    total_signals: number;
    unique_psychologists_contacted: number;
    unique_psychologists_favorited: number;
    unique_psychologists_viewed: number;
  };
  metrics: PatientsDetailMetric[];
  period: PatientsDetailPeriod;
  platform_usage: {
    access_days_count: number;
    average_duration_seconds: number | null;
    device_usage: {
      items: {
        count: number;
        device_type: "desktop" | "mobile" | "tablet" | "unknown";
        id: "desktop" | "mobile" | "tablet" | "unknown";
        label: string;
        percentage: number;
      }[];
      source: "visitor_session.device_type+user_id";
      total_sessions: number;
      unavailable_reason: string | null;
    };
    duration_unavailable_reason: string | null;
    hourly_activity: PatientPlatformUsageHourlyActivityPoint[];
    hourly_activity_by_weekday: {
      day: number;
      hours: PatientPlatformUsageHourlyActivityPoint[];
      label: string;
    }[];
    last_access_at: string | null;
    peak_activity_hours: {
      count: number;
      hour: number;
      label: string;
      percentage: number;
    }[];
    period_from: string;
    period_to: string;
    pwa_installation_recorded: boolean;
    pwa_installed_at: string | null;
    sessions_count: number;
    source: "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+community_member+professional_review";
    top_pages: {
      count: number;
      label: string;
      percentage: number;
    }[];
    unavailable_reason: string | null;
  };
  publications: {
    coverage_note: string;
    items: PatientsDetailPublication[];
    source: "community_post+post_reply+post_vote+post_save+post_share+page_view_event+post_report";
  };
  privacy: {
    omitted_fields: string[];
    visible_fields: string[];
  };
  series: {
    points: PatientsDetailSeriesPoint[];
    source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report+verified_responses";
  };
  source: "user+patient_profile+visitor_location+community_activity+professional_review";
  unavailable: PatientsDetailUnavailable[];
};

const cleanParams = (input: PatientsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanActivitiesParams = (input: AdminPatientActivitiesQuery) => ({
  ...(input.area ? { area: input.area } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

const cleanReportsParams = (input: AdminPatientReportsQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.status && input.status !== "all" ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type && input.type !== "all" ? { type: input.type } : {}),
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

export const getAdminPatientActivities = async (id: string, input: AdminPatientActivitiesQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientActivities>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/activities`,
    {
      params: cleanActivitiesParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPatientReports = async (id: string, input: AdminPatientReportsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientReports>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/reports`,
    {
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPatientAccount = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account`,
  );

  return resolveApiData(response.data);
};

export const changeAdminPatientAccountEmail = async (
  id: string,
  input: AdminPatientChangeEmailInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/change-email`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPatientAccountEmailConfirmation = async (
  id: string,
  input: AdminPatientAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/send-email-confirmation`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPatientAccountPasswordReset = async (
  id: string,
  input: AdminPatientAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/send-password-reset`,
    input,
  );

  return resolveApiData(response.data);
};

export const setAdminPatientAccountTemporaryPassword = async (
  id: string,
  input: AdminPatientSetTemporaryPasswordInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/set-temporary-password`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPatientAccountSessions = async (
  id: string,
  input: AdminPatientRevokeSessionsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/revoke-sessions`,
    input,
  );

  return resolveApiData(response.data);
};

export const suspendAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/suspend`,
    input,
  );

  return resolveApiData(response.data);
};

export const deactivateAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccount>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/deactivate`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminPatientAccount = async (
  id: string,
  input: AdminPatientAccountStatusActionInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPatientAccountDeleteResponse>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/account/delete`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPatientPersonalData = async (
  id: string,
  input: AdminPatientUpdatePersonalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPatientDetail>>(
    `/api/admin/private/patients/${encodeURIComponent(id)}/personal-data`,
    input,
  );

  return resolveApiData(response.data);
};
