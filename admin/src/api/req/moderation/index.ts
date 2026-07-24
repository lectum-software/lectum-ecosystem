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
    public_label: string;
    role: string;
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
  | "unpublished_required_settings";

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
    type: "post" | "psychologist" | "reply";
  };
  facts: {
    label: string;
    value: string;
  }[];
  group: "compliance" | "denuncias" | "operacional";
  id: string;
  priority: AdminModerationSeverity;
  source: string;
  title: string;
  type: AdminModerationOperationalAlertType;
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
  source: "post_report+community_post+post_reply+psychologist_profile+professional_subscription+profile_view_event+contact_request";
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
  group?: AdminModerationOperationalAlertsGroup;
  limit?: number;
  page?: number;
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
  ...(input.group && input.group !== "all" ? { group: input.group } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
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
