import type { Request } from "express";

export type AdminPsychologistsDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "week" | "year";
  to?: string;
};

export type AdminPsychologistsDashboardDateRange = {
  end: Date;
  start: Date;
};

export type AdminPsychologistsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminPsychologistsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPsychologistsDashboardMetric = {
  change_percent: number | null;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminPsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type AdminPsychologistsDashboardDailyPoint = {
  date: string;
  new_signups: number;
  paid_subscriptions_started: number;
  profile_views: number;
  reviews_received: number;
  whatsapp_clicks: number;
};

export type AdminPsychologistsDashboardPsychologist = {
  avatar: string | null;
  city: string | null;
  created_at: Date;
  crp: string | null;
  email: string;
  id: string;
  name: string;
  plan_name: string | null;
  plan_slug: string | null;
  published: boolean;
  state: string | null;
  status: "gratuito" | "nao_publicado" | "pendente" | "verificado";
  verified: boolean;
};

export type AdminPsychologistsDashboardRankingItem = {
  avatar: string | null;
  base_score: number;
  crp: string | null;
  id: string;
  name: string;
  position: number;
  public_profile_url: string;
  score: number;
  verified: boolean;
};

export type AdminPsychologistsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminPsychologistsDashboardBooleanBreakdown = {
  false_count: number;
  false_label: string;
  source: string;
  true_count: number;
  true_label: string;
  true_percentage: number;
};

export type AdminPsychologistsDashboardStatistics = {
  accepts_insurance: AdminPsychologistsDashboardBooleanBreakdown;
  approaches: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_approach";
    total: number;
  };
  discount_first_session: AdminPsychologistsDashboardBooleanBreakdown;
  experience_over_10_years: AdminPsychologistsDashboardBooleanBreakdown;
  gender: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.gender";
    total: number;
  };
  modalities: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.modality";
    total: number;
  };
  services: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_service";
    total: number;
  };
  social_value: AdminPsychologistsDashboardBooleanBreakdown;
  states: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_state";
    total: number;
  };
  target_audience: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.target_audience";
    total: number;
  };
};

export type AdminPsychologistsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPsychologistsDashboardSummary = {
  cards: {
    churn: AdminPsychologistsDashboardMetric;
    free_psychologists: AdminPsychologistsDashboardMetric;
    new_signups: AdminPsychologistsDashboardMetric;
    subscription_revenue: AdminPsychologistsDashboardMetric;
    total_psychologists: AdminPsychologistsDashboardMetric;
    verified_psychologists: AdminPsychologistsDashboardMetric;
  };
  filters_searches: {
    available: false;
    description: string;
    source: "not_tracked";
  };
  period: AdminPsychologistsDashboardPeriod;
  psychologists: {
    items: AdminPsychologistsDashboardPsychologist[];
    source: "user+psychologist_profile+professional_subscription";
    total: number;
  };
  ranking: {
    formula: "public_directory_psychologist_ranking";
    items: AdminPsychologistsDashboardRankingItem[];
    source: "shared_psychologist_public_ranking_helper";
    total: number;
  };
  statistics: AdminPsychologistsDashboardStatistics;
  timeline: {
    points: AdminPsychologistsDashboardDailyPoint[];
    source: "user+contact_request+profile_view_event+professional_review+professional_subscription";
  };
  unavailable: AdminPsychologistsDashboardUnavailableMetric[];
};

export type IAdminPsychologistsDashboardDTO = Request & {
  q: AdminPsychologistsDashboardQuery;
};
