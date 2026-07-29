import type { Request } from "express";
import type {
  AdminProfileConversionBenchmark,
  AdminProfileConversionSource,
  AdminProfileConversionThresholds,
} from "@/utils/admin-profile-conversion";
import type {
  AdminProfileReceivedEngagementDiagnosis,
  AdminProfileReceivedEngagementSource,
} from "@/utils/admin-profile-received-engagement";

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

export const ADMIN_PSYCHOLOGISTS_LIST_PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS = [
  "strong_conversion_very_engaged",
  "strong_conversion_engaged",
  "strong_conversion_low_engaged",
  "strong_conversion_no_engagement",
  "standard_conversion_very_engaged",
  "standard_conversion_engaged",
  "standard_conversion_low_engaged",
  "standard_conversion_no_engagement",
  "low_conversion_very_engaged",
  "low_conversion_engaged",
  "low_conversion_low_engaged",
  "low_conversion_no_engagement",
  "no_conversion_very_engaged",
  "no_conversion_engaged",
  "no_conversion_low_engaged",
  "no_conversion_no_engagement",
] as const;

export type AdminPsychologistsListSort = (typeof ADMIN_PSYCHOLOGISTS_LIST_SORTS)[number];
export type AdminPsychologistsListStatus = (typeof ADMIN_PSYCHOLOGISTS_LIST_STATUSES)[number];
export type AdminPsychologistsListExperience = (typeof ADMIN_PSYCHOLOGISTS_LIST_EXPERIENCE)[number];
export type AdminPsychologistsListEngagementCategoryId =
  AdminProfileReceivedEngagementDiagnosis["id"];
export type AdminPsychologistsListProfileConversionEngagementQuadrantId =
  (typeof ADMIN_PSYCHOLOGISTS_LIST_PROFILE_CONVERSION_ENGAGEMENT_QUADRANTS)[number];

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
  profile_conversion?: AdminPsychologistsListProfileConversionCategoryId;
  profile_conversion_engagement?: AdminPsychologistsListProfileConversionEngagementQuadrantId;
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

export type AdminPsychologistsListProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type AdminPsychologistsListProfileConversionSummary = {
  benchmark: AdminProfileConversionBenchmark;
  description: string;
  id: AdminPsychologistsListProfileConversionCategoryId;
  label: string;
  signals: {
    active_days: number;
    profile_age_days: number;
    whatsapp_clicks: number;
  };
  source: AdminProfileConversionSource;
  thresholds: AdminProfileConversionThresholds;
};

export type AdminPsychologistsListEngagementSummary = Omit<
  AdminProfileReceivedEngagementDiagnosis,
  "source"
> & {
  signals: {
    active_days: number;
    comments_received: number;
    content_saves: number;
    content_shares: number;
    interactions: number;
    normalized_interactions_30d: number;
    normalized_weighted_score_30d: number;
    positive_votes: number;
    profile_favorites: number;
    profile_follows: number;
    uncapped_normalized_weighted_score_30d: number;
  };
  source: AdminProfileReceivedEngagementSource;
  thresholds: {
    active_interactions_30d: number;
    active_score_30d: number;
    highly_active_interactions_30d: number;
    highly_active_score_30d: number;
    minimum_signal_interactions_30d: number;
    minimum_signal_score_30d: number;
    score_caps_30d: {
      comments_received: null;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: null;
      profile_follows: null;
    };
    weights: {
      comments_received: number;
      content_saves: number;
      content_shares: number;
      positive_votes: number;
      profile_favorites: number;
      profile_follows: number;
    };
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
  profile_conversion: AdminPsychologistsListProfileConversionSummary;
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
  source: "user+psychologist_profile+professional_subscription+public_ranking+contact_request+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share";
};

export type IAdminPsychologistsListDTO = Request & {
  q: AdminPsychologistsListQuery;
};
