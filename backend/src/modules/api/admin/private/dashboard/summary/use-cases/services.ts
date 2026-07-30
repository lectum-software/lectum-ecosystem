import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG,
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER,
  ADMIN_PROFILE_CONVERSION_SOURCE,
  ADMIN_PROFILE_CONVERSION_THRESHOLDS,
  buildAdminProfileConversionBenchmark,
  classifyAdminProfileConversionCategory,
} from "@/utils/admin-profile-conversion";
import type {
  AdminDashboardDateRange,
  AdminDashboardDeviceItem,
  AdminDashboardFinancialPoint,
  AdminDashboardIntentConversionCategoryId,
  AdminDashboardIntentConversionFlow,
  AdminDashboardIntentConversionFlowItem,
  AdminDashboardIntentConversionIntentId,
  AdminDashboardLocationItem,
  AdminDashboardMetric,
  AdminDashboardPendingReport,
  AdminDashboardPeriod,
  AdminDashboardQuery,
  AdminDashboardSeverity,
  AdminDashboardSummary,
  AdminDashboardWhatsAppClickDistribution,
  AdminDashboardWhatsAppClickDistributionConcentrationLevel,
  AdminDashboardWhatsAppClickDistributionPoint,
  AdminDashboardWhatsAppClickDistributionSegment,
  IAdminDashboardSummaryDTO,
} from "../DTOs/IAdminDashboardSummaryDTO";
import { AdminDashboardRepository } from "../repositories/AdminDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const SEVERITY_WEIGHTS: Record<AdminDashboardSeverity, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};
const DEVICE_LABELS: Record<AdminDashboardDeviceItem["device_type"], string> = {
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

type DashboardPeriodResolution = {
  current: AdminDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminDashboardPeriod;
  previous: AdminDashboardDateRange;
};

type PeriodResult =
  | {
      period: DashboardPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

type SubscriptionRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPaidSubscriptionsUntil"]>
>[number];

type PendingReportRecord = Awaited<
  ReturnType<AdminDashboardRepository["listPendingReports"]>
>[number];

type IntentConversionSignals = Awaited<
  ReturnType<AdminDashboardRepository["listIntentConversionSignals"]>
>;

type PsychologistConversionEvents = Awaited<
  ReturnType<AdminDashboardRepository["listPsychologistConversionEvents"]>
>;

type PsychologistConversionProfile = Awaited<
  ReturnType<AdminDashboardRepository["listPsychologistConversionProfiles"]>
>[number];

type PublishedPsychologistProfile = Awaited<
  ReturnType<AdminDashboardRepository["listPublishedPsychologistProfiles"]>
>[number];

type WhatsappClickCountByPsychologist = Awaited<
  ReturnType<AdminDashboardRepository["listWhatsappClickCountsByPsychologist"]>
>[number];

type IntentConversionPairCounts = {
  favorites: number;
  profile_views: number;
  repeated_profile_views: number;
  whatsapp_clicks: number;
};

type PsychologistConversionCounts = {
  activeDays: number;
  benchmark: ReturnType<typeof buildAdminProfileConversionBenchmark>;
  profileAgeDays: number;
  whatsappClicks: number;
};

const INTENT_CONVERSION_SOURCE = ADMIN_PROFILE_CONVERSION_SOURCE;
const PATIENT_INTENT_SCORE_WEIGHTS = {
  favorites: 20,
  profile_views: 3,
  repeated_profile_views: 5,
  whatsapp_clicks: 45,
} as const satisfies Record<keyof IntentConversionPairCounts, number>;
const PATIENT_INTENT_SCORE_CAPS = {
  favorites: 40,
  profile_views: 30,
  repeated_profile_views: 20,
  whatsapp_clicks: 90,
} as const satisfies Record<keyof IntentConversionPairCounts, number>;
const INTENT_CONVERSION_INTENT_CONFIG = {
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
const INTENT_CONVERSION_INTENT_ORDER: AdminDashboardIntentConversionIntentId[] = [
  "curious",
  "objective",
  "very_qualified",
];
const INTENT_CONVERSION_CATEGORY_CONFIG = ADMIN_PROFILE_CONVERSION_CATEGORY_CONFIG satisfies Record<
  AdminDashboardIntentConversionCategoryId,
  { description: string; label: string }
>;
const INTENT_CONVERSION_CATEGORY_ORDER =
  ADMIN_PROFILE_CONVERSION_ENGAGEMENT_CATEGORY_ORDER as AdminDashboardIntentConversionCategoryId[];

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

export const toDateKey = (date: Date) =>
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

  return Math.floor((end - start) / 86_400_000) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (
  query: AdminDashboardQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo)
      return { success: false, code: "invalid_analytics_date_range" };

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
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
    label = "Este mês";
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
    label = "Todo o período";
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
  const previous = { start: previousStart, end: previousEnd };
  const current = { start, end };

  return {
    success: true,
    period: {
      current,
      days,
      labels: buildLabels(start, days),
      previous,
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

const countByDate = (items: Array<{ createdAt: Date }>, labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return labels.map((date) => ({ date, count: counts.get(date) ?? 0 }));
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const scoreContribution = (metricId: keyof IntentConversionPairCounts, value: number) =>
  Math.min(
    PATIENT_INTENT_SCORE_CAPS[metricId],
    Math.max(0, value) * PATIENT_INTENT_SCORE_WEIGHTS[metricId],
  );

const patientIntentScore = (counts: IntentConversionPairCounts) =>
  Math.min(
    100,
    Math.round(
      scoreContribution("profile_views", counts.profile_views) +
        scoreContribution("repeated_profile_views", counts.repeated_profile_views) +
        scoreContribution("favorites", counts.favorites) +
        scoreContribution("whatsapp_clicks", counts.whatsapp_clicks),
    ),
  );

const classifyIntentConversionPair = (
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

const classifyPsychologistConversion = (
  signals: PsychologistConversionCounts,
): AdminDashboardIntentConversionCategoryId => {
  const categoryId = classifyAdminProfileConversionCategory(signals);

  return categoryId === "insufficient_data" ? "standard_conversion" : categoryId;
};

const getProfileActiveDaysInRange = (
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

const getProfileAgeDaysUntil = (profile: PsychologistConversionProfile, date: Date) => {
  const profileStart = startOfDate(profile.user.createdAt);
  const rangeEnd = endOfDate(date);

  if (profileStart > rangeEnd) return 0;

  return daysBetweenInclusive(profileStart, rangeEnd);
};

const countEventsByPsychologist = (events: Array<{ psychologist_id: string }>) => {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.psychologist_id, (counts.get(event.psychologist_id) ?? 0) + 1);
  }

  return counts;
};

const emptyIntentConversionPairCounts = (): IntentConversionPairCounts => ({
  favorites: 0,
  profile_views: 0,
  repeated_profile_views: 0,
  whatsapp_clicks: 0,
});

const buildPsychologistConversionMap = (
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

const buildIntentConversionFlow = (params: {
  psychologistConversionEvents: PsychologistConversionEvents;
  psychologistProfiles: PsychologistConversionProfile[];
  range: AdminDashboardDateRange;
  signals: IntentConversionSignals;
}): AdminDashboardIntentConversionFlow => {
  const conversionByPsychologist = buildPsychologistConversionMap(
    params.psychologistProfiles,
    params.psychologistConversionEvents,
    params.range,
  );
  const pairCounts = new Map<string, IntentConversionPairCounts & { psychologistId: string }>();
  const profileViewCountsByPair = new Map<string, number>();

  const getPair = (patientId: string, psychologistId: string) => {
    const key = `${patientId}:${psychologistId}`;
    const current = pairCounts.get(key);
    if (current) return current;

    const next = {
      ...emptyIntentConversionPairCounts(),
      psychologistId,
    };
    pairCounts.set(key, next);
    return next;
  };

  for (const view of params.signals.profileViews) {
    if (!view.viewer_id) continue;

    const pair = getPair(view.viewer_id, view.psychologist_id);
    pair.profile_views += 1;
    const key = `${view.viewer_id}:${view.psychologist_id}`;
    profileViewCountsByPair.set(key, (profileViewCountsByPair.get(key) ?? 0) + 1);
  }

  for (const [key, views] of profileViewCountsByPair.entries()) {
    const pair = pairCounts.get(key);
    if (!pair) continue;

    pair.repeated_profile_views = Math.max(0, views - 1);
  }

  for (const favorite of params.signals.favorites) {
    getPair(favorite.user_id, favorite.psychologist_id).favorites += 1;
  }

  for (const click of params.signals.whatsappClicks) {
    if (!click.user_id) continue;

    getPair(click.user_id, click.psychologist_id).whatsapp_clicks += 1;
  }

  const intentTotals = new Map<AdminDashboardIntentConversionIntentId, number>(
    INTENT_CONVERSION_INTENT_ORDER.map((id) => [id, 0]),
  );
  const conversionTotals = new Map<AdminDashboardIntentConversionCategoryId, number>(
    INTENT_CONVERSION_CATEGORY_ORDER.map((id) => [id, 0]),
  );
  const flowCounts = new Map<string, number>();

  for (const pair of pairCounts.values()) {
    const intentId = classifyIntentConversionPair(pair);
    if (!intentId) continue;

    const conversionId = conversionByPsychologist.get(pair.psychologistId) ?? "low_conversion";
    const flowKey = `${intentId}_${conversionId}`;

    intentTotals.set(intentId, (intentTotals.get(intentId) ?? 0) + 1);
    conversionTotals.set(conversionId, (conversionTotals.get(conversionId) ?? 0) + 1);
    flowCounts.set(flowKey, (flowCounts.get(flowKey) ?? 0) + 1);
  }

  const totalPairs = [...flowCounts.values()].reduce((sum, count) => sum + count, 0);
  const flowItems: AdminDashboardIntentConversionFlowItem[] =
    INTENT_CONVERSION_INTENT_ORDER.flatMap((intentId) =>
      INTENT_CONVERSION_CATEGORY_ORDER.map((conversionId) => {
        const count = flowCounts.get(`${intentId}_${conversionId}`) ?? 0;

        return {
          conversion_id: conversionId,
          conversion_label: INTENT_CONVERSION_CATEGORY_CONFIG[conversionId].label,
          conversion_percentage: safePercentage(count, conversionTotals.get(conversionId) ?? 0),
          count,
          id: `${intentId}_${conversionId}` as const,
          intent_id: intentId,
          intent_label: INTENT_CONVERSION_INTENT_CONFIG[intentId].label,
          intent_percentage: safePercentage(count, intentTotals.get(intentId) ?? 0),
          percentage: safePercentage(count, totalPairs),
        };
      }),
    ).filter((item) => item.count > 0);

  const healthyAbsorption = flowCounts.get("very_qualified_strong_conversion") ?? 0;
  const retainedIntention = [...flowCounts.entries()].reduce((sum, [key, count]) => {
    const isWarmIntent = key.startsWith("objective_") || key.startsWith("very_qualified_");
    const isStrongConversion = key.endsWith("_strong_conversion");

    return isWarmIntent && !isStrongConversion ? sum + count : sum;
  }, 0);
  const exploratoryLoss =
    (flowCounts.get("curious_low_conversion") ?? 0) +
    (flowCounts.get("curious_no_conversion") ?? 0);

  return {
    coverage_note:
      "Fluxo observacional por pares paciente-psicólogo com sinais reais no período; pacientes frios não entram porque não têm perfil associado.",
    flows: flowItems.sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return right.percentage - left.percentage;
    }),
    insights: [
      {
        count: healthyAbsorption,
        description: "Qualificados que chegaram a psicólogos classificados em Alta Conversão.",
        id: "healthy_absorption",
        label: "Absorção saudável",
        percentage: safePercentage(healthyAbsorption, totalPairs),
      },
      {
        count: retainedIntention,
        description:
          "Interessados ou Qualificados que chegaram a psicólogos sem Alta Conversão no período.",
        id: "retained_intention",
        label: "Intenção represada",
        percentage: safePercentage(retainedIntention, totalPairs),
      },
      {
        count: exploratoryLoss,
        description: "Curiosos chegando a psicólogos em Baixa Conversão ou Sem Conversão.",
        id: "exploratory_loss",
        label: "Tráfego exploratório",
        percentage: safePercentage(exploratoryLoss, totalPairs),
      },
    ],
    intents: INTENT_CONVERSION_INTENT_ORDER.map((id) => {
      const count = intentTotals.get(id) ?? 0;

      return {
        count,
        description: INTENT_CONVERSION_INTENT_CONFIG[id].description,
        id,
        label: INTENT_CONVERSION_INTENT_CONFIG[id].label,
        percentage: safePercentage(count, totalPairs),
      };
    }),
    privacy_note:
      "Indicador interno do Admin; não é exibido a pacientes ou psicólogos e não infere sessão, atendimento, diagnóstico ou conteúdo de conversa.",
    psychologist_conversions: INTENT_CONVERSION_CATEGORY_ORDER.map((id) => {
      const count = conversionTotals.get(id) ?? 0;

      return {
        count,
        description: INTENT_CONVERSION_CATEGORY_CONFIG[id].description,
        id,
        label: INTENT_CONVERSION_CATEGORY_CONFIG[id].label,
        percentage: safePercentage(count, totalPairs),
      };
    }),
    source: INTENT_CONVERSION_SOURCE,
    total_pairs: totalPairs,
    unavailable_reason:
      totalPairs > 0
        ? null
        : "Nenhum par paciente-psicólogo com sinal real foi encontrado no período.",
  };
};

const normalizeDeviceType = (value: string): AdminDashboardDeviceItem["device_type"] => {
  const normalized = value.toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDevices = (sessions: Array<{ device_type: string }>) => {
  const counts: Record<AdminDashboardDeviceItem["device_type"], number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };

  for (const session of sessions) {
    counts[normalizeDeviceType(session.device_type)] += 1;
  }

  const total = sessions.length;
  const items = (Object.keys(counts) as AdminDashboardDeviceItem["device_type"][])
    .map((deviceType) => ({
      count: counts[deviceType],
      device_type: deviceType,
      label: DEVICE_LABELS[deviceType],
      percentage: safePercentage(counts[deviceType], total),
    }))
    .sort((left, right) => right.count - left.count);

  return { items, total };
};

const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

const buildLocations = (locations: Array<{ country: string | null }>) => {
  const counts = new Map<string, number>();

  for (const location of locations) {
    const country = normalizeCountry(location.country);
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  const total = locations.length;
  const items: AdminDashboardLocationItem[] = [...counts.entries()]
    .map(([country, count]) => ({
      count,
      country,
      percentage: safePercentage(count, total),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  return { items, total };
};

const isBillableSubscription = (subscription: SubscriptionRecord) =>
  subscription.status === "ativa" &&
  subscription.source !== "admin_grant" &&
  subscription.plan.price_cents > 0 &&
  subscription.plan.slug !== "gratuito";

const isActiveAt = (subscription: SubscriptionRecord, day: Date) => {
  const dayEnd = endOfDate(day);

  return (
    subscription.createdAt <= dayEnd &&
    (!subscription.current_period_end || subscription.current_period_end >= startOfDate(day))
  );
};

const estimateMrrAt = (subscriptions: SubscriptionRecord[], day: Date) => {
  const activeSubscriptions = subscriptions.filter(
    (subscription) => isBillableSubscription(subscription) && isActiveAt(subscription, day),
  );
  const mrrCents = activeSubscriptions.reduce(
    (sum, subscription) => sum + subscription.plan.price_cents,
    0,
  );

  return {
    activeSubscriptions: activeSubscriptions.length,
    mrrCents,
  };
};

const buildFinancial = (
  subscriptions: SubscriptionRecord[],
  labels: string[],
  periodEnd: Date,
  days: number,
) => {
  const daily: AdminDashboardFinancialPoint[] = labels.map((label) => {
    const day = parseDateOnly(label, "end")!;
    const estimate = estimateMrrAt(subscriptions, day);

    return {
      active_subscriptions: estimate.activeSubscriptions,
      date: label,
      value_cents: estimate.mrrCents,
    };
  });
  const currentEstimate = estimateMrrAt(subscriptions, periodEnd);

  return {
    confirmed_revenue_available: false,
    daily,
    label:
      "MRR estimado por assinaturas profissionais ativas, excluindo cortesias administrativas.",
    mrr_cents: currentEstimate.mrrCents,
    period_estimate_cents: Math.round((currentEstimate.mrrCents / 30) * days),
    source: "active_subscription_estimate" as const,
    unavailable_reason:
      "Eventos de pagamento não possuem campo monetário normalizado; por isso o Dashboard exibe estimativa de assinatura ativa, não receita confirmada.",
  };
};

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const normalizeSeverityText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const deriveReportSeverity = (
  report: Pick<PendingReportRecord, "reason" | "target_type">,
) => {
  const text = normalizeSeverityText(`${report.reason} ${report.target_type}`);

  if (
    ["odio", "violencia", "risco", "ameaca", "suic", "automutil", "abuso"].some((term) =>
      text.includes(term),
    )
  ) {
    return "alta" as const;
  }

  if (
    report.target_type === "reply" ||
    ["ofens", "desrespeito", "desinform", "assedio", "spam"].some((term) => text.includes(term))
  ) {
    return "media" as const;
  }

  return "baixa" as const;
};

const mapPendingReport = (report: PendingReportRecord): AdminDashboardPendingReport => {
  const severity = deriveReportSeverity(report);
  const isReply = report.target_type === "reply" && report.reply;
  const communityName = isReply ? report.reply?.post.community.name : report.post.community.name;
  const targetTitle = isReply
    ? report.reply?.title ||
      snippet(report.reply?.content, report.reply?.post.title || "Comentário denunciado")
    : report.post.title || snippet(report.post.content, "Post denunciado");

  return {
    community_name: communityName ?? null,
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reporter_role: report.reporter.role,
    severity,
    status: report.status,
    target_id: report.target_id,
    target_title: targetTitle,
    target_type: report.target_type,
  };
};

const buildPendingReports = (reports: PendingReportRecord[], total: number) => ({
  items: reports
    .map(mapPendingReport)
    .sort((left, right) => {
      const severityDiff = SEVERITY_WEIGHTS[right.severity] - SEVERITY_WEIGHTS[left.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })
    .slice(0, 5),
  source: "post_report" as const,
  total,
});

const formatPercentText = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })}%`;

const formatCountText = (value: number, singular: string, plural: string) =>
  `${value.toLocaleString("pt-BR")} ${value === 1 ? singular : plural}`;

const sumNumbers = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

const concentrationFromGini = (
  gini: number | null,
  totalClicks: number,
  totalPsychologists: number,
): {
  label: string;
  level: AdminDashboardWhatsAppClickDistributionConcentrationLevel;
} => {
  if (totalPsychologists === 0) {
    return {
      label: "Sem psicólogos publicados",
      level: "unavailable",
    };
  }

  if (totalClicks === 0 || gini === null) {
    return {
      label: "Sem cliques no período",
      level: "unavailable",
    };
  }

  if (gini < 0.3) {
    return {
      label: "Baixa concentração",
      level: "balanced",
    };
  }

  if (gini < 0.55) {
    return {
      label: "Concentração moderada",
      level: "moderate",
    };
  }

  return {
    label: "Alta concentração",
    level: "concentrated",
  };
};

const buildGini = (sortedAscendingCounts: number[], totalClicks: number) => {
  if (sortedAscendingCounts.length === 0 || totalClicks === 0) return null;

  const weightedSum = sortedAscendingCounts.reduce(
    (sum, value, index) => sum + (index + 1) * value,
    0,
  );
  const raw =
    (2 * weightedSum) / (sortedAscendingCounts.length * totalClicks) -
    (sortedAscendingCounts.length + 1) / sortedAscendingCounts.length;

  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
};

const buildWhatsAppCurve = (
  sortedAscendingCounts: number[],
  totalClicks: number,
): AdminDashboardWhatsAppClickDistributionPoint[] => {
  if (sortedAscendingCounts.length === 0) return [];

  let cumulativeClicks = 0;

  return [
    {
      click_percentage: 0,
      cumulative_clicks: 0,
      psychologist_percentage: 0,
      psychologists: 0,
    },
    ...sortedAscendingCounts.map((count, index) => {
      cumulativeClicks += count;

      return {
        click_percentage: safePercentage(cumulativeClicks, totalClicks),
        cumulative_clicks: cumulativeClicks,
        psychologist_percentage: safePercentage(index + 1, sortedAscendingCounts.length),
        psychologists: index + 1,
      };
    }),
  ];
};

const buildTopSegment = (
  sortedDescendingCounts: number[],
  totalClicks: number,
  percentage: 10 | 20,
): AdminDashboardWhatsAppClickDistributionSegment => {
  const totalPsychologists = sortedDescendingCounts.length;
  if (totalPsychologists === 0) {
    return {
      click_percentage: 0,
      clicks: 0,
      psychologist_count: 0,
      psychologist_percentage: 0,
    };
  }

  const psychologistCount = Math.max(1, Math.ceil(totalPsychologists * (percentage / 100)));
  const clicks = sumNumbers(sortedDescendingCounts.slice(0, psychologistCount));

  return {
    click_percentage: safePercentage(clicks, totalClicks),
    clicks,
    psychologist_count: psychologistCount,
    psychologist_percentage: safePercentage(psychologistCount, totalPsychologists),
  };
};

const buildWhatsAppDistributionSummary = (params: {
  top20: AdminDashboardWhatsAppClickDistributionSegment;
  totalClicks: number;
  totalPsychologists: number;
}) => {
  if (params.totalPsychologists === 0) {
    return "Nenhum psicólogo ativo e publicado foi encontrado para compor a base da distribuição.";
  }

  if (params.totalClicks === 0) {
    return "Nenhum clique real de WhatsApp foi registrado para os psicólogos considerados neste período.";
  }

  return `Top 20% (${formatCountText(
    params.top20.psychologist_count,
    "psicólogo",
    "psicólogos",
  )}) concentram ${formatPercentText(params.top20.click_percentage)} dos cliques de WhatsApp no período.`;
};

const buildWhatsAppClickDistribution = (
  profiles: PublishedPsychologistProfile[],
  clickCounts: WhatsappClickCountByPsychologist[],
): AdminDashboardWhatsAppClickDistribution => {
  const clicksByPsychologist = new Map(
    clickCounts.map((item) => [item.psychologist_id, item.count]),
  );
  const counts = profiles.map((profile) => clicksByPsychologist.get(profile.user_id) ?? 0);
  const totalPsychologists = counts.length;
  const totalClicks = sumNumbers(counts);
  const sortedAscendingCounts = [...counts].sort((left, right) => left - right);
  const sortedDescendingCounts = [...counts].sort((left, right) => right - left);
  const psychologistsWithClicks = counts.filter((count) => count > 0).length;
  const top10 = buildTopSegment(sortedDescendingCounts, totalClicks, 10);
  const top20 = buildTopSegment(sortedDescendingCounts, totalClicks, 20);
  const gini = buildGini(sortedAscendingCounts, totalClicks);
  const concentration = concentrationFromGini(gini, totalClicks, totalPsychologists);

  return {
    concentration_label: concentration.label,
    concentration_level: concentration.level,
    curve: buildWhatsAppCurve(sortedAscendingCounts, totalClicks),
    gini,
    psychologists_with_clicks: psychologistsWithClicks,
    psychologists_without_clicks: Math.max(0, totalPsychologists - psychologistsWithClicks),
    source: "contact_request.channel=whatsapp+psychologist_profile.published",
    summary: buildWhatsAppDistributionSummary({
      top20,
      totalClicks,
      totalPsychologists,
    }),
    top_10_percent: top10,
    top_20_percent: top20,
    total_clicks: totalClicks,
    total_psychologists: totalPsychologists,
  };
};

export const buildDashboardSummary = async (query: AdminDashboardQuery): Promise<Resolve> => {
  const repository = new AdminDashboardRepository();
  const allPeriodStartDate =
    query?.period === "all" ? await repository.findEarliestDashboardDate() : null;
  const resolvedPeriod = resolvePeriod(query ?? {}, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, days, labels, period, previous } = resolvedPeriod.period;
  const publishedPsychologistProfiles = await repository.listPublishedPsychologistProfiles();
  const publishedPsychologistIds = publishedPsychologistProfiles.map((profile) => profile.user_id);

  const [
    sessions,
    previousSessions,
    patients,
    previousPatients,
    psychologists,
    previousPsychologists,
    pendingReportsTotal,
    previousPendingReports,
    patientCommunityPostDates,
    psychologistCommunityPostDates,
    patientCommentDates,
    psychologistReplyDates,
    visitorLocations,
    visitorSessions,
    paidSubscriptions,
    pendingReportRows,
    intentConversionSignals,
    psychologistConversionEvents,
    psychologistConversionProfiles,
    whatsappClickCountsByPsychologist,
  ] = await Promise.all([
    repository.countVisitorSessions(current),
    repository.countVisitorSessions(previous),
    repository.countUsersByRole("paciente", current),
    repository.countUsersByRole("paciente", previous),
    repository.countUsersByRole("psicologo", current),
    repository.countUsersByRole("psicologo", previous),
    repository.countPendingReports(current),
    repository.countPendingReports(previous),
    repository.listCommunityPostDates(current, "paciente"),
    repository.listCommunityPostDates(current, "psicologo"),
    repository.listPostReplyDates(current, "paciente"),
    repository.listPostReplyDates(current, "psicologo"),
    repository.listVisitorLocations(current),
    repository.listVisitorSessions(current),
    repository.listPaidSubscriptionsUntil(current.end),
    repository.listPendingReports(current),
    repository.listIntentConversionSignals(current),
    repository.listPsychologistConversionEvents(current),
    repository.listPsychologistConversionProfiles(),
    repository.listWhatsappClickCountsByPsychologist(current, publishedPsychologistIds),
  ]);

  const financial = buildFinancial(paidSubscriptions, labels, current.end, days);
  const previousFinancial = estimateMrrAt(paidSubscriptions, previous.end);
  const devices = buildDevices(visitorSessions);
  const locations = buildLocations(visitorLocations);
  const intentConversionFlow = buildIntentConversionFlow({
    psychologistConversionEvents,
    psychologistProfiles: psychologistConversionProfiles,
    range: current,
    signals: intentConversionSignals,
  });
  const whatsappClickDistribution = buildWhatsAppClickDistribution(
    publishedPsychologistProfiles,
    whatsappClickCountsByPsychologist,
  );

  const summary: AdminDashboardSummary = {
    cards: {
      patients: metric({
        current: patients,
        description: "Pacientes ativos cadastrados no período selecionado.",
        id: "patients",
        label: "Pacientes",
        previous: previousPatients,
        source: "user.role=paciente",
      }),
      pending_reports: metric({
        current: pendingReportsTotal,
        description: "Denúncias pendentes registradas no período selecionado.",
        id: "pending_reports",
        label: "Denúncias pendentes",
        previous: previousPendingReports,
        source: "post_report.status=pendente",
      }),
      psychologists: metric({
        current: psychologists,
        description: "Psicólogos ativos cadastrados no período selecionado.",
        id: "psychologists",
        label: "Psicólogos",
        previous: previousPsychologists,
        source: "user.role=psicologo",
      }),
      revenue: metric({
        current: financial.mrr_cents,
        description:
          "MRR estimado por assinaturas profissionais ativas. Não representa receita confirmada no gateway.",
        id: "revenue",
        label: "MRR estimado",
        previous: previousFinancial.mrrCents,
        source: financial.source,
        unit: "currency_cents",
      }),
      sessions: metric({
        current: sessions,
        description: "Sessões reais capturadas em visitor_session no período selecionado.",
        id: "sessions",
        label: "Sessões do site",
        previous: previousSessions,
        source: "visitor_session",
      }),
    },
    community_activity: {
      comments: countByDate([...patientCommentDates, ...psychologistReplyDates], labels),
      patient_comments: countByDate(patientCommentDates, labels),
      patient_posts: countByDate(patientCommunityPostDates, labels),
      posts: countByDate([...patientCommunityPostDates, ...psychologistCommunityPostDates], labels),
      psychologist_posts: countByDate(psychologistCommunityPostDates, labels),
      psychologist_replies: countByDate(psychologistReplyDates, labels),
      source: "community_post+post_reply+user.role",
    },
    devices: {
      ...devices,
      source: "visitor_session.device_type",
    },
    financial: {
      confirmed_revenue_available: financial.confirmed_revenue_available,
      daily: financial.daily,
      label: financial.label,
      mrr_cents: financial.mrr_cents,
      period_estimate_cents: financial.period_estimate_cents,
      source: financial.source,
      unavailable_reason: financial.unavailable_reason,
    },
    intent_conversion_flow: intentConversionFlow,
    locations: {
      ...locations,
      source: "visitor_location.country",
    },
    pending_reports: buildPendingReports(pendingReportRows, pendingReportsTotal),
    period,
    unavailable: [
      {
        description:
          "O schema payment_event armazena payload bruto do gateway sem valor monetário normalizado para somatório confiável.",
        id: "confirmed_revenue",
        label: "Receita confirmada",
        source: "payment_event",
      },
    ],
    whatsapp_click_distribution: whatsappClickDistribution,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminDashboardSummaryDTO): Promise<Resolve> => {
  return buildDashboardSummary(data.q ?? {});
};
