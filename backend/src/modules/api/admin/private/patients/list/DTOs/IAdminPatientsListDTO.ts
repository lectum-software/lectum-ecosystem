import type { Request } from "express";

export const ADMIN_PATIENTS_LIST_SORTS = ["recent", "name"] as const;
export const ADMIN_PATIENTS_LIST_STATUSES = ["active", "inactive"] as const;
export const ADMIN_PATIENTS_LIST_PROVIDERS = ["email_password", "google"] as const;

export type AdminPatientsListSort = (typeof ADMIN_PATIENTS_LIST_SORTS)[number];
export type AdminPatientsListStatus = (typeof ADMIN_PATIENTS_LIST_STATUSES)[number];
export type AdminPatientsListProvider = (typeof ADMIN_PATIENTS_LIST_PROVIDERS)[number];
export type AdminPatientsListIntentId = "cold" | "curious" | "objective" | "very_qualified";
export type AdminPatientsListEngagementId =
  | "engaged"
  | "low_engagement"
  | "no_engagement"
  | "very_engaged";

export type AdminPatientsListQuery = {
  gender?: string;
  limit?: number;
  page?: number;
  provider?: AdminPatientsListProvider;
  q?: string;
  sort?: AdminPatientsListSort;
  status?: AdminPatientsListStatus;
};

export type AdminPatientsListOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPatientsListFilters = {
  genders: AdminPatientsListOption[];
  providers: AdminPatientsListOption[];
  statuses: AdminPatientsListOption[];
};

export type AdminPatientsListItem = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: Date;
  detail_url: string;
  email: string;
  gender: string | null;
  gender_label: string;
  id: string;
  engagement: {
    id: AdminPatientsListEngagementId;
    label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem engajamento";
  };
  intent: {
    id: AdminPatientsListIntentId;
    label: "Curioso" | "Frio" | "Interessado" | "Qualificado";
  };
  last_location_at: Date | null;
  name: string;
  onboarding_completed_at: Date | null;
  provider: string;
  provider_label: string;
  state: string | null;
  status: AdminPatientsListStatus;
  status_label: "Ativo" | "Inativo";
};

export type AdminPatientsListSummary = {
  active_filters_count: number;
  count: number;
  data: AdminPatientsListItem[];
  filters: AdminPatientsListFilters;
  page: number;
  pages: number;
  per_page: number;
  sort: AdminPatientsListSort;
  source: "user+patient_profile+visitor_location+profile_view_event+psychologist_favorite+contact_request";
};

export type IAdminPatientsListDTO = Request & {
  q: AdminPatientsListQuery;
};
