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
  status?: "all" | "dismissed" | "in_review" | "upheld" | string;
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

export type AdminPsychologistReportsStatusGroup = "dismissed" | "in_review" | "upheld";

export type AdminPsychologistReportsCard = {
  id: "dismissed" | "in_review" | "total" | "upheld";
  label: string;
  source: "post_report";
  value: number;
};

export type AdminPsychologistReportItem = {
  content: {
    community: {
      id: string;
      name: string;
      slug: string;
    };
    excerpt: string;
    id: string;
    public_url: string;
    title: string;
    type: "post" | "reply";
  };
  created_at: Date;
  description: string | null;
  id: string;
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    role: string;
  };
  status: string;
  status_group: AdminPsychologistReportsStatusGroup;
  status_label: string;
};

export type AdminPsychologistReportsDTO = {
  access: {
    mode: "read_only";
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
