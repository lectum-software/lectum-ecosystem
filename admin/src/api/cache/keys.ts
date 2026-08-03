import type {
  AdminCommunitiesListQuery,
  AdminCommunityActivitiesQuery,
  AdminCommunityContentDetailQuery,
  AdminCommunityContentQuery,
  AdminCommunityRankingQuery,
  AdminCommunityReportsQuery,
  AdminCommunityStatisticsQuery,
  CommunitiesDashboardQuery,
} from "@/api/req/communities";
import type { DashboardSummaryQuery } from "@/api/req/dashboard";
import type { FinanceDashboardQuery, FinanceListQuery } from "@/api/req/finance";
import type {
  AdminModerationEventsQuery,
  AdminModerationOperationalAlertsQuery,
} from "@/api/req/moderation";
import type {
  AdminNotificationCampaignsQuery,
  AdminNotificationLogsQuery,
  AdminNotificationsRangeQuery,
} from "@/api/req/notifications";
import type {
  AdminPatientActivitiesQuery,
  AdminPatientReportsQuery,
  PatientsDashboardQuery,
  PatientsDetailQuery,
} from "@/api/req/patients";
import type { PatientsListQuery } from "@/api/req/patients/list";
import type {
  AdminPsychologistActivitiesQuery,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistReportsQuery,
  AdminPsychologistReviewsQuery,
  AdminPsychologistStatisticsQuery,
  PsychologistsDashboardQuery,
  PsychologistsListQuery,
} from "@/api/req/psychologists";
import type { TrafficSummaryQuery } from "@/api/req/traffic";

type AdminRangeQuery =
  | CommunitiesDashboardQuery
  | DashboardSummaryQuery
  | FinanceDashboardQuery
  | PatientsDashboardQuery
  | PatientsDetailQuery
  | PsychologistsDashboardQuery
  | TrafficSummaryQuery;

const normalizeRange = (input: AdminRangeQuery) => ({
  from: input.from || "default",
  groupBy: "groupBy" in input ? input.groupBy || "day" : undefined,
  period: "period" in input ? input.period || "default" : undefined,
  to: input.to || "default",
});

const normalizeFinanceList = (input: FinanceListQuery) => ({
  ...normalizeRange(input),
  limit: input.limit || 20,
  page: input.page || 1,
  paymentHealth: input.paymentHealth || "all",
  q: input.q || "",
  status: input.status || "all",
});

const normalizePsychologistsList = (input: PsychologistsListQuery) => ({
  accepts_insurance: input.accepts_insurance || false,
  approach: input.approach || "all",
  available_today: input.available_today || false,
  city: input.city || "all",
  discount_first_session: input.discount_first_session || false,
  engagement: input.engagement || "all",
  experience: input.experience || "all",
  gender: input.gender || "all",
  language: input.language || "all",
  limit: input.limit || 12,
  modality: input.modality || "all",
  more_experienced: input.more_experienced || false,
  page: input.page || 1,
  plan: input.plan || "all",
  profile_status: input.profile_status || "all",
  q: input.q || "",
  race_color: input.race_color || "all",
  registry_status: input.registry_status || "all",
  religion: input.religion || "all",
  service: input.service || "all",
  social_value: input.social_value || false,
  sort: input.sort || "relevance",
  specialty: input.specialty || "all",
  state: input.state || "all",
  status: input.status || "all",
  target_audience: input.target_audience || "all",
  profile_conversion: input.profile_conversion || "all",
  profile_conversion_engagement: input.profile_conversion_engagement || "all",
  verified: input.verified || false,
});

const normalizePatientsList = (input: PatientsListQuery) => ({
  gender: input.gender || "all",
  intent_engagement: input.intent_engagement || "all",
  limit: input.limit || 12,
  page: input.page || 1,
  provider: input.provider || "all",
  q: input.q || "",
  sort: input.sort || "recent",
  status: input.status || "all",
});

const normalizePatientActivities = (input: AdminPatientActivitiesQuery) => ({
  area: input.area || "all",
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  q: input.q || "",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizePatientReports = (input: AdminPatientReportsQuery) => ({
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  status: input.status || "all",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizePsychologistPublications = (input: AdminPsychologistPublicationsQuery) => ({
  community: input.community || "all",
  from: input.from || "default",
  limit: input.limit || 5,
  page: input.page || 1,
  period: input.period || "all",
  q: input.q || "",
  sort: input.sort || "engagement",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizePsychologistStatistics = (input: AdminPsychologistStatisticsQuery = {}) => ({
  community: input.community || "all",
  from: input.from || "default",
  period: input.period || "week",
  to: input.to || "default",
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

const normalizeNotificationsRange = (input: AdminNotificationsRangeQuery) => ({
  from: input.from || "default",
  period: input.period || "all",
  to: input.to || "default",
});

const normalizeNotificationCampaigns = (input: AdminNotificationCampaignsQuery) => ({
  audience: input.audience || "all",
  channel: input.channel || "all",
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  period: input.period || "all",
  q: input.q || "",
  status: input.status || "all",
  to: input.to || "default",
});

const normalizeNotificationLogs = (input: AdminNotificationLogsQuery) => ({
  audience: input.audience || "all",
  channel: input.channel || "all",
  from: input.from || "default",
  limit: input.limit || 8,
  page: input.page || 1,
  period: input.period || "all",
  q: input.q || "",
  status: input.status || "all",
  to: input.to || "default",
  trigger_key: input.trigger_key || "",
});

const normalizeModerationEvents = (input: AdminModerationEventsQuery) => ({
  category: input.category || "all",
  community: input.community || "all",
  decision: input.decision || "all",
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  q: input.q || "",
  severity: input.severity || "all",
  status: input.status || "all",
  targetType: input.targetType || "all",
  to: input.to || "default",
});

const normalizeModerationOperationalAlerts = (input: AdminModerationOperationalAlertsQuery) => ({
  alertType: input.alertType || "all",
  contentType: input.contentType || "all",
  from: input.from || "default",
  group: input.group || "all",
  limit: input.limit || 10,
  page: input.page || 1,
  plan: input.plan || "all",
  profileStatus: input.profileStatus || "all",
  q: input.q || "",
  reason: input.reason || "",
  reporter: input.reporter || "all",
  status: input.status || "all",
  to: input.to || "default",
  userRole: input.userRole || "all",
});

const normalizeCommunityContent = (input: AdminCommunityContentQuery) => ({
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  period: input.period || "all",
  q: input.q || "",
  sort: input.sort || "engagement",
  status: input.status || "all",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizeCommunityContentDetail = (input: AdminCommunityContentDetailQuery) => ({
  from: input.from || "default",
  period: input.period || "month",
  to: input.to || "default",
});

const normalizeCommunityRanking = (input: AdminCommunityRankingQuery) => ({
  limit: input.limit || 10,
  page: input.page || 1,
  period: input.period || "30d",
  q: input.q || "",
});

const normalizeCommunityReports = (input: AdminCommunityReportsQuery) => ({
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  q: input.q || "",
  status: input.status || "all",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizeCommunityActivities = (input: AdminCommunityActivitiesQuery) => ({
  area: input.area || "all",
  from: input.from || "default",
  limit: input.limit || 10,
  page: input.page || 1,
  q: input.q || "",
  to: input.to || "default",
  type: input.type || "all",
});

const normalizeCommunityStatistics = (input: AdminCommunityStatisticsQuery) => ({
  from: input.from || "default",
  period: input.period || "month",
  to: input.to || "default",
});

const normalizeCommunitiesList = (input: AdminCommunitiesListQuery) => ({
  category: input.category || "all",
  limit: input.limit || 12,
  page: input.page || 1,
  q: input.q || "",
  sort: input.sort || "name",
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
  activities: (id: string, input: AdminCommunityActivitiesQuery) =>
    [...adminCommunitiesKeys.all, "activities", id, normalizeCommunityActivities(input)] as const,
  content: (id: string, input: AdminCommunityContentQuery) =>
    [...adminCommunitiesKeys.all, "content", id, normalizeCommunityContent(input)] as const,
  contentDetail: (
    id: string,
    type: string,
    contentId: string,
    input: AdminCommunityContentDetailQuery,
  ) =>
    [
      ...adminCommunitiesKeys.all,
      "content-detail",
      id,
      type,
      contentId,
      normalizeCommunityContentDetail(input),
    ] as const,
  dashboard: (input: CommunitiesDashboardQuery) =>
    [...adminCommunitiesKeys.all, "dashboard", normalizeRange(input)] as const,
  detail: (id: string) => [...adminCommunitiesKeys.all, "detail", id] as const,
  list: (input: AdminCommunitiesListQuery) =>
    [...adminCommunitiesKeys.all, "list", normalizeCommunitiesList(input)] as const,
  ranking: (id: string, input: AdminCommunityRankingQuery) =>
    [...adminCommunitiesKeys.all, "ranking", id, normalizeCommunityRanking(input)] as const,
  reports: (id: string, input: AdminCommunityReportsQuery) =>
    [...adminCommunitiesKeys.all, "reports", id, normalizeCommunityReports(input)] as const,
  rules: (id: string) => [...adminCommunitiesKeys.all, "rules", id] as const,
  statistics: (id: string, input: AdminCommunityStatisticsQuery) =>
    [...adminCommunitiesKeys.all, "statistics", id, normalizeCommunityStatistics(input)] as const,
};

export const adminFinanceKeys = {
  all: ["admin", "finance"] as const,
  charges: (input: FinanceListQuery) =>
    [...adminFinanceKeys.all, "charges", normalizeFinanceList(input)] as const,
  dashboard: (input: FinanceDashboardQuery) =>
    [...adminFinanceKeys.all, "dashboard", normalizeRange(input)] as const,
  subscriptions: (input: FinanceListQuery) =>
    [...adminFinanceKeys.all, "subscriptions", normalizeFinanceList(input)] as const,
};

export const adminPsychologistsKeys = {
  all: ["admin", "psychologists"] as const,
  account: (id: string) => [...adminPsychologistsKeys.all, "account", id] as const,
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
  registryVerification: (id: string) =>
    [...adminPsychologistsKeys.all, "registry-verification", id] as const,
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
  statistics: (id: string, input: AdminPsychologistStatisticsQuery = {}) =>
    [
      ...adminPsychologistsKeys.all,
      "statistics",
      id,
      normalizePsychologistStatistics(input),
    ] as const,
};

export const adminPatientsKeys = {
  all: ["admin", "patients"] as const,
  account: (id: string) => [...adminPatientsKeys.all, "account", id] as const,
  activities: (id: string, input: AdminPatientActivitiesQuery) =>
    [...adminPatientsKeys.all, "activities", id, normalizePatientActivities(input)] as const,
  dashboard: (input: PatientsDashboardQuery) =>
    [...adminPatientsKeys.all, "dashboard", normalizeRange(input)] as const,
  detail: (id: string, input: PatientsDetailQuery) =>
    [...adminPatientsKeys.all, "detail", id, normalizeRange(input)] as const,
  list: (input: PatientsListQuery) =>
    [...adminPatientsKeys.all, "list", normalizePatientsList(input)] as const,
  reports: (id: string, input: AdminPatientReportsQuery) =>
    [...adminPatientsKeys.all, "reports", id, normalizePatientReports(input)] as const,
};

export const adminNotificationsKeys = {
  all: ["admin", "notifications"] as const,
  automaticLogs: (input: AdminNotificationLogsQuery) =>
    [...adminNotificationsKeys.all, "automatic-logs", normalizeNotificationLogs(input)] as const,
  campaigns: (input: AdminNotificationCampaignsQuery) =>
    [...adminNotificationsKeys.all, "campaigns", normalizeNotificationCampaigns(input)] as const,
  emailStatus: () => [...adminNotificationsKeys.all, "email-status"] as const,
  metrics: (input: AdminNotificationsRangeQuery) =>
    [...adminNotificationsKeys.all, "metrics", normalizeNotificationsRange(input)] as const,
  pushStatus: () => [...adminNotificationsKeys.all, "push-status"] as const,
};

export const adminModerationKeys = {
  all: ["admin", "moderation"] as const,
  detail: (id: string) => [...adminModerationKeys.all, "detail", id] as const,
  events: (input: AdminModerationEventsQuery) =>
    [...adminModerationKeys.all, "events", normalizeModerationEvents(input)] as const,
  operationalAlerts: (input: AdminModerationOperationalAlertsQuery) =>
    [
      ...adminModerationKeys.all,
      "operational-alerts",
      normalizeModerationOperationalAlerts(input),
    ] as const,
  summary: () => [...adminModerationKeys.all, "summary"] as const,
};

export const adminSettingsKeys = {
  all: ["admin", "settings"] as const,
  catalogs: () => [...adminSettingsKeys.all, "catalogs"] as const,
  seo: () => [...adminSettingsKeys.all, "seo"] as const,
  subscriptionPlan: () => [...adminSettingsKeys.all, "subscription-plan"] as const,
};
