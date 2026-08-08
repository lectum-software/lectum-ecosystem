import { extractPsychologistSignupAnalyticsVisitorId } from "@/modules/api/public/analytics/helpers/signup-identity";
import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import {
  daysBetweenDates,
  platformPageLabel,
  roundOneDecimal,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDeviceType,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPreSignupConversion,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistPlatformSessionRecord,
  AdminPsychologistPreSignupConversionPageViewRecord,
  AdminPsychologistPreSignupConversionSessionRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistSignupAnalyticsIdentityRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  DEVICE_LABELS,
  PRE_SIGNUP_CONVERSION_BUCKETS,
  PRE_SIGNUP_CONVERSION_COVERAGE_NOTE,
  PRE_SIGNUP_CONVERSION_FIRST_TOUCH_LIMIT,
  PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD,
  PRE_SIGNUP_CONVERSION_SESSION_LABEL,
} from "../support/constants";
import {
  averageNumber,
  normalizeKey,
  percentileValue,
  preSignupConversionBucketForDays,
  safePercentage,
} from "../support/metrics";

export const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Psicólogo";

type PreSignupConversionPsychologistTouch = {
  occurredAt: Date;
  pageId: string;
  pageLabel: string;
  sessionId: string;
  source: "page_view_event" | "visitor_session";
};

type PreSignupConversionPsychologistSummary = {
  daysToRegistration: number | null;
  firstTouchId: string | null;
  firstTouchLabel: string | null;
  psychologistId: string;
  sessions: Set<string>;
};

const preSignupConversionPageLabel = (view: AdminPsychologistPreSignupConversionPageViewRecord) =>
  platformPageLabel(view);

export const latestPsychologistSignupDate = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.reduce<Date | null>((latest, profile) => {
    if (!latest || profile.user.createdAt > latest) return profile.user.createdAt;

    return latest;
  }, null);

export const buildPsychologistVisitorIds = (params: {
  linkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  linkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  psychologistIds: Set<string>;
  signupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
}) => {
  const visitorIdsByPsychologistId = new Map<string, Set<string>>();
  const addVisitorId = (psychologistId: string | null, visitorId: string | null) => {
    if (!psychologistId || !visitorId || !params.psychologistIds.has(psychologistId)) return;

    const current = visitorIdsByPsychologistId.get(psychologistId) ?? new Set<string>();
    current.add(visitorId);
    visitorIdsByPsychologistId.set(psychologistId, current);
  };

  for (const view of params.linkedPageViews) {
    addVisitorId(view.user_id, view.visitor_id);
  }

  for (const session of params.linkedSessions) {
    addVisitorId(session.user_id, session.visitor_id);
  }

  for (const identity of params.signupIdentities) {
    const visitorId = extractPsychologistSignupAnalyticsVisitorId(identity.data);
    if (visitorId) addVisitorId(identity.user_id, visitorId);
  }

  return visitorIdsByPsychologistId;
};

export const collectPreSignupConversionVisitorIds = (
  visitorIdsByPsychologistId: Map<string, Set<string>>,
) => [
  ...new Set([...visitorIdsByPsychologistId.values()].flatMap((visitorIds) => [...visitorIds])),
];

const psychologistScopedRecord = (userId: string | null, psychologistId: string) =>
  userId === null || userId === psychologistId;

const touchSort = (
  left: PreSignupConversionPsychologistTouch,
  right: PreSignupConversionPsychologistTouch,
) => {
  const dateDiff = left.occurredAt.getTime() - right.occurredAt.getTime();
  if (dateDiff !== 0) return dateDiff;
  if (left.source !== right.source) return left.source === "page_view_event" ? -1 : 1;

  return left.pageLabel.localeCompare(right.pageLabel, "pt-BR");
};

export const summarizePreSignupConversion = (params: {
  linkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  linkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  pageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  period: AdminPsychologistsDashboardPeriod;
  profiles: AdminPsychologistProfileRecord[];
  sessions: AdminPsychologistPreSignupConversionSessionRecord[];
  signupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
}): AdminPsychologistsDashboardPreSignupConversion => {
  const psychologistIds = new Set(params.profiles.map((profile) => profile.user.id));
  const visitorIdsByPsychologistId = buildPsychologistVisitorIds({
    linkedPageViews: params.linkedPageViews,
    linkedSessions: params.linkedSessions,
    psychologistIds,
    signupIdentities: params.signupIdentities,
  });
  const pageViewsByVisitorId = new Map<
    string,
    AdminPsychologistPreSignupConversionPageViewRecord[]
  >();
  const sessionsByVisitorId = new Map<
    string,
    AdminPsychologistPreSignupConversionSessionRecord[]
  >();

  for (const view of params.pageViews) {
    if (!view.visitor_id) continue;

    const current = pageViewsByVisitorId.get(view.visitor_id) ?? [];
    current.push(view);
    pageViewsByVisitorId.set(view.visitor_id, current);
  }

  for (const session of params.sessions) {
    if (!session.visitor_id) continue;

    const current = sessionsByVisitorId.get(session.visitor_id) ?? [];
    current.push(session);
    sessionsByVisitorId.set(session.visitor_id, current);
  }

  const psychologistSummaries = params.profiles.map(
    (profile): PreSignupConversionPsychologistSummary => {
      const profileVisitorIds =
        visitorIdsByPsychologistId.get(profile.user.id) ?? new Set<string>();
      const touches: PreSignupConversionPsychologistTouch[] = [];

      for (const visitorId of profileVisitorIds) {
        for (const view of pageViewsByVisitorId.get(visitorId) ?? []) {
          if (!psychologistScopedRecord(view.user_id, profile.user.id)) continue;
          if (view.occurred_at > profile.user.createdAt) continue;

          const label = preSignupConversionPageLabel(view);
          touches.push({
            occurredAt: view.occurred_at,
            pageId: normalizeKey(label) || "outras_paginas",
            pageLabel: label,
            sessionId: view.session_id,
            source: "page_view_event",
          });
        }

        for (const session of sessionsByVisitorId.get(visitorId) ?? []) {
          if (!psychologistScopedRecord(session.user_id, profile.user.id)) continue;
          if (session.first_seen_at > profile.user.createdAt) continue;

          touches.push({
            occurredAt: session.first_seen_at,
            pageId: "sessao_sem_pagina",
            pageLabel: PRE_SIGNUP_CONVERSION_SESSION_LABEL,
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
          ? daysBetweenDates(firstTouch.occurredAt, profile.user.createdAt)
          : null,
        firstTouchId: firstTouch?.pageId ?? null,
        firstTouchLabel: firstTouch?.pageLabel ?? null,
        psychologistId: profile.user.id,
        sessions,
      };
    },
  );

  const psychologistsWithHistory = psychologistSummaries.filter(
    (profile) => typeof profile.daysToRegistration === "number",
  );
  const historyDays = psychologistsWithHistory.flatMap((profile) =>
    typeof profile.daysToRegistration === "number" ? [profile.daysToRegistration] : [],
  );
  const bucketCounts = new Map(PRE_SIGNUP_CONVERSION_BUCKETS.map((bucket) => [bucket.id, 0]));

  for (const profile of psychologistSummaries) {
    const bucket =
      typeof profile.daysToRegistration === "number"
        ? preSignupConversionBucketForDays(profile.daysToRegistration)
        : "no_history";
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }

  const firstTouchGroups = new Map<
    string,
    {
      historyDays: number[];
      label: string;
      psychologistsCount: number;
    }
  >();

  for (const profile of psychologistsWithHistory) {
    if (!profile.firstTouchId || !profile.firstTouchLabel) continue;

    const current = firstTouchGroups.get(profile.firstTouchId) ?? {
      historyDays: [],
      label: profile.firstTouchLabel,
      psychologistsCount: 0,
    };
    current.psychologistsCount += 1;

    if (typeof profile.daysToRegistration === "number") {
      current.historyDays.push(profile.daysToRegistration);
    }

    firstTouchGroups.set(profile.firstTouchId, current);
  }

  const registeredPsychologistsCount = psychologistSummaries.length;
  const psychologistsWithHistoryCount = psychologistsWithHistory.length;
  const psychologistsWithoutHistoryCount =
    registeredPsychologistsCount - psychologistsWithHistoryCount;
  const anonymousSessionsCount = new Set(
    psychologistSummaries.flatMap((profile) =>
      [...profile.sessions].map((sessionId) => `${profile.psychologistId}:${sessionId}`),
    ),
  ).size;

  return {
    anonymous_sessions_count: anonymousSessionsCount,
    average_days: averageNumber(historyDays),
    buckets: PRE_SIGNUP_CONVERSION_BUCKETS.map((bucket) => ({
      count: bucketCounts.get(bucket.id) ?? 0,
      id: bucket.id,
      label: bucket.label,
      percentage: safePercentage(bucketCounts.get(bucket.id) ?? 0, registeredPsychologistsCount),
    })),
    cohort_from: params.period.from,
    cohort_to: params.period.to,
    coverage_note: PRE_SIGNUP_CONVERSION_COVERAGE_NOTE,
    first_touch_pages: [...firstTouchGroups.entries()]
      .map(([id, group]) => ({
        average_days: averageNumber(group.historyDays),
        id,
        label: group.label,
        percentage: safePercentage(group.psychologistsCount, psychologistsWithHistoryCount),
        psychologists_count: group.psychologistsCount,
        sample_sufficient:
          group.psychologistsCount >= PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD,
        unavailable_reason:
          group.psychologistsCount === 0
            ? "Sem psicólogos neste ponto de entrada."
            : group.psychologistsCount < PRE_SIGNUP_CONVERSION_FIRST_TOUCH_SAMPLE_THRESHOLD
              ? "Amostra pequena; interpretar apenas como leitura operacional."
              : null,
      }))
      .sort((left, right) => {
        if (right.psychologists_count !== left.psychologists_count) {
          return right.psychologists_count - left.psychologists_count;
        }

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, PRE_SIGNUP_CONVERSION_FIRST_TOUCH_LIMIT),
    history_coverage_rate:
      registeredPsychologistsCount > 0
        ? roundOneDecimal((psychologistsWithHistoryCount / registeredPsychologistsCount) * 100)
        : null,
    median_days: percentileValue(historyDays, 50),
    p75_days: percentileValue(historyDays, 75),
    p90_days: percentileValue(historyDays, 90),
    psychologists_with_anonymous_history_count: psychologistsWithHistoryCount,
    psychologists_without_anonymous_history_count: psychologistsWithoutHistoryCount,
    registered_psychologists_count: registeredPsychologistsCount,
    source: "user.createdAt+user_background+page_view_event+visitor_session",
    unavailable_reason:
      registeredPsychologistsCount === 0
        ? "Sem psicólogos cadastrados no período selecionado."
        : psychologistsWithHistoryCount === 0
          ? "Nenhum psicólogo cadastrado no período possui trilha anônima prévia capturada pelo mesmo visitor_id."
          : null,
  };
};

const normalizeDeviceType = (value: string): AdminPsychologistsDashboardDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const buildDeviceUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
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

export const buildOperatingSystemUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
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

export const normalizeStateCode = (value: string | null | undefined) => {
  const state = value?.trim().toUpperCase();

  return state && /^[A-Z]{2}$/.test(state) ? state : null;
};

export const buildCityStateLabel = (city: string, state: string | null) =>
  state ? `${city}/${state}` : city;

export const buildCityStateId = (city: string, state: string | null) =>
  normalizeKey(state ? `${city}_${state}` : city);

export const parseCityFilterTarget = (value: string) => {
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

export const humanizeFilterValue = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) ||
  value;

export const currentWeekdayValue = () => {
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

export const dateInRange = (date: Date, range: AdminPsychologistsDashboardDateRange) =>
  date >= range.start && date <= range.end;
