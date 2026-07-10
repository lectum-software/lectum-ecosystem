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
  | "denuncias"
  | "financeiro"
  | "perfil";

export type AdminPsychologistActivityType =
  | "account_created"
  | "post_created"
  | "post_saved"
  | "profile_created"
  | "profile_updated"
  | "registry_verified"
  | "reply_created"
  | "reply_saved"
  | "report_received"
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
  source: "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report";
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
