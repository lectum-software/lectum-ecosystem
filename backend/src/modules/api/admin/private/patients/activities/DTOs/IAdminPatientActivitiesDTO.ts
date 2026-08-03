import type { Request } from "express";

export type AdminPatientActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPatientActivityActor = {
  id: string;
  name: string;
  role: string;
} | null;

export type AdminPatientActivityArea = "avaliacoes" | "comunidade" | "conta" | "perfil";

export type AdminPatientActivityType =
  | "account_created"
  | "account_deactivated"
  | "account_deleted"
  | "account_email_changed"
  | "account_email_confirmation_sent"
  | "account_password_reset_sent"
  | "account_sessions_revoked"
  | "account_suspended"
  | "account_temporary_password_set"
  | "account_view_as_started"
  | "admin_personal_data_updated"
  | "community_joined"
  | "onboarding_completed"
  | "post_created"
  | "post_saved"
  | "profile_created"
  | "profile_updated"
  | "reply_created"
  | "reply_saved"
  | "review_created"
  | "vote_cast";

export type AdminPatientActivityItem = {
  actor: AdminPatientActivityActor;
  area: {
    id: AdminPatientActivityArea;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: Date;
  source: string;
  type: {
    id: AdminPatientActivityType;
    label: string;
  };
};

export type AdminPatientActivitiesFilterOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPatientActivitiesDTO = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPatientActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: AdminPatientActivitiesFilterOption[];
    types: AdminPatientActivitiesFilterOption[];
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

export type IAdminPatientActivitiesDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPatientActivitiesQuery;
};
