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

export type AdminModerationSummaryDTO = {
  by_category: Record<string, number>;
  by_decision: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  latest_pending: AdminModerationEventItemDTO[];
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
