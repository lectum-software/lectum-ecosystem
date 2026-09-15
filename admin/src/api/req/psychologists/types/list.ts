import type { AdminPublicSource } from "@/api/public-response";
import type {
  PsychologistsListEngagementId,
  PsychologistsListSort,
  PsychologistsListStatus,
} from "./dashboard-core";
import type {
  PsychologistsProfileConversionBenchmark,
  PsychologistsProfileConversionSource,
  PsychologistsProfileConversionThresholds,
} from "./dashboard-profile";

export type PsychologistsListOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminRegistryVerificationSource =
  | "admin_grant"
  | "api_automatica"
  | "manual_admin"
  | "pendente";

export type AdminRegistryVerificationStatus =
  | "api_indisponivel"
  | "aprovado"
  | "em_analise"
  | "limite_tentativas"
  | "pendente"
  | "rejeitado";

export type AdminRegistryVerificationActor = {
  email: string | null;
  id: string | null;
  name: string | null;
};

export type AdminPsychologistRegistryVerificationSummary = {
  source: AdminRegistryVerificationSource;
  source_label: string;
  status: AdminRegistryVerificationStatus;
  status_label: string;
};

export type PsychologistsListProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type PsychologistsListProfileConversion = {
  benchmark: PsychologistsProfileConversionBenchmark;
  description: string;
  id: PsychologistsListProfileConversionCategoryId;
  label: string;
  signals: {
    active_days: number;
    profile_age_days: number;
    whatsapp_clicks: number;
  };
  source: PsychologistsProfileConversionSource;
  thresholds: PsychologistsProfileConversionThresholds;
};

export type PsychologistsListEngagement = {
  id: PsychologistsListEngagementId;
  label: "Engajado" | "Muito engajado" | "Pouco engajado" | "Sem base";
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
  source: AdminPublicSource<"psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share">;
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

export type PsychologistsListFilters = {
  approaches: PsychologistsListOption[];
  cities: PsychologistsListOption[];
  experience_ranges: PsychologistsListOption[];
  genders: PsychologistsListOption[];
  languages: PsychologistsListOption[];
  modalities: PsychologistsListOption[];
  plans: PsychologistsListOption[];
  race_colors: PsychologistsListOption[];
  religions: PsychologistsListOption[];
  services: PsychologistsListOption[];
  specialties: PsychologistsListOption[];
  states: PsychologistsListOption[];
  statuses: PsychologistsListOption[];
  target_audience: PsychologistsListOption[];
};

export type PsychologistsListItem = {
  accepts_insurance: boolean;
  avatar: string | null;
  city: string | null;
  created_at: string;
  crp: string | null;
  detail_url: string;
  discount_first_session: boolean;
  email: string;
  engagement: PsychologistsListEngagement;
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
  status: PsychologistsListStatus;
  profile_conversion: PsychologistsListProfileConversion;
  registry_verification: AdminPsychologistRegistryVerificationSummary;
  verified: boolean;
  whatsapp_clicks_count: number;
};

export type AdminPsychologistsList = {
  active_filters_count: number;
  count: number;
  data: PsychologistsListItem[];
  filters: PsychologistsListFilters;
  page: number;
  pages: number;
  per_page: number;
  sort: PsychologistsListSort;
  source: AdminPublicSource<"user+psychologist_profile+professional_subscription+public_ranking+contact_request+psychologist_favorite+psychologist_follow+post_reply.received+post_vote.value=1.received+post_save+post_reply_save+post_share">;
};
