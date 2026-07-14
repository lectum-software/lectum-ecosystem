import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  firstPaidProfessionalSubscription,
  isPaidProfessionalSubscription,
  roundOneDecimal,
  signupMethodFromProvider,
  signupMethodLabel,
  summarizeConversionCohort,
  summarizePlatformUsage,
  summarizePsychologistTrafficOrigins,
} from "@/utils/admin-psychologist-analytics";
import { crpExperienceYears } from "@/utils/professional-experience";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import type {
  AdminPsychologistsDashboardBooleanBreakdown,
  AdminPsychologistsDashboardBreakdownItem,
  AdminPsychologistsDashboardDailyPoint,
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardMetric,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPsychologist,
  AdminPsychologistsDashboardQuery,
  AdminPsychologistsDashboardSummary,
  IAdminPsychologistsDashboardDTO,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import { AdminPsychologistsDashboardRepository } from "../repositories/AdminPsychologistsDashboardRepository";
import type {
  AdminPsychologistProfileRecord,
  AdminPsychologistSubscriptionRecord,
} from "../repositories/interfaces/IAdminPsychologistsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const COURTESY_SUBSCRIPTION_SOURCE = "admin_grant";

const STATUS_ACTIVE = "ativa";
const STATUS_CANCELLED = "cancelada";
const FREE_PLAN_SLUG = "gratuito";

const MODALITY_LABELS: Record<string, string> = {
  hibrido: "Híbrido",
  hybrid: "Híbrido",
  online: "Online",
  presencial: "Presencial",
};

const GENDER_LABELS: Record<string, string> = {
  feminina: "Feminino",
  feminino: "Feminino",
  female: "Feminino",
  homem: "Masculino",
  male: "Masculino",
  masculina: "Masculino",
  masculino: "Masculino",
  mulher: "Feminino",
  nao_binario: "Outro",
  não_binário: "Outro",
  outro: "Outro",
  other: "Outro",
};

type PsychologistsPeriodResolution = {
  current: AdminPsychologistsDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminPsychologistsDashboardPeriod;
  previous: AdminPsychologistsDashboardDateRange;
};

type PeriodResult =
  | {
      period: PsychologistsPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

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

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (
  query: AdminPsychologistsDashboardQuery,
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

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
    label = "Período personalizado";
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

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  estimated?: boolean;
  id: string;
  label: string;
  previous: number;
  previousValueCount?: number;
  source: string;
  unit?: AdminPsychologistsDashboardMetric["unit"];
  unavailable?: boolean;
  unavailableReason?: string;
  valueCount?: number;
}): AdminPsychologistsDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    ...(typeof params.previousValueCount === "number"
      ? { previous_value_count: params.previousValueCount }
      : {}),
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: params.unit ?? "count",
    unavailable: params.unavailable ?? false,
    ...(typeof params.estimated === "boolean" ? { estimated: params.estimated } : {}),
    ...(params.unavailableReason ? { unavailable_reason: params.unavailableReason } : {}),
    value: params.current,
    ...(typeof params.valueCount === "number" ? { value_count: params.valueCount } : {}),
  };
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Psicólogo";

const dateInRange = (date: Date, range: AdminPsychologistsDashboardDateRange) =>
  date >= range.start && date <= range.end;

const profileCreatedUntil = (profile: AdminPsychologistProfileRecord, date: Date) =>
  profile.user.createdAt <= date;

const subscriptionActiveAt = (subscription: AdminPsychologistSubscriptionRecord, date: Date) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

const isProfessionalPlan = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

const isPaidGatewaySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  isPaidProfessionalSubscription(subscription);

const isCourtesySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.source === COURTESY_SUBSCRIPTION_SOURCE && isProfessionalPlan(subscription);

const activeSubscriptionsAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  profile.subscriptions.filter((subscription) => subscriptionActiveAt(subscription, date));

const hasActiveFreeAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

const getPlanSegmentAt = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
): "courtesy" | "free" | "none" | "subscriber" => {
  const activeSubscriptions = activeSubscriptionsAt(profile, date);

  if (activeSubscriptions.some(isPaidGatewaySubscription)) return "subscriber";
  if (activeSubscriptions.some(isCourtesySubscription)) return "courtesy";
  if (activeSubscriptions.some(isFreeSubscription)) return "free";

  return "none";
};

const hasActiveSubscriberAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "subscriber";

const hasActiveCourtesyAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "courtesy";

const hasCurrentFreePlanAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  getPlanSegmentAt(profile, date) === "free";

const activeProfessionalSubscriptionsAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

const hasVerifiedEntitlementAt = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const entitlements = activeProfessionalSubscriptionsAt(profile, date);
  if (entitlements.length === 0) return false;

  if (profile.crp_status === "aprovado") return true;
  if (profile.cfp_verified_at && profile.cfp_verified_at <= date) return true;

  return entitlements.some(
    (subscription) =>
      subscription.source === "admin_grant" &&
      (subscription.grant_started_at ?? subscription.createdAt) <= date,
  );
};

const pickCurrentPlan = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftPaid = Number(isProfessionalPlan(left));
    const rightPaid = Number(isProfessionalPlan(right));
    if (leftPaid !== rightPaid) return rightPaid - leftPaid;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const flattenSubscriptions = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.flatMap((profile) => profile.subscriptions);

const paidGatewayCanceledInRange = (
  subscriptions: AdminPsychologistSubscriptionRecord[],
  range: AdminPsychologistsDashboardDateRange,
) =>
  subscriptions.filter(
    (item) =>
      isPaidGatewaySubscription(item) &&
      item.status === STATUS_CANCELLED &&
      dateInRange(item.updatedAt, range),
  );

const paidGatewaySubscriptionInOpeningBaseAt = (
  subscription: AdminPsychologistSubscriptionRecord,
  date: Date,
) => {
  if (!isPaidGatewaySubscription(subscription)) return false;
  if (subscription.createdAt > date) return false;
  if (subscription.current_period_end && subscription.current_period_end <= date) return false;
  if (subscription.status === STATUS_ACTIVE) return true;

  return subscription.status === STATUS_CANCELLED && subscription.updatedAt > date;
};

/**
 * Churn V1 do Admin Psicólogos:
 * cancelamentos reais de assinaturas profissionais originadas no gateway Mercado Pago no período
 * divididos pela base paga ativa no início do período. Novas assinaturas iniciadas dentro do
 * período não entram no denominador. Cortesias/admin_grant e plano gratuito não entram no
 * numerador nem denominador.
 */
const calculateChurnPercent = (
  profiles: AdminPsychologistProfileRecord[],
  range: AdminPsychologistsDashboardDateRange,
) => {
  const subscriptions = flattenSubscriptions(profiles);
  const openingBase = subscriptions.filter((item) =>
    paidGatewaySubscriptionInOpeningBaseAt(item, range.start),
  );
  const denominator = openingBase.length;
  const canceled = paidGatewayCanceledInRange(subscriptions, range).length;

  if (denominator === 0) {
    return {
      canceled,
      denominator,
      value: 0,
    };
  }

  return {
    canceled,
    denominator,
    value: roundPercent((canceled / denominator) * 100),
  };
};

const countByDate = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

const getDateCount = (counts: Map<string, number>, label: string) => counts.get(label) ?? 0;

const buildTimeline = (params: {
  labels: string[];
  profiles: AdminPsychologistProfileRecord[];
}): AdminPsychologistsDashboardDailyPoint[] => {
  const newSignupsByDate = countByDate(
    params.profiles.map((profile) => ({ createdAt: profile.user.createdAt })),
    params.labels,
  );

  return params.labels.map((date) => {
    const dayStart = parseDateOnly(date, "start") ?? startOfDate(new Date(date));
    const dayEnd = parseDateOnly(date, "end") ?? endOfDate(new Date(date));
    const profilesCreatedUntilDay = params.profiles.filter((profile) =>
      profileCreatedUntil(profile, dayEnd),
    );

    return {
      churn: calculateChurnPercent(params.profiles, { end: dayEnd, start: dayStart }).value,
      courtesy_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveCourtesyAt(profile, dayEnd),
      ).length,
      date,
      free_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasCurrentFreePlanAt(profile, dayEnd),
      ).length,
      new_signups: getDateCount(newSignupsByDate, date),
      subscriber_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveSubscriberAt(profile, dayEnd),
      ).length,
      total_psychologists: profilesCreatedUntilDay.length,
    };
  });
};

const addMapCount = (
  map: Map<string, { count: number; label: string }>,
  id: string,
  label: string,
) => {
  const current = map.get(id);
  map.set(id, {
    count: (current?.count ?? 0) + 1,
    label: current?.label ?? label,
  });
};

const buildBreakdown = (
  map: Map<string, { count: number; label: string }>,
  total: number,
  limit?: number,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const items = [...map.entries()]
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

  return typeof limit === "number" ? items.slice(0, limit) : items;
};

const booleanBreakdown = (params: {
  falseLabel?: string;
  source: string;
  total: number;
  trueCount: number;
  trueLabel?: string;
}): AdminPsychologistsDashboardBooleanBreakdown => ({
  false_count: Math.max(0, params.total - params.trueCount),
  false_label: params.falseLabel ?? "Não",
  source: params.source,
  true_count: params.trueCount,
  true_label: params.trueLabel ?? "Sim",
  true_percentage: safePercentage(params.trueCount, params.total),
});

const jsonStringArray = (value: AdminPsychologistProfileRecord["target_audience"]) => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const buildStatistics = (profiles: AdminPsychologistProfileRecord[]) => {
  const services = new Map<string, { count: number; label: string }>();
  const specialties = new Map<string, { count: number; label: string }>();
  const approaches = new Map<string, { count: number; label: string }>();
  const targetAudience = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const modalities = new Map<string, { count: number; label: string }>();
  const gender = new Map<string, { count: number; label: string }>();
  const states = new Map<string, { count: number; label: string }>();

  for (const profile of profiles) {
    for (const relation of profile.user.psychologist_services) {
      addMapCount(services, relation.service.slug, relation.service.name);
    }

    for (const relation of profile.user.psychologist_specialties) {
      addMapCount(specialties, relation.specialty.slug, relation.specialty.name);
    }

    for (const relation of profile.user.psychologist_approaches) {
      addMapCount(approaches, relation.approach.slug, relation.approach.name);
    }

    for (const audience of jsonStringArray(profile.target_audience)) {
      addMapCount(targetAudience, normalizeKey(audience), audience);
    }

    for (const language of jsonStringArray(profile.languages)) {
      addMapCount(languages, normalizeKey(language), language);
    }

    if (profile.modality?.trim()) {
      const key = normalizeKey(profile.modality);
      addMapCount(modalities, key, MODALITY_LABELS[key] ?? profile.modality.trim());
    }

    if (profile.gender?.trim()) {
      const key = normalizeKey(profile.gender);
      addMapCount(gender, key, GENDER_LABELS[key] ?? profile.gender.trim());
    }

    if (profile.professional_address_state?.trim()) {
      const state = profile.professional_address_state.trim().toUpperCase();
      addMapCount(states, state, state);
    }
  }

  const total = profiles.length;
  const experienceOver10 = profiles.filter(
    (profile) => (crpExperienceYears(profile.crp_registration_date) ?? 0) >= 10,
  ).length;

  return {
    accepts_insurance: booleanBreakdown({
      source: "psychologist_profile.accepts_insurance",
      total,
      trueCount: profiles.filter((profile) => profile.accepts_insurance).length,
    }),
    approaches: {
      items: buildBreakdown(approaches, total),
      source: "psychologist_approach" as const,
      total,
    },
    discount_first_session: booleanBreakdown({
      source: "psychologist_profile.discount_first_session",
      total,
      trueCount: profiles.filter((profile) => profile.discount_first_session).length,
    }),
    experience_over_10_years: booleanBreakdown({
      source: "psychologist_profile.crp_registration_date",
      total,
      trueCount: experienceOver10,
    }),
    gender: {
      items: buildBreakdown(gender, total, 4),
      source: "psychologist_profile.gender" as const,
      total,
    },
    languages: {
      items: buildBreakdown(languages, total),
      source: "psychologist_profile.languages" as const,
      total,
    },
    modalities: {
      items: buildBreakdown(modalities, total, 4),
      source: "psychologist_profile.modality" as const,
      total,
    },
    services: {
      items: buildBreakdown(services, total),
      source: "psychologist_service" as const,
      total,
    },
    specialties: {
      items: buildBreakdown(specialties, total),
      source: "psychologist_specialty" as const,
      total,
    },
    social_value: booleanBreakdown({
      source: "psychologist_profile.social_value",
      total,
      trueCount: profiles.filter((profile) => profile.social_value).length,
    }),
    states: {
      items: buildBreakdown(states, total, 6),
      source: "psychologist_profile.professional_address_state" as const,
      total,
    },
    target_audience: {
      items: buildBreakdown(targetAudience, total),
      source: "psychologist_profile.target_audience" as const,
      total,
    },
  };
};

const buildSignupMethod = (profiles: AdminPsychologistProfileRecord[]) => {
  const counts = {
    email_password: 0,
    google: 0,
    unknown: 0,
  };

  for (const profile of profiles) {
    counts[signupMethodFromProvider(profile.user.provider)] += 1;
  }

  const total = profiles.length;

  return {
    items: (["google", "email_password"] as const).map((id) => ({
      count: counts[id],
      id,
      label: signupMethodLabel(id),
      percentage: safePercentage(counts[id], total),
    })),
    source: "user.provider" as const,
    total,
    unknown_count: counts.unknown,
  };
};

const buildConversionBySignupMethod = (profiles: AdminPsychologistProfileRecord[]) =>
  (["google", "email_password"] as const).map((id) => {
    const methodProfiles = profiles.filter(
      (profile) => signupMethodFromProvider(profile.user.provider) === id,
    );
    const convertedDays = methodProfiles.flatMap((profile) => {
      const firstPaid = firstPaidProfessionalSubscription(profile.subscriptions);
      if (!firstPaid) return [];

      return [
        Math.max(
          0,
          Math.floor(
            (startOfDate(firstPaid.createdAt).getTime() -
              startOfDate(profile.user.createdAt).getTime()) /
              MS_PER_DAY,
          ),
        ),
      ];
    });
    const conversion = summarizeConversionCohort(methodProfiles);
    const sampleSufficient = methodProfiles.length >= 3 && convertedDays.length > 0;

    return {
      average_days: sampleSufficient ? conversion.average_days : null,
      conversion_rate:
        methodProfiles.length > 0
          ? roundOneDecimal((convertedDays.length / methodProfiles.length) * 100)
          : null,
      converted_paid_count: convertedDays.length,
      id,
      label: signupMethodLabel(id),
      median_days: sampleSufficient ? conversion.median_days : null,
      registered_count: methodProfiles.length,
      sample_sufficient: sampleSufficient,
      unavailable_reason: sampleSufficient
        ? null
        : methodProfiles.length === 0
          ? "Sem psicólogos cadastrados por esta via na coorte."
          : "Amostra insuficiente para comparar prazo por modo de cadastro.",
    };
  });

const mapPsychologistStatus = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
): AdminPsychologistsDashboardPsychologist["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verificado";
  if (!profile.published) return "nao_publicado";
  if (hasActiveFreeAt(profile, date)) return "gratuito";

  return "pendente";
};

const buildPsychologistsList = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardPsychologist[] =>
  profiles.slice(0, 5).map((profile) => {
    const plan = pickCurrentPlan(profile, date);

    return {
      avatar: profile.user.avatar,
      city: profile.professional_address_city,
      created_at: profile.user.createdAt,
      crp: profile.crp,
      email: profile.user.email,
      id: profile.user.id,
      name: normalizeName(profile.user.name),
      plan_name: plan?.plan.name ?? null,
      plan_slug: plan?.plan.slug ?? null,
      published: profile.published,
      state: profile.professional_address_state,
      status: mapPsychologistStatus(profile, date),
      verified: hasVerifiedEntitlementAt(profile, date),
    };
  });

const roundRankingScore = (value: number) => Math.round(value * 1000) / 10;

const getAllPeriodStartDate = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.reduce<Date | undefined>((earliest, profile) => {
    const createdAt = profile.user.createdAt;
    if (!earliest || createdAt < earliest) return createdAt;

    return earliest;
  }, undefined);

export const buildPsychologistsDashboard = async (
  query: AdminPsychologistsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPsychologistsDashboardRepository();
  const [profiles, directoryFilters] = await Promise.all([
    repository.listPsychologistProfiles(),
    repository.listDirectoryFilters(),
  ]);
  const resolvedPeriod = resolvePeriod(query ?? {}, getAllPeriodStartDate(profiles));
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;

  const psychologistUserIds = profiles.map((profile) => profile.user.id);
  const [rankingCandidates, platformPageViews, publicProfilePageViews] = await Promise.all([
    repository.listPublicRankingCandidates(),
    repository.listPlatformPageViews(current),
    repository.listPublicProfilePageViews(current, psychologistUserIds),
  ]);

  const currentProfiles = profiles.filter((profile) => profileCreatedUntil(profile, current.end));
  const previousProfiles = profiles.filter((profile) => profileCreatedUntil(profile, previous.end));
  const currentNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, current),
  );
  const previousNewSignups = profiles.filter((profile) =>
    dateInRange(profile.user.createdAt, previous),
  );
  const currentFree = currentProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, current.end),
  );
  const previousFree = previousProfiles.filter((profile) =>
    hasCurrentFreePlanAt(profile, previous.end),
  );
  const currentSubscribers = currentProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, current.end),
  );
  const previousSubscribers = previousProfiles.filter((profile) =>
    hasActiveSubscriberAt(profile, previous.end),
  );
  const currentCourtesy = currentProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, current.end),
  );
  const previousCourtesy = previousProfiles.filter((profile) =>
    hasActiveCourtesyAt(profile, previous.end),
  );
  const currentChurn = calculateChurnPercent(profiles, current);
  const previousChurn = calculateChurnPercent(profiles, previous);
  const rankedPsychologists = await rankPsychologistCandidates(rankingCandidates, null);
  const conversion = summarizeConversionCohort(currentNewSignups);
  const platformUsage = summarizePlatformUsage({
    eligiblePsychologistsCount: currentProfiles.length,
    labels,
    pageViews: platformPageViews,
  });
  const trafficSources = summarizePsychologistTrafficOrigins(publicProfilePageViews);

  const summary: AdminPsychologistsDashboardSummary = {
    cards: {
      churn: metric({
        current: currentChurn.value,
        description:
          "Cancelamentos de assinaturas profissionais Mercado Pago no período ÷ base paga ativa no início do período. Novas assinaturas do período não entram no denominador; cortesias e plano gratuito não entram.",
        id: "churn",
        label: "Churn",
        previous: previousChurn.value,
        previousValueCount: previousChurn.canceled,
        source: "professional_subscription.source=mercadopago/status=cancelada",
        unit: "percentage",
        unavailable: currentChurn.denominator === 0,
        valueCount: currentChurn.canceled,
        ...(currentChurn.denominator === 0
          ? {
              unavailableReason:
                "Não há base paga Mercado Pago ativa no início do período para calcular churn.",
            }
          : {}),
      }),
      courtesy_psychologists: metric({
        current: currentCourtesy.length,
        description:
          "Psicólogos com cortesia administrativa profissional ativa no fim do período selecionado.",
        id: "courtesy_psychologists",
        label: "Psicólogos cortesia",
        previous: previousCourtesy.length,
        source: "professional_subscription.source=admin_grant/status=ativa",
      }),
      free_psychologists: metric({
        current: currentFree.length,
        description:
          "Psicólogos cujo segmento ativo no fim do período é o plano gratuito; assinantes pagos e cortesias são contados separadamente.",
        id: "free_psychologists",
        label: "Psicólogos gratuitos",
        previous: previousFree.length,
        source: "professional_subscription.plan.slug=gratuito/status=ativa",
      }),
      new_signups: metric({
        current: currentNewSignups.length,
        description: "Novos usuários com role psicologo criados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewSignups.length,
        source: "user.createdAt/role=psicologo",
      }),
      subscriber_psychologists: metric({
        current: currentSubscribers.length,
        description:
          "Psicólogos com assinatura profissional paga Mercado Pago ativa no fim do período selecionado.",
        id: "subscriber_psychologists",
        label: "Psicólogos assinantes",
        previous: previousSubscribers.length,
        source: "professional_subscription.source=mercadopago/status=ativa",
      }),
      total_psychologists: metric({
        current: currentProfiles.length,
        description:
          "Usuários ativos com role psicologo e perfil profissional não deletado existentes até o fim do período.",
        id: "total_psychologists",
        label: "Total de psicólogos",
        previous: previousProfiles.length,
        source: "user.role=psicologo+psychologist_profile",
      }),
    },
    conversion: {
      ...conversion,
      cohort_from: period.from,
      cohort_to: period.to,
      source: "user.createdAt+professional_subscription+subscription_plan",
    },
    conversion_by_signup_method: buildConversionBySignupMethod(currentNewSignups),
    filters_searches: {
      available: false,
      description:
        "A plataforma ainda não persiste eventos de busca e filtros do diretório de psicólogos com dimensão de filtro pesquisado.",
      source: "not_tracked",
    },
    directory_filters: directoryFilters,
    period,
    platform_usage: {
      ...platformUsage,
      eligible_psychologists_count: currentProfiles.length,
      source: "page_view_event",
    },
    psychologists: {
      items: buildPsychologistsList(profiles, current.end),
      source: "user+psychologist_profile+professional_subscription",
      total: profiles.length,
    },
    ranking: {
      formula: "public_directory_psychologist_ranking",
      items: rankedPsychologists.slice(0, 5).map(({ item, ranking }, index) => ({
        avatar: item.user.avatar,
        base_score: roundRankingScore(ranking.baseScore),
        crp: item.crp,
        id: item.user.id,
        name: normalizeName(item.user.name),
        position: index + 1,
        public_profile_url: `/psychologists/${item.user.id}`,
        score: roundRankingScore(ranking.score),
        verified: ranking.isVerified,
      })),
      source: "shared_psychologist_public_ranking_helper",
      total: rankedPsychologists.length,
    },
    signup_method: buildSignupMethod(currentNewSignups),
    statistics: buildStatistics(profiles),
    timeline: {
      points: buildTimeline({
        labels,
        profiles,
      }),
      source: "user+professional_subscription",
    },
    traffic_sources: {
      ...trafficSources,
      source: "page_view_event.traffic_source+target_type=psychologist",
    },
    unavailable: [
      {
        description:
          "Sem tracking persistido por filtro/termo de busca no diretório público. A seção aparece indisponível em vez de usar dados inventados.",
        id: "filters_searches",
        label: "Filtros mais buscados",
        source: "not_tracked",
      },
      ...(trafficSources.unavailable_reason
        ? [
            {
              description:
                "Origem do tráfego agregada depende de page_view_event do perfil público dos psicólogos no período selecionado.",
              id: "traffic_sources",
              label: "Origem do tráfego",
              source: "page_view_event",
            },
          ]
        : []),
      ...(currentChurn.denominator === 0
        ? [
            {
              description:
                "Churn exige assinaturas profissionais Mercado Pago ativas no início do período; não há base para o período atual.",
              id: "churn_denominator_zero",
              label: "Churn de assinaturas",
              source: "professional_subscription",
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "Uso da plataforma por psicólogos depende de page_view_event autenticado no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
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

export default async (data: IAdminPsychologistsDashboardDTO): Promise<Resolve> => {
  return buildPsychologistsDashboard(data.q ?? {});
};
