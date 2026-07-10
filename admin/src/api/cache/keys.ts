import type { CommunitiesDashboardQuery } from "@/api/req/communities";
import type { DashboardSummaryQuery } from "@/api/req/dashboard";
import type {
  AdminPsychologistActivitiesQuery,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistReportsQuery,
  AdminPsychologistReviewsQuery,
  PsychologistsDashboardQuery,
  PsychologistsListQuery,
} from "@/api/req/psychologists";
import type { TrafficSummaryQuery } from "@/api/req/traffic";

type AdminRangeQuery =
  | CommunitiesDashboardQuery
  | DashboardSummaryQuery
  | PsychologistsDashboardQuery
  | TrafficSummaryQuery;

const normalizeRange = (input: AdminRangeQuery) => ({
  from: input.from || "default",
  to: input.to || "default",
});

const normalizePsychologistsList = (input: PsychologistsListQuery) => ({
  accepts_insurance: input.accepts_insurance || false,
  approach: input.approach || "all",
  city: input.city || "all",
  discount_first_session: input.discount_first_session || false,
  experience: input.experience || "all",
  gender: input.gender || "all",
  language: input.language || "all",
  limit: input.limit || 12,
  modality: input.modality || "all",
  page: input.page || 1,
  plan: input.plan || "all",
  q: input.q || "",
  service: input.service || "all",
  social_value: input.social_value || false,
  sort: input.sort || "relevance",
  state: input.state || "all",
  status: input.status || "all",
  target_audience: input.target_audience || "all",
});

const normalizePsychologistPublications = (input: AdminPsychologistPublicationsQuery) => ({
  community: input.community || "all",
  from: input.from || "default",
  limit: input.limit || 5,
  page: input.page || 1,
  q: input.q || "",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizePsychologistReviews = (input: AdminPsychologistReviewsQuery) => ({
  limit: input.limit || 10,
  page: input.page || 1,
  rating: input.rating || "all",
  status: input.status || "all",
});

const normalizePsychologistReports = (input: AdminPsychologistReportsQuery) => ({
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  status: input.status || "all",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizePsychologistActivities = (input: AdminPsychologistActivitiesQuery) => ({
  area: input.area || "all",
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  q: input.q || "",
  to: input.to || "default",
  type: input.type || "all",
});

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  summary: (input: DashboardSummaryQuery) =>
    [...adminDashboardKeys.all, "summary", normalizeRange(input)] as const,
};

export const adminTrafficKeys = {
  all: ["admin", "traffic"] as const,
  summary: (input: TrafficSummaryQuery) =>
    [...adminTrafficKeys.all, "summary", normalizeRange(input)] as const,
};

export const adminCommunitiesKeys = {
  all: ["admin", "communities"] as const,
  dashboard: (input: CommunitiesDashboardQuery) =>
    [...adminCommunitiesKeys.all, "dashboard", normalizeRange(input)] as const,
  detail: (id: string) => [...adminCommunitiesKeys.all, "detail", id] as const,
  rules: (id: string) => [...adminCommunitiesKeys.all, "rules", id] as const,
};

export const adminPsychologistsKeys = {
  all: ["admin", "psychologists"] as const,
  activities: (id: string, input: AdminPsychologistActivitiesQuery) =>
    [
      ...adminPsychologistsKeys.all,
      "activities",
      id,
      normalizePsychologistActivities(input),
    ] as const,
  billing: (id: string) => [...adminPsychologistsKeys.all, "billing", id] as const,
  dashboard: (input: PsychologistsDashboardQuery) =>
    [...adminPsychologistsKeys.all, "dashboard", normalizeRange(input)] as const,
  detail: (id: string) => [...adminPsychologistsKeys.all, "detail", id] as const,
  list: (input: PsychologistsListQuery) =>
    [...adminPsychologistsKeys.all, "list", normalizePsychologistsList(input)] as const,
  publications: (id: string, input: AdminPsychologistPublicationsQuery) =>
    [
      ...adminPsychologistsKeys.all,
      "publications",
      id,
      normalizePsychologistPublications(input),
    ] as const,
  reports: (id: string, input: AdminPsychologistReportsQuery) =>
    [...adminPsychologistsKeys.all, "reports", id, normalizePsychologistReports(input)] as const,
  reviews: (id: string, input: AdminPsychologistReviewsQuery) =>
    [...adminPsychologistsKeys.all, "reviews", id, normalizePsychologistReviews(input)] as const,
  statistics: (id: string) => [...adminPsychologistsKeys.all, "statistics", id] as const,
};
