import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type PsychologistsDashboardQuery = {
  from?: string;
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
  city?: string;
  discount_first_session?: boolean;
  experience?: PsychologistsListExperience;
  gender?: string;
  language?: string;
  limit?: number;
  modality?: string;
  page?: number;
  plan?: string;
  q?: string;
  service?: string;
  social_value?: boolean;
  sort?: PsychologistsListSort;
  state?: string;
  status?: PsychologistsListStatus;
  target_audience?: string;
};

export type PsychologistsDashboardTrend = "down" | "flat" | "unavailable" | "up";

export type PsychologistsDashboardMetric = {
  change_percent: number | null;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: PsychologistsDashboardTrend;
  unit: "count" | "currency_cents" | "decimal" | "percentage";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
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
  date: string;
  new_signups: number;
  paid_subscriptions_started: number;
  profile_views: number;
  reviews_received: number;
  whatsapp_clicks: number;
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

export type PsychologistsListFilters = {
  approaches: PsychologistsListOption[];
  cities: PsychologistsListOption[];
  experience_ranges: PsychologistsListOption[];
  genders: PsychologistsListOption[];
  languages: PsychologistsListOption[];
  modalities: PsychologistsListOption[];
  plans: PsychologistsListOption[];
  services: PsychologistsListOption[];
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
  id: "cfp" | "email" | "mercado_pago" | "subscription" | "whatsapp";
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
    blocked_reason: string | null;
    can_grant: boolean;
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
  crp_registration_date?: string | null;
  notes?: string | null;
  period_days: number;
  reason: string;
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

export type AdminPsychologistEngagementMetric = {
  available: boolean;
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
    timezone: "server-local";
    to: string;
  };
  source: "profile_events+community_activity+video_sessions";
  unavailable: AdminPsychologistEngagementMetric[];
  video: {
    available: boolean;
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

export type AdminPsychologistStatisticsPoint = {
  comments_received: number;
  date: string;
  favorites: number;
  profile_views: number;
  replies: number;
  saves: number;
  whatsapp_clicks: number;
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

export type AdminPsychologistReportsStatusGroup = "dismissed" | "in_review" | "upheld";

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
    community: {
      id: string;
      name: string;
      slug: string;
    };
    excerpt: string;
    id: string;
    public_url: string;
    title: string;
    type: "post" | "reply";
  };
  created_at: string;
  description: string | null;
  id: string;
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
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "in_review" | "total" | "upheld";
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
  source: "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report";
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistsDashboard = {
  cards: {
    churn: PsychologistsDashboardMetric;
    free_psychologists: PsychologistsDashboardMetric;
    new_signups: PsychologistsDashboardMetric;
    subscription_revenue: PsychologistsDashboardMetric;
    total_psychologists: PsychologistsDashboardMetric;
    verified_psychologists: PsychologistsDashboardMetric;
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
    source: "user+contact_request+profile_view_event+professional_review+professional_subscription";
  };
  unavailable: PsychologistsDashboardUnavailableMetric[];
};

const cleanDashboardParams = (input: PsychologistsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanListParams = (input: PsychologistsListQuery) => ({
  ...(input.accepts_insurance ? { accepts_insurance: input.accepts_insurance } : {}),
  ...(input.approach ? { approach: input.approach } : {}),
  ...(input.city ? { city: input.city } : {}),
  ...(input.discount_first_session ? { discount_first_session: input.discount_first_session } : {}),
  ...(input.experience ? { experience: input.experience } : {}),
  ...(input.gender ? { gender: input.gender } : {}),
  ...(input.language ? { language: input.language } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.modality ? { modality: input.modality } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.plan ? { plan: input.plan } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.service ? { service: input.service } : {}),
  ...(input.social_value ? { social_value: input.social_value } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.state ? { state: input.state } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.target_audience ? { target_audience: input.target_audience } : {}),
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

export const getAdminPsychologistBilling = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistBilling>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/billing`,
  );

  return resolveApiData(response.data);
};

export const getAdminPsychologistStatistics = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminPsychologistStatistics>>(
    `/api/admin/private/psychologists/${encodeURIComponent(id)}/statistics`,
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
