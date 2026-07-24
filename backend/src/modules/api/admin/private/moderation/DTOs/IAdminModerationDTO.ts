import type { admin } from "@/interfaces/objects";

export type AdminModerationStatus = "all" | "pending" | "reviewing" | "resolved";
export type AdminModerationDecision = "all" | "allow_sensitive" | "block" | "safety_hold";
export type AdminModerationSeverity = "all" | "high" | "low" | "medium" | "urgent";
export type AdminModerationTargetType =
  | "all"
  | "community_post"
  | "post_reply"
  | "submitted_post"
  | "submitted_reply";

export type AdminModerationEventsQuery = {
  category?: string;
  community?: string;
  decision?: AdminModerationDecision;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  severity?: AdminModerationSeverity;
  status?: AdminModerationStatus;
  targetType?: AdminModerationTargetType;
  to?: string;
};

export type AdminModerationOperationalAlertsGroup =
  | "all"
  | "compliance"
  | "denuncias"
  | "operacional";

export type AdminModerationPostReportReason =
  | "abuse"
  | "all"
  | "other"
  | "privacy"
  | "self_harm"
  | "spam";

export type AdminModerationOperationalAlertsQuery = {
  from?: string;
  group?: AdminModerationOperationalAlertsGroup;
  limit?: number;
  page?: number;
  q?: string;
  reason?: AdminModerationPostReportReason;
  reporter?: "all" | "paciente" | "psicologo";
  status?: "all" | "dismissed" | "pending" | "upheld";
  to?: string;
};

export type AdminModerationEventParams = {
  id: string;
};

export type AdminModerationResolveBody = {
  note: string;
};

export type IAdminModerationSummaryDTO = {
  auth?: admin;
  admin?: admin;
};

export type IAdminModerationEventsDTO = {
  q: AdminModerationEventsQuery;
  auth?: admin;
  admin?: admin;
};

export type IAdminModerationOperationalAlertsDTO = {
  q: AdminModerationOperationalAlertsQuery;
  auth?: admin;
  admin?: admin;
};

export type IAdminModerationEventDTO = {
  p: AdminModerationEventParams;
  auth?: admin;
  admin?: admin;
};

export type IAdminModerationResolveDTO = IAdminModerationEventDTO & {
  b: AdminModerationResolveBody;
};

export type AdminModerationCommunityDTO = {
  id: string;
  name: string;
  slug: string;
} | null;

export type AdminModerationAuthorDTO = {
  admin_label?: string;
  id: string;
  public_label: string;
  role: string;
};

export type AdminModerationEventItemDTO = {
  author: AdminModerationAuthorDTO;
  blocked_before_publication: boolean;
  categories: string[];
  community: AdminModerationCommunityDTO;
  content_excerpt: string;
  created_at: Date;
  decision: string;
  id: string;
  matched_rules: string[];
  public_url: string | null;
  reason_code: string;
  reviewed_at: Date | null;
  resolved_at: Date | null;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
  title_snapshot: string | null;
};

export type AdminModerationEventDetailDTO = AdminModerationEventItemDTO & {
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

export type AdminModerationOperationalAlertPriority = "high" | "low" | "medium" | "urgent";

export type AdminModerationOperationalAlertGroup = "compliance" | "denuncias" | "operacional";

export type AdminModerationOperationalAlertEntityDTO = {
  href: string | null;
  id: string;
  label: string;
  type: "post" | "psychologist" | "reply";
};

export type AdminModerationOperationalAlertFactDTO = {
  label: string;
  value: string;
};

export type AdminModerationOperationalAlertDTO = {
  action_href: string | null;
  action_label: string;
  age_hours: number | null;
  community: AdminModerationCommunityDTO;
  created_at: Date;
  description: string;
  entity: AdminModerationOperationalAlertEntityDTO;
  facts: AdminModerationOperationalAlertFactDTO[];
  group: AdminModerationOperationalAlertGroup;
  id: string;
  priority: AdminModerationOperationalAlertPriority;
  source: string;
  title: string;
  type: AdminModerationOperationalAlertType;
};

export type AdminModerationOperationalAlertCountsDTO = {
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

export type AdminModerationOperationalAlertsDTO = {
  counts: AdminModerationOperationalAlertCountsDTO;
  excluded_dimensions: {
    id: string;
    reason: string;
    title: string;
  }[];
  items: AdminModerationOperationalAlertDTO[];
  source: "post_report+community_post+post_reply+psychologist_profile+professional_subscription+profile_view_event+contact_request";
  thresholds: {
    patient_post_without_coverage_hours: number;
    psychologist_adaptation_days: number;
  };
};

export type AdminModerationSummaryDTO = {
  by_category: Record<string, number>;
  by_decision: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  latest_pending: AdminModerationEventItemDTO[];
  operational_alerts: AdminModerationOperationalAlertsDTO;
  pending_total: number;
  source: "content_moderation_event";
  urgent_pending_total: number;
};

export type AdminModerationEventsDTO = {
  count: number;
  data: AdminModerationEventItemDTO[];
  page: number;
  pages: number;
  per_page: number;
  source: "content_moderation_event";
};

export type AdminModerationOperationalAlertsPageDTO = {
  count: number;
  counts: AdminModerationOperationalAlertCountsDTO;
  data: AdminModerationOperationalAlertDTO[];
  excluded_dimensions: AdminModerationOperationalAlertsDTO["excluded_dimensions"];
  group: AdminModerationOperationalAlertsGroup;
  page: number;
  pages: number;
  per_page: number;
  source: AdminModerationOperationalAlertsDTO["source"];
  thresholds: AdminModerationOperationalAlertsDTO["thresholds"];
};
