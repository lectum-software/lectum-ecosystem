import type { Request } from "express";
import type {
  AdminCommunityEngagementDiagnosis,
  AdminPsychologistCommunityEngagementDiagnosis,
} from "@/utils/admin-community-engagement-diagnosis";

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

export const ADMIN_PSYCHOLOGISTS_LIST_TRACTION_ENGAGEMENT_QUADRANTS = [
  "low_traction_engaged",
  "low_traction_low_engaged",
  "low_traction_no_engagement",
  "low_traction_very_engaged",
  "strong_traction_engaged",
  "strong_traction_low_engaged",
  "strong_traction_no_engagement",
  "strong_traction_very_engaged",
] as const;

export type AdminPsychologistsListSort = (typeof ADMIN_PSYCHOLOGISTS_LIST_SORTS)[number];
export type AdminPsychologistsListStatus = (typeof ADMIN_PSYCHOLOGISTS_LIST_STATUSES)[number];
export type AdminPsychologistsListExperience = (typeof ADMIN_PSYCHOLOGISTS_LIST_EXPERIENCE)[number];
export type AdminPsychologistsListEngagementCategoryId = AdminCommunityEngagementDiagnosis["id"];
export type AdminPsychologistsListTractionEngagementQuadrantId =
  (typeof ADMIN_PSYCHOLOGISTS_LIST_TRACTION_ENGAGEMENT_QUADRANTS)[number];

export type AdminPsychologistsListQuery = {
  accepts_insurance?: boolean;
  approach?: string;
  available_today?: boolean;
  city?: string;
  discount_first_session?: boolean;
  engagement?: AdminPsychologistsListEngagementCategoryId;
  experience?: AdminPsychologistsListExperience;
  gender?: string;
  language?: string;
  limit?: number;
  modality?: string;
  more_experienced?: boolean;
  page?: number;
  plan?: string;
  profile_status?: "active" | "inactive";
  q?: string;
  race_color?: string;
  registry_status?: "active" | "pending";
  religion?: string;
  service?: string;
  social_value?: boolean;
  sort?: AdminPsychologistsListSort;
  specialty?: string;
  state?: string;
  status?: AdminPsychologistsListStatus;
  target_audience?: string;
  traction?: AdminPsychologistsListTractionCategoryId;
  traction_engagement?: AdminPsychologistsListTractionEngagementQuadrantId;
  verified?: boolean;
};

export type AdminPsychologistsListOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminPsychologistsListRegistryVerification = {
  source: "admin_grant" | "api_automatica" | "manual_admin" | "pendente";
  source_label: string;
  status:
    | "api_indisponivel"
    | "aprovado"
    | "em_analise"
    | "limite_tentativas"
    | "pendente"
    | "rejeitado";
  status_label: string;
};

export type AdminPsychologistsListTractionCategoryId =
  | "insufficient_data"
  | "low_traction"
  | "strong_traction"
  | "unconverted_interest"
  | "unconverted_traffic";

export type AdminPsychologistsListTractionSummary = {
  description: string;
  id: AdminPsychologistsListTractionCategoryId;
  label: string;
  signals: {
    active_days: number;
    favorites: number;
    normalized_favorites_30d: number;
    normalized_profile_views_30d: number;
    normalized_whatsapp_clicks_30d: number;
    profile_views: number;
    whatsapp_clicks: number;
    whatsapp_conversion_rate_percent: number | null;
  };
  source: "profile_view_event+contact_request+psychologist_favorite";
  thresholds: {
    favorites_high_30d: number;
    minimum_active_days: number;
    profile_views_high_30d: number;
    strong_conversion_rate_percent: number;
    whatsapp_high_30d: number;
    whatsapp_high_with_conversion_30d: number;
  };
};

export type AdminPsychologistsListEngagementSummary = Omit<
  AdminPsychologistCommunityEngagementDiagnosis,
  "source"
> & {
  signals: {
    active_days: number;
    interactions: number;
    normalized_interactions_30d: number;
    posts: number;
    replies: number;
    votes: number;
  };
  source: "community_post+post_reply+post_vote.user_id";
  thresholds: {
    active_interactions_30d: number;
    highly_active_interactions_30d: number;
    minimum_signal_interactions_30d: number;
  };
};

export type AdminPsychologistsListFilters = {
  approaches: AdminPsychologistsListOption[];
  cities: AdminPsychologistsListOption[];
  experience_ranges: AdminPsychologistsListOption[];
  genders: AdminPsychologistsListOption[];
  languages: AdminPsychologistsListOption[];
  modalities: AdminPsychologistsListOption[];
  plans: AdminPsychologistsListOption[];
  race_colors: AdminPsychologistsListOption[];
  religions: AdminPsychologistsListOption[];
  services: AdminPsychologistsListOption[];
  specialties: AdminPsychologistsListOption[];
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
  email: string;
  engagement: AdminPsychologistsListEngagementSummary;
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
  traction: AdminPsychologistsListTractionSummary;
  registry_verification: AdminPsychologistsListRegistryVerification;
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
  source: "user+psychologist_profile+professional_subscription+public_ranking+profile_view_event+contact_request+psychologist_favorite+community_post+post_reply+post_vote";
};

export type IAdminPsychologistsListDTO = Request & {
  q: AdminPsychologistsListQuery;
};
