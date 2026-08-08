export type AdminPsychologistsDashboardQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
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
  previous_value_count?: number;
  source: string;
  trend: AdminPsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
  value_count?: number;
};

export type AdminPsychologistsDashboardDailyPoint = {
  churn: number;
  courtesy_psychologists: number;
  date: string;
  free_psychologists: number;
  new_signups: number;
  subscriber_psychologists: number;
  total_psychologists: number;
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

export type AdminPsychologistsDashboardDirectoryFilterItem = {
  category_id?: string | null;
  category_label?: string | null;
  id: string;
  label: string;
  position?: number | null;
  slug: string;
};

export type AdminPsychologistsDashboardDirectoryFilters = {
  approaches: AdminPsychologistsDashboardDirectoryFilterItem[];
  features: AdminPsychologistsDashboardDirectoryFilterItem[];
  genders: AdminPsychologistsDashboardDirectoryFilterItem[];
  languages: AdminPsychologistsDashboardDirectoryFilterItem[];
  modalities: AdminPsychologistsDashboardDirectoryFilterItem[];
  race_colors: AdminPsychologistsDashboardDirectoryFilterItem[];
  religions: AdminPsychologistsDashboardDirectoryFilterItem[];
  services: AdminPsychologistsDashboardDirectoryFilterItem[];
  specialties: AdminPsychologistsDashboardDirectoryFilterItem[];
  states: AdminPsychologistsDashboardDirectoryFilterItem[];
  target_audiences: AdminPsychologistsDashboardDirectoryFilterItem[];
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
  cities: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_city+professional_address_state";
    total: number;
  };
  features: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile+professional_subscription";
    total: number;
  };
  languages: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.languages";
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
  specialties: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_specialty";
    total: number;
  };
  race_colors: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.race_color";
    total: number;
  };
  religions: {
    items: AdminPsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.religion";
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

export type AdminPsychologistsDashboardFilterSearchDimension = {
  items: AdminPsychologistsDashboardBreakdownItem[];
  source: "important_action_event.action_type=psychologist_directory_filter_search";
  total: number;
};

export type AdminPsychologistsDashboardFilterSearches = {
  available: true;
  description: string;
  dimensions: {
    approaches: AdminPsychologistsDashboardFilterSearchDimension;
    cities: AdminPsychologistsDashboardFilterSearchDimension;
    features: AdminPsychologistsDashboardFilterSearchDimension;
    genders: AdminPsychologistsDashboardFilterSearchDimension;
    languages: AdminPsychologistsDashboardFilterSearchDimension;
    modalities: AdminPsychologistsDashboardFilterSearchDimension;
    race_colors: AdminPsychologistsDashboardFilterSearchDimension;
    religions: AdminPsychologistsDashboardFilterSearchDimension;
    services: AdminPsychologistsDashboardFilterSearchDimension;
    specialties: AdminPsychologistsDashboardFilterSearchDimension;
    states: AdminPsychologistsDashboardFilterSearchDimension;
    target_audiences: AdminPsychologistsDashboardFilterSearchDimension;
  };
  minimum_city_searches: number;
  source: "important_action_event.action_type=psychologist_directory_filter_search";
};
