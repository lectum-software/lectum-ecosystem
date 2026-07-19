import type { Request } from "express";

export type AdminPatientDetailQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPatientDetailDateRange = {
  end: Date;
  start: Date;
};

export type AdminPatientDetailPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "America/Sao_Paulo";
  to: string;
};

export type AdminPatientDetailTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPatientDetailMetric = {
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
  trend: AdminPatientDetailTrend;
  unit: "count";
  value: number;
};

export type AdminPatientDetailSeriesPoint = {
  comments_created: number;
  date: string;
  downvotes_received: number;
  posts_created: number;
  responses_received: number;
  upvotes_received: number;
};

export type AdminPatientDetailActivityItem = {
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: Date;
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

export type AdminPatientDetailCommunity = {
  avatar_url: string | null;
  color: string | null;
  id: string;
  interactions: number;
  is_member: boolean;
  member_since: Date | null;
  name: string;
  slug: string;
};

export type AdminPatientDetailHeatmapCell = {
  count: number;
  day: string;
  day_index: number;
  hour: number;
  hour_label: string;
};

export type AdminPatientDetailUnavailable = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientDetailDTO = {
  activities: {
    coverage_note: string;
    items: AdminPatientDetailActivityItem[];
    source: "community_activity+professional_review";
  };
  communities: {
    items: AdminPatientDetailCommunity[];
    source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save";
  };
  coverage_notes: string[];
  header: {
    active: boolean;
    avatar: string | null;
    created_at: Date;
    email: string;
    gender: string | null;
    id: string;
    last_access_at: Date | null;
    location: {
      captured_at: Date;
      city: string | null;
      country: string | null;
      source: string;
      state: string | null;
    } | null;
    name: string;
    onboarding_completed_at: Date | null;
    provider: string;
    provider_label: string;
    status: "active" | "inactive";
    status_label: "Ativo" | "Inativo";
  };
  heatmap: {
    available: boolean;
    cells: AdminPatientDetailHeatmapCell[];
    max_count: number;
    source: "community_post+post_reply+post_vote+post_save+post_reply_save";
    timezone: "America/Sao_Paulo";
    total_events: number;
    unavailable_reason: string | null;
  };
  metrics: AdminPatientDetailMetric[];
  period: AdminPatientDetailPeriod;
  privacy: {
    omitted_fields: string[];
    visible_fields: string[];
  };
  series: {
    points: AdminPatientDetailSeriesPoint[];
    source: "community_post+post_reply+post_vote+responses";
  };
  source: "user+patient_profile+visitor_location+community_activity+professional_review";
  unavailable: AdminPatientDetailUnavailable[];
};

export type IAdminPatientDetailDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPatientDetailQuery;
};
