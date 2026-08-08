import { extractPatientSignupAnalyticsVisitorId } from "@/modules/api/public/analytics/helpers/signup-identity";
import { toDateKey } from "@/utils/date-range";
import type {
  AdminPatientsDashboardAnonymousConversion,
  AdminPatientsDashboardPeriod,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import type {
  AdminPatientAnonymousConversionPageViewRecord,
  AdminPatientAnonymousConversionSessionRecord,
  AdminPatientPageViewRecord,
  AdminPatientSignupAnalyticsIdentityRecord,
  AdminPatientSnapshotRecord,
} from "../../repositories/AdminPatientsDashboardRepository";

import { normalizeKey, patientPlatformPageLabel } from "./device-demographics";

import {
  ANONYMOUS_CONVERSION_BUCKETS,
  ANONYMOUS_CONVERSION_FIRST_TOUCH_LIMIT,
  anonymousConversionBucketForDays,
  averageNumber,
  DURATION_RELIABILITY_THRESHOLD,
  daysBetweenDates,
  FIRST_TOUCH_SAMPLE_THRESHOLD,
  percentileValue,
  roundOneDecimal,
  safePercentage,
} from "./intent-support";

export type AnonymousConversionPatientTouch = {
  occurredAt: Date;
  pageId: string;
  pageLabel: string;
  sessionId: string;
  source: "page_view_event" | "visitor_session";
};

export type AnonymousConversionPatientSummary = {
  daysToRegistration: number | null;
  firstTouchId: string | null;
  firstTouchLabel: string | null;
  patientId: string;
  sessions: Set<string>;
};

export const ANONYMOUS_CONVERSION_SESSION_LABEL = "Sess\u00e3o sem p\u00e1gina capturada";

export const anonymousConversionPageLabel = (view: AdminPatientAnonymousConversionPageViewRecord) =>
  patientPlatformPageLabel(view);

export const latestPatientSignupDate = (patients: AdminPatientSnapshotRecord[]) =>
  patients.reduce<Date | null>((latest, patient) => {
    if (!latest || patient.createdAt > latest) return patient.createdAt;

    return latest;
  }, null);

export const buildPatientVisitorIds = (params: {
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

export const collectAnonymousConversionVisitorIds = (
  visitorIdsByPatientId: Map<string, Set<string>>,
) => [...new Set([...visitorIdsByPatientId.values()].flatMap((visitorIds) => [...visitorIds]))];

export const patientScopedRecord = (userId: string | null, patientId: string) =>
  userId === null || userId === patientId;

export const touchSort = (
  left: AnonymousConversionPatientTouch,
  right: AnonymousConversionPatientTouch,
) => {
  const dateDiff = left.occurredAt.getTime() - right.occurredAt.getTime();
  if (dateDiff !== 0) return dateDiff;
  if (left.source !== right.source) return left.source === "page_view_event" ? -1 : 1;

  return left.pageLabel.localeCompare(right.pageLabel, "pt-BR");
};

export const summarizeAnonymousConversion = (params: {
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
      "Grupo de pacientes cadastrados no período, considerando também a navegação anônima anterior que pôde ser associada ao cadastro. Outros visitantes não entram neste bloco.",
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
          ? "Nenhum paciente cadastrado no período possui navegação anônima anterior associada ao cadastro."
          : null,
  };
};

export const buildPlatformUsage = (params: {
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
  const pageMetrics = new Map<
    string,
    {
      count: number;
      durationSamplesCount: number;
      durationTotalSeconds: number;
      label: string;
    }
  >();
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
    const pageMetric = pageMetrics.get(pageLabel) ?? {
      count: 0,
      durationSamplesCount: 0,
      durationTotalSeconds: 0,
      label: pageLabel,
    };
    const durationSeconds =
      typeof view.duration_seconds === "number" &&
      Number.isFinite(view.duration_seconds) &&
      view.duration_seconds > 0
        ? view.duration_seconds
        : null;

    pageMetric.count += 1;
    if (durationSeconds !== null) {
      pageMetric.durationSamplesCount += 1;
      pageMetric.durationTotalSeconds += durationSeconds;
    }
    pageMetrics.set(pageLabel, pageMetric);

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
        ? "Sem visualizações autenticadas de pacientes no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% das visualizações de pacientes têm duração confiável."
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
    top_pages: [...pageMetrics.values()]
      .map((page) => ({
        count: page.count,
        label: page.label,
        percentage:
          viewsWithUser.length > 0 ? roundOneDecimal((page.count / viewsWithUser.length) * 100) : 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      })
      .slice(0, 6),
    top_pages_by_average_duration: [...pageMetrics.values()]
      .filter((page) => page.durationSamplesCount > 0)
      .map((page) => ({
        average_duration_seconds: roundOneDecimal(
          page.durationTotalSeconds / page.durationSamplesCount,
        ),
        count: page.count,
        duration_samples_count: page.durationSamplesCount,
        label: page.label,
      }))
      .sort((left, right) => {
        if (right.average_duration_seconds !== left.average_duration_seconds) {
          return right.average_duration_seconds - left.average_duration_seconds;
        }
        if (right.duration_samples_count !== left.duration_samples_count) {
          return right.duration_samples_count - left.duration_samples_count;
        }
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
