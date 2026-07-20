import type { Request } from "express";

export type AdminPsychologistReviewsQuery = {
  limit?: number;
  page?: number;
  rating?: number;
  status?: string;
};

export type AdminPsychologistReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | "dismissed" | "pending" | "upheld" | string;
  to?: string;
  type?: "all" | "post" | "reply" | string;
};

export type AdminPsychologistReviewDistributionItem = {
  count: number;
  percentage: number;
  rating: 1 | 2 | 3 | 4 | 5;
};

export type AdminPsychologistReviewStatusOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPsychologistReviewItem = {
  author: {
    avatar: string | null;
    id: string;
    name: string;
    role: string;
  };
  comment: string | null;
  created_at: Date;
  id: string;
  rating: number;
  response: string | null;
  responded_at: Date | null;
  status: string;
  status_label: string;
};

export type AdminPsychologistReviewsDTO = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  count: number;
  data: AdminPsychologistReviewItem[];
  filters: {
    ratings: { count: number; id: string; label: string }[];
    statuses: AdminPsychologistReviewStatusOption[];
  };
  page: number;
  pages: number;
  per_page: number;
  source: "professional_review";
  summary: {
    distribution: AdminPsychologistReviewDistributionItem[];
    rating_avg: number;
    rating_count: number;
    statuses: AdminPsychologistReviewStatusOption[];
  };
};

export type AdminPsychologistReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPsychologistReportsCard = {
  id: "dismissed" | "pending" | "total" | "upheld";
  label: string;
  source: "post_report";
  value: number;
};

export type AdminPsychologistReportItem = {
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
  status_group: AdminPsychologistReportsStatusGroup;
  status_label: string;
};

export type AdminPsychologistReportsDTO = {
  access: {
    mode: "moderation";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: AdminPsychologistReportsCard[];
  count: number;
  data: AdminPsychologistReportItem[];
  filters: {
    statuses: { count: number; id: "all" | AdminPsychologistReportsStatusGroup; label: string }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "post_report+community_post+post_reply";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistReportResolveBody = {
  confirmation: string;
  measure?: "none" | "remove_content" | string;
  reason: string;
  resolution: "dismissed" | "pending" | "upheld" | string;
};

export type AdminPsychologistReportActionDTO = {
  affected_reports_count: number;
  content_already_unavailable: boolean;
  content_removed: boolean;
  report: AdminPsychologistReportItem;
  source: "post_report+admin_activity_log";
};

export type IAdminPsychologistReviewsDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPsychologistReviewsQuery;
};

export type IAdminPsychologistReportsDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPsychologistReportsQuery;
};

export type IAdminPsychologistReportResolveDTO = Request & {
  b: AdminPsychologistReportResolveBody;
  p: {
    id: string;
    reportId: string;
  };
};
