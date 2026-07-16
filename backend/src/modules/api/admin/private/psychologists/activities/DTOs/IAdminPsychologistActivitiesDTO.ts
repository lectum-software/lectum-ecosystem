import type { Request } from "express";

export type AdminPsychologistActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPsychologistActivityActor = {
  id: string;
  name: string;
  role: string;
} | null;

export type AdminPsychologistActivityArea =
  | "atendimento"
  | "avaliacoes"
  | "comunidade"
  | "conta"
  | "denuncias"
  | "financeiro"
  | "perfil";

export type AdminPsychologistActivityType =
  | "account_created"
  | "account_deactivated"
  | "account_deleted"
  | "admin_personal_data_updated"
  | "admin_professional_data_updated"
  | "account_email_changed"
  | "account_email_confirmation_sent"
  | "account_password_reset_sent"
  | "account_sessions_revoked"
  | "account_suspended"
  | "account_temporary_password_set"
  | "post_created"
  | "post_saved"
  | "profile_created"
  | "profile_updated"
  | "registry_verified"
  | "reply_created"
  | "reply_saved"
  | "report_received"
  | "report_content_removed"
  | "report_decision_reviewed"
  | "report_dismissed"
  | "report_review_started"
  | "report_upheld"
  | "review_received"
  | "review_responded"
  | "subscription_started"
  | "whatsapp_click"
  | "whatsapp_verified";

export type AdminPsychologistActivityItem = {
  actor: AdminPsychologistActivityActor;
  area: {
    id: AdminPsychologistActivityArea;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: Date;
  source: string;
  type: {
    id: AdminPsychologistActivityType;
    label: string;
  };
};

export type AdminPsychologistActivitiesFilterOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPsychologistActivitiesDTO = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPsychologistActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: AdminPsychologistActivitiesFilterOption[];
    types: AdminPsychologistActivitiesFilterOption[];
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
  source: "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report+admin_activity_log";
  unavailable: {
    description: string;
    id: string;
    label: string;
    source: string;
  }[];
};

export type IAdminPsychologistActivitiesDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPsychologistActivitiesQuery;
};
