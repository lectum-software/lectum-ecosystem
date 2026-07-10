import type { Request } from "express";

export const ADMIN_PSYCHOLOGISTS_LIST_SORTS = [
  "relevance",
  "rating",
  "favorites",
  "whatsapp",
  "recent",
  "name",
] as const;

export const ADMIN_PSYCHOLOGISTS_LIST_STATUSES = [
  "verified",
  "free",
  "unpublished",
  "pending",
] as const;

export const ADMIN_PSYCHOLOGISTS_LIST_EXPERIENCE = ["0_4", "5_9", "10_plus", "unknown"] as const;

export type AdminPsychologistsListSort = (typeof ADMIN_PSYCHOLOGISTS_LIST_SORTS)[number];
export type AdminPsychologistsListStatus = (typeof ADMIN_PSYCHOLOGISTS_LIST_STATUSES)[number];
export type AdminPsychologistsListExperience = (typeof ADMIN_PSYCHOLOGISTS_LIST_EXPERIENCE)[number];

export type AdminPsychologistsListQuery = {
  accepts_insurance?: boolean;
  approach?: string;
  city?: string;
  discount_first_session?: boolean;
  experience?: AdminPsychologistsListExperience;
  gender?: string;
  language?: string;
  limit?: number;
  modality?: string;
  page?: number;
  plan?: string;
  q?: string;
  service?: string;
  social_value?: boolean;
  sort?: AdminPsychologistsListSort;
  state?: string;
  status?: AdminPsychologistsListStatus;
  target_audience?: string;
};

export type AdminPsychologistsListOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPsychologistsListFilters = {
  approaches: AdminPsychologistsListOption[];
  cities: AdminPsychologistsListOption[];
  experience_ranges: AdminPsychologistsListOption[];
  genders: AdminPsychologistsListOption[];
  languages: AdminPsychologistsListOption[];
  modalities: AdminPsychologistsListOption[];
  plans: AdminPsychologistsListOption[];
  services: AdminPsychologistsListOption[];
  states: AdminPsychologistsListOption[];
  statuses: AdminPsychologistsListOption[];
  target_audience: AdminPsychologistsListOption[];
};

export type AdminPsychologistsListItem = {
  accepts_insurance: boolean;
  avatar: string | null;
  city: string | null;
  created_at: Date;
  crp: string | null;
  detail_url: string;
  discount_first_session: boolean;
  experience_years: number | null;
  favorites_count: number;
  gender: string | null;
  id: string;
  name: string;
  plan_name: string | null;
  plan_slug: string | null;
  public_profile_url: string;
  published: boolean;
  ranking_position: number | null;
  ranking_score: number | null;
  rating_avg: number;
  rating_count: number;
  social_value: boolean;
  state: string | null;
  status: "free" | "pending" | "unpublished" | "verified";
  verified: boolean;
  whatsapp_clicks_count: number;
};

export type AdminPsychologistsListSummary = {
  active_filters_count: number;
  count: number;
  data: AdminPsychologistsListItem[];
  filters: AdminPsychologistsListFilters;
  page: number;
  pages: number;
  per_page: number;
  sort: AdminPsychologistsListSort;
  source: "user+psychologist_profile+professional_subscription+public_ranking";
};

export type IAdminPsychologistsListDTO = Request & {
  q: AdminPsychologistsListQuery;
};
