import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminTrafficBreakdownItem,
  AdminTrafficDateRange,
  AdminTrafficDeviceItem,
  AdminTrafficDeviceType,
  AdminTrafficEntryPage,
  AdminTrafficLocationItem,
  AdminTrafficMetric,
  AdminTrafficPeriod,
  AdminTrafficQuery,
  AdminTrafficRankingItem,
  AdminTrafficSummary,
  AdminTrafficTimelinePoint,
  AdminTrafficUserType,
  AdminTrafficUserTypeItem,
  IAdminTrafficSummaryDTO,
} from "../DTOs/IAdminTrafficSummaryDTO";
import { AdminTrafficRepository } from "../repositories/AdminTrafficRepository";
import type {
  IAdminTrafficRepository,
  TrafficActionRecord,
  TrafficLocationRecord,
  TrafficPageViewRecord,
  TrafficSessionRecord,
} from "../repositories/interfaces/IAdminTrafficRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 180;
const TOP_LIMIT = 10;

const DEVICE_LABELS: Record<AdminTrafficDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  pwa: "PWA instalado",
  tablet: "Tablet",
  unknown: "Não identificado",
};

const USER_TYPE_LABELS: Record<AdminTrafficUserType, string> = {
  anonymous: "Visitantes anônimos",
  patients: "Pacientes",
  psychologists: "Psicólogos",
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

type TrafficPeriodResolution = {
  current: AdminTrafficDateRange;
  days: number;
  period: AdminTrafficPeriod;
  previous: AdminTrafficDateRange;
};

type PeriodResult =
  | {
      period: TrafficPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

type TrafficStats = {
  actions: TrafficActionRecord[];
  contactRequests: number;
  locations: TrafficLocationRecord[];
  pageViews: TrafficPageViewRecord[];
  patientSignups: number;
  postReplies: number;
  priorVisitorIds: Set<string>;
  psychologistSignups: number;
  publishedCommunityPosts: number;
  sessions: TrafficSessionRecord[];
  subscriptionsStarted: number;
};

type NumericMetric = {
  unavailable: boolean;
  unavailableReason?: string;
  value: number;
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

  return Math.floor((end - start) / 86_400_000) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (query: AdminTrafficQuery): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  let start: Date;
  let end: Date;
  let label = "Últimos 30 dias";

  if (hasCustomFrom || hasCustomTo) {
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
      previous: { start: previousStart, end: previousEnd },
    },
  };
};

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return round((value / total) * 100);
};

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return round(((current - previous) / previous) * 100);
};

const metric = (params: {
  current: number;
  description: string;
  id: string;
  label: string;
  previous: number;
  source: string;
  unit?: AdminTrafficMetric["unit"];
  unavailable?: boolean;
  unavailableReason?: string;
}): AdminTrafficMetric => {
  const change = params.unavailable ? null : percentageChange(params.current, params.previous);

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

const sessionKey = (record: Pick<TrafficActionRecord, "session_id" | "visitor_id">) =>
  `${record.visitor_id}:${record.session_id}`;

const uniqueValues = <T>(items: T[]) => [...new Set(items)];

const getVisitorIds = (stats: Pick<TrafficStats, "actions" | "pageViews" | "sessions">) =>
  new Set([
    ...stats.sessions.map((session) => session.visitor_id),
    ...stats.pageViews.map((pageView) => pageView.visitor_id),
    ...stats.actions.map((action) => action.visitor_id),
  ]);

const loadStats = async (
  repository: IAdminTrafficRepository,
  range: AdminTrafficDateRange,
): Promise<TrafficStats> => {
  const [
    sessions,
    pageViews,
    actions,
    locations,
    patientSignups,
    psychologistSignups,
    publishedCommunityPosts,
    postReplies,
    contactRequests,
    subscriptionsStarted,
  ] = await Promise.all([
    repository.listSessions(range),
    repository.listPageViews(range),
    repository.listActions(range),
    repository.listLocations(range),
    repository.countUsersByRole("paciente", range),
    repository.countUsersByRole("psicologo", range),
    repository.countPublishedCommunityPosts(range),
    repository.countPostReplies(range),
    repository.countContactRequests(range),
    repository.countSubscriptionsStarted(range),
  ]);
  const visitorIds = [...getVisitorIds({ actions, pageViews, sessions })];
  const previousSessions = await repository.listVisitorSessionsBefore(visitorIds, range.start);

  return {
    actions,
    contactRequests,
    locations,
    pageViews,
    patientSignups,
    postReplies,
    priorVisitorIds: new Set(previousSessions.map((session) => session.visitor_id)),
    psychologistSignups,
    publishedCommunityPosts,
    sessions,
    subscriptionsStarted,
  };
};

const newVisitorIds = (stats: TrafficStats) =>
  [...getVisitorIds(stats)].filter((visitorId) => !stats.priorVisitorIds.has(visitorId));

const recurringVisitorIds = (stats: TrafficStats) =>
  [...getVisitorIds(stats)].filter((visitorId) => stats.priorVisitorIds.has(visitorId));

const pageViewSessions = (stats: TrafficStats) => {
  const sessions = new Map<string, TrafficPageViewRecord[]>();

  for (const pageView of stats.pageViews) {
    const key = sessionKey(pageView);
    sessions.set(key, [...(sessions.get(key) ?? []), pageView]);
  }

  return sessions;
};

const entryPageViews = (stats: TrafficStats) => {
  const bySession = pageViewSessions(stats);

  return [...bySession.values()].map((sessionViews) => {
    const sorted = [...sessionViews].sort(
      (left, right) => left.occurred_at.getTime() - right.occurred_at.getTime(),
    );
    return sorted.find((view) => view.is_entry) ?? sorted[0]!;
  });
};

const actionSessionKeys = (stats: TrafficStats) =>
  new Set(stats.actions.map((action) => sessionKey(action)));

const pagesPerSession = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats).size;
  if (sessionsWithPageview === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: round(stats.pageViews.length / sessionsWithPageview, 2),
  };
};

const bounceRate = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats);
  if (sessionsWithPageview.size === 0) {
    return {
      unavailable: true,
      unavailableReason: "Sem sessões com pageview no período.",
      value: 0,
    };
  }

  const sessionsWithAction = actionSessionKeys(stats);
  const bounces = [...sessionsWithPageview.entries()].filter(
    ([key, views]) => views.length === 1 && !sessionsWithAction.has(key),
  ).length;

  return { unavailable: false, value: safePercentage(bounces, sessionsWithPageview.size) };
};

const averageTime = (stats: TrafficStats): NumericMetric => {
  const durations = stats.pageViews
    .map((pageView) => pageView.duration_seconds)
    .filter((duration): duration is number => typeof duration === "number" && duration > 0);

  if (durations.length === 0) {
    return {
      unavailable: true,
      unavailableReason:
        "Ainda não há pageviews com duração registrada por heartbeat/beacon no período.",
      value: 0,
    };
  }

  return {
    unavailable: false,
    value: Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
  };
};

const returnVisitors = (stats: TrafficStats) => {
  const sessionCounts = new Map<string, Set<string>>();

  for (const session of stats.sessions) {
    const sessions = sessionCounts.get(session.visitor_id) ?? new Set<string>();
    sessions.add(session.session_id);
    sessionCounts.set(session.visitor_id, sessions);
  }

  return [...getVisitorIds(stats)].filter((visitorId) => {
    if (stats.priorVisitorIds.has(visitorId)) return true;

    return (sessionCounts.get(visitorId)?.size ?? 0) > 1;
  });
};

const returnRate = (stats: TrafficStats): NumericMetric => {
  const uniqueVisitors = getVisitorIds(stats).size;
  if (uniqueVisitors === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: safePercentage(returnVisitors(stats).length, uniqueVisitors),
  };
};

const importantActionRate = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats).size;
  if (sessionsWithPageview === 0) {
    return {
      unavailable: true,
      unavailableReason: "Sem sessões com pageview para calcular a taxa.",
      value: 0,
    };
  }

  return {
    unavailable: false,
    value: safePercentage(actionSessionKeys(stats).size, sessionsWithPageview),
  };
};

const registrationRate = (stats: TrafficStats): NumericMetric => {
  const uniqueVisitors = getVisitorIds(stats).size;
  if (uniqueVisitors === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: safePercentage(stats.patientSignups + stats.psychologistSignups, uniqueVisitors),
  };
};

const pwaInstalls = (stats: TrafficStats) =>
  stats.actions.filter((action) => action.action_type === "pwa_installed").length;

const loggedPsychologists = (stats: TrafficStats) =>
  new Set(
    stats.sessions
      .filter((session) => session.user?.role === "psicologo" && session.user_id)
      .map((session) => session.user_id),
  ).size;

const anonymousVisitors = (stats: TrafficStats) =>
  new Set(
    stats.sessions
      .filter((session) => !session.user_id || !session.user)
      .map((session) => session.visitor_id),
  ).size;

const buildOverviewCards = (current: TrafficStats, previous: TrafficStats) => {
  const currentPagesPerSession = pagesPerSession(current);
  const previousPagesPerSession = pagesPerSession(previous);
  const currentRegistrationRate = registrationRate(current);
  const previousRegistrationRate = registrationRate(previous);
  const currentBounceRate = bounceRate(current);
  const previousBounceRate = bounceRate(previous);

  return [
    metric({
      current: current.sessions.length,
      description: "Sessões reais capturadas em visitor_session no período.",
      id: "sessions",
      label: "Sessões",
      previous: previous.sessions.length,
      source: "visitor_session",
    }),
    metric({
      current: getVisitorIds(current).size,
      description: "Visitantes únicos por visitor_id considerando sessões e pageviews.",
      id: "unique_visitors",
      label: "Usuários únicos",
      previous: getVisitorIds(previous).size,
      source: "visitor_session+page_view_event",
    }),
    metric({
      current: newVisitorIds(current).length,
      description: "Visitantes sem sessão anterior ao início do período.",
      id: "new_visitors",
      label: "Novos visitantes",
      previous: newVisitorIds(previous).length,
      source: "visitor_session.first_seen_at",
    }),
    metric({
      current: recurringVisitorIds(current).length,
      description: "Visitantes com sessao anterior ao inicio do periodo.",
      id: "recurring_visitors",
      label: "Visitantes recorrentes",
      previous: recurringVisitorIds(previous).length,
      source: "visitor_session",
    }),
    metric({
      current: current.pageViews.length,
      description: "Visualizações reais registradas em page_view_event.",
      id: "pageviews",
      label: "Visualizações de página",
      previous: previous.pageViews.length,
      source: "page_view_event",
    }),
    metric({
      current: currentPagesPerSession.value,
      description: "Pageviews divididos por sessões com pelo menos uma pageview.",
      id: "pages_per_session",
      label: "Páginas por sessão",
      previous: previousPagesPerSession.value,
      source: "page_view_event.session_id",
      unit: "decimal",
    }),
    metric({
      current: loggedPsychologists(current),
      description: "Psicólogos autenticados com sessão real no período.",
      id: "logged_psychologists",
      label: "Psicólogos logados",
      previous: loggedPsychologists(previous),
      source: "visitor_session.user.role=psicologo",
    }),
    metric({
      current: anonymousVisitors(current),
      description: "Visitantes sem usuário vinculado em visitor_session.",
      id: "anonymous_visitors",
      label: "Visitantes anônimos",
      previous: anonymousVisitors(previous),
      source: "visitor_session.user_id",
    }),
    metric({
      current: currentRegistrationRate.value,
      description: "Novos cadastros divididos por visitantes únicos do período.",
      id: "registration_rate",
      label: "Taxa de cadastro",
      previous: previousRegistrationRate.value,
      source: "user.createdAt / visitor_id",
      unit: "percentage",
    }),
    metric({
      current: currentBounceRate.value,
      description:
        "Sessões com uma única pageview e nenhuma ação importante divididas por sessões com pageview.",
      id: "bounce_rate",
      label: "Taxa de rejeição",
      previous: previousBounceRate.value,
      source: "page_view_event+important_action_event",
      unavailable: currentBounceRate.unavailable,
      unavailableReason: currentBounceRate.unavailableReason,
      unit: "percentage",
    }),
    metric({
      current: pwaInstalls(current),
      description: "Instalações PWA registradas como ação importante.",
      id: "pwa_installs",
      label: "Instalações PWA",
      previous: pwaInstalls(previous),
      source: "important_action_event.action_type=pwa_installed",
    }),
  ];
};

const isInsideRange = (date: Date, range: AdminTrafficDateRange) =>
  date >= range.start && date <= range.end;

const setFirstObservedDate = (
  map: Map<string, Date>,
  visitorId: string,
  date: Date,
  range: AdminTrafficDateRange,
) => {
  if (!isInsideRange(date, range)) return;

  const current = map.get(visitorId);
  if (!current || date < current) map.set(visitorId, date);
};

const buildTimeline = (
  stats: TrafficStats,
  period: TrafficPeriodResolution,
): AdminTrafficTimelinePoint[] => {
  const labels = buildLabels(period.current.start, period.days);
  const firstObservedByVisitor = new Map<string, Date>();
  const newVisitors = new Set(newVisitorIds(stats));
  const recurringVisitors = new Set(recurringVisitorIds(stats));

  for (const session of stats.sessions) {
    setFirstObservedDate(
      firstObservedByVisitor,
      session.visitor_id,
      session.first_seen_at,
      period.current,
    );
  }

  for (const pageView of stats.pageViews) {
    setFirstObservedDate(
      firstObservedByVisitor,
      pageView.visitor_id,
      pageView.occurred_at,
      period.current,
    );
  }

  for (const action of stats.actions) {
    setFirstObservedDate(
      firstObservedByVisitor,
      action.visitor_id,
      action.occurred_at,
      period.current,
    );
  }

  return labels.map((date) => {
    const dayStart = parseDateOnly(date, "start") ?? startOfDate(new Date(date));
    const dayEnd = parseDateOnly(date, "end") ?? endOfDate(new Date(date));
    const visitorIds = new Set<string>();
    const sessions = stats.sessions.filter(
      (session) => session.first_seen_at <= dayEnd && session.last_seen_at >= dayStart,
    );

    for (const session of sessions) {
      visitorIds.add(session.visitor_id);
    }

    for (const pageView of stats.pageViews) {
      if (toDateKey(pageView.occurred_at) === date) visitorIds.add(pageView.visitor_id);
    }

    for (const action of stats.actions) {
      if (toDateKey(action.occurred_at) === date) visitorIds.add(action.visitor_id);
    }

    return {
      date,
      new_visitors: [...firstObservedByVisitor.entries()].filter(
        ([visitorId, firstObservedAt]) =>
          newVisitors.has(visitorId) && toDateKey(firstObservedAt) === date,
      ).length,
      recurring_visitors: [...visitorIds].filter((visitorId) => recurringVisitors.has(visitorId))
        .length,
      sessions: sessions.length,
      unique_visitors: visitorIds.size,
    };
  });
};

const labelFromSource = (source: string) => {
  const labels: Record<string, string> = {
    direct: "Direto",
    google: "Google Pesquisa",
    instagram: "Instagram",
    lectum_billing: "Lectum Billing",
    lectum_community: "Comunidades",
    lectum_internal: "Lectum interno",
    lectum_profile: "Perfis Lectum",
    whatsapp: "WhatsApp",
  };

  return labels[source] ?? source.replace(/_/g, " ");
};

const buildBreakdown = (items: Array<{ id: string; label: string }>, total: number) => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const current = counts.get(item.id) ?? { count: 0, label: item.label };
    counts.set(item.id, { ...current, count: current.count + 1 });
  }

  return [...counts.entries()]
    .map<AdminTrafficBreakdownItem>(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => right.count - left.count);
};

const buildTrafficSources = (stats: TrafficStats) => {
  const entries = entryPageViews(stats);
  const total = entries.length;
  const items = buildBreakdown(
    entries.map((entry) => ({
      id: entry.traffic_source || "direct",
      label: labelFromSource(entry.traffic_source || "direct"),
    })),
    total,
  ).slice(0, 8);

  return {
    items,
    source: "page_view_event.traffic_source" as const,
    total,
  };
};

const normalizeDeviceType = (
  session: TrafficSessionRecord,
  pwaSessionKeys: Set<string>,
): AdminTrafficDeviceType => {
  if (pwaSessionKeys.has(sessionKey(session))) return "pwa";

  const normalized = session.device_type.toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

const buildDevices = (stats: TrafficStats) => {
  const pwaSessionKeys = new Set(
    stats.pageViews
      .filter((pageView) =>
        ["fullscreen", "minimal-ui", "standalone"].includes(pageView.display_mode),
      )
      .map((pageView) => sessionKey(pageView)),
  );
  const counts: Record<AdminTrafficDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    pwa: 0,
    tablet: 0,
    unknown: 0,
  };

  for (const session of stats.sessions) {
    counts[normalizeDeviceType(session, pwaSessionKeys)] += 1;
  }

  const total = stats.sessions.length;
  const items = (Object.keys(counts) as AdminTrafficDeviceType[])
    .map<AdminTrafficDeviceItem>((deviceType) => ({
      count: counts[deviceType],
      device_type: deviceType,
      id: deviceType,
      label: DEVICE_LABELS[deviceType],
      percentage: safePercentage(counts[deviceType], total),
    }))
    .filter((item) => item.count > 0 || item.device_type !== "pwa")
    .sort((left, right) => right.count - left.count);

  return {
    items,
    source: "visitor_session.device_type+page_view_event.display_mode" as const,
    total,
  };
};

const buildUserTypes = (stats: TrafficStats) => {
  const counts: Record<AdminTrafficUserType, number> = {
    anonymous: 0,
    patients: 0,
    psychologists: 0,
  };

  for (const session of stats.sessions) {
    if (session.user?.role === "paciente") {
      counts.patients += 1;
      continue;
    }

    if (session.user?.role === "psicologo") {
      counts.psychologists += 1;
      continue;
    }

    counts.anonymous += 1;
  }

  const total = stats.sessions.length;
  const items = (Object.keys(counts) as AdminTrafficUserType[])
    .map<AdminTrafficUserTypeItem>((userType) => ({
      count: counts[userType],
      id: userType,
      label: USER_TYPE_LABELS[userType],
      percentage: safePercentage(counts[userType], total),
      user_type: userType,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    items,
    source: "visitor_session.user.role" as const,
    total,
  };
};

const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

const normalizeLocality = (value: string | null) => value?.trim() || "Não identificado";

const buildLocationItems = (
  locations: TrafficLocationRecord[],
  totalVisitors: number,
  getGroup: (location: TrafficLocationRecord) => { id: string; label: string },
) => {
  const groups = new Map<string, { label: string; visitorIds: Set<string> }>();

  for (const location of locations) {
    const group = getGroup(location);
    const current = groups.get(group.id) ?? {
      label: group.label,
      visitorIds: new Set<string>(),
    };
    current.visitorIds.add(location.visitor_id);
    groups.set(group.id, current);
  }

  return [...groups.entries()]
    .map<AdminTrafficLocationItem>(([id, group]) => ({
      count: group.visitorIds.size,
      id,
      label: group.label,
      percentage: safePercentage(group.visitorIds.size, totalVisitors),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, TOP_LIMIT);
};

const buildLocations = (stats: TrafficStats) => {
  const visitorsWithLocation = new Set(stats.locations.map((location) => location.visitor_id));
  const total = visitorsWithLocation.size;

  return {
    cities: buildLocationItems(stats.locations, total, (location) => {
      const city = normalizeLocality(location.city);
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);

      return {
        id: `${city}:${state}:${country}`,
        label:
          [city, state, country].filter((item) => item !== "Não identificado").join(", ") || city,
      };
    }),
    countries: buildLocationItems(stats.locations, total, (location) => {
      const country = normalizeCountry(location.country);

      return { id: country, label: country };
    }),
    source: "visitor_location" as const,
    states: buildLocationItems(stats.locations, total, (location) => {
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        country === "Brasil" || country === "Não identificado" ? state : `${state}, ${country}`;

      return { id: `${state}:${country}`, label };
    }),
    total,
  };
};

const pathLabel = (path: string) => {
  const normalized = path || "/";
  if (normalized === "/") return "Página inicial";
  if (normalized === "/psychologists") return "Página de Psicólogos";
  if (normalized.startsWith("/psychologists/")) return "Perfil de Psicólogo";
  if (normalized === "/community" || normalized === "/community/feed") return "Comunidades";
  if (normalized.startsWith("/community/") && normalized.includes("/post/"))
    return "Post específico";
  if (normalized.startsWith("/community/")) return "Comunidade";
  if (normalized.startsWith("/login")) return "Login";
  if (normalized.includes("cadastro") || normalized.includes("signup")) return "Cadastro";

  return normalized;
};

const buildEntryPages = (stats: TrafficStats) => {
  const entries = entryPageViews(stats);
  const total = entries.length;
  const items = buildBreakdown(
    entries.map((entry) => {
      const path = entry.entry_path || entry.path || "/";

      return {
        id: path,
        label: pathLabel(path),
      };
    }),
    total,
  )
    .slice(0, 7)
    .map<AdminTrafficEntryPage>((item) => ({
      count: item.count,
      label: item.label,
      path: item.id,
      percentage: item.percentage,
    }));

  return {
    items,
    source: "page_view_event.is_entry" as const,
    total,
  };
};

const buildConversions = (current: TrafficStats, previous: TrafficStats) => ({
  items: [
    metric({
      current: current.patientSignups,
      description: "Usuários com role paciente criados no período.",
      id: "patient_signups",
      label: "Cadastros de pacientes",
      previous: previous.patientSignups,
      source: "user.role=paciente",
    }),
    metric({
      current: current.psychologistSignups,
      description: "Usuários com role psicólogo criados no período.",
      id: "psychologist_signups",
      label: "Cadastros de psicólogos",
      previous: previous.psychologistSignups,
      source: "user.role=psicologo",
    }),
    metric({
      current: current.publishedCommunityPosts,
      description: "Posts publicados em comunidades.",
      id: "community_posts",
      label: "Posts criados",
      previous: previous.publishedCommunityPosts,
      source: "community_post.status=publicado",
    }),
    metric({
      current: current.postReplies,
      description: "Comentários e respostas publicados em posts de comunidade.",
      id: "post_replies",
      label: "Comentários",
      previous: previous.postReplies,
      source: "post_reply",
    }),
    metric({
      current: current.contactRequests,
      description: "Cliques reais de contato por WhatsApp registrados no domínio.",
      id: "whatsapp_clicks",
      label: "Cliques no WhatsApp",
      previous: previous.contactRequests,
      source: "contact_request.channel=whatsapp",
    }),
    metric({
      current: current.subscriptionsStarted,
      description: "Assinaturas profissionais pagas iniciadas, excluindo cortesia administrativa.",
      id: "subscriptions_started",
      label: "Assinaturas iniciadas",
      previous: previous.subscriptionsStarted,
      source: "professional_subscription",
    }),
    metric({
      current: pwaInstalls(current),
      description: "Instalações PWA capturadas como ação importante.",
      id: "pwa_installs",
      label: "Instalações PWA",
      previous: pwaInstalls(previous),
      source: "important_action_event.action_type=pwa_installed",
    }),
  ],
  source: "domain_events" as const,
});

const buildQuality = (current: TrafficStats, previous: TrafficStats) => {
  const currentAverageTime = averageTime(current);
  const previousAverageTime = averageTime(previous);
  const currentPagesPerSession = pagesPerSession(current);
  const previousPagesPerSession = pagesPerSession(previous);
  const currentBounceRate = bounceRate(current);
  const previousBounceRate = bounceRate(previous);
  const currentReturnRate = returnRate(current);
  const previousReturnRate = returnRate(previous);
  const currentImportantActionRate = importantActionRate(current);
  const previousImportantActionRate = importantActionRate(previous);
  const currentUniqueVisitors = getVisitorIds(current).size;
  const previousUniqueVisitors = getVisitorIds(previous).size;

  return {
    items: [
      metric({
        current: currentAverageTime.value,
        description: "Tempo médio por pageview com duração registrada.",
        id: "average_time",
        label: "Tempo médio na plataforma",
        previous: previousAverageTime.value,
        source: "page_view_event.duration_seconds",
        unavailable: currentAverageTime.unavailable,
        unavailableReason: currentAverageTime.unavailableReason,
        unit: "seconds",
      }),
      metric({
        current: currentPagesPerSession.value,
        description: "Pageviews por sessão com pelo menos uma pageview.",
        id: "pages_per_session",
        label: "Páginas por sessão",
        previous: previousPagesPerSession.value,
        source: "page_view_event.session_id",
        unit: "decimal",
      }),
      metric({
        current: currentBounceRate.value,
        description: "Sessões com uma pageview e sem ação importante.",
        id: "bounce_rate",
        label: "Taxa de rejeição",
        previous: previousBounceRate.value,
        source: "page_view_event+important_action_event",
        unavailable: currentBounceRate.unavailable,
        unavailableReason: currentBounceRate.unavailableReason,
        unit: "percentage",
      }),
      metric({
        current: currentReturnRate.value,
        description: "Visitantes com sessão anterior ou mais de uma sessão no período.",
        id: "return_rate",
        label: "Taxa de retorno",
        previous: previousReturnRate.value,
        source: "visitor_session",
        unit: "percentage",
      }),
      metric({
        current: safePercentage(returnVisitors(current).length, currentUniqueVisitors),
        description: "Participação de visitantes recorrentes entre visitantes únicos.",
        id: "recurring_users",
        label: "Usuários recorrentes",
        previous: safePercentage(returnVisitors(previous).length, previousUniqueVisitors),
        source: "visitor_session",
        unit: "percentage",
      }),
      metric({
        current: currentImportantActionRate.value,
        description: "Sessões com pelo menos uma ação importante registrada.",
        id: "important_action_sessions",
        label: "Sessões com ação importante",
        previous: previousImportantActionRate.value,
        source: "important_action_event.session_id",
        unavailable: currentImportantActionRate.unavailable,
        unavailableReason: currentImportantActionRate.unavailableReason,
        unit: "percentage",
      }),
    ],
    source: "page_view_event+important_action_event+visitor_session" as const,
  };
};

const targetRanking = (
  stats: TrafficStats,
  targetType: "community" | "psychologist",
  labels: Map<string, string>,
) => {
  const pageViews = stats.pageViews.filter(
    (pageView) => pageView.target_type === targetType && pageView.target_id,
  );
  const groups = new Map<string, { pageViews: number; sessionKeys: Set<string> }>();

  for (const pageView of pageViews) {
    const id = pageView.target_id!;
    const current = groups.get(id) ?? {
      pageViews: 0,
      sessionKeys: new Set<string>(),
    };
    current.pageViews += 1;
    current.sessionKeys.add(sessionKey(pageView));
    groups.set(id, current);
  }

  const totalSessions = uniqueValues(pageViews.map((pageView) => sessionKey(pageView))).length;

  return [...groups.entries()]
    .map<AdminTrafficRankingItem>(([id, group]) => ({
      count: group.pageViews,
      id,
      label: labels.get(id) ?? id,
      path: targetType === "community" ? `/community/${id}` : `/psychologists/${id}`,
      percentage: safePercentage(group.sessionKeys.size, totalSessions),
      sessions: group.sessionKeys.size,
    }))
    .sort((left, right) => right.sessions - left.sessions)
    .slice(0, 5);
};

const buildRankings = async (repository: IAdminTrafficRepository, stats: TrafficStats) => {
  const communitySlugs = uniqueValues(
    stats.pageViews
      .filter((pageView) => pageView.target_type === "community" && pageView.target_id)
      .map((pageView) => pageView.target_id!),
  );
  const psychologistIds = uniqueValues(
    stats.pageViews
      .filter((pageView) => pageView.target_type === "psychologist" && pageView.target_id)
      .map((pageView) => pageView.target_id!),
  );
  const [communities, psychologists] = await Promise.all([
    repository.listCommunitiesBySlugs(communitySlugs),
    repository.listPsychologistsByIds(psychologistIds),
  ]);
  const communityLabels = new Map(communities.map((community) => [community.slug, community.name]));
  const psychologistLabels = new Map(
    psychologists.map((psychologist) => {
      const suffix = psychologist.psychologist_profile?.crp
        ? ` · CRP ${psychologist.psychologist_profile.crp}`
        : "";

      return [psychologist.id, `${psychologist.name}${suffix}`];
    }),
  );
  const communityItems = targetRanking(stats, "community", communityLabels);
  const psychologistItems = targetRanking(stats, "psychologist", psychologistLabels);

  return {
    topCommunities: {
      items: communityItems,
      source: "page_view_event.target_type=community" as const,
      total: communityItems.reduce((sum, item) => sum + item.sessions, 0),
    },
    topPsychologists: {
      items: psychologistItems,
      source: "page_view_event.target_type=psychologist" as const,
      total: psychologistItems.reduce((sum, item) => sum + item.sessions, 0),
    },
  };
};

const unavailableMetrics = (summary: Pick<AdminTrafficSummary, "locations" | "quality">) => {
  const unavailable = summary.quality.items
    .filter((item) => item.unavailable)
    .map((item) => ({
      description: item.unavailable_reason ?? item.description,
      id: item.id,
      label: item.label,
      source: item.source,
    }));

  if (summary.locations.total === 0) {
    unavailable.push({
      description:
        "Nenhuma localização foi capturada para o período; verifique headers/provedor de geolocalização em produção.",
      id: "locations",
      label: "Localização",
      source: summary.locations.source,
    });
  }

  unavailable.push({
    description:
      "Atribuição cross-device não é inferida; visitantes em dispositivos diferentes permanecem separados por visitor_id.",
    id: "cross_device_attribution",
    label: "Atribuição cross-device",
    source: "visitor_id",
  });

  return unavailable;
};

export const buildTrafficSummary = async (query: AdminTrafficQuery): Promise<Resolve> => {
  const resolvedPeriod = resolvePeriod(query ?? {});
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const repository = new AdminTrafficRepository();
  const { current, period, previous } = resolvedPeriod.period;
  const [currentStats, previousStats] = await Promise.all([
    loadStats(repository, current),
    loadStats(repository, previous),
  ]);
  const rankings = await buildRankings(repository, currentStats);
  const locations = buildLocations(currentStats);
  const quality = buildQuality(currentStats, previousStats);

  const summary: AdminTrafficSummary = {
    conversions: buildConversions(currentStats, previousStats),
    devices: buildDevices(currentStats),
    entry_pages: buildEntryPages(currentStats),
    locations,
    overview_cards: buildOverviewCards(currentStats, previousStats),
    period,
    quality,
    top_communities: rankings.topCommunities,
    top_psychologists: rankings.topPsychologists,
    timeline: {
      points: buildTimeline(currentStats, resolvedPeriod.period),
      source: "visitor_session+page_view_event+important_action_event",
    },
    traffic_sources: buildTrafficSources(currentStats),
    unavailable: [],
    user_types: buildUserTypes(currentStats),
  };

  summary.unavailable = unavailableMetrics(summary);

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminTrafficSummaryDTO): Promise<Resolve> => {
  return buildTrafficSummary(data.q ?? {});
};
