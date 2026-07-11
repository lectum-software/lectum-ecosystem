import type { Request } from "express";

export type AdminPsychologistDetailStatus = "free" | "pending" | "unpublished" | "verified";

export type AdminPsychologistCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type AdminPsychologistDetailMetric = {
  id: string;
  label: string;
  source: string;
  unit: "count" | "decimal" | "position";
  value: number | null;
};

export type AdminPsychologistDetailEvent = {
  created_at: Date;
  description: string;
  id: string;
  label: string;
  source: string;
  type: string;
};

export type AdminPsychologistIntegrationStatus = {
  checked_at: Date | null;
  id: "email" | "mercado_pago" | "registry" | "subscription" | "whatsapp";
  label: string;
  source: string;
  status: "active" | "configured" | "missing" | "pending" | "synced" | "unavailable";
  status_label: string;
};

export type AdminPsychologistDetailDTO = {
  general: {
    account_history: AdminPsychologistDetailEvent[];
    integrations: AdminPsychologistIntegrationStatus[];
    metrics: AdminPsychologistDetailMetric[];
    recent_activity: AdminPsychologistDetailEvent[];
    subscription: {
      current_period_end: Date | null;
      gateway: string | null;
      gateway_label: string | null;
      id: string | null;
      interval: string | null;
      payment_method: {
        brand: string | null;
        exp_month: number | null;
        exp_year: number | null;
        gateway: string;
        last4: string | null;
      } | null;
      plan_name: string | null;
      plan_slug: string | null;
      price_cents: number | null;
      source: string | null;
      started_at: Date | null;
      status: string | null;
    };
  };
  header: {
    active: boolean;
    avatar: string | null;
    created_at: Date;
    crp: string | null;
    id: string;
    last_access_at: Date | null;
    name: string;
    plan_name: string | null;
    plan_slug: string | null;
    public_profile_url: string;
    published: boolean;
    rating_avg: number;
    rating_count: number;
    status: AdminPsychologistDetailStatus;
    status_label: string;
    verified: boolean;
  };
  profile: {
    academic: {
      formations: string[];
      graduation_year: string | null;
      institution: string | null;
      title: string | null;
    };
    content: {
      bio: string | null;
      cover_image_url: string | null;
      headline: string | null;
      video_cover_url: string | null;
      video_url: string | null;
    };
    features: {
      accepts_insurance: boolean;
      discount_first_session: boolean;
      social_value: boolean;
    };
    personal: {
      address: {
        city: string | null;
        complement: string | null;
        district: string | null;
        full: string | null;
        number: string | null;
        state: string | null;
        street: string | null;
        zip: string | null;
      };
      birthdate: Date | null;
      cpf: string | null;
      email: string;
      phone: string | null;
      provider: string;
    };
    professional: {
      approaches: AdminPsychologistCatalogItem[];
      crp: string | null;
      crp_registration_date: Date | null;
      crp_status: string;
      experience_years: number | null;
      gender: string | null;
      languages: string[];
      modality: string | null;
      race_color: string | null;
      regional_crp: string | null;
      registration_number: string | null;
      religion: string | null;
      services: AdminPsychologistCatalogItem[];
      specialties: AdminPsychologistCatalogItem[];
      target_audience: string[];
    };
  };
  source: "user+psychologist_profile+catalogs+subscriptions+metrics+events";
};

export type IAdminPsychologistDetailDTO = Request & {
  p: {
    id: string;
  };
};
