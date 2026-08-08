import { diagnoseAdminCommunityEngagement } from "@/utils/admin-community-engagement-diagnosis";
import {
  buildDateLabels as buildLabels,
  daysBetweenInclusive,
  resolveCalendarPeriod,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminPatientsDashboardDateRange,
  AdminPatientsDashboardDeviceType,
  AdminPatientsDashboardEngagementAnalysis,
  AdminPatientsDashboardEngagementSegmentId,
  AdminPatientsDashboardIntentAnalysis,
  AdminPatientsDashboardIntentFilterId,
  AdminPatientsDashboardIntentSegmentId,
  AdminPatientsDashboardMetric,
  AdminPatientsDashboardPeriod,
  AdminPatientsDashboardQuery,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import type {
  AdminPatientSnapshotRecord,
  AdminPatientsDashboardRepository,
} from "../../repositories/AdminPatientsDashboardRepository";

export const DEFAULT_PERIOD_DAYS = 7;

export const MAX_PERIOD_DAYS = 3660;

export const MS_PER_DAY = 86_400_000;

export const DURATION_RELIABILITY_THRESHOLD = 0.5;

export const ANONYMOUS_CONVERSION_FIRST_TOUCH_LIMIT = 6;

export const FIRST_TOUCH_SAMPLE_THRESHOLD = 3;

export type PatientsPeriodResolution = {
  current: AdminPatientsDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminPatientsDashboardPeriod;
  previous: AdminPatientsDashboardDateRange;
};

export type PeriodResult =
  | {
      period: PatientsPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export type PatientsDashboardIntentSignals = Awaited<
  ReturnType<AdminPatientsDashboardRepository["listIntentSignals"]>
>;

export type PatientsDashboardCommunityEngagementSignals = Awaited<
  ReturnType<AdminPatientsDashboardRepository["listCommunityEngagementEvents"]>
>;

export type PatientsDashboardIntentCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

export type PatientsDashboardCommunityEngagementCounts = {
  interactions: number;
  normalizedInteractions: number;
  normalizedWeightedScore: number;
  posts: number;
  replies: number;
  saves: number;
  uncappedNormalizedWeightedScore: number;
  votes: number;
};

export type PatientsDashboardIntentClassification = {
  analysis: AdminPatientsDashboardIntentAnalysis;
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
};

export type PatientsDashboardEngagementClassification = {
  engagementAnalysis: AdminPatientsDashboardEngagementAnalysis;
  engagementSegmentByPatientId: Map<string, AdminPatientsDashboardEngagementSegmentId>;
};

export const GENDER_LABELS: Record<string, string> = {
  female: "Feminino",
  feminina: "Feminino",
  feminino: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  nao_informado: "Não informado",
  não_binário: "Outro",
  outro: "Outro",
  other: "Outro",
};

export const SIGNUP_SOURCE_OPTIONS = [
  { id: "email_password", label: "E-mail e senha" },
  { id: "google", label: "Google" },
] as const;

export type SignupSource = (typeof SIGNUP_SOURCE_OPTIONS)[number];

export const DEVICE_LABELS: Record<AdminPatientsDashboardDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

export const COUNTRY_LABELS: Record<string, string> = {
  AO: "Angola",
  BR: "Brasil",
  BRA: "Brasil",
  MZ: "Moçambique",
  PT: "Portugal",
  PRT: "Portugal",
  US: "Estados Unidos",
  USA: "Estados Unidos",
};

export const PATIENT_PAGE_KIND_LABELS: Record<string, string> = {
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Psicólogos",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};

export const PATIENT_INTENT_SOURCE =
  "profile_view_event+psychologist_favorite+contact_request" as const;

export const PATIENT_COMMUNITY_ENGAGEMENT_SOURCE =
  "community_post+post_reply+post_vote+post_save+post_reply_save" as const;

export const PATIENT_INTENT_ENGAGEMENT_SOURCE =
  "profile_view_event+psychologist_favorite+contact_request+community_post+post_reply+post_vote+post_save+post_reply_save" as const;

export const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<keyof PatientsDashboardIntentCounts, number>;

export const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<keyof PatientsDashboardIntentCounts, number>;

export const PATIENT_INTENT_SEGMENT_LABELS = {
  cold: "Frios",
  curious: "Curiosos",
  objective: "Interessados",
  very_qualified: "Qualificados",
} as const satisfies Record<AdminPatientsDashboardIntentSegmentId, string>;

export const PATIENT_INTENT_SEGMENT_DESCRIPTIONS = {
  cold: "Sem abertura de perfil, favorito ou clique no WhatsApp no período.",
  curious: "Abriram perfis de psicólogos, mas ainda sem favorito ou contato.",
  objective: "Favoritaram psicólogos ou retornaram a perfis, sem clique no WhatsApp.",
  very_qualified: "Clicaram no WhatsApp ou concentraram múltiplos sinais fortes.",
} as const satisfies Record<AdminPatientsDashboardIntentSegmentId, string>;

export const PATIENT_INTENT_SEGMENT_ORDER: AdminPatientsDashboardIntentSegmentId[] = [
  "cold",
  "curious",
  "objective",
  "very_qualified",
];

export const PATIENT_INTENT_FILTER_ORDER: AdminPatientsDashboardIntentFilterId[] = [
  "all",
  ...PATIENT_INTENT_SEGMENT_ORDER,
];

export const PATIENT_ENGAGEMENT_SEGMENT_LABELS = {
  engaged: "Engajados",
  low_engagement: "Pouco engajados",
  no_engagement: "Sem engajamento",
  very_engaged: "Muito engajados",
} as const satisfies Record<AdminPatientsDashboardEngagementSegmentId, string>;

export const PATIENT_ENGAGEMENT_SEGMENT_ORDER: AdminPatientsDashboardEngagementSegmentId[] = [
  "very_engaged",
  "engaged",
  "low_engagement",
  "no_engagement",
];

export const PATIENT_INTENT_ENGAGEMENT_HIGH_INTENT_SEGMENTS =
  new Set<AdminPatientsDashboardIntentSegmentId>(["objective", "very_qualified"]);

export const PATIENT_INTENT_ENGAGEMENT_HIGH_ENGAGEMENT_SEGMENTS =
  new Set<AdminPatientsDashboardEngagementSegmentId>(["engaged", "very_engaged"]);

export const ANONYMOUS_CONVERSION_BUCKETS = [
  { id: "same_day", label: "Mesmo dia" },
  { id: "days_1_3", label: "1-3 dias" },
  { id: "days_4_7", label: "4-7 dias" },
  { id: "days_8_30", label: "8-30 dias" },
  { id: "over_30", label: "Mais de 30 dias" },
  { id: "no_history", label: "Sem trilha capturada" },
] as const;

export const resolvePeriod = (
  query: AdminPatientsDashboardQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, previousEnd, previousStart, start } = resolved;
  return {
    success: true,
    period: {
      current: { end, start },
      days,
      labels: buildLabels(start, days),
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
      previous: { end: previousEnd, start: previousStart },
    },
  };
};

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const metric = (params: {
  current: number;
  description: string;
  id: string;
  label: string;
  previous: number;
  source: string;
}): AdminPatientsDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: "count",
    unavailable: false,
    value: params.current,
  };
};

export const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

export const averageNumber = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export const percentileValue = (values: number[], percent: number) => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? null;
};

export const daysBetweenDates = (from: Date, to: Date) =>
  Math.max(0, Math.floor((startOfDate(to).getTime() - startOfDate(from).getTime()) / MS_PER_DAY));

export const getPatientActiveDaysInRange = (
  patient: AdminPatientSnapshotRecord,
  range: AdminPatientsDashboardDateRange,
) => {
  const rangeStart = startOfDate(range.start);
  const rangeEnd = startOfDate(range.end);
  const patientStart = startOfDate(patient.createdAt);
  const activeStart = patientStart > rangeStart ? patientStart : rangeStart;

  if (activeStart > rangeEnd) return 0;

  return daysBetweenInclusive(activeStart, rangeEnd);
};

export const normalizeCountToThirtyDays = (count: number, activeDays: number) => {
  if (activeDays <= 0) return 0;

  return roundPercent((count / activeDays) * 30);
};

export const anonymousConversionBucketForDays = (days: number) => {
  if (days === 0) return "same_day";
  if (days <= 3) return "days_1_3";
  if (days <= 7) return "days_4_7";
  if (days <= 30) return "days_8_30";

  return "over_30";
};

export const createIntentCounts = (): PatientsDashboardIntentCounts => ({
  favorites: 0,
  profile_views: 0,
  repeated_profile_views: 0,
  whatsapp_clicks: 0,
});

export const scoreContribution = (metricId: keyof PatientsDashboardIntentCounts, value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

export const patientIntentScore = (counts: PatientsDashboardIntentCounts) =>
  Math.min(
    100,
    Math.round(
      scoreContribution("profile_views", counts.profile_views) +
        scoreContribution("repeated_profile_views", counts.repeated_profile_views) +
        scoreContribution("favorites", counts.favorites) +
        scoreContribution("whatsapp_clicks", counts.whatsapp_clicks),
    ),
  );

export const classifyPatientIntent = (
  counts: PatientsDashboardIntentCounts,
): AdminPatientsDashboardIntentSegmentId => {
  const score = patientIntentScore(counts);

  if (counts.whatsapp_clicks > 0 || score >= 45) return "very_qualified";
  if (counts.favorites > 0 || score >= 20) return "objective";
  if (counts.profile_views > 0 || counts.repeated_profile_views > 0 || score > 0) {
    return "curious";
  }

  return "cold";
};

export const getIntentCountsForPatient = (
  countsByPatient: Map<string, PatientsDashboardIntentCounts>,
  patientId: string,
) => {
  const current = countsByPatient.get(patientId);
  if (current) return current;

  const next = createIntentCounts();
  countsByPatient.set(patientId, next);
  return next;
};

export const createCommunityEngagementCounts = (): PatientsDashboardCommunityEngagementCounts => ({
  interactions: 0,
  normalizedInteractions: 0,
  normalizedWeightedScore: 0,
  posts: 0,
  replies: 0,
  saves: 0,
  uncappedNormalizedWeightedScore: 0,
  votes: 0,
});

export const getCommunityEngagementCountsForPatient = (
  countsByPatient: Map<string, PatientsDashboardCommunityEngagementCounts>,
  patientId: string,
) => {
  const current = countsByPatient.get(patientId);
  if (current) return current;

  const next = createCommunityEngagementCounts();
  countsByPatient.set(patientId, next);
  return next;
};

export const classifyPatientCommunityEngagement = (
  counts: PatientsDashboardCommunityEngagementCounts,
): AdminPatientsDashboardEngagementSegmentId => {
  if (counts.interactions <= 0) return "no_engagement";

  const diagnosis = diagnoseAdminCommunityEngagement({
    interactions: counts.normalizedWeightedScore,
    source: PATIENT_COMMUNITY_ENGAGEMENT_SOURCE,
  });

  if (diagnosis.id === "muito_ativo") return "very_engaged";
  if (diagnosis.id === "ativo") return "engaged";

  return "low_engagement";
};
