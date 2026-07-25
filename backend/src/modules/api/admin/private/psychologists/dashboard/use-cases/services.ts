import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
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
  AdminPsychologistsDashboardDeviceType,
  AdminPsychologistsDashboardDirectoryFilterItem,
  AdminPsychologistsDashboardDirectoryFilters,
  AdminPsychologistsDashboardFilterSearchDimension,
  AdminPsychologistsDashboardFilterSearches,
  AdminPsychologistsDashboardMetric,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPlanSegment,
  AdminPsychologistsDashboardPlanSegmentSummary,
  AdminPsychologistsDashboardPsychologist,
  AdminPsychologistsDashboardQuery,
  AdminPsychologistsDashboardSummary,
  IAdminPsychologistsDashboardDTO,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import { AdminPsychologistsDashboardRepository } from "../repositories/AdminPsychologistsDashboardRepository";
import type {
  AdminPsychologistDirectoryFilterSearchRecord,
  AdminPsychologistPlatformPageViewRecord,
  AdminPsychologistPlatformPwaInstallRecord,
  AdminPsychologistPlatformSessionRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistPublicProfilePageViewRecord,
  AdminPsychologistSubscriptionRecord,
} from "../repositories/interfaces/IAdminPsychologistsDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
const COURTESY_SUBSCRIPTION_SOURCE = "admin_grant";

const STATUS_ACTIVE = "ativa";
const STATUS_CANCELLED = "cancelada";
const FREE_PLAN_SLUG = "gratuito";
const DIRECTORY_FILTER_SEARCH_ACTION_SOURCE =
  "important_action_event.action_type=psychologist_directory_filter_search";
const CITY_FILTER_MINIMUM_SEARCHES = 10;

const PLAN_SEGMENT_OPTIONS: Array<{
  id: AdminPsychologistsDashboardPlanSegment;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "free", label: "Gratuitos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "courtesy", label: "Cortesia" },
];

const DEVICE_LABELS: Record<AdminPsychologistsDashboardDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
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
  nao_binario: "Não binário",
  não_binário: "Não binário",
  outro: "Outro",
  other: "Outro",
};

const RACE_COLOR_LABELS: Record<string, string> = {
  amarela: "Amarela",
  amarelo: "Amarela",
  branca: "Branca",
  branco: "Branca",
  indigena: "Indígena",
  indígena: "Indígena",
  parda: "Parda",
  pardo: "Parda",
  preta: "Preta",
  preto: "Preta",
};

const RELIGION_LABELS: Record<string, string> = {
  ateu_agnostico: "Ateu/Agnóstico",
  budista: "Budista",
  catolica: "Católica",
  católico: "Católica",
  catolico: "Católica",
  evangelica: "Evangélica",
  evangelico: "Evangélica",
  espírita: "Espírita",
  espirita: "Espírita",
  islamica: "Islâmica",
  islamico: "Islâmica",
  judaica: "Judaica",
  judaico: "Judaica",
  outra: "Outra",
  outro: "Outra",
  sem_religiao: "Sem religião",
  umbanda_candomble: "Umbanda/Candomblé",
};

const FILTER_SEARCH_TARGET_TYPES = {
  approaches: ["psychologist_filter_approach"],
  cities: ["psychologist_filter_city"],
  features: ["psychologist_filter_feature"],
  genders: ["psychologist_filter_gender"],
  languages: ["psychologist_filter_language"],
  modalities: ["psychologist_filter_modality"],
  race_colors: ["psychologist_filter_race_color"],
  religions: ["psychologist_filter_religion"],
  services: ["psychologist_filter_service"],
  specialties: ["psychologist_filter_specialty"],
  states: ["psychologist_filter_state"],
  target_audiences: ["psychologist_filter_target_audience"],
} satisfies Record<string, string[]>;

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

const normalizeDeviceType = (value: string): AdminPsychologistsDashboardDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDeviceUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts: Record<AdminPsychologistsDashboardDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const activePsychologistsByDevice = new Map<AdminPsychologistsDashboardDeviceType, Set<string>>(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Set<string>(),
    ]),
  );
  const operatingSystemCountsByDevice = new Map<
    AdminPsychologistsDashboardDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );
  const activePsychologistsByDeviceAndOperatingSystem = new Map<
    AdminPsychologistsDashboardDeviceType,
    Map<AdminOperatingSystemType, Set<string>>
  >(
    (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[]).map((deviceType) => [
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
    if (session.user_id) activePsychologistsByDevice.get(deviceType)?.add(session.user_id);
    const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
    if (session.user_id) {
      activePsychologistsByDeviceAndOperatingSystem
        .get(deviceType)
        ?.get(operatingSystem)
        ?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePsychologists = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: (Object.keys(counts) as AdminPsychologistsDashboardDeviceType[])
      .map((deviceType) => {
        const deviceTotal = counts[deviceType];
        const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
        const activePsychologistsByOperatingSystem =
          activePsychologistsByDeviceAndOperatingSystem.get(deviceType);

        return {
          active_psychologists_count: activePsychologistsByDevice.get(deviceType)?.size ?? 0,
          count: deviceTotal,
          device_type: deviceType,
          id: deviceType,
          label: DEVICE_LABELS[deviceType],
          operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
            active_psychologists_count:
              activePsychologistsByOperatingSystem?.get(operatingSystem)?.size ?? 0,
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
    source: "visitor_session.device_type+visitor_session.os+user.role=psicologo" as const,
    total_active_psychologists: totalActivePsychologists,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de psicólogos com dispositivo identificado no período selecionado."
        : null,
  };
};

const buildOperatingSystemUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts = Object.fromEntries(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
  ) as Record<AdminOperatingSystemType, number>;
  const activePsychologistsByOperatingSystem = new Map<AdminOperatingSystemType, Set<string>>(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[operatingSystem] += 1;
    if (session.user_id) {
      activePsychologistsByOperatingSystem.get(operatingSystem)?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePsychologists = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
      active_psychologists_count:
        activePsychologistsByOperatingSystem.get(operatingSystem)?.size ?? 0,
      count: counts[operatingSystem],
      id: operatingSystem,
      label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
      operating_system: operatingSystem,
      percentage: safePercentage(counts[operatingSystem], totalSessions),
    })).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.os+visitor_session.device_type+user.role=psicologo" as const,
    total_active_psychologists: totalActivePsychologists,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de psicólogos com sistema operacional no período selecionado."
        : null,
  };
};

const normalizeStateCode = (value: string | null | undefined) => {
  const state = value?.trim().toUpperCase();

  return state && /^[A-Z]{2}$/.test(state) ? state : null;
};

const buildCityStateLabel = (city: string, state: string | null) =>
  state ? `${city}/${state}` : city;

const buildCityStateId = (city: string, state: string | null) =>
  normalizeKey(state ? `${city}_${state}` : city);

const parseCityFilterTarget = (value: string) => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const slashIndex = trimmed.lastIndexOf("/");

  if (slashIndex > 0) {
    const city = trimmed.slice(0, slashIndex).trim();
    const state = normalizeStateCode(trimmed.slice(slashIndex + 1));

    if (city && state) {
      return {
        city,
        id: buildCityStateId(city, state),
        label: buildCityStateLabel(city, state),
        state,
      };
    }
  }

  return {
    city: trimmed,
    id: buildCityStateId(trimmed, null),
    label: trimmed,
    state: null,
  };
};

const humanizeFilterValue = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) ||
  value;

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = normalizeKey(weekday);

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";

  return "domingo";
};

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

const profileMatchesPlanSegment = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) => {
  if (segment === "all") return true;
  if (segment === "free") return getPlanSegmentAt(profile, date) === "free";
  if (segment === "courtesy") return getPlanSegmentAt(profile, date) === "courtesy";

  return getPlanSegmentAt(profile, date) === "subscriber";
};

const filterProfilesByPlanSegment = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) =>
  segment === "all"
    ? profiles
    : profiles.filter((profile) => profileMatchesPlanSegment(profile, date, segment));

const filterRecordsByUserPlanSegment = <T extends { user_id: string | null }>(
  records: T[],
  allowedUserIds: Set<string>,
) => records.filter((record) => record.user_id && allowedUserIds.has(record.user_id));

const filterPublicProfileViewsByPlanSegment = <
  T extends {
    target_id: string | null;
  },
>(
  records: T[],
  allowedPsychologistIds: Set<string>,
) => records.filter((record) => record.target_id && allowedPsychologistIds.has(record.target_id));

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

const buildOptionLookup = (options: AdminPsychologistsDashboardDirectoryFilterItem[] = []) => {
  const lookup = new Map<string, AdminPsychologistsDashboardDirectoryFilterItem>();

  for (const option of options) {
    for (const value of [option.id, option.slug, option.label]) {
      const key = normalizeKey(value);
      if (key) lookup.set(key, option);
    }
  }

  return lookup;
};

const buildFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  minimumCount?: number;
  options?: AdminPsychologistsDashboardDirectoryFilterItem[];
  targetTypes: string[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const optionLookup = buildOptionLookup(params.options);
  const itemsById = new Map<string, { count: number; label: string }>();
  const targetTypes = new Set(params.targetTypes);

  for (const option of params.options ?? []) {
    const id = option.slug || option.id;
    if (!id) continue;

    itemsById.set(id, {
      count: 0,
      label: option.label,
    });
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const normalizedTarget = normalizeKey(targetId);
    if (!normalizedTarget) continue;

    const option = optionLookup.get(normalizedTarget);
    if (params.options && !option) continue;

    const id = option?.slug || option?.id || normalizedTarget;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      label: current?.label ?? option?.label ?? humanizeFilterValue(targetId),
    });
  }

  const allItems = buildBreakdown(
    itemsById,
    [...itemsById.values()].reduce((sum, item) => sum + item.count, 0),
  );
  const minimumCount = params.minimumCount;
  const visibleItems =
    typeof minimumCount === "number"
      ? allItems.filter((item) => item.count >= minimumCount)
      : allItems;
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

const buildCityFilterSearchDimension = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  supplyItems: AdminPsychologistsDashboardBreakdownItem[];
}): AdminPsychologistsDashboardFilterSearchDimension => {
  const itemsById = new Map<string, { count: number; hasSupply: boolean; label: string }>();
  const supplyItemsByCity = new Map<string, AdminPsychologistsDashboardBreakdownItem[]>();
  const targetTypes = new Set(FILTER_SEARCH_TARGET_TYPES.cities);

  for (const item of params.supplyItems) {
    itemsById.set(item.id, {
      count: 0,
      hasSupply: item.count > 0,
      label: item.label,
    });

    const city = item.label.split("/")[0]?.trim();
    const cityKey = city ? normalizeKey(city) : "";
    if (!cityKey) continue;

    supplyItemsByCity.set(cityKey, [...(supplyItemsByCity.get(cityKey) ?? []), item]);
  }

  for (const action of params.actions) {
    if (!action.target_type || !targetTypes.has(action.target_type)) continue;

    const targetId = action.target_id?.trim();
    if (!targetId) continue;

    const parsed = parseCityFilterTarget(targetId);
    if (!parsed.city) continue;

    const sameCitySupplyItems = supplyItemsByCity.get(normalizeKey(parsed.city)) ?? [];
    const matchedSupplyItem = parsed.state
      ? sameCitySupplyItems.find((item) => item.id === parsed.id)
      : sameCitySupplyItems.length === 1
        ? sameCitySupplyItems[0]
        : null;
    const id = matchedSupplyItem?.id ?? parsed.id;
    const current = itemsById.get(id);

    itemsById.set(id, {
      count: (current?.count ?? 0) + 1,
      hasSupply: current?.hasSupply ?? Boolean(matchedSupplyItem?.count),
      label: current?.label ?? matchedSupplyItem?.label ?? parsed.label,
    });
  }

  const visibleItems = [...itemsById.entries()]
    .filter(([, item]) => item.hasSupply || item.count >= CITY_FILTER_MINIMUM_SEARCHES)
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: 0,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });
  const total = visibleItems.reduce((sum, item) => sum + item.count, 0);

  return {
    items: visibleItems.map((item) => ({
      ...item,
      percentage: safePercentage(item.count, total),
    })),
    source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
    total,
  };
};

const buildFilterSearches = (params: {
  actions: AdminPsychologistDirectoryFilterSearchRecord[];
  citySupplyItems: AdminPsychologistsDashboardBreakdownItem[];
  directoryFilters: AdminPsychologistsDashboardDirectoryFilters;
}): AdminPsychologistsDashboardFilterSearches => ({
  available: true,
  description:
    "Buscas reais por filtros aplicados no diretório público de psicólogos, capturadas por evento first-party sem texto livre.",
  dimensions: {
    approaches: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.approaches,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.approaches,
    }),
    cities: buildCityFilterSearchDimension({
      actions: params.actions,
      supplyItems: params.citySupplyItems,
    }),
    features: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.features,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.features,
    }),
    genders: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.genders,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.genders,
    }),
    languages: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.languages,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.languages,
    }),
    modalities: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.modalities,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.modalities,
    }),
    race_colors: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.race_colors,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.race_colors,
    }),
    religions: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.religions,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.religions,
    }),
    services: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.services,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.services,
    }),
    specialties: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.specialties,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.specialties,
    }),
    states: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.states,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.states,
    }),
    target_audiences: buildFilterSearchDimension({
      actions: params.actions,
      options: params.directoryFilters.target_audiences,
      targetTypes: FILTER_SEARCH_TARGET_TYPES.target_audiences,
    }),
  },
  minimum_city_searches: CITY_FILTER_MINIMUM_SEARCHES,
  source: DIRECTORY_FILTER_SEARCH_ACTION_SOURCE,
});

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

const profileMatchesPatientModality = (
  profile: AdminPsychologistProfileRecord,
  modality: "online" | "presencial",
) => {
  const key = normalizeKey(profile.modality ?? "");

  if (modality === "online") return key === "online" || key === "hibrido" || key === "hybrid";

  return key === "presencial" || key === "hibrido" || key === "hybrid";
};

const buildPatientModalityBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;

  return [
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "online")).length,
      id: "online",
      label: "Online",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profileMatchesPatientModality(profile, "presencial"))
        .length,
      id: "presencial",
      label: "Presencial",
      percentage: 0,
    },
  ].map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

const isAvailableToday = (profile: AdminPsychologistProfileRecord) =>
  jsonStringArray(profile.available_days).includes(currentWeekdayValue());

const isMoreExperienced = (profile: AdminPsychologistProfileRecord) =>
  profile.show_experience_tag && (crpExperienceYears(profile.crp_registration_date) ?? 0) >= 10;

const buildFeatureBreakdown = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const total = profiles.length;
  const items: AdminPsychologistsDashboardBreakdownItem[] = [
    {
      count: profiles.filter(isAvailableToday).length,
      id: "available_today",
      label: "Disponível hoje",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => hasVerifiedEntitlementAt(profile, date)).length,
      id: "verified",
      label: "Somente verificados",
      percentage: 0,
    },
    {
      count: profiles.filter(isMoreExperienced).length,
      id: "more_experienced",
      label: "Mais experientes",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.discount_first_session).length,
      id: "discount_first_session",
      label: "Desconto na 1ª sessão",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.accepts_insurance).length,
      id: "accepts_insurance",
      label: "Aceita convênios",
      percentage: 0,
    },
    {
      count: profiles.filter((profile) => profile.social_value).length,
      id: "social_value",
      label: "Valor social",
      percentage: 0,
    },
  ];

  return items.map((item) => ({
    ...item,
    percentage: safePercentage(item.count, total),
  }));
};

const buildStatistics = (profiles: AdminPsychologistProfileRecord[], date: Date) => {
  const services = new Map<string, { count: number; label: string }>();
  const cities = new Map<string, { count: number; label: string }>();
  const specialties = new Map<string, { count: number; label: string }>();
  const approaches = new Map<string, { count: number; label: string }>();
  const targetAudience = new Map<string, { count: number; label: string }>();
  const languages = new Map<string, { count: number; label: string }>();
  const gender = new Map<string, { count: number; label: string }>();
  const raceColors = new Map<string, { count: number; label: string }>();
  const religions = new Map<string, { count: number; label: string }>();
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

    if (profile.gender?.trim()) {
      const key = normalizeKey(profile.gender);
      addMapCount(gender, key, GENDER_LABELS[key] ?? profile.gender.trim());
    }

    if (profile.race_color?.trim()) {
      const key = normalizeKey(profile.race_color);
      addMapCount(raceColors, key, RACE_COLOR_LABELS[key] ?? profile.race_color.trim());
    }

    if (profile.religion?.trim()) {
      const key = normalizeKey(profile.religion);
      addMapCount(religions, key, RELIGION_LABELS[key] ?? profile.religion.trim());
    }

    if (profile.professional_address_state?.trim()) {
      const state = profile.professional_address_state.trim().toUpperCase();
      addMapCount(states, state, state);
    }

    if (profile.professional_address_city?.trim()) {
      const city = profile.professional_address_city.trim();
      const state = normalizeStateCode(profile.professional_address_state);
      addMapCount(cities, buildCityStateId(city, state), buildCityStateLabel(city, state));
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
      items: buildBreakdown(gender, total),
      source: "psychologist_profile.gender" as const,
      total,
    },
    cities: {
      items: buildBreakdown(cities, total),
      source: "psychologist_profile.professional_address_city+professional_address_state" as const,
      total,
    },
    features: {
      items: buildFeatureBreakdown(profiles, date),
      source: "psychologist_profile+professional_subscription" as const,
      total,
    },
    languages: {
      items: buildBreakdown(languages, total),
      source: "psychologist_profile.languages" as const,
      total,
    },
    modalities: {
      items: buildPatientModalityBreakdown(profiles),
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
    race_colors: {
      items: buildBreakdown(raceColors, total),
      source: "psychologist_profile.race_color" as const,
      total,
    },
    religions: {
      items: buildBreakdown(religions, total),
      source: "psychologist_profile.religion" as const,
      total,
    },
    social_value: booleanBreakdown({
      source: "psychologist_profile.social_value",
      total,
      trueCount: profiles.filter((profile) => profile.social_value).length,
    }),
    states: {
      items: buildBreakdown(states, total),
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

const buildPlanSegmentSummaries = (params: {
  currentNewSignups: AdminPsychologistProfileRecord[];
  currentProfiles: AdminPsychologistProfileRecord[];
  date: Date;
  labels: string[];
  platformPageViews: AdminPsychologistPlatformPageViewRecord[];
  platformPwaInstalls: AdminPsychologistPlatformPwaInstallRecord[];
  platformSessions: AdminPsychologistPlatformSessionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  publicProfilePageViews: AdminPsychologistPublicProfilePageViewRecord[];
}) =>
  PLAN_SEGMENT_OPTIONS.reduce(
    (accumulator, segment) => {
      const segmentProfiles = filterProfilesByPlanSegment(
        params.currentProfiles,
        params.date,
        segment.id,
      );
      const segmentProfilesForSupply = filterProfilesByPlanSegment(
        params.profiles,
        params.date,
        segment.id,
      );
      const segmentNewSignups = filterProfilesByPlanSegment(
        params.currentNewSignups,
        params.date,
        segment.id,
      );
      const segmentUserIds = new Set(segmentProfiles.map((profile) => profile.user.id));
      const segmentSupplyUserIds = new Set(
        segmentProfilesForSupply.map((profile) => profile.user.id),
      );
      const isAll = segment.id === "all";
      const platformPageViews = isAll
        ? params.platformPageViews
        : filterRecordsByUserPlanSegment(params.platformPageViews, segmentUserIds);
      const platformSessions = isAll
        ? params.platformSessions
        : filterRecordsByUserPlanSegment(params.platformSessions, segmentUserIds);
      const platformPwaInstalls = isAll
        ? params.platformPwaInstalls
        : filterRecordsByUserPlanSegment(params.platformPwaInstalls, segmentUserIds);
      const publicProfilePageViews = isAll
        ? params.publicProfilePageViews
        : filterPublicProfileViewsByPlanSegment(
            params.publicProfilePageViews,
            segmentSupplyUserIds,
          );
      const platformUsage = summarizePlatformUsage({
        eligiblePsychologistsCount: segmentProfiles.length,
        labels: params.labels,
        pageViews: platformPageViews,
        pwaInstalledUserIds: platformPwaInstalls.flatMap((event) =>
          event.user_id ? [event.user_id] : [],
        ),
      });
      const trafficSources = summarizePsychologistTrafficOrigins(publicProfilePageViews);

      accumulator[segment.id] = {
        device_usage: buildDeviceUsage(platformSessions),
        id: segment.id,
        label: segment.label,
        platform_usage: {
          ...platformUsage,
          eligible_psychologists_count: segmentProfiles.length,
          source: "page_view_event+important_action_event" as const,
        },
        psychologists_count: segmentProfiles.length,
        signup_method: buildSignupMethod(segmentNewSignups),
        statistics: buildStatistics(segmentProfilesForSupply, params.date),
        traffic_sources: {
          ...trafficSources,
          source: "page_view_event.traffic_source+target_type=psychologist" as const,
        },
      };

      return accumulator;
    },
    {} as Record<
      AdminPsychologistsDashboardPlanSegment,
      AdminPsychologistsDashboardPlanSegmentSummary
    >,
  );

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
  const [
    directoryFilterSearchActions,
    rankingCandidates,
    platformPageViews,
    platformSessions,
    platformPwaInstalls,
    publicProfilePageViews,
  ] = await Promise.all([
    repository.listDirectoryFilterSearchActions(current),
    repository.listPublicRankingCandidates(),
    repository.listPlatformPageViews(current),
    repository.listPlatformSessions(current),
    repository.listPlatformPwaInstallActions(current),
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
  const planSegments = buildPlanSegmentSummaries({
    currentNewSignups,
    currentProfiles,
    date: current.end,
    labels,
    platformPageViews,
    platformPwaInstalls,
    platformSessions,
    profiles,
    publicProfilePageViews,
  });
  const platformUsage = planSegments.all.platform_usage;
  const deviceUsage = planSegments.all.device_usage;
  const operatingSystemUsage = buildOperatingSystemUsage(platformSessions);
  const trafficSources = planSegments.all.traffic_sources;
  const statistics = planSegments.all.statistics;

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
    device_usage: deviceUsage,
    filters_searches: buildFilterSearches({
      actions: directoryFilterSearchActions,
      citySupplyItems: statistics.cities.items,
      directoryFilters,
    }),
    directory_filters: directoryFilters,
    operating_system_usage: operatingSystemUsage,
    plan_segments: planSegments,
    period,
    platform_usage: platformUsage,
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
    signup_method: planSegments.all.signup_method,
    statistics,
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
      ...(deviceUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de devices dos psicólogos depende de visitor_session autenticada com user.role=psicologo no período selecionado.",
              id: "psychologist_device_usage",
              label: "Devices dos psicólogos",
              source: "visitor_session",
            },
          ]
        : []),
      ...(operatingSystemUsage.unavailable_reason
        ? [
            {
              description:
                "Distribuição de sistemas operacionais dos psicólogos depende de visitor_session autenticada com os normalizado no período selecionado.",
              id: "psychologist_operating_system_usage",
              label: "Sistema operacional dos psicólogos",
              source: "visitor_session",
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
