import { resolveCalendarPeriod, toDateKey } from "@/utils/date-range";
import type {
  AdminTrafficBreakdownItem,
  AdminTrafficDateRange,
  AdminTrafficDeviceType,
  AdminTrafficMetric,
  AdminTrafficOnlineNow,
  AdminTrafficPeriod,
  AdminTrafficQuery,
  AdminTrafficUserType,
} from "../../DTOs/IAdminTrafficSummaryDTO";
import type {
  IAdminTrafficRepository,
  TrafficActionRecord,
  TrafficDomainConversionRecord,
  TrafficLocationRecord,
  TrafficPageViewRecord,
  TrafficSessionRecord,
  TrafficUserRecord,
} from "../../repositories/interfaces/IAdminTrafficRepository";

export const DEFAULT_PERIOD_DAYS = 30;

export const ONLINE_NOW_WINDOW_MINUTES = 5;

export const MAX_CUSTOM_PERIOD_DAYS = 180;

export const MAX_PRESET_PERIOD_DAYS = 3660;

export const TOP_LIMIT = 10;

export const DEVICE_LABELS: Record<AdminTrafficDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  pwa: "PWA instalado",
  tablet: "Tablet",
  unknown: "Não identificado",
};

export const USER_TYPE_LABELS: Record<AdminTrafficUserType, string> = {
  anonymous: "Não autenticados",
  patients: "Pacientes",
  psychologists: "Psicólogos",
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

export type TrafficPeriodResolution = {
  current: AdminTrafficDateRange;
  days: number;
  period: AdminTrafficPeriod;
  previous: AdminTrafficDateRange;
};

export type PeriodResult =
  | {
      period: TrafficPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export type TrafficStats = {
  actions: TrafficActionRecord[];
  contactRequests: number;
  domainConversions: TrafficDomainConversionRecord[];
  locations: TrafficLocationRecord[];
  pageViews: TrafficPageViewRecord[];
  patientSignups: number;
  postReplies: number;
  priorVisitorIds: Set<string>;
  psychologistSignups: number;
  publishedCommunityPosts: number;
  sessions: TrafficSessionRecord[];
  subscriptionsStarted: number;
  users: TrafficUserRecord[];
  usersCreated: TrafficUserRecord[];
};

export type NumericMetric = {
  unavailable: boolean;
  unavailableReason?: string;
  value: number;
};

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

export const onlineNowWindow = (now = new Date()): AdminTrafficDateRange => ({
  end: now,
  start: addMinutes(now, -ONLINE_NOW_WINDOW_MINUTES),
});

export const resolvePeriod = (
  query: AdminTrafficQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: (preset) =>
      preset === "all" || preset === "year" ? MAX_PRESET_PERIOD_DAYS : MAX_CUSTOM_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, maxDays, previousEnd, previousStart, start } = resolved;
  return {
    success: true,
    period: {
      current: { end, start },
      days,
      period: {
        days,
        from: toDateKey(start),
        label,
        max_days: maxDays,
        previous_from: toDateKey(previousStart),
        previous_to: toDateKey(previousEnd),
        timezone: "server-local",
        to: toDateKey(end),
      },
      previous: { end: previousEnd, start: previousStart },
    },
  };
};

export const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return round((value / total) * 100);
};

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return round(((current - previous) / previous) * 100);
};

export const metric = (params: {
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

export const sessionKey = (record: Pick<TrafficActionRecord, "session_id" | "visitor_id">) =>
  `${record.visitor_id}:${record.session_id}`;

export const uniqueValues = <T>(items: T[]) => [...new Set(items)];

export const getVisitorIds = (stats: Pick<TrafficStats, "actions" | "pageViews" | "sessions">) =>
  new Set([
    ...stats.sessions.map((session) => session.visitor_id),
    ...stats.pageViews.map((pageView) => pageView.visitor_id),
    ...stats.actions.map((action) => action.visitor_id),
  ]);

export const loadStats = async (
  repository: IAdminTrafficRepository,
  range: AdminTrafficDateRange,
): Promise<TrafficStats> => {
  const [
    actions,
    contactRequests,
    domainConversions,
    locations,
    pageViews,
    patientSignups,
    postReplies,
    psychologistSignups,
    publishedCommunityPosts,
    sessions,
    subscriptionsStarted,
    usersCreated,
  ] = await Promise.all([
    repository.listActions(range),
    repository.countContactRequests(range),
    repository.listDomainConversions(range),
    repository.listLocations(range),
    repository.listPageViews(range),
    repository.countUsersByRole("paciente", range),
    repository.countPostReplies(range),
    repository.countUsersByRole("psicologo", range),
    repository.countPublishedCommunityPosts(range),
    repository.listSessions(range),
    repository.countSubscriptionsStarted(range),
    repository.listUsersCreated(range),
  ]);
  const visitorIds = [...getVisitorIds({ actions, pageViews, sessions })];
  const observedUserIds = uniqueValues([
    ...sessions.flatMap((session) => (session.user_id ? [session.user_id] : [])),
    ...pageViews.flatMap((pageView) => (pageView.user_id ? [pageView.user_id] : [])),
    ...actions.flatMap((action) => (action.user_id ? [action.user_id] : [])),
    ...domainConversions.flatMap((conversion) => (conversion.user_id ? [conversion.user_id] : [])),
    ...usersCreated.map((user) => user.id),
  ]);
  const [previousSessions, users] = await Promise.all([
    repository.listVisitorSessionsBefore(visitorIds, range.start),
    repository.listUsersByIds(observedUserIds),
  ]);

  return {
    actions,
    contactRequests,
    domainConversions,
    locations,
    pageViews,
    patientSignups,
    postReplies,
    priorVisitorIds: new Set(previousSessions.map((session) => session.visitor_id)),
    psychologistSignups,
    publishedCommunityPosts,
    sessions,
    subscriptionsStarted,
    users,
    usersCreated,
  };
};

export const newVisitorIds = (stats: TrafficStats) =>
  [...getVisitorIds(stats)].filter((visitorId) => !stats.priorVisitorIds.has(visitorId));

export const recurringVisitorIds = (stats: TrafficStats) =>
  [...getVisitorIds(stats)].filter((visitorId) => stats.priorVisitorIds.has(visitorId));

export const pageViewSessions = (stats: TrafficStats) => {
  const sessions = new Map<string, TrafficPageViewRecord[]>();

  for (const pageView of stats.pageViews) {
    const key = sessionKey(pageView);
    sessions.set(key, [...(sessions.get(key) ?? []), pageView]);
  }

  return sessions;
};

export const entryPageViews = (stats: TrafficStats) => {
  const bySession = pageViewSessions(stats);

  return [...bySession.values()].map((sessionViews) => {
    const sorted = [...sessionViews].sort(
      (left, right) => left.occurred_at.getTime() - right.occurred_at.getTime(),
    );
    return sorted.find((view) => view.is_entry) ?? sorted[0]!;
  });
};

export const actionSessionKeys = (stats: TrafficStats) =>
  new Set(stats.actions.map((action) => sessionKey(action)));

export const pagesPerSession = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats).size;
  if (sessionsWithPageview === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: round(stats.pageViews.length / sessionsWithPageview, 2),
  };
};

export const bounceRate = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats);
  if (sessionsWithPageview.size === 0) {
    return {
      unavailable: true,
      unavailableReason: "Sem sessões com visualizações no período.",
      value: 0,
    };
  }

  const sessionsWithAction = actionSessionKeys(stats);
  const bounces = [...sessionsWithPageview.entries()].filter(
    ([key, views]) => views.length === 1 && !sessionsWithAction.has(key),
  ).length;

  return { unavailable: false, value: safePercentage(bounces, sessionsWithPageview.size) };
};

export const averageTime = (stats: TrafficStats): NumericMetric => {
  const durations = stats.pageViews
    .map((pageView) => pageView.duration_seconds)
    .filter((duration): duration is number => typeof duration === "number" && duration > 0);

  if (durations.length === 0) {
    return {
      unavailable: true,
      unavailableReason: "Ainda não há visualizações com duração registrada no período.",
      value: 0,
    };
  }

  return {
    unavailable: false,
    value: Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length),
  };
};

export const returnVisitors = (stats: TrafficStats) => {
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

export const returnRate = (stats: TrafficStats): NumericMetric => {
  const uniqueVisitors = getVisitorIds(stats).size;
  if (uniqueVisitors === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: safePercentage(returnVisitors(stats).length, uniqueVisitors),
  };
};

export const importantActionRate = (stats: TrafficStats): NumericMetric => {
  const sessionsWithPageview = pageViewSessions(stats).size;
  if (sessionsWithPageview === 0) {
    return {
      unavailable: true,
      unavailableReason: "Sem sessões com visualizações para calcular a taxa.",
      value: 0,
    };
  }

  return {
    unavailable: false,
    value: safePercentage(actionSessionKeys(stats).size, sessionsWithPageview),
  };
};

export const registrationRate = (stats: TrafficStats): NumericMetric => {
  const uniqueVisitors = getVisitorIds(stats).size;
  if (uniqueVisitors === 0) return { unavailable: false, value: 0 };

  return {
    unavailable: false,
    value: safePercentage(stats.patientSignups + stats.psychologistSignups, uniqueVisitors),
  };
};

export const pwaInstalls = (stats: TrafficStats) =>
  stats.actions.filter((action) => action.action_type === "pwa_installed").length;

export const loggedPsychologists = (stats: TrafficStats) =>
  new Set(
    stats.sessions
      .filter((session) => session.user?.role === "psicologo" && session.user_id)
      .map((session) => session.user_id),
  ).size;

export const anonymousVisitors = (stats: TrafficStats) =>
  new Set(
    stats.sessions
      .filter((session) => !session.user_id || !session.user)
      .map((session) => session.visitor_id),
  ).size;

export const buildOnlineNow = (
  sessions: TrafficSessionRecord[],
  window: AdminTrafficDateRange,
  priorVisitorIds: Set<string>,
): AdminTrafficOnlineNow => {
  const latestSessionByVisitorId = new Map<string, TrafficSessionRecord>();

  for (const session of sessions) {
    const current = latestSessionByVisitorId.get(session.visitor_id);
    if (!current || session.last_seen_at > current.last_seen_at) {
      latestSessionByVisitorId.set(session.visitor_id, session);
    }
  }

  const authenticatedUserIds = new Set<string>();
  const counts: Record<AdminTrafficUserType, number> = {
    anonymous: 0,
    patients: 0,
    psychologists: 0,
  };

  for (const session of latestSessionByVisitorId.values()) {
    if (session.user_id && session.user?.role === "paciente") {
      authenticatedUserIds.add(session.user_id);
      counts.patients += 1;
      continue;
    }

    if (session.user_id && session.user?.role === "psicologo") {
      authenticatedUserIds.add(session.user_id);
      counts.psychologists += 1;
      continue;
    }

    counts.anonymous += 1;
  }

  const totalVisitors = latestSessionByVisitorId.size;
  const newVisitors = [...latestSessionByVisitorId.keys()].filter(
    (visitorId) => !priorVisitorIds.has(visitorId),
  ).length;
  const items: AdminTrafficBreakdownItem[] = [
    {
      count: counts.patients,
      id: "patients",
      label: "Pacientes",
      percentage: safePercentage(counts.patients, totalVisitors),
    },
    {
      count: counts.psychologists,
      id: "psychologists",
      label: "Psicólogos",
      percentage: safePercentage(counts.psychologists, totalVisitors),
    },
    {
      count: counts.anonymous,
      id: "anonymous",
      label: "Visitantes não autenticados",
      percentage: safePercentage(counts.anonymous, totalVisitors),
    },
  ];

  return {
    active_sessions: sessions.length,
    anonymous_visitors: counts.anonymous,
    authenticated_users: authenticatedUserIds.size,
    items,
    new_visitors: newVisitors,
    patients: counts.patients,
    psychologists: counts.psychologists,
    source: "visitor_session.last_seen_at+visitor_session.first_seen_at",
    unique_visitors: totalVisitors,
    window: {
      from: window.start.toISOString(),
      minutes: ONLINE_NOW_WINDOW_MINUTES,
      timezone: "server-local",
      to: window.end.toISOString(),
    },
  };
};

export const buildOverviewCards = (current: TrafficStats, previous: TrafficStats) => {
  const currentPagesPerSession = pagesPerSession(current);
  const previousPagesPerSession = pagesPerSession(previous);
  const currentRegistrationRate = registrationRate(current);
  const previousRegistrationRate = registrationRate(previous);
  const currentBounceRate = bounceRate(current);
  const previousBounceRate = bounceRate(previous);

  return [
    metric({
      current: current.sessions.length,
      description: "Sessões registradas no período.",
      id: "sessions",
      label: "Sessões",
      previous: previous.sessions.length,
      source: "visitor_session",
    }),
    metric({
      current: getVisitorIds(current).size,
      description: "Visitantes únicos considerando sessões e visualizações.",
      id: "unique_visitors",
      label: "Visitantes únicos",
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
      description: "Visualizações registradas no período.",
      id: "pageviews",
      label: "Visualizações de página",
      previous: previous.pageViews.length,
      source: "page_view_event",
    }),
    metric({
      current: currentPagesPerSession.value,
      description: "Visualizações divididas por sessões com pelo menos uma página acessada.",
      id: "pages_per_session",
      label: "Páginas por sessão",
      previous: previousPagesPerSession.value,
      source: "page_view_event.session_id",
      unit: "decimal",
    }),
    metric({
      current: loggedPsychologists(current),
      description: "Psicólogos autenticados com sessão no período.",
      id: "logged_psychologists",
      label: "Psicólogos logados",
      previous: loggedPsychologists(previous),
      source: "visitor_session.user.role=psicologo",
    }),
    metric({
      current: anonymousVisitors(current),
      description: "Visitantes sem conta vinculada.",
      id: "anonymous_visitors",
      label: "Visitantes não autenticados",
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
        "Sessões com uma única visualização e nenhuma ação importante, divididas pelas sessões com páginas acessadas.",
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
