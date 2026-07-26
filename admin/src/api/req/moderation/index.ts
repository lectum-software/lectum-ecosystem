import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type AdminModerationDecision = "allow_sensitive" | "block" | "safety_hold";
export type AdminModerationSeverity = "high" | "low" | "medium" | "urgent";
export type AdminModerationStatus = "pending" | "reviewing" | "resolved";
export type AdminModerationTargetType =
  | "community_post"
  | "post_reply"
  | "submitted_post"
  | "submitted_reply";

export type AdminModerationEvent = {
  author: {
    admin_label?: string;
    id: string;
    name: string;
    public_label: string;
    role: string;
    role_label: string;
    show_verified_badge: boolean;
  };
  blocked_before_publication: boolean;
  categories: string[];
  community: {
    id: string;
    name: string;
    slug: string;
  } | null;
  content_excerpt: string;
  created_at: string;
  decision: AdminModerationDecision;
  id: string;
  matched_rules: string[];
  public_url: string | null;
  reason_code: string;
  reviewed_at: string | null;
  resolved_at: string | null;
  severity: AdminModerationSeverity;
  status: AdminModerationStatus;
  target_id: string | null;
  target_type: AdminModerationTargetType;
  title_snapshot: string | null;
};

export type AdminModerationEventDetail = AdminModerationEvent & {
  admin_note: string | null;
  content_snapshot: string | null;
  reviewed_by_admin_id: string | null;
};

export type AdminModerationOperationalAlertType =
  | "invalid_whatsapp"
  | "patient_post_without_coverage"
  | "post_report"
  | "professional_crp_pending"
  | "psychologist_no_traction"
  | "registration_error"
  | "unpublished_required_settings";

export type AdminModerationOperationalAlertProfessional = {
  gender: string | null;
  id: string;
  is_subscriber: boolean;
  name: string;
  registry_verified: boolean;
  role_label: string;
  show_verified_badge: boolean;
};

export type AdminModerationOperationalAlertUser = {
  id: string;
  name: string;
  role: string;
  role_label: string;
  show_verified_badge: boolean;
};

export type AdminModerationOperationalAlert = {
  action_href: string | null;
  action_label: string;
  age_hours: number | null;
  community: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at: string;
  description: string;
  entity: {
    href: string | null;
    id: string;
    label: string;
    type: "patient" | "post" | "psychologist" | "reply";
  };
  facts: {
    label: string;
    value: string;
  }[];
  group: "compliance" | "denuncias" | "operacional";
  id: string;
  priority: AdminModerationSeverity;
  professional?: AdminModerationOperationalAlertProfessional | null;
  report?: AdminModerationReportItem | null;
  source: string;
  title: string;
  type: AdminModerationOperationalAlertType;
  user?: AdminModerationOperationalAlertUser | null;
};

export type AdminModerationReportStatusGroup = "dismissed" | "pending" | "upheld";
export type AdminModerationReportItem = {
  capabilities: {
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
      verified: boolean;
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
  status_group: AdminModerationReportStatusGroup;
  status_label: string;
};

export type AdminModerationReportResolveInput = {
  confirmation: string;
  measure?: "none" | "remove_content";
  reason: string;
  resolution: "dismissed" | "upheld";
};

export type AdminModerationReportAction = {
  affected_reports_count: number;
  content_already_unavailable: boolean;
  content_removed: boolean;
  report: AdminModerationReportItem;
  source: "post_report+admin_activity_log";
};

export type AdminModerationReportChartType =
  | "all"
  | "patient_comments"
  | "patient_posts"
  | "psychologist_posts"
  | "psychologist_replies";

export type AdminModerationReportChartPoint = {
  date: string;
  dismissed: number;
  pending: number;
  upheld: number;
};

export type AdminModerationComplianceChartPoint = {
  date: string;
  invalid_whatsapp: number;
  professional_crp_pending: number;
};

export type AdminModerationOperationalChartPoint = {
  date: string;
  patient_posts_without_coverage_48h: number;
  psychologist_no_traction_after_adaptation: number;
  registration_errors: number;
  unpublished_required_settings: number;
};

export type AdminModerationSensitiveContentChartPoint = {
  allow_sensitive: number;
  block: number;
  date: string;
  safety_hold: number;
};

export type AdminModerationOverviewCharts = {
  compliance: {
    points: AdminModerationComplianceChartPoint[];
  };
  content_sensitive: {
    by_category: Record<
      string,
      {
        points: AdminModerationSensitiveContentChartPoint[];
      }
    >;
    categories: string[];
  };
  operational: {
    points: AdminModerationOperationalChartPoint[];
  };
  reports: Record<
    AdminModerationReportChartType,
    {
      points: AdminModerationReportChartPoint[];
    }
  >;
};

export type AdminModerationOperationalAlerts = {
  counts: {
    compliance_total: number;
    invalid_whatsapp: number;
    operational_total: number;
    patient_posts_without_coverage_48h: number;
    pending_reports: number;
    professional_crp_pending: number;
    psychologist_no_traction_after_adaptation: number;
    registration_errors: number;
    total: number;
    unpublished_required_settings: number;
    urgent_total: number;
  };
  excluded_dimensions: {
    id: string;
    reason: string;
    title: string;
  }[];
  items: AdminModerationOperationalAlert[];
  source: "post_report+community_post+post_reply+user+psychologist_profile+professional_subscription+profile_view_event+contact_request+post_vote+post_save+post_reply_save+post_share";
  thresholds: {
    patient_post_without_coverage_hours: number;
    psychologist_adaptation_days: number;
  };
};

export type AdminModerationOperationalAlertsGroup =
  | "all"
  | "compliance"
  | "denuncias"
  | "operacional";

export type AdminModerationOperationalAlertsQuery = {
  alertType?: "all" | AdminModerationOperationalAlertType;
  contentType?: "all" | "post" | "reply";
  from?: string;
  group?: AdminModerationOperationalAlertsGroup;
  limit?: number;
  page?: number;
  plan?: "all" | "cortesia" | "gratuito" | "profissional";
  profileStatus?: "active" | "all" | "inactive";
  q?: string;
  reason?: "abuse" | "all" | "other" | "privacy" | "self_harm" | "spam";
  reporter?: "all" | "paciente" | "psicologo";
  status?: "all" | "dismissed" | "pending" | "upheld";
  to?: string;
  userRole?: "all" | "paciente" | "psicologo";
};

export type AdminModerationOperationalAlertsPage = {
  count: number;
  counts: AdminModerationOperationalAlerts["counts"];
  data: AdminModerationOperationalAlert[];
  excluded_dimensions: AdminModerationOperationalAlerts["excluded_dimensions"];
  group: AdminModerationOperationalAlertsGroup;
  page: number;
  pages: number;
  per_page: number;
  source: AdminModerationOperationalAlerts["source"];
  thresholds: AdminModerationOperationalAlerts["thresholds"];
};

export type AdminModerationSummary = {
  by_category: Record<string, number>;
  by_decision: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  latest_pending: AdminModerationEvent[];
  operational_alerts: AdminModerationOperationalAlerts;
  overview_charts: AdminModerationOverviewCharts;
  pending_total: number;
  source: "content_moderation_event";
  urgent_pending_total: number;
};

export type AdminModerationEventsQuery = {
  category?: string;
  community?: string;
  decision?: "all" | AdminModerationDecision;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  severity?: "all" | AdminModerationSeverity;
  status?: "all" | AdminModerationStatus;
  targetType?: "all" | AdminModerationTargetType;
  to?: string;
};

export type AdminModerationEvents = {
  count: number;
  data: AdminModerationEvent[];
  page: number;
  pages: number;
  per_page: number;
  source: "content_moderation_event";
};

export type AdminModerationResolveInput = {
  note: string;
};

const cleanParams = (input: AdminModerationEventsQuery = {}) => ({
  ...(input.category && input.category !== "all" ? { category: input.category } : {}),
  ...(input.community && input.community !== "all" ? { community: input.community } : {}),
  ...(input.decision && input.decision !== "all" ? { decision: input.decision } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.severity && input.severity !== "all" ? { severity: input.severity } : {}),
  ...(input.status && input.status !== "all" ? { status: input.status } : {}),
  ...(input.targetType && input.targetType !== "all" ? { targetType: input.targetType } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanOperationalAlertsParams = (input: AdminModerationOperationalAlertsQuery = {}) => ({
  ...(input.alertType && input.alertType !== "all" ? { alertType: input.alertType } : {}),
  ...(input.contentType && input.contentType !== "all" ? { contentType: input.contentType } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.group && input.group !== "all" ? { group: input.group } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.plan && input.plan !== "all" ? { plan: input.plan } : {}),
  ...(input.profileStatus && input.profileStatus !== "all"
    ? { profileStatus: input.profileStatus }
    : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.reason ? { reason: input.reason } : {}),
  ...(input.reporter && input.reporter !== "all" ? { reporter: input.reporter } : {}),
  ...(input.status && input.status !== "all" ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.userRole && input.userRole !== "all" ? { userRole: input.userRole } : {}),
});

export const getAdminModerationSummary = async () => {
  const response = await adminApi.get<ApiResponse<AdminModerationSummary>>(
    "/api/admin/private/moderation/summary",
  );

  return resolveApiData(response.data);
};

export const getAdminModerationEvents = async (input: AdminModerationEventsQuery = {}) => {
  const response = await adminApi.get<ApiResponse<AdminModerationEvents>>(
    "/api/admin/private/moderation/events",
    { params: cleanParams(input) },
  );

  return resolveApiData(response.data);
};

export const getAdminModerationOperationalAlerts = async (
  input: AdminModerationOperationalAlertsQuery = {},
) => {
  const response = await adminApi.get<ApiResponse<AdminModerationOperationalAlertsPage>>(
    "/api/admin/private/moderation/operational-alerts",
    { params: cleanOperationalAlertsParams(input) },
  );

  return resolveApiData(response.data);
};

export const getAdminModerationEvent = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminModerationEventDetail>>(
    `/api/admin/private/moderation/events/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const reviewAdminModerationEvent = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminModerationEventDetail>>(
    `/api/admin/private/moderation/events/${encodeURIComponent(id)}/review`,
  );

  return resolveApiData(response.data);
};

export const resolveAdminModerationEvent = async (
  id: string,
  input: AdminModerationResolveInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminModerationEventDetail>>(
    `/api/admin/private/moderation/events/${encodeURIComponent(id)}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const resolveAdminModerationReport = async (
  reportId: string,
  input: AdminModerationReportResolveInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminModerationReportAction>>(
    `/api/admin/private/moderation/reports/${encodeURIComponent(reportId)}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};
