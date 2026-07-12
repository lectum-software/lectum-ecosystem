import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type PsychologistsDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "week" | "year";
  to?: string;
};

export type PsychologistsListSort =
  | "favorites"
  | "name"
  | "rating"
  | "recent"
  | "relevance"
  | "whatsapp";

export type PsychologistsListStatus = "free" | "pending" | "unpublished" | "verified";

export type PsychologistsListExperience = "0_4" | "5_9" | "10_plus" | "unknown";

export type PsychologistsListQuery = {
  accepts_insurance?: boolean;
  approach?: string;
  available_today?: boolean;
  city?: string;
  discount_first_session?: boolean;
  experience?: PsychologistsListExperience;
  gender?: string;
  language?: string;
  limit?: number;
  modality?: string;
  more_experienced?: boolean;
  page?: number;
  plan?: string;
  q?: string;
  race_color?: string;
  religion?: string;
  service?: string;
  social_value?: boolean;
  sort?: PsychologistsListSort;
  specialty?: string;
  state?: string;
  status?: PsychologistsListStatus;
  target_audience?: string;
  verified?: boolean;
};

export type PsychologistsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type PsychologistsDashboardMetric = {
  change_percent: number | null;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous_value: number;
  previous_value_count?: number;
  source: string;
  trend: PsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
  value_count?: number;
};

export type PsychologistsDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type PsychologistsDashboardDailyPoint = {
  churn: number;
  courtesy_psychologists: number;
  date: string;
  free_psychologists: number;
  new_signups: number;
  subscriber_psychologists: number;
  total_psychologists: number;
};

export type PsychologistsDashboardPsychologist = {
  avatar: string | null;
  city: string | null;
  created_at: string;
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

export type PsychologistsDashboardRankingItem = {
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

export type PsychologistsDashboardBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type PsychologistsDashboardBooleanBreakdown = {
  false_count: number;
  false_label: string;
  source: string;
  true_count: number;
  true_label: string;
  true_percentage: number;
};

export type PsychologistsDashboardStatistics = {
  accepts_insurance: PsychologistsDashboardBooleanBreakdown;
  approaches: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_approach";
    total: number;
  };
  discount_first_session: PsychologistsDashboardBooleanBreakdown;
  experience_over_10_years: PsychologistsDashboardBooleanBreakdown;
  gender: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.gender";
    total: number;
  };
  modalities: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.modality";
    total: number;
  };
  services: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_service";
    total: number;
  };
  specialties: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_specialty";
    total: number;
  };
  social_value: PsychologistsDashboardBooleanBreakdown;
  states: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.professional_address_state";
    total: number;
  };
  target_audience: {
    items: PsychologistsDashboardBreakdownItem[];
    source: "psychologist_profile.target_audience";
    total: number;
  };
};

export type PsychologistsDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

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
  source: "user+psychologist_profile+professional_subscription+public_ranking";
};

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
  created_at: string;
  description: string;
  id: string;
  label: string;
  source: string;
  type: string;
};

export type AdminPsychologistIntegrationStatus = {
  checked_at: string | null;
  id: "email" | "mercado_pago" | "registry" | "subscription" | "whatsapp";
  label: string;
  source: string;
  status: "active" | "configured" | "missing" | "pending" | "synced" | "unavailable";
  status_label: string;
};

export type AdminPsychologistDetail = {
  general: {
    account_history: AdminPsychologistDetailEvent[];
    integrations: AdminPsychologistIntegrationStatus[];
    metrics: AdminPsychologistDetailMetric[];
    recent_activity: AdminPsychologistDetailEvent[];
    subscription: {
      current_period_end: string | null;
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
      started_at: string | null;
      status: string | null;
    };
  };
  header: {
    active: boolean;
    avatar: string | null;
    created_at: string;
    crp: string | null;
    id: string;
    last_access_at: string | null;
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
      birthdate: string | null;
      cpf: string | null;
      email: string;
      phone: string | null;
      provider: string;
    };
    professional: {
      approaches: AdminPsychologistCatalogItem[];
      crp: string | null;
      crp_registration_date: string | null;
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

export type AdminPsychologistUpdatePersonalDataInput = {
  address_city?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_number?: string | null;
  address_state?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  birthdate?: string | null;
  confirm_cpf_change?: boolean;
  cpf?: string | null;
  gender?: string | null;
  race_color?: string | null;
  reason: string;
  religion?: string | null;
  whatsapp?: string | null;
};

export type AdminPsychologistUpdateProfessionalDataInput = {
  approach_ids?: string[];
  languages?: string[];
  modality?: "hibrido" | "online" | "presencial" | null;
  reason: string;
  service_ids?: string[];
  specialty_ids?: string[];
  target_audience?: string[];
};

export type AdminPsychologistAccount = {
  active: boolean;
  capabilities: {
    can_change_email: boolean;
    can_send_email_confirmation: boolean;
    can_send_password_reset: boolean;
    can_set_temporary_password: boolean;
    can_revoke_sessions: boolean;
  };
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  email: string;
  has_password: boolean;
  last_access_at: string | null;
  need_reset: boolean;
  provider: string;
  provider_label: string;
  sessions: {
    active_count: number;
    devices_count: number;
    last_access_at: string | null;
    source: "user_token";
  };
  source: "user+user_token";
};

export type AdminPsychologistAccountReasonInput = {
  reason: string;
};

export type AdminPsychologistChangeEmailInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  email: string;
};

export type AdminPsychologistSetTemporaryPasswordInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  password: string;
  password_confirm: string;
};

export type AdminPsychologistRevokeSessionsInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
};

export type AdminPsychologistBillingPaymentHistoryItem = {
  amount_cents: number | null;
  description: string;
  external_id: string;
  gateway: string;
  id: string;
  occurred_at: string | null;
  status: "cancelado" | "pago" | "pendente" | "processado" | "recusado";
  status_label: string;
  title: string;
};

export type AdminPsychologistBilling = {
  courtesy: {
    active_grant_id: string | null;
    blocked_reason: string | null;
    can_grant: boolean;
    can_revoke: boolean;
    cpf: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    period_options: { days: number; label: string }[];
    regional_crp: string | null;
    registration_number: string | null;
    requires_crp_registration_date: boolean;
  };
  payment_history: {
    available: boolean;
    items: AdminPsychologistBillingPaymentHistoryItem[];
    reason: string | null;
    source: "payment_event";
  };
  payment_method: {
    brand: string | null;
    exp_month: number | null;
    exp_year: number | null;
    gateway: string;
    last4: string | null;
  } | null;
  plan: {
    can_cancel: false;
    can_change_payment_method: false;
    current_period_end: string | null;
    gateway: string | null;
    gateway_label: string | null;
    grant_notes: string | null;
    grant_reason: string | null;
    grant_started_at: string | null;
    granted_by: string | null;
    has_external_billing: boolean;
    id: string | null;
    interval: string | null;
    is_courtesy: boolean;
    is_paid: boolean;
    lifetime_value_available: boolean;
    lifetime_value_cents: number | null;
    lifetime_value_unavailable_reason: string | null;
    paid_installments_count: number;
    plan_name: string | null;
    plan_slug: string | null;
    price_cents: number | null;
    source: string | null;
    source_label: string | null;
    started_at: string | null;
    status: string | null;
  };
  source: "professional_subscription+payment_method+payment_event+admin_grant_service";
};

export type AdminPsychologistGrantCourtesyInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes: string;
  period_days: number;
  regional_crp: string;
};

export type AdminPsychologistGrantCourtesyResponse = {
  billing: AdminPsychologistBilling;
  grant: {
    crp_registration_date: string | null;
    granted_to: {
      email: string;
      name: string;
      profileId: string;
      userId: string;
    };
    identity_override: {
      cpf: string | null;
      crp: string | null;
      crp_number: string | null;
      crp_region: string | null;
    } | null;
    subscription: {
      current_period_end: string;
      id: string;
      plan: {
        id: string;
        name: string;
        slug: string;
      };
      source: string;
      status: string;
    };
  };
};

export type AdminPsychologistRevokeCourtesyResponse = {
  billing: AdminPsychologistBilling;
  revoked: {
    id: string;
    status: "cancelada";
  };
};

export type AdminPsychologistRegistryVerificationAttempt = {
  checked_at: string;
  cpf_masked: string | null;
  found: boolean;
  id: string;
  notes: string | null;
  reason: string | null;
  regional_crp: string | null;
  registration_number: string | null;
  result_label: string;
  source: Exclude<AdminRegistryVerificationSource, "admin_grant" | "pendente">;
  source_label: string;
  responsible_admin: AdminRegistryVerificationActor | null;
};

export type AdminPsychologistRegistryVerification = {
  actions: {
    can_approve_manually: boolean;
    can_reject_manually: boolean;
    strong_approve_confirmation: "APROVAR CRP";
    strong_reject_confirmation: "REJEITAR CRP";
    strong_save_confirmation: "SALVAR REGISTRO";
  };
  identity: {
    cpf: string | null;
    cpf_masked: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    experience_years: number | null;
    regional_crp: string | null;
    registration_number: string | null;
  };
  latest_attempts: AdminPsychologistRegistryVerificationAttempt[];
  source: "psychologist_profile+professional_registry_check";
  summary: AdminPsychologistRegistryVerificationSummary & {
    approval_label: "Ativo" | "Pendente";
    cfp_verified_at: string | null;
    crp_status: string;
    latest_manual_admin: AdminRegistryVerificationActor | null;
    latest_manual_checked_at: string | null;
    latest_manual_notes: string | null;
    latest_manual_reason: string | null;
    plan_label: "Cortesia" | "Gratuito" | "Profissional";
    plan_type: "cortesia" | "gratuito" | "profissional";
  };
};

export type AdminPsychologistApproveRegistryVerificationInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes?: string | null;
  regional_crp: string;
  situation_confirmed: boolean;
};

export type AdminPsychologistRejectRegistryVerificationInput = {
  confirmation: string;
  reason: string;
};

export type AdminPsychologistUpdateRegistryIdentityInput = {
  confirmation: string;
  crp: string;
  crp_registration_date: string;
  regional_crp: string;
};

export type AdminPsychologistEngagementMetric = {
  available: boolean;
  comparison?: {
    change_percent: number | null;
    previous_from: string;
    previous_to: string;
    previous_value: number;
    trend: PsychologistsDashboardTrend;
  } | null;
  id: string;
  label: string;
  source: string;
  unit: "count" | "percentage" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminPsychologistStatistics = {
  business: {
    cards: AdminPsychologistEngagementMetric[];
    series: AdminPsychologistStatisticsPoint[];
  };
  community: {
    cards: AdminPsychologistEngagementMetric[];
    communities: {
      color: string | null;
      id: string;
      member_since: string | null;
      name: string;
      posts: number;
      replies: number;
      slug: string;
    }[];
    series: AdminPsychologistStatisticsPoint[];
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    previous_from: string;
    previous_to: string;
    timezone: "server-local";
    to: string;
  };
  source: "profile_events+community_activity+video_sessions+search_impressions";
  unavailable: AdminPsychologistEngagementMetric[];
  video: {
    available: boolean;
    comparisons: {
      average_retention_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      replay_rate_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      sessions: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
    };
    cover_url: string | null;
    metrics: {
      average_retention_percent: number;
      completions: number;
      replay_rate_percent: number;
      sessions: number;
    };
    retention: { label: string; percentage: number; position_percent: number }[];
    source: "profile_video_watch_session";
    unavailable_reason: string | null;
    video_url: string | null;
  };
};

export type AdminPsychologistStatisticsPeriodFilter = "all" | "custom" | "month" | "week" | "year";

export type AdminPsychologistStatisticsQuery = {
  from?: string;
  period?: AdminPsychologistStatisticsPeriodFilter;
  to?: string;
};

export type AdminPsychologistStatisticsPoint = {
  comments_received: number;
  date: string;
  downvotes: number;
  favorites: number;
  profile_views: number;
  replies: number;
  saves: number;
  search_results: number;
  shares: number;
  whatsapp_clicks: number;
  upvotes: number;
  posts: number;
};

export type AdminPsychologistPublicationMetric = AdminPsychologistEngagementMetric;

export type AdminPsychologistPublicationItem = {
  community: {
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
  excerpt: string;
  id: string;
  media: {
    type: string | null;
    url: string | null;
  } | null;
  metrics: {
    comments: AdminPsychologistPublicationMetric;
    downvotes: AdminPsychologistPublicationMetric;
    saves: AdminPsychologistPublicationMetric;
    shares: AdminPsychologistPublicationMetric;
    upvotes: AdminPsychologistPublicationMetric;
    views: AdminPsychologistPublicationMetric;
  };
  public_url: string;
  source: "community_post" | "post_reply";
  title: string;
  type: "post" | "reply";
};

export type AdminPsychologistPublicationsQuery = {
  community?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistPublications = {
  active_filters_count: number;
  count: number;
  data: AdminPsychologistPublicationItem[];
  filters: {
    communities: { id: string; label: string; slug: string }[];
    types: { id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatistics["period"];
  source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event";
  totals: {
    cards: AdminPsychologistEngagementMetric[];
  };
  unavailable: AdminPsychologistEngagementMetric[];
};

export type AdminPsychologistReviewsQuery = {
  limit?: number;
  page?: number;
  rating?: number;
  status?: string;
};

export type AdminPsychologistReviewItem = {
  author: {
    avatar: string | null;
    id: string;
    name: string;
    role: string;
  };
  comment: string | null;
  created_at: string;
  id: string;
  rating: number;
  response: string | null;
  responded_at: string | null;
  status: string;
  status_label: string;
};

export type AdminPsychologistReviews = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  count: number;
  data: AdminPsychologistReviewItem[];
  filters: {
    ratings: { count: number; id: string; label: string }[];
    statuses: { count: number; id: string; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  source: "professional_review";
  summary: {
    distribution: { count: number; percentage: number; rating: 1 | 2 | 3 | 4 | 5 }[];
    rating_avg: number;
    rating_count: number;
    statuses: { count: number; id: string; label: string }[];
  };
};

export type AdminPsychologistReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPsychologistReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPsychologistReportsStatusGroup;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistReportItem = {
  content: {
    available: boolean;
    community: {
      id: string;
      name: string;
      slug: string;
    };
    excerpt: string;
    id: string;
    public_url: string | null;
    title: string;
    type: "post" | "reply";
    unavailable_reason: string | null;
  };
  capabilities: {
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  created_at: string;
  description: string | null;
  id: string;
  moderation: {
    status: string;
    status_label: string;
  };
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    role: string;
  };
  status: string;
  status_group: AdminPsychologistReportsStatusGroup;
  status_label: string;
};

export type AdminPsychologistReports = {
  access: {
    mode: "moderation";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  count: number;
  data: AdminPsychologistReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | AdminPsychologistReportsStatusGroup;
      label: string;
    }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatistics["period"];
  source: "post_report+community_post+post_reply";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistReportResolveInput = {
  confirmation: string;
  measure?: "none" | "remove_content";
  reason: string;
  resolution: "dismissed" | "upheld";
};

export type AdminPsychologistReportActionResponse = {
  affected_reports_count: number;
  content_already_unavailable: boolean;
  content_removed: boolean;
  report: AdminPsychologistReportItem;
  source: "post_report+admin_activity_log";
};

export type AdminPsychologistActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPsychologistActivityItem = {
  actor: {
    id: string;
    name: string;
    role: string;
  } | null;
  area: {
    id: string;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: string;
  type: {
    id: string;
    label: string;
  };
};

export type AdminPsychologistActivities = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPsychologistActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: { count: number; id: string; label: string }[];
    types: { count: number; id: string; label: string }[];
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
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistsDashboard = {
  cards: {
    churn: PsychologistsDashboardMetric;
    courtesy_psychologists: PsychologistsDashboardMetric;
    free_psychologists: PsychologistsDashboardMetric;
    new_signups: PsychologistsDashboardMetric;
    subscriber_psychologists: PsychologistsDashboardMetric;
    total_psychologists: PsychologistsDashboardMetric;
  };
  filters_searches: {
    available: false;
    description: string;
    source: "not_tracked";
  };
  period: PsychologistsDashboardPeriod;
  psychologists: {
    items: PsychologistsDashboardPsychologist[];
    source: "user+psychologist_profile+professional_subscription";
    total: number;
  };
  ranking: {
    formula: "public_directory_psychologist_ranking";
    items: PsychologistsDashboardRankingItem[];
    source: "shared_psychologist_public_ranking_helper";
    total: number;
  };
  statistics: PsychologistsDashboardStatistics;
  timeline: {
    points: PsychologistsDashboardDailyPoint[];
    source: "user+professional_subscription";
  };
  unavailable: PsychologistsDashboardUnavailableMetric[];
};

const cleanDashboardParams = (input: PsychologistsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanListParams = (input: PsychologistsListQuery) => ({
  ...(input.accepts_insurance ? { accepts_insurance: input.accepts_insurance } : {}),
  ...(input.approach ? { approach: input.approach } : {}),
  ...(input.available_today ? { available_today: input.available_today } : {}),
  ...(input.city ? { city: input.city } : {}),
  ...(input.discount_first_session ? { discount_first_session: input.discount_first_session } : {}),
  ...(input.experience ? { experience: input.experience } : {}),
  ...(input.gender ? { gender: input.gender } : {}),
  ...(input.language ? { language: input.language } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.modality ? { modality: input.modality } : {}),
  ...(input.more_experienced ? { more_experienced: input.more_experienced } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.plan ? { plan: input.plan } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.race_color ? { race_color: input.race_color } : {}),
  ...(input.religion ? { religion: input.religion } : {}),
  ...(input.service ? { service: input.service } : {}),
  ...(input.social_value ? { social_value: input.social_value } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.specialty ? { specialty: input.specialty } : {}),
  ...(input.state ? { state: input.state } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.target_audience ? { target_audience: input.target_audience } : {}),
  ...(input.verified ? { verified: input.verified } : {}),
});

const cleanPublicationsParams = (input: AdminPsychologistPublicationsQuery) => ({
  ...(input.community ? { community: input.community } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

const cleanStatisticsParams = (input: AdminPsychologistStatisticsQuery = {}) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanReviewsParams = (input: AdminPsychologistReviewsQuery) => ({
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.rating ? { rating: input.rating } : {}),
  ...(input.status ? { status: input.status } : {}),
});

const cleanReportsParams = (input: AdminPsychologistReportsQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

const cleanActivitiesParams = (input: AdminPsychologistActivitiesQuery) => ({
  ...(input.area ? { area: input.area } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

export const getAdminPsychologistsDashboard = async (input: PsychologistsDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsDashboard>>(
    "/api/admin/private/psychologists/dashboard",
    {
      params: cleanDashboardParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistsList = async (input: PsychologistsListQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistsList>>(
    "/api/admin/private/psychologists",
    {
      params: cleanListParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistPersonalData = async (
  id: string,
  input: AdminPsychologistUpdatePersonalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/personal-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistProfessionalData = async (
  id: string,
  input: AdminPsychologistUpdateProfessionalDataInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistDetail>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/professional-data`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistAccount = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account`,
  );

  return resolveApiData(response.data);
};

export const changeAdminPsychologistAccountEmail = async (
  id: string,
  input: AdminPsychologistChangeEmailInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/change-email`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountEmailConfirmation = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-email-confirmation`,
    input,
  );

  return resolveApiData(response.data);
};

export const sendAdminPsychologistAccountPasswordReset = async (
  id: string,
  input: AdminPsychologistAccountReasonInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/send-password-reset`,
    input,
  );

  return resolveApiData(response.data);
};

export const setAdminPsychologistAccountTemporaryPassword = async (
  id: string,
  input: AdminPsychologistSetTemporaryPasswordInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/set-temporary-password`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistAccountSessions = async (
  id: string,
  input: AdminPsychologistRevokeSessionsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistAccount>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/account/revoke-sessions`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistBilling = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistBilling>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistRegistryVerification = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistStatistics = async (
  id: string,
  input: AdminPsychologistStatisticsQuery = {},
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistStatistics>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/statistics`,
    {
      params: cleanStatisticsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistPublications = async (
  id: string,
  input: AdminPsychologistPublicationsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistPublications>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/publications`,
    {
      params: cleanPublicationsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReviews = async (
  id: string,
  input: AdminPsychologistReviewsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReviews>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reviews`,
    {
      params: cleanReviewsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistReports = async (
  id: string,
  input: AdminPsychologistReportsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistReports>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports`,
    {
      params: cleanReportsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const resolveAdminPsychologistReport = async (
  id: string,
  reportId: string,
  input: AdminPsychologistReportResolveInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistReportActionResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/reports/${encodeURIComponent(
      reportId,
    )}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistActivities = async (
  id: string,
  input: AdminPsychologistActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistActivities>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/activities`,
    {
      params: cleanActivitiesParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const grantAdminPsychologistCourtesy = async (
  id: string,
  input: AdminPsychologistGrantCourtesyInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistGrantCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/grant-courtesy`,
    input,
  );

  return resolveApiData(response.data);
};

export const revokeAdminPsychologistCourtesy = async (id: string) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRevokeCourtesyResponse>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing/revoke-courtesy`,
  );

  return resolveApiData(response.data);
};

export const approveAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistApproveRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/approve`,
    input,
  );

  return resolveApiData(response.data);
};

export const rejectAdminPsychologistRegistryVerification = async (
  id: string,
  input: AdminPsychologistRejectRegistryVerificationInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/reject`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminPsychologistRegistryIdentity = async (
  id: string,
  input: AdminPsychologistUpdateRegistryIdentityInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminPsychologistRegistryVerification>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/registry-verification/identity`,
    input,
  );

  return resolveApiData(response.data);
};
