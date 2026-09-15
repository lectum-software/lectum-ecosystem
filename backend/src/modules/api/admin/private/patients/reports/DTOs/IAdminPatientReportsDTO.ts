import type { Request } from "express";

export type AdminPatientReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPatientReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPatientReportsStatusGroup | string;
  to?: string;
  type?: "all" | "post" | "reply" | string;
};

export type AdminPatientReportsCard = {
  id: "dismissed" | "pending" | "total" | "upheld";
  label: string;
  source: "post_report";
  value: number;
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
    created_at: Date;
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
  created_at: Date;
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

export type AdminPatientReportsDTO = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: AdminPatientReportsCard[];
  count: number;
  data: AdminPatientReportItem[];
  filters: {
    statuses: { count: number; id: "all" | AdminPatientReportsStatusGroup; label: string }[];
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

export type IAdminPatientReportsDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPatientReportsQuery;
};
