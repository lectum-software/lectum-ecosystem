import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { extractPatientSignupAnalyticsVisitorId } from "@/modules/api/public/analytics/helpers/signup-identity";
import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import type {
  AdminPatientsDashboardAnonymousConversion,
  AdminPatientsDashboardBreakdownItem,
  AdminPatientsDashboardDateRange,
  AdminPatientsDashboardDeviceType,
  AdminPatientsDashboardEngagementAnalysis,
  AdminPatientsDashboardEngagementSegmentId,
  AdminPatientsDashboardIntentAnalysis,
  AdminPatientsDashboardIntentEngagement,
  AdminPatientsDashboardIntentFilterId,
  AdminPatientsDashboardIntentSegmentId,
  AdminPatientsDashboardMetric,
  AdminPatientsDashboardPeriod,
  AdminPatientsDashboardQuery,
  AdminPatientsDashboardRecentActivity,
  AdminPatientsDashboardRecentPatient,
  AdminPatientsDashboardSummary,
  IAdminPatientsDashboardDTO,
} from "../DTOs/IAdminPatientsDashboardDTO";
import {
  type AdminPatientAnonymousConversionPageViewRecord,
  type AdminPatientAnonymousConversionSessionRecord,
  type AdminPatientLocationRecord,
  type AdminPatientPageViewRecord,
  type AdminPatientPlatformSessionRecord,
  type AdminPatientRecentRecord,
  type AdminPatientSignupAnalyticsIdentityRecord,
  type AdminPatientSnapshotRecord,
  AdminPatientsDashboardRepository,
} from "../repositories/AdminPatientsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const DURATION_RELIABILITY_THRESHOLD = 0.5;
const ANONYMOUS_CONVERSION_FIRST_TOUCH_LIMIT = 6;
const FIRST_TOUCH_SAMPLE_THRESHOLD = 3;

type PatientsPeriodResolution = {
  current: AdminPatientsDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminPatientsDashboardPeriod;
  previous: AdminPatientsDashboardDateRange;
};

type PeriodResult =
  | {
      period: PatientsPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

type PatientsDashboardIntentSignals = Awaited<
  ReturnType<AdminPatientsDashboardRepository["listIntentSignals"]>
>;

type PatientsDashboardIntentCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

type PatientsDashboardIntentClassification = {
  analysis: AdminPatientsDashboardIntentAnalysis;
  engagementAnalysis: AdminPatientsDashboardEngagementAnalysis;
  engagementSegmentByPatientId: Map<string, AdminPatientsDashboardEngagementSegmentId>;
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
};

const GENDER_LABELS: Record<string, string> = {
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

const SIGNUP_SOURCE_OPTIONS = [
  { id: "email_password", label: "E-mail e senha" },
  { id: "google", label: "Google" },
] as const;

type SignupSource = (typeof SIGNUP_SOURCE_OPTIONS)[number];

const DEVICE_LABELS: Record<AdminPatientsDashboardDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

const COUNTRY_LABELS: Record<string, string> = {
  AO: "Angola",
  BR: "Brasil",
  BRA: "Brasil",
  MZ: "Moçambique",
  PT: "Portugal",
  PRT: "Portugal",
  US: "Estados Unidos",
  USA: "Estados Unidos",
};

const PATIENT_PAGE_KIND_LABELS: Record<string, string> = {
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Psicólogos",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};

const PATIENT_INTENT_SOURCE = "profile_view_event+psychologist_favorite+contact_request" as const;
const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<keyof PatientsDashboardIntentCounts, number>;
const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<keyof PatientsDashboardIntentCounts, number>;
const PATIENT_INTENT_SEGMENT_LABELS = {
  cold: "Frios",
  curious: "Curiosos",
  objective: "Interessados",
  very_qualified: "Qualificados",
} as const satisfies Record<AdminPatientsDashboardIntentSegmentId, string>;
const PATIENT_INTENT_SEGMENT_DESCRIPTIONS = {
  cold: "Sem abertura de perfil, favorito ou clique no WhatsApp no período.",
  curious: "Abriram perfis de psicólogos, mas ainda sem favorito ou contato.",
  objective: "Favoritaram psicólogos ou retornaram a perfis, sem clique no WhatsApp.",
  very_qualified: "Clicaram no WhatsApp ou concentraram múltiplos sinais fortes.",
} as const satisfies Record<AdminPatientsDashboardIntentSegmentId, string>;
const PATIENT_INTENT_SEGMENT_ORDER: AdminPatientsDashboardIntentSegmentId[] = [
  "cold",
  "curious",
  "objective",
  "very_qualified",
];
const PATIENT_INTENT_FILTER_ORDER: AdminPatientsDashboardIntentFilterId[] = [
  "all",
  ...PATIENT_INTENT_SEGMENT_ORDER,
];
const PATIENT_ENGAGEMENT_SEGMENT_LABELS = {
  engaged: "Engajados",
  low_engagement: "Pouco engajados",
  no_engagement: "Sem engajamento",
  very_engaged: "Muito engajados",
} as const satisfies Record<AdminPatientsDashboardEngagementSegmentId, string>;
const PATIENT_ENGAGEMENT_SEGMENT_ORDER: AdminPatientsDashboardEngagementSegmentId[] = [
  "very_engaged",
  "engaged",
  "low_engagement",
  "no_engagement",
];
const PATIENT_INTENT_ENGAGEMENT_HIGH_INTENT_SEGMENTS =
  new Set<AdminPatientsDashboardIntentSegmentId>(["objective", "very_qualified"]);
const PATIENT_INTENT_ENGAGEMENT_HIGH_ENGAGEMENT_SEGMENTS =
  new Set<AdminPatientsDashboardEngagementSegmentId>(["engaged", "very_engaged"]);
const ANONYMOUS_CONVERSION_BUCKETS = [
  { id: "same_day", label: "Mesmo dia" },
  { id: "days_1_3", label: "1-3 dias" },
  { id: "days_4_7", label: "4-7 dias" },
  { id: "days_8_30", label: "8-30 dias" },
  { id: "over_30", label: "Mais de 30 dias" },
  { id: "no_history", label: "Sem trilha capturada" },
] as const;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);

  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (
  query: AdminPatientsDashboardQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "\u00daltimos 7 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Per\u00edodo personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este m\u00eas";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const today = new Date();
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDate(addDays(today, -(days - 1)));
    end = endOfDate(today);
    label = `Últimos ${days} dias`;
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o per\u00edodo";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    period: {
      current: { start, end },
      days,
      labels: buildLabels(start, days),
      previous: { start: previousStart, end: previousEnd },
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
    },
  };
};

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const roundOneDecimal = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
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

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const averageNumber = (values: number[]) => {
  if (values.length === 0) return null;

  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const percentileValue = (values: number[], percent: number) => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? null;
};

const daysBetweenDates = (from: Date, to: Date) =>
  Math.max(0, Math.floor((startOfDate(to).getTime() - startOfDate(from).getTime()) / MS_PER_DAY));

const anonymousConversionBucketForDays = (days: number) => {
  if (days === 0) return "same_day";
  if (days <= 3) return "days_1_3";
  if (days <= 7) return "days_4_7";
  if (days <= 30) return "days_8_30";

  return "over_30";
};

const createIntentCounts = (): PatientsDashboardIntentCounts => ({
  favorites: 0,
  profile_views: 0,
  repeated_profile_views: 0,
  whatsapp_clicks: 0,
});

const scoreContribution = (metricId: keyof PatientsDashboardIntentCounts, value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

const patientIntentScore = (counts: PatientsDashboardIntentCounts) =>
  Math.min(
    100,
    Math.round(
      scoreContribution("profile_views", counts.profile_views) +
        scoreContribution("repeated_profile_views", counts.repeated_profile_views) +
        scoreContribution("favorites", counts.favorites) +
        scoreContribution("whatsapp_clicks", counts.whatsapp_clicks),
    ),
  );

const classifyPatientIntent = (
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

const patientEngagementActionCount = (counts: PatientsDashboardIntentCounts) =>
  Math.max(0, counts.profile_views) +
  Math.max(0, counts.favorites) +
  Math.max(0, counts.whatsapp_clicks);

const classifyPatientEngagement = (
  counts: PatientsDashboardIntentCounts,
): AdminPatientsDashboardEngagementSegmentId => {
  const actionCount = patientEngagementActionCount(counts);

  if (actionCount === 0) return "no_engagement";
  if (counts.whatsapp_clicks > 0 || counts.repeated_profile_views >= 2 || actionCount >= 4) {
    return "very_engaged";
  }
  if (counts.favorites > 0 || counts.repeated_profile_views > 0 || actionCount >= 2) {
    return "engaged";
  }

  return "low_engagement";
};

const getIntentCountsForPatient = (
  countsByPatient: Map<string, PatientsDashboardIntentCounts>,
  patientId: string,
) => {
  const current = countsByPatient.get(patientId);
  if (current) return current;

  const next = createIntentCounts();
  countsByPatient.set(patientId, next);
  return next;
};

const buildPatientIntentClassification = (
  patients: AdminPatientSnapshotRecord[],
  signals: PatientsDashboardIntentSignals,
): PatientsDashboardIntentClassification => {
  const patientIds = new Set(patients.map((patient) => patient.id));
  const countsByPatient = new Map<string, PatientsDashboardIntentCounts>();
  const profilePsychologistsByPatient = new Map<string, Set<string>>();

  for (const view of signals.profileViews) {
    if (!view.viewer_id || !patientIds.has(view.viewer_id)) continue;

    const counts = getIntentCountsForPatient(countsByPatient, view.viewer_id);
    counts.profile_views += 1;

    if (!profilePsychologistsByPatient.has(view.viewer_id)) {
      profilePsychologistsByPatient.set(view.viewer_id, new Set());
    }
    profilePsychologistsByPatient.get(view.viewer_id)?.add(view.psychologist_id);
  }

  for (const [patientId, psychologists] of profilePsychologistsByPatient.entries()) {
    const counts = getIntentCountsForPatient(countsByPatient, patientId);
    counts.repeated_profile_views = Math.max(0, counts.profile_views - psychologists.size);
  }

  for (const favorite of signals.favorites) {
    if (!patientIds.has(favorite.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, favorite.user_id).favorites += 1;
  }

  for (const click of signals.whatsappClicks) {
    if (!click.user_id || !patientIds.has(click.user_id)) continue;

    getIntentCountsForPatient(countsByPatient, click.user_id).whatsapp_clicks += 1;
  }

  const segmentCounts = new Map<AdminPatientsDashboardIntentSegmentId, number>(
    PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const engagementSegmentCounts = new Map<AdminPatientsDashboardEngagementSegmentId, number>(
    PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const segmentByPatientId = new Map<string, AdminPatientsDashboardIntentSegmentId>();
  const engagementSegmentByPatientId = new Map<string, AdminPatientsDashboardEngagementSegmentId>();
  const signalTotals = createIntentCounts();

  for (const patient of patients) {
    const counts = countsByPatient.get(patient.id) ?? createIntentCounts();
    const segmentId = classifyPatientIntent(counts);
    const engagementSegmentId = classifyPatientEngagement(counts);
    segmentByPatientId.set(patient.id, segmentId);
    engagementSegmentByPatientId.set(patient.id, engagementSegmentId);
    segmentCounts.set(segmentId, (segmentCounts.get(segmentId) ?? 0) + 1);
    engagementSegmentCounts.set(
      engagementSegmentId,
      (engagementSegmentCounts.get(engagementSegmentId) ?? 0) + 1,
    );
    signalTotals.profile_views += counts.profile_views;
    signalTotals.repeated_profile_views += counts.repeated_profile_views;
    signalTotals.favorites += counts.favorites;
    signalTotals.whatsapp_clicks += counts.whatsapp_clicks;
  }

  const totalSignals =
    signalTotals.profile_views + signalTotals.favorites + signalTotals.whatsapp_clicks;
  const coldPatients = segmentCounts.get("cold") ?? 0;
  const patientsWithoutEngagement = engagementSegmentCounts.get("no_engagement") ?? 0;

  return {
    analysis: {
      coverage_note:
        "Distribuição por pacientes existentes no fim do período, usando somente sinais reais de descoberta e contato dentro do site.",
      items: PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => ({
        count: segmentCounts.get(segmentId) ?? 0,
        description: PATIENT_INTENT_SEGMENT_DESCRIPTIONS[segmentId],
        id: segmentId,
        label: PATIENT_INTENT_SEGMENT_LABELS[segmentId],
        percentage: safePercentage(segmentCounts.get(segmentId) ?? 0, patients.length),
      })),
      patients_with_signals: Math.max(0, patients.length - coldPatients),
      privacy_note:
        "Indicador agregado interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
      signal_totals: signalTotals,
      source: PATIENT_INTENT_SOURCE,
      total_patients: patients.length,
      total_signals: totalSignals,
    },
    engagementAnalysis: {
      coverage_note:
        "Distribuição por pacientes existentes no fim do período, usando somente ações reais de descoberta e contato dentro do site.",
      items: PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => ({
        count: engagementSegmentCounts.get(segmentId) ?? 0,
        id: segmentId,
        label: PATIENT_ENGAGEMENT_SEGMENT_LABELS[segmentId],
        percentage: safePercentage(engagementSegmentCounts.get(segmentId) ?? 0, patients.length),
      })),
      patients_with_engagement: Math.max(0, patients.length - patientsWithoutEngagement),
      privacy_note:
        "Indicador agregado interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
      source: PATIENT_INTENT_SOURCE,
      total_patients: patients.length,
    },
    engagementSegmentByPatientId,
    segmentByPatientId,
  };
};

const buildPatientIntentEngagement = (params: {
  engagementSegmentByPatientId: Map<string, AdminPatientsDashboardEngagementSegmentId>;
  patients: AdminPatientSnapshotRecord[];
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
}): AdminPatientsDashboardIntentEngagement => {
  const cellCounts = new Map<string, number>();
  const intentTotals = new Map<AdminPatientsDashboardIntentSegmentId, number>(
    PATIENT_INTENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const engagementTotals = new Map<AdminPatientsDashboardEngagementSegmentId, number>(
    PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((segmentId) => [segmentId, 0]),
  );
  const comparison = {
    high_engagement: {
      high_intent_count: 0,
      high_intent_rate: null as number | null,
      patients: 0,
    },
    low_engagement: {
      high_intent_count: 0,
      high_intent_rate: null as number | null,
      patients: 0,
    },
    rate_difference_points: null as number | null,
  };
  let highIntentPatients = 0;

  for (const patient of params.patients) {
    const intentId = params.segmentByPatientId.get(patient.id) ?? "cold";
    const engagementId = params.engagementSegmentByPatientId.get(patient.id) ?? "no_engagement";
    const cellId = `${intentId}_${engagementId}`;
    const hasHighIntent = PATIENT_INTENT_ENGAGEMENT_HIGH_INTENT_SEGMENTS.has(intentId);
    const hasHighEngagement = PATIENT_INTENT_ENGAGEMENT_HIGH_ENGAGEMENT_SEGMENTS.has(engagementId);
    const comparisonBucket = hasHighEngagement
      ? comparison.high_engagement
      : comparison.low_engagement;

    cellCounts.set(cellId, (cellCounts.get(cellId) ?? 0) + 1);
    intentTotals.set(intentId, (intentTotals.get(intentId) ?? 0) + 1);
    engagementTotals.set(engagementId, (engagementTotals.get(engagementId) ?? 0) + 1);
    comparisonBucket.patients += 1;
    if (hasHighIntent) {
      highIntentPatients += 1;
      comparisonBucket.high_intent_count += 1;
    }
  }

  comparison.high_engagement.high_intent_rate =
    comparison.high_engagement.patients > 0
      ? safePercentage(
          comparison.high_engagement.high_intent_count,
          comparison.high_engagement.patients,
        )
      : null;
  comparison.low_engagement.high_intent_rate =
    comparison.low_engagement.patients > 0
      ? safePercentage(
          comparison.low_engagement.high_intent_count,
          comparison.low_engagement.patients,
        )
      : null;
  comparison.rate_difference_points =
    typeof comparison.high_engagement.high_intent_rate === "number" &&
    typeof comparison.low_engagement.high_intent_rate === "number"
      ? roundPercent(
          comparison.high_engagement.high_intent_rate - comparison.low_engagement.high_intent_rate,
        )
      : null;

  return {
    cells: PATIENT_INTENT_SEGMENT_ORDER.flatMap((intentId) =>
      PATIENT_ENGAGEMENT_SEGMENT_ORDER.map((engagementId) => {
        const count = cellCounts.get(`${intentId}_${engagementId}`) ?? 0;

        return {
          column_percentage: safePercentage(count, engagementTotals.get(engagementId) ?? 0),
          count,
          engagement_id: engagementId,
          engagement_label: PATIENT_ENGAGEMENT_SEGMENT_LABELS[engagementId],
          id: `${intentId}_${engagementId}` as const,
          intent_id: intentId,
          intent_label: PATIENT_INTENT_SEGMENT_LABELS[intentId],
          percentage: safePercentage(count, params.patients.length),
          row_percentage: safePercentage(count, intentTotals.get(intentId) ?? 0),
        };
      }),
    ),
    comparison,
    description:
      "Relação observacional entre intenção e engajamento dos pacientes no período selecionado; não indica causalidade, diagnóstico, atendimento ou conversa.",
    source: PATIENT_INTENT_SOURCE,
    totals: {
      high_engagement_patients: comparison.high_engagement.patients,
      high_intent_patients: highIntentPatients,
      low_engagement_patients: comparison.low_engagement.patients,
      patients: params.patients.length,
    },
    unavailable_reason:
      params.patients.length === 0
        ? "Sem pacientes reais no período selecionado para comparar Intenção e Engajamento."
        : null,
  };
};

const normalizeDeviceType = (value: string): AdminPatientsDashboardDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDeviceUsage = (sessions: AdminPatientPlatformSessionRecord[]) => {
  const counts: Record<AdminPatientsDashboardDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const activePatientsByDevice = new Map<AdminPatientsDashboardDeviceType, Set<string>>(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Set<string>(),
    ]),
  );
  const operatingSystemCountsByDevice = new Map<
    AdminPatientsDashboardDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );
  const activePatientsByDeviceAndOperatingSystem = new Map<
    AdminPatientsDashboardDeviceType,
    Map<AdminOperatingSystemType, Set<string>>
  >(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Map(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
      ),
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    if (session.user_id) activePatientsByDevice.get(deviceType)?.add(session.user_id);
    const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
    if (session.user_id) {
      activePatientsByDeviceAndOperatingSystem
        .get(deviceType)
        ?.get(operatingSystem)
        ?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePatients = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: (Object.keys(counts) as AdminPatientsDashboardDeviceType[])
      .map((deviceType) => {
        const deviceTotal = counts[deviceType];
        const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
        const activePatientsByOperatingSystem =
          activePatientsByDeviceAndOperatingSystem.get(deviceType);

        return {
          active_patients_count: activePatientsByDevice.get(deviceType)?.size ?? 0,
          count: deviceTotal,
          device_type: deviceType,
          id: deviceType,
          label: DEVICE_LABELS[deviceType],
          operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
            active_patients_count: activePatientsByOperatingSystem?.get(operatingSystem)?.size ?? 0,
            count: countsByOperatingSystem?.[operatingSystem] ?? 0,
            id: operatingSystem,
            label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
            operating_system: operatingSystem,
            percentage: safePercentage(
              countsByOperatingSystem?.[operatingSystem] ?? 0,
              deviceTotal,
            ),
          }))
            .filter((operatingSystem) => operatingSystem.count > 0)
            .sort((left, right) => {
              if (right.count !== left.count) return right.count - left.count;

              return left.label.localeCompare(right.label, "pt-BR");
            }),
          percentage: safePercentage(deviceTotal, totalSessions),
        };
      })
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      }),
    source: "visitor_session.device_type+visitor_session.os+user.role=paciente" as const,
    total_active_patients: totalActivePatients,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0 ? "Sem sessões autenticadas de pacientes no período selecionado." : null,
  };
};

const buildOperatingSystemUsage = (sessions: AdminPatientPlatformSessionRecord[]) => {
  const counts = Object.fromEntries(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
  ) as Record<AdminOperatingSystemType, number>;
  const activePatientsByOperatingSystem = new Map<AdminOperatingSystemType, Set<string>>(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[operatingSystem] += 1;
    if (session.user_id) activePatientsByOperatingSystem.get(operatingSystem)?.add(session.user_id);
  }

  const totalSessions = sessions.length;
  const totalActivePatients = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
      active_patients_count: activePatientsByOperatingSystem.get(operatingSystem)?.size ?? 0,
      count: counts[operatingSystem],
      id: operatingSystem,
      label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
      operating_system: operatingSystem,
      percentage: safePercentage(counts[operatingSystem], totalSessions),
    })).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.os+visitor_session.device_type+user.role=paciente" as const,
    total_active_patients: totalActivePatients,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de pacientes com sistema operacional no período selecionado."
        : null,
  };
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

const normalizeGender = (value?: string | null) => {
  const key = normalizeKey(value || "nao_informado");

  return {
    id: key || "nao_informado",
    label: GENDER_LABELS[key] ?? value?.trim() ?? "Não informado",
  };
};

const signupSourceFromProvider = (provider?: string | null): SignupSource => {
  const normalized = (provider ?? "").trim().toLowerCase();

  return normalized === "google" ? SIGNUP_SOURCE_OPTIONS[1] : SIGNUP_SOURCE_OPTIONS[0];
};

const providerLabel = (provider: string) => signupSourceFromProvider(provider).label;

const dateInRange = (date: Date, range: AdminPatientsDashboardDateRange) =>
  date >= range.start && date <= range.end;

const createdUntil = (patient: AdminPatientSnapshotRecord, date: Date) => patient.createdAt <= date;

const buildSeries = (
  patients: AdminPatientSnapshotRecord[],
  labels: string[],
): AdminPatientsDashboardSummary["series"]["points"] =>
  labels.map((label) => {
    const dayEnd = endOfDate(parseDateOnly(label, "start") ?? new Date(label));
    const visible = patients.filter((patient) => patient.createdAt <= dayEnd);

    return {
      active_patients: visible.filter((patient) => patient.active).length,
      date: label,
      inactive_patients: visible.filter((patient) => !patient.active).length,
      new_signups: patients.filter((patient) => toDateKey(patient.createdAt) === label).length,
      total_patients: visible.length,
    };
  });

const buildBreakdown = (
  items: Array<{ id: string; label: string }>,
  total: number,
  limit = 8,
): AdminPatientsDashboardBreakdownItem[] => {
  return buildBreakdownFromGroups(items, total).slice(0, limit);
};

const buildBreakdownFromGroups = (
  items: Array<{ id: string; label: string }>,
  total: number,
): AdminPatientsDashboardBreakdownItem[] => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const current = counts.get(item.id) ?? { count: 0, label: item.label };
    counts.set(item.id, { ...current, count: current.count + 1 });
  }

  return [...counts.entries()]
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });
};

const buildPrivacyAwareCityBreakdown = (
  items: Array<{ id: string; label: string }>,
  total: number,
  limit = 10,
): AdminPatientsDashboardBreakdownItem[] => {
  const aggregated = buildBreakdownFromGroups(items, total);
  const cityPrivacyThreshold = 2;
  const visible = aggregated.filter(
    (item) =>
      item.count >= cityPrivacyThreshold ||
      item.id.includes("nao_identificado") ||
      item.label === "Não identificado",
  );
  const groupedCount = aggregated
    .filter((item) => !visible.some((visibleItem) => visibleItem.id === item.id))
    .reduce((sum, item) => sum + item.count, 0);
  const withGroupedCities =
    groupedCount > 0
      ? visible.concat({
          count: groupedCount,
          id: "outras_cidades",
          label: "Outras cidades",
          percentage: safePercentage(groupedCount, total),
        })
      : visible;

  return withGroupedCities
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    })
    .slice(0, limit);
};

const buildSignupSourceBreakdown = (
  patients: AdminPatientSnapshotRecord[],
): AdminPatientsDashboardBreakdownItem[] => {
  if (patients.length === 0) return [];

  const counts = new Map<SignupSource["id"], number>(
    SIGNUP_SOURCE_OPTIONS.map((source) => [source.id, 0] as const),
  );

  for (const patient of patients) {
    const source = signupSourceFromProvider(patient.provider);
    counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
  }

  return SIGNUP_SOURCE_OPTIONS.map((source) => {
    const count = counts.get(source.id) ?? 0;

    return {
      count,
      id: source.id,
      label: source.label,
      percentage: safePercentage(count, patients.length),
    };
  });
};

const buildDemographics = (patients: AdminPatientSnapshotRecord[]) => ({
  gender: {
    items: buildBreakdown(
      patients.map((patient) => normalizeGender(patient.patient_profile?.gender)),
      patients.length,
      5,
    ),
    source: "patient_profile.gender" as const,
    total: patients.length,
  },
  signup_sources: {
    items: buildSignupSourceBreakdown(patients),
    source: "user.provider" as const,
    total: patients.length,
  },
});

const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

const normalizeLocality = (value: string | null) => value?.trim() || "Não identificado";

const buildLocationBreakdown = (
  locations: AdminPatientLocationRecord[],
  total: number,
  getGroup: (location: AdminPatientLocationRecord) => { id: string; label: string },
) => buildBreakdown(locations.map(getGroup), total, 10);

const buildLocations = (locations: AdminPatientLocationRecord[]) => {
  const total = locations.length;

  return {
    cities: buildPrivacyAwareCityBreakdown(
      locations.map((location) => {
        const city = normalizeLocality(location.city);
        const state = normalizeLocality(location.state);
        const country = normalizeCountry(location.country);
        const label =
          [city, state, country].filter((item) => item !== "Não identificado").join(", ") || city;

        return {
          id: `${city}:${state}:${country}`,
          label,
        };
      }),
      total,
      10,
    ),
    countries: buildLocationBreakdown(locations, total, (location) => {
      const country = normalizeCountry(location.country);

      return { id: country, label: country };
    }),
    source: "visitor_location" as const,
    states: buildLocationBreakdown(locations, total, (location) => {
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        country === "Brasil" || country === "Não identificado" ? state : `${state}, ${country}`;

      return { id: `${state}:${country}`, label };
    }),
    total,
  };
};

const patientPlatformPageLabel = (
  view: Pick<AdminPatientPageViewRecord, "normalized_path" | "page_kind" | "path">,
) => {
  const path = (view.normalized_path || view.path || "/").split("?")[0] ?? "/";
  const segments = path.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (joined.includes("post")) return "Posts";
  if (joined.includes("community")) return "Comunidades";
  if (joined.includes("favorite") || joined.includes("favoritos")) return "Favoritos";
  if (joined.includes("notification") || joined.includes("notificacoes")) return "Notificações";
  if (
    joined.includes("settings") ||
    joined.includes("configuracoes") ||
    joined.includes("account")
  ) {
    return "Configurações";
  }
  if (joined.includes("psychologist") || joined.includes("psicologo")) return "Psicólogos";
  if (joined.includes("profile") || joined.includes("perfil")) return "Perfil";
  if (joined.startsWith("app")) return "Área do paciente";

  return PATIENT_PAGE_KIND_LABELS[view.page_kind] ?? "Outras páginas";
};

type AnonymousConversionPatientTouch = {
  occurredAt: Date;
  pageId: string;
  pageLabel: string;
  sessionId: string;
  source: "page_view_event" | "visitor_session";
};

type AnonymousConversionPatientSummary = {
  daysToRegistration: number | null;
  firstTouchId: string | null;
  firstTouchLabel: string | null;
  patientId: string;
  sessions: Set<string>;
};

const ANONYMOUS_CONVERSION_SESSION_LABEL = "Sess\u00e3o sem p\u00e1gina capturada";

const anonymousConversionPageLabel = (view: AdminPatientAnonymousConversionPageViewRecord) =>
  patientPlatformPageLabel(view);

const latestPatientSignupDate = (patients: AdminPatientSnapshotRecord[]) =>
  patients.reduce<Date | null>((latest, patient) => {
    if (!latest || patient.createdAt > latest) return patient.createdAt;

    return latest;
  }, null);

const buildPatientVisitorIds = (params: {
  linkedPageViews: AdminPatientAnonymousConversionPageViewRecord[];
  linkedSessions: AdminPatientAnonymousConversionSessionRecord[];
  patientIds: Set<string>;
  signupIdentities: AdminPatientSignupAnalyticsIdentityRecord[];
}) => {
  const visitorIdsByPatientId = new Map<string, Set<string>>();
  const addVisitorId = (patientId: string | null, visitorId: string) => {
    if (!patientId || !params.patientIds.has(patientId)) return;

    const current = visitorIdsByPatientId.get(patientId) ?? new Set<string>();
    current.add(visitorId);
    visitorIdsByPatientId.set(patientId, current);
  };

  for (const view of params.linkedPageViews) {
    addVisitorId(view.user_id, view.visitor_id);
  }

  for (const session of params.linkedSessions) {
    addVisitorId(session.user_id, session.visitor_id);
  }

  for (const identity of params.signupIdentities) {
    const visitorId = extractPatientSignupAnalyticsVisitorId(identity.data);
    if (visitorId) addVisitorId(identity.user_id, visitorId);
  }

  return visitorIdsByPatientId;
};

const collectAnonymousConversionVisitorIds = (visitorIdsByPatientId: Map<string, Set<string>>) => [
  ...new Set([...visitorIdsByPatientId.values()].flatMap((visitorIds) => [...visitorIds])),
];

const patientScopedRecord = (userId: string | null, patientId: string) =>
  userId === null || userId === patientId;

const touchSort = (
  left: AnonymousConversionPatientTouch,
  right: AnonymousConversionPatientTouch,
) => {
  const dateDiff = left.occurredAt.getTime() - right.occurredAt.getTime();
  if (dateDiff !== 0) return dateDiff;
  if (left.source !== right.source) return left.source === "page_view_event" ? -1 : 1;

  return left.pageLabel.localeCompare(right.pageLabel, "pt-BR");
};

const summarizeAnonymousConversion = (params: {
  linkedPageViews: AdminPatientAnonymousConversionPageViewRecord[];
  linkedSessions: AdminPatientAnonymousConversionSessionRecord[];
  pageViews: AdminPatientAnonymousConversionPageViewRecord[];
  patients: AdminPatientSnapshotRecord[];
  period: AdminPatientsDashboardPeriod;
  sessions: AdminPatientAnonymousConversionSessionRecord[];
  signupIdentities: AdminPatientSignupAnalyticsIdentityRecord[];
}): AdminPatientsDashboardAnonymousConversion => {
  const patientIds = new Set(params.patients.map((patient) => patient.id));
  const visitorIdsByPatientId = buildPatientVisitorIds({
    linkedPageViews: params.linkedPageViews,
    linkedSessions: params.linkedSessions,
    patientIds,
    signupIdentities: params.signupIdentities,
  });
  const pageViewsByVisitorId = new Map<string, AdminPatientAnonymousConversionPageViewRecord[]>();
  const sessionsByVisitorId = new Map<string, AdminPatientAnonymousConversionSessionRecord[]>();

  for (const view of params.pageViews) {
    const current = pageViewsByVisitorId.get(view.visitor_id) ?? [];
    current.push(view);
    pageViewsByVisitorId.set(view.visitor_id, current);
  }

  for (const session of params.sessions) {
    const current = sessionsByVisitorId.get(session.visitor_id) ?? [];
    current.push(session);
    sessionsByVisitorId.set(session.visitor_id, current);
  }

  const patientSummaries = params.patients.map((patient): AnonymousConversionPatientSummary => {
    const patientVisitorIds = visitorIdsByPatientId.get(patient.id) ?? new Set<string>();
    const touches: AnonymousConversionPatientTouch[] = [];

    for (const visitorId of patientVisitorIds) {
      for (const view of pageViewsByVisitorId.get(visitorId) ?? []) {
        if (!patientScopedRecord(view.user_id, patient.id)) continue;
        if (view.occurred_at > patient.createdAt) continue;

        const label = anonymousConversionPageLabel(view);
        touches.push({
          occurredAt: view.occurred_at,
          pageId: normalizeKey(label) || "outras_paginas",
          pageLabel: label,
          sessionId: view.session_id,
          source: "page_view_event",
        });
      }

      for (const session of sessionsByVisitorId.get(visitorId) ?? []) {
        if (!patientScopedRecord(session.user_id, patient.id)) continue;
        if (session.first_seen_at > patient.createdAt) continue;

        touches.push({
          occurredAt: session.first_seen_at,
          pageId: "sessao_sem_pagina",
          pageLabel: ANONYMOUS_CONVERSION_SESSION_LABEL,
          sessionId: session.session_id,
          source: "visitor_session",
        });
      }
    }

    const sortedTouches = touches.sort(touchSort);
    const firstTouch = sortedTouches[0];
    const sessions = new Set(sortedTouches.map((touch) => touch.sessionId));

    return {
      daysToRegistration: firstTouch
        ? daysBetweenDates(firstTouch.occurredAt, patient.createdAt)
        : null,
      firstTouchId: firstTouch?.pageId ?? null,
      firstTouchLabel: firstTouch?.pageLabel ?? null,
      patientId: patient.id,
      sessions,
    };
  });

  const patientsWithHistory = patientSummaries.filter(
    (patient) => typeof patient.daysToRegistration === "number",
  );
  const historyDays = patientsWithHistory.flatMap((patient) =>
    typeof patient.daysToRegistration === "number" ? [patient.daysToRegistration] : [],
  );
  const bucketCounts = new Map(ANONYMOUS_CONVERSION_BUCKETS.map((bucket) => [bucket.id, 0]));

  for (const patient of patientSummaries) {
    const bucket =
      typeof patient.daysToRegistration === "number"
        ? anonymousConversionBucketForDays(patient.daysToRegistration)
        : "no_history";
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }

  const firstTouchGroups = new Map<
    string,
    {
      historyDays: number[];
      label: string;
      patientsCount: number;
    }
  >();

  for (const patient of patientsWithHistory) {
    if (!patient.firstTouchId || !patient.firstTouchLabel) continue;

    const current = firstTouchGroups.get(patient.firstTouchId) ?? {
      historyDays: [],
      label: patient.firstTouchLabel,
      patientsCount: 0,
    };
    current.patientsCount += 1;

    if (typeof patient.daysToRegistration === "number") {
      current.historyDays.push(patient.daysToRegistration);
    }

    firstTouchGroups.set(patient.firstTouchId, current);
  }

  const registeredPatientsCount = patientSummaries.length;
  const patientsWithHistoryCount = patientsWithHistory.length;
  const patientsWithoutHistoryCount = registeredPatientsCount - patientsWithHistoryCount;
  const anonymousSessionsCount = new Set(
    patientSummaries.flatMap((patient) =>
      [...patient.sessions].map((sessionId) => `${patient.patientId}:${sessionId}`),
    ),
  ).size;

  return {
    anonymous_sessions_count: anonymousSessionsCount,
    average_days: averageNumber(historyDays),
    buckets: ANONYMOUS_CONVERSION_BUCKETS.map((bucket) => ({
      count: bucketCounts.get(bucket.id) ?? 0,
      id: bucket.id,
      label: bucket.label,
      percentage: safePercentage(bucketCounts.get(bucket.id) ?? 0, registeredPatientsCount),
    })),
    cohort_from: params.period.from,
    cohort_to: params.period.to,
    coverage_note:
      "Coorte de pacientes cadastrados no periodo; leitura de tras para frente pela ponte visitor_id/session_id salva no cadastro do paciente e por eventos vinculados ao mesmo visitor_id. Psicologos e visitantes que nao viraram paciente nao entram neste bloco.",
    first_touch_pages: [...firstTouchGroups.entries()]
      .map(([id, group]) => ({
        average_days: averageNumber(group.historyDays),
        id,
        label: group.label,
        patients_count: group.patientsCount,
        percentage: safePercentage(group.patientsCount, patientsWithHistoryCount),
        sample_sufficient: group.patientsCount >= FIRST_TOUCH_SAMPLE_THRESHOLD,
        unavailable_reason:
          group.patientsCount === 0
            ? "Sem pacientes neste ponto de entrada."
            : group.patientsCount < FIRST_TOUCH_SAMPLE_THRESHOLD
              ? "Amostra pequena; interpretar apenas como leitura operacional."
              : null,
      }))
      .sort((left, right) => {
        if (right.patients_count !== left.patients_count) {
          return right.patients_count - left.patients_count;
        }

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, ANONYMOUS_CONVERSION_FIRST_TOUCH_LIMIT),
    history_coverage_rate:
      registeredPatientsCount > 0
        ? roundOneDecimal((patientsWithHistoryCount / registeredPatientsCount) * 100)
        : null,
    median_days: percentileValue(historyDays, 50),
    p75_days: percentileValue(historyDays, 75),
    p90_days: percentileValue(historyDays, 90),
    patients_with_anonymous_history_count: patientsWithHistoryCount,
    patients_without_anonymous_history_count: patientsWithoutHistoryCount,
    registered_patients_count: registeredPatientsCount,
    source: "user.createdAt+user_background+page_view_event+visitor_session",
    unavailable_reason:
      registeredPatientsCount === 0
        ? "Sem pacientes cadastrados no periodo selecionado."
        : patientsWithHistoryCount === 0
          ? "Nenhum paciente cadastrado no periodo possui trilha anonima previa capturada pelo mesmo visitor_id."
          : null,
  };
};

const buildPlatformUsage = (params: {
  eligiblePatientsCount: number;
  labels: string[];
  pageViews: AdminPatientPageViewRecord[];
  pwaInstalledUserIds: string[];
}) => {
  const { eligiblePatientsCount, labels, pageViews, pwaInstalledUserIds } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const users = new Set(viewsWithUser.map((view) => view.user_id as string));
  const pwaInstalledUsers = new Set(pwaInstalledUserIds.filter(Boolean));
  const sessionsByUser = new Map<string, Set<string>>();
  const daysByUser = new Map<string, Set<string>>();
  const pageCounts = new Map<string, number>();
  const seriesMap = new Map(
    labels.map((label) => [
      label,
      {
        activeUsers: new Set<string>(),
        pageviews: 0,
        sessions: new Set<string>(),
      },
    ]),
  );
  const durations = viewsWithUser
    .map((view) => view.duration_seconds)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );

  for (const view of viewsWithUser) {
    const userId = view.user_id as string;
    const dateKey = toDateKey(view.occurred_at);

    if (!sessionsByUser.has(userId)) sessionsByUser.set(userId, new Set());
    sessionsByUser.get(userId)?.add(view.session_id);

    if (!daysByUser.has(userId)) daysByUser.set(userId, new Set());
    daysByUser.get(userId)?.add(dateKey);

    const pageLabel = patientPlatformPageLabel(view);
    pageCounts.set(pageLabel, (pageCounts.get(pageLabel) ?? 0) + 1);

    const point = seriesMap.get(dateKey);
    if (point) {
      point.activeUsers.add(userId);
      point.sessions.add(view.session_id);
      point.pageviews += 1;
    }
  }

  const activeCount = users.size;
  const totalAccessDays = [...daysByUser.values()].reduce((sum, days) => sum + days.size, 0);
  const totalSessions = [...sessionsByUser.values()].reduce(
    (sum, sessions) => sum + sessions.size,
    0,
  );
  const durationCoverage = viewsWithUser.length > 0 ? durations.length / viewsWithUser.length : 0;
  const averageDuration =
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD && durations.length > 0
      ? roundOneDecimal(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  return {
    active_patients_count: activeCount,
    active_patients_rate:
      eligiblePatientsCount > 0
        ? roundOneDecimal((activeCount / eligiblePatientsCount) * 100)
        : null,
    average_access_days: activeCount > 0 ? roundOneDecimal(totalAccessDays / activeCount) : null,
    average_duration_seconds: averageDuration,
    average_sessions: activeCount > 0 ? roundOneDecimal(totalSessions / activeCount) : null,
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem pageviews autenticados de pacientes no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% dos pageviews de pacientes têm duration_seconds confiável."
          : null,
    eligible_patients_count: eligiblePatientsCount,
    pageviews_count: viewsWithUser.length,
    pwa_installed_patients_count: pwaInstalledUsers.size,
    pwa_installed_patients_rate:
      eligiblePatientsCount > 0
        ? roundOneDecimal((pwaInstalledUsers.size / eligiblePatientsCount) * 100)
        : null,
    series: labels.map((label) => {
      const point = seriesMap.get(label);

      return {
        active_patients: point?.activeUsers.size ?? 0,
        date: label,
        pageviews: point?.pageviews ?? 0,
        sessions: point?.sessions.size ?? 0,
      };
    }),
    sessions_count: totalSessions,
    source: "page_view_event+important_action_event" as const,
    top_pages: [...pageCounts.entries()]
      .map(([label, count]) => ({
        count,
        label,
        percentage:
          viewsWithUser.length > 0 ? roundOneDecimal((count / viewsWithUser.length) * 100) : 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, 6),
    unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem uso autenticado de pacientes no período selecionado."
        : null,
  };
};

const matchesIntentFilter = (
  userId: string | null | undefined,
  filterId: AdminPatientsDashboardIntentFilterId,
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>,
) => {
  if (filterId === "all") return true;
  if (!userId) return false;

  return segmentByPatientId.get(userId) === filterId;
};

const buildPatientIntentFilters = (params: {
  currentPatients: AdminPatientSnapshotRecord[];
  currentPeriodPatients: AdminPatientSnapshotRecord[];
  intentAnalysis: AdminPatientsDashboardIntentAnalysis;
  labels: string[];
  locations: AdminPatientLocationRecord[];
  pageViews: AdminPatientPageViewRecord[];
  platformSessions: AdminPatientPlatformSessionRecord[];
  pwaInstalledUserIds: string[];
  segmentByPatientId: Map<string, AdminPatientsDashboardIntentSegmentId>;
}): AdminPatientsDashboardSummary["intent_filters"] => {
  const {
    currentPatients,
    currentPeriodPatients,
    intentAnalysis,
    labels,
    locations,
    pageViews,
    platformSessions,
    pwaInstalledUserIds,
    segmentByPatientId,
  } = params;
  const breakdownEntries = PATIENT_INTENT_FILTER_ORDER.map((filterId) => {
    const eligiblePatients = currentPatients.filter((patient) =>
      matchesIntentFilter(patient.id, filterId, segmentByPatientId),
    );
    const demographicPatients = currentPeriodPatients.filter((patient) =>
      matchesIntentFilter(patient.id, filterId, segmentByPatientId),
    );
    const filteredLocations = locations.filter((location) =>
      matchesIntentFilter(location.user_id, filterId, segmentByPatientId),
    );
    const filteredPageViews = pageViews.filter((view) =>
      matchesIntentFilter(view.user_id, filterId, segmentByPatientId),
    );
    const filteredPlatformSessions = platformSessions.filter((session) =>
      matchesIntentFilter(session.user_id, filterId, segmentByPatientId),
    );
    const filteredPwaInstalledUserIds = pwaInstalledUserIds.filter((userId) =>
      matchesIntentFilter(userId, filterId, segmentByPatientId),
    );

    return [
      filterId,
      {
        demographics: buildDemographics(demographicPatients),
        device_usage: buildDeviceUsage(filteredPlatformSessions),
        locations: buildLocations(filteredLocations),
        platform_usage: buildPlatformUsage({
          eligiblePatientsCount: eligiblePatients.length,
          labels,
          pageViews: filteredPageViews,
          pwaInstalledUserIds: filteredPwaInstalledUserIds,
        }),
      },
    ] as const;
  });

  return {
    breakdowns: Object.fromEntries(
      breakdownEntries,
    ) as AdminPatientsDashboardSummary["intent_filters"]["breakdowns"],
    default_filter: "all",
    options: [
      {
        count: intentAnalysis.total_patients,
        id: "all",
        label: "Todos",
      },
      ...intentAnalysis.items.map((segment) => ({
        count: segment.count,
        id: segment.id,
        label: segment.label,
      })),
    ],
    source: PATIENT_INTENT_SOURCE,
  };
};

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
};

const postUrl = (post: { community: { slug: string }; id: string }) =>
  `/community/${post.community.slug}/post/${post.id}`;

const replyUrl = (reply: { id: string; post: { community: { slug: string }; id: string } }) =>
  `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`;

const pickRecentActivity = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentActivity | null => {
  const candidates: AdminPatientsDashboardRecentActivity[] = [
    {
      description: "Cadastro de paciente realizado na plataforma.",
      detail_url: null,
      label: "Cadastro realizado",
      occurred_at: patient.createdAt,
      source: "user.createdAt",
      type: "account_created",
    },
    ...patient.community_members.map((member) => ({
      description: `Entrou na comunidade ${member.community.name}.`,
      detail_url: `/community/${member.community.slug}`,
      label: "Entrou em comunidade",
      occurred_at: member.createdAt,
      source: "community_member",
      type: "community_joined",
    })),
    ...patient.community_posts.map((post) => ({
      description: `Criou o post "${post.title}" na comunidade ${post.community.name}.`,
      detail_url: postUrl(post),
      label: "Criou um post",
      occurred_at: post.createdAt,
      source: "community_post",
      type: "post_created",
    })),
    ...patient.post_replies.map((reply) => ({
      description: `Comentou no post "${reply.post.title}": ${snippet(
        reply.content,
        "comentário sem texto",
      )}.`,
      detail_url: replyUrl(reply),
      label: "Comentou em um post",
      occurred_at: reply.createdAt,
      source: "post_reply",
      type: "post_reply_created",
    })),
    ...patient.post_votes.map((vote) => {
      const target = vote.reply ?? vote.post;
      const detailUrl = vote.reply ? replyUrl(vote.reply) : vote.post ? postUrl(vote.post) : null;

      return {
        description: `Reagiu a ${vote.reply ? "uma resposta" : "um post"}${
          target ? ` em "${vote.reply ? vote.reply.post.title : vote.post?.title}"` : ""
        }.`,
        detail_url: detailUrl,
        label: vote.value > 0 ? "Upvote registrado" : "Downvote registrado",
        occurred_at: vote.createdAt,
        source: "post_vote",
        type: "post_vote",
      };
    }),
    ...patient.post_saves.map((save) => ({
      description: `Salvou o post "${save.post.title}".`,
      detail_url: postUrl(save.post),
      label: "Salvou um post",
      occurred_at: save.createdAt,
      source: "post_save",
      type: "post_saved",
    })),
    ...patient.post_reply_saves.map((save) => ({
      description: `Salvou uma resposta no post "${save.reply.post.title}".`,
      detail_url: replyUrl(save.reply),
      label: "Salvou uma resposta",
      occurred_at: save.createdAt,
      source: "post_reply_save",
      type: "reply_saved",
    })),
  ];

  return (
    candidates.sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime())[0] ??
    null
  );
};

const mapRecentPatient = (
  patient: AdminPatientRecentRecord,
): AdminPatientsDashboardRecentPatient => {
  const latestLocation = patient.visitor_locations[0] ?? null;

  return {
    avatar: patient.avatar,
    city: latestLocation?.city ?? null,
    country: latestLocation?.country ?? null,
    created_at: patient.createdAt,
    detail_url: `/pacientes/${patient.id}`,
    email: patient.email,
    gender: patient.patient_profile?.gender ?? null,
    id: patient.id,
    last_location_at: latestLocation?.createdAt ?? null,
    name: normalizeName(patient.name),
    provider: patient.provider,
    provider_label: providerLabel(patient.provider),
    recent_activity: pickRecentActivity(patient),
    state: latestLocation?.state ?? null,
    status: patient.active ? "active" : "inactive",
    status_label: patient.active ? "Ativo" : "Inativo",
  };
};

const getAllPeriodStartDate = (patients: AdminPatientSnapshotRecord[]) =>
  patients.reduce<Date | undefined>((earliest, patient) => {
    if (!earliest || patient.createdAt < earliest) return patient.createdAt;

    return earliest;
  }, undefined);

export const buildPatientsDashboard = async (
  query: AdminPatientsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPatientsDashboardRepository();
  const [patients, recentPatients] = await Promise.all([
    repository.listPatientSnapshots(),
    repository.listRecentPatients(5),
  ]);
  const resolvedPeriod = resolvePeriod(query ?? {}, getAllPeriodStartDate(patients));
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;
  const currentPatients = patients.filter((patient) => createdUntil(patient, current.end));
  const previousPatients = patients.filter((patient) => createdUntil(patient, previous.end));
  const currentPeriodPatients = patients.filter((patient) =>
    dateInRange(patient.createdAt, current),
  );
  const previousPeriodPatients = patients.filter((patient) =>
    dateInRange(patient.createdAt, previous),
  );
  const currentPeriodPatientIds = currentPeriodPatients.map((patient) => patient.id);
  const [
    locations,
    patientPageViews,
    patientPwaInstalls,
    patientPlatformSessions,
    anonymousConversionLinkedPageViews,
    anonymousConversionLinkedSessions,
    anonymousConversionSignupIdentities,
  ] = await Promise.all([
    repository.listLocations(current),
    repository.listPatientPageViews(current),
    repository.listPatientPwaInstallActions(current),
    repository.listPatientPlatformSessions(current),
    repository.listAnonymousConversionLinkedPageViews(currentPeriodPatientIds),
    repository.listAnonymousConversionLinkedSessions(currentPeriodPatientIds),
    repository.listAnonymousConversionSignupIdentities(currentPeriodPatientIds),
  ]);
  const anonymousConversionVisitorIds = collectAnonymousConversionVisitorIds(
    buildPatientVisitorIds({
      linkedPageViews: anonymousConversionLinkedPageViews,
      linkedSessions: anonymousConversionLinkedSessions,
      patientIds: new Set(currentPeriodPatientIds),
      signupIdentities: anonymousConversionSignupIdentities,
    }),
  );
  const anonymousConversionMaxSignupDate = latestPatientSignupDate(currentPeriodPatients);
  const [anonymousConversionPageViews, anonymousConversionSessions] = await Promise.all([
    repository.listAnonymousConversionPageViewsByVisitorIds(
      anonymousConversionVisitorIds,
      currentPeriodPatientIds,
      anonymousConversionMaxSignupDate,
    ),
    repository.listAnonymousConversionSessionsByVisitorIds(
      anonymousConversionVisitorIds,
      currentPeriodPatientIds,
      anonymousConversionMaxSignupDate,
    ),
  ]);
  const intentSignals = await repository.listIntentSignals(current);

  const currentNewPatients = currentPeriodPatients.length;
  const previousNewPatients = previousPeriodPatients.length;
  const activePatients = patients.filter((patient) => patient.active);
  const inactivePatients = patients.filter((patient) => !patient.active);
  const previousActivePatients = previousPatients.filter((patient) => patient.active);
  const previousInactivePatients = previousPatients.filter((patient) => !patient.active);
  const locationSummary = buildLocations(locations);
  const platformUsage = buildPlatformUsage({
    eligiblePatientsCount: currentPatients.length,
    labels,
    pageViews: patientPageViews,
    pwaInstalledUserIds: patientPwaInstalls.flatMap((event) =>
      event.user_id ? [event.user_id] : [],
    ),
  });
  const deviceUsage = buildDeviceUsage(patientPlatformSessions);
  const operatingSystemUsage = buildOperatingSystemUsage(patientPlatformSessions);
  const anonymousConversion = summarizeAnonymousConversion({
    linkedPageViews: anonymousConversionLinkedPageViews,
    linkedSessions: anonymousConversionLinkedSessions,
    pageViews: anonymousConversionPageViews,
    patients: currentPeriodPatients,
    period,
    sessions: anonymousConversionSessions,
    signupIdentities: anonymousConversionSignupIdentities,
  });
  const intentClassification = buildPatientIntentClassification(currentPatients, intentSignals);
  const intentEngagement = buildPatientIntentEngagement({
    engagementSegmentByPatientId: intentClassification.engagementSegmentByPatientId,
    patients: currentPatients,
    segmentByPatientId: intentClassification.segmentByPatientId,
  });
  const intentFilters = buildPatientIntentFilters({
    currentPatients,
    currentPeriodPatients,
    intentAnalysis: intentClassification.analysis,
    labels,
    locations,
    pageViews: patientPageViews,
    platformSessions: patientPlatformSessions,
    pwaInstalledUserIds: patientPwaInstalls.flatMap((event) =>
      event.user_id ? [event.user_id] : [],
    ),
    segmentByPatientId: intentClassification.segmentByPatientId,
  });

  const summary: AdminPatientsDashboardSummary = {
    anonymous_conversion: anonymousConversion,
    cards: {
      active_patients: metric({
        current: activePatients.length,
        description: "Contas de pacientes com user.active=true no snapshot atual.",
        id: "active_patients",
        label: "Pacientes ativos",
        previous: previousActivePatients.length,
        source: "user.role=paciente+user.active=true",
      }),
      inactive_patients: metric({
        current: inactivePatients.length,
        description: "Contas de pacientes com user.active=false no snapshot atual.",
        id: "inactive_patients",
        label: "Pacientes inativos",
        previous: previousInactivePatients.length,
        source: "user.role=paciente+user.active=false",
      }),
      new_signups: metric({
        current: currentNewPatients,
        description: "Usuários com role paciente criados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewPatients,
        source: "user.role=paciente+user.createdAt",
      }),
      total_patients: metric({
        current: patients.length,
        description: "Total atual de usuários não deletados com role paciente.",
        id: "total_patients",
        label: "Total de pacientes",
        previous: previousPatients.length,
        source: "user.role=paciente",
      }),
    },
    coverage_notes: [
      "Status ativo/inativo representa o estado da conta em user.active, não engajamento recente.",
      "Atividade recente usa eventos reais de comunidade, reações e salvamentos já persistidos.",
      "Uso da plataforma mede somente pageviews autenticados e eventos first-party de instalação PWA de pacientes no período selecionado.",
      "Devices dos pacientes usa somente visitor_session autenticada vinculada a user.role=paciente no período selecionado.",
      "Sistema operacional dos pacientes usa somente visitor_session autenticada com os normalizado; não armazena user-agent bruto.",
      "Trilha pre-cadastro parte dos pacientes cadastrados no periodo e busca, de tras para frente, uso anonimo anterior pela ponte visitor_id/session_id salva no cadastro do paciente e pelos eventos vinculados ao mesmo visitor_id; psicologos e visitantes que nao viraram paciente ficam fora deste bloco.",
      "Gênero e forma de cadastro consideram somente pacientes cadastrados no período selecionado; em Todo o período incluem a base completa.",
      "Tempo médio do paciente usa pageviews autenticados first-party e ignora períodos em que o app fica oculto/minimizado quando o navegador envia eventos de visibilidade.",
      "Localização usa apenas capturas agregadas e coarse de visitor_location no período selecionado; cidades com baixa frequência são agrupadas, e coordenadas, IP e endereço não são retornados.",
      "Análise de intenção usa apenas agregados de abertura de perfil, favoritos ativos e cliques no WhatsApp; não expõe conversa, diagnóstico ou atendimento.",
      "Engajamento dos pacientes classifica pacientes únicos pelo volume de ações reais de descoberta e contato no período; retornos ao mesmo perfil reforçam a categoria, mas não substituem eventos persistidos.",
      "Intenção x Engajamento cruza as duas classificações agregadas por paciente único para leitura observacional; não indica causalidade, atendimento, diagnóstico ou conversa.",
      "Filtros por intenção nos blocos agregados usam a mesma classificação real do período e não recalculam segmentos a partir de dados exibidos no cliente.",
    ],
    demographics: buildDemographics(currentPeriodPatients),
    device_usage: deviceUsage,
    engagement_analysis: intentClassification.engagementAnalysis,
    export: {
      available: false,
      reason: "Exportação não exibida porque ainda não existe endpoint real para pacientes.",
    },
    intent_filters: intentFilters,
    intent_engagement: intentEngagement,
    intent_analysis: intentClassification.analysis,
    locations: locationSummary,
    operating_system_usage: operatingSystemUsage,
    period,
    platform_usage: platformUsage,
    recent_patients: {
      items: recentPatients.map(mapRecentPatient),
      source: "user+patient_profile+visitor_location+community_activity",
      total: patients.length,
    },
    series: {
      points: buildSeries(patients, labels),
      source: "user.createdAt+user.active",
    },
    unavailable: [
      ...(platformUsage.duration_unavailable_reason
        ? [
            {
              description: platformUsage.duration_unavailable_reason,
              id: "patient_average_duration",
              label: "Tempo médio do paciente",
              source: platformUsage.source,
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "Uso da plataforma por pacientes depende de page_view_event autenticado no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
            },
          ]
        : []),
      ...(deviceUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de devices dos pacientes depende de visitor_session autenticada com user.role=paciente no período selecionado.",
              id: "patient_device_usage",
              label: "Devices dos pacientes",
              source: "visitor_session",
            },
          ]
        : []),
      ...(operatingSystemUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de sistemas operacionais dos pacientes depende de visitor_session autenticada com os normalizado no período selecionado.",
              id: "patient_operating_system_usage",
              label: "Sistema operacional dos pacientes",
              source: "visitor_session",
            },
          ]
        : []),
      ...(intentEngagement.unavailable_reason
        ? [
            {
              description: intentEngagement.unavailable_reason,
              id: "patient_intent_engagement",
              label: "Intenção x Engajamento",
              source: intentEngagement.source,
            },
          ]
        : []),
      ...(anonymousConversion.unavailable_reason
        ? [
            {
              description: anonymousConversion.unavailable_reason,
              id: "anonymous_conversion",
              label: "Conversão até o cadastro",
              source: anonymousConversion.source,
            },
          ]
        : []),
      ...(currentPeriodPatients.length === 0
        ? [
            {
              description:
                "Nenhum paciente foi cadastrado no período selecionado; gênero e forma de cadastro ficam vazios sem reaproveitar coortes de outros períodos.",
              id: "patient_period_demographics",
              label: "Gênero e forma de cadastro",
              source: "user.createdAt+patient_profile.gender+user.provider",
            },
          ]
        : []),
      ...(locationSummary.total === 0
        ? [
            {
              description:
                "Nenhuma visitor_location vinculada a pacientes foi encontrada no período selecionado; a seção de localização fica vazia sem inferir endereço.",
              id: "locations",
              label: "Localização agregada",
              source: "visitor_location",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminPatientsDashboardDTO): Promise<Resolve> => {
  return buildPatientsDashboard(data.q ?? {});
};
