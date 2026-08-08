import {
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionCategory,
} from "@/utils/admin-profile-conversion";
import {
  buildDateLabels as buildLabels,
  daysBetweenInclusive,
  endOfDate,
  resolveCalendarPeriod,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminDashboardDateRange,
  AdminDashboardDeviceItem,
  AdminDashboardIntentConversionCategoryId,
  AdminDashboardIntentConversionIntentId,
  AdminDashboardMetric,
  AdminDashboardPeriod,
  AdminDashboardQuery,
  AdminDashboardSeverity,
} from "../../DTOs/IAdminDashboardSummaryDTO";
import type { AdminDashboardRepository } from "../../repositories/AdminDashboardRepository";

export const DEFAULT_PERIOD_DAYS = 7;

export const MAX_PERIOD_DAYS = 3660;

export const SEVERITY_WEIGHTS: Record<AdminDashboardSeverity, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};

export const DEVICE_LABELS: Record<AdminDashboardDeviceItem["device_type"], string> = {
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

export type DashboardPeriodResolution = {
  current: AdminDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminDashboardPeriod;
  previous: AdminDashboardDateRange;
};

export type PeriodResult =
  | {
      period: DashboardPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export type SubscriptionRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPaidSubscriptionsUntil"]>
>[number];

export type PendingReportRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPendingReports"]>
>[number];

export type IntentConversionSignals = Awaited<
  ReturnType<AdminDashboardRepository["listIntentConversionSignals"]>
>;

export type PsychologistConversionEvents = Awaited<
  ReturnType<AdminDashboardRepository["listPsychologistConversionEvents"]>
>;

export type PsychologistConversionProfile = Awaited<
  ReturnType<AdminDashboardRepository["listPsychologistConversionProfiles"]>
>[number];

export type PublishedPsychologistProfile = Awaited<
  ReturnType<AdminDashboardRepository["listPublishedPsychologistProfiles"]>
>[number];

export type WhatsappClickCountByPsychologist = Awaited<
  ReturnType<AdminDashboardRepository["listWhatsappClickCountsByPsychologist"]>
>[number];

export type IntentConversionPairCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

export type PsychologistConversionCounts = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

export const INTENT_CONVERSION_SOURCE = ADMIN_PROFILE_CONVERSION_SOURCE;

export const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<keyof IntentConversionPairCounts, number>;

export const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<keyof IntentConversionPairCounts, number>;

export const INTENT_CONVERSION_INTENT_CONFIG = {
  curious: {
    description: "Abertura de perfil sem favorito ou WhatsApp para o mesmo psicólogo.",
    label: "Curiosos",
  },
  objective: {
    description: "Retorno ao perfil ou favorito antes do clique no WhatsApp.",
    label: "Interessados",
  },
  very_qualified: {
    description: "Clique no WhatsApp ou múltiplos sinais fortes para o mesmo psicólogo.",
    label: "Qualificados",
  },
} as const satisfies Record<
  AdminDashboardIntentConversionIntentId,
  { description: string; label: string }
>;

export const INTENT_CONVERSION_INTENT_ORDER: AdminDashboardIntentConversionIntentId[] = [
  "curious",
  "objective",
  "very_qualified",
];

export const INTENT_CONVERSION_CATEGORY_CONFIG =
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
    AdminDashboardIntentConversionCategoryId,
    { description: string; label: string }
  >;

export const INTENT_CONVERSION_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminDashboardIntentConversionCategoryId[];

export const resolvePeriod = (
  query: AdminDashboardQuery,
  allPeriodStartDate?: Date | null,
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
  unit?: AdminDashboardMetric["unit"];
  unavailable?: boolean;
  unavailableReason?: string;
}): AdminDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: params.unit ?? "count",
    unavailable: params.unavailable ?? false,
    ...(params.unavailableReason ? { unavailable_reason: params.unavailableReason } : {}),
    value: params.current,
  };
};

export const countByDate = (items: Array<{ createdAt: Date }>, labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return labels.map((date) => ({ date, count: counts.get(date) ?? 0 }));
};

export const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

export const scoreContribution = (metricId: keyof IntentConversionPairCounts, value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

export const patientIntentScore = (counts: IntentConversionPairCounts) =>
  Math.min(
    100,
    Math.round(
      scoreContribution("profile_views", counts.profile_views) +
        scoreContribution("repeated_profile_views", counts.repeated_profile_views) +
        scoreContribution("favorites", counts.favorites) +
        scoreContribution("whatsapp_clicks", counts.whatsapp_clicks),
    ),
  );

export const classifyIntentConversionPair = (
  counts: IntentConversionPairCounts,
): AdminDashboardIntentConversionIntentId | null => {
  const score = patientIntentScore(counts);

  if (counts.whatsapp_clicks > 0 || score >= 45) return "very_qualified";
  if (counts.favorites > 0 || score >= 20) return "objective";
  if (counts.profile_views > 0 || counts.repeated_profile_views > 0 || score > 0) {
    return "curious";
  }

  return null;
};

export const classifyPsychologistConversion = (
  signals: PsychologistConversionCounts,
): AdminDashboardIntentConversionCategoryId => {
  const categoryId = classifyAdminProfileConversionCategory(signals);

  return categoryId === "insufficient_data" ? "standard_conversion" : categoryId;
};

export const getProfileActiveDaysInRange = (
  profile: PsychologistConversionProfile,
  range: AdminDashboardDateRange,
) => {
  const rangeStart = startOfDate(range.start);
  const rangeEnd = endOfDate(range.end);
  const profileStart = startOfDate(profile.user.createdAt);
  const activeStart = profileStart > rangeStart ? profileStart : rangeStart;

  if (activeStart > rangeEnd) return 0;

  return daysBetweenInclusive(activeStart, rangeEnd);
};

export const getProfileAgeDaysUntil = (profile: PsychologistConversionProfile, date: Date) => {
  const profileStart = startOfDate(profile.user.createdAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

export const countEventsByPsychologist = (events: Array<{ psychologist_id: string }>) => {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.psychologist_id, (counts.get(event.psychologist_id) ?? 0) + 1);
  }

  return counts;
};

export const emptyIntentConversionPairCounts = (): IntentConversionPairCounts => ({
  favorites: 0,
  profile_views: 0,
  repeated_profile_views: 0,
  whatsapp_clicks: 0,
});

export const buildPsychologistConversionMap = (
  profiles: PsychologistConversionProfile[],
  events: PsychologistConversionEvents,
  range: AdminDashboardDateRange,
) => {
  const whatsappClickCounts = countEventsByPsychologist(events.whatsappClicks);
  const conversionByPsychologist = new Map<string, AdminDashboardIntentConversionCategoryId>();
  const eligibleProfiles = profiles.filter(
    (profile) =>
      getProfileAgeDaysUntil(profile, range.end) >=
      ADMIN_PROFILE_CONVERSION_THRESHOLDS.adaptation_period_days,
  );
  const benchmark = buildAdminProfileConversionBenchmark({
    eligiblePsychologists: eligibleProfiles.length,
    whatsappClicks: eligibleProfiles.map(
      (profile) => whatsappClickCounts.get(profile.user_id) ?? 0,
    ),
  });

  for (const profile of profiles) {
    const psychologistId = profile.user_id;
    const activeDays = getProfileActiveDaysInRange(profile, range);
    const profileAgeDays = getProfileAgeDaysUntil(profile, range.end);
    const whatsappClicks = whatsappClickCounts.get(psychologistId) ?? 0;

    conversionByPsychologist.set(
      psychologistId,
      classifyPsychologistConversion({
        activeDays,
        benchmark,
        profileAgeDays,
        whatsappClicks,
      }),
    );
  }

  return conversionByPsychologist;
};
