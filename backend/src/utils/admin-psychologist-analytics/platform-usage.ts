import { platformPageLabel } from "./platform-activity";
import {
  type AdminPsychologistAnalyticsPageView,
  average,
  DURATION_RELIABILITY_THRESHOLD,
  roundOneDecimal,
  toDateKey,
} from "./subscription-conversion";

export const summarizePlatformUsage = (params: {
  eligiblePsychologistsCount?: number;
  labels?: string[];
  pageViews: AdminPsychologistAnalyticsPageView[];
  pwaInstalledUserIds?: string[];
}) => {
  const {
    eligiblePsychologistsCount = 0,
    labels = [],
    pageViews,
    pwaInstalledUserIds = [],
  } = params;
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

    const label = platformPageLabel(view);
    const pageMetric = pageMetrics.get(label) ?? {
      count: 0,
      durationSamplesCount: 0,
      durationTotalSeconds: 0,
      label,
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
    pageMetrics.set(label, pageMetric);

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
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD ? average(durations) : null;

  return {
    active_psychologists_count: activeCount,
    active_psychologists_rate:
      eligiblePsychologistsCount > 0
        ? roundOneDecimal((activeCount / eligiblePsychologistsCount) * 100)
        : null,
    average_access_days: activeCount > 0 ? roundOneDecimal(totalAccessDays / activeCount) : null,
    average_duration_seconds: averageDuration,
    average_sessions: activeCount > 0 ? roundOneDecimal(totalSessions / activeCount) : null,
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem visualizações autenticadas de psicólogos no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% das visualizações têm duração confiável."
          : null,
    pwa_installed_psychologists_count: pwaInstalledUsers.size,
    pwa_installed_psychologists_rate:
      eligiblePsychologistsCount > 0
        ? roundOneDecimal((pwaInstalledUsers.size / eligiblePsychologistsCount) * 100)
        : null,
    series: labels.map((label) => {
      const point = seriesMap.get(label);

      return {
        active_psychologists: point?.activeUsers.size ?? 0,
        date: label,
        pageviews: point?.pageviews ?? 0,
        sessions: point?.sessions.size ?? 0,
      };
    }),
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
        ? "Sem uso autenticado de psicólogos no período selecionado."
        : null,
  };
};
