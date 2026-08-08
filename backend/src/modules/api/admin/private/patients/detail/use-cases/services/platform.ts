import type {
  AdminPatientDetailPeriod,
  AdminPatientPlatformUsage,
} from "../../DTOs/IAdminPatientDetailDTO";
import type {
  AdminPatientDetailPlatformPageViewRecord,
  AdminPatientDetailPlatformSessionRecord,
  AdminPatientEngagementBundle,
} from "../../repositories/AdminPatientDetailRepository";

import {
  average,
  buildPlatformDeviceUsage,
  DURATION_RELIABILITY_THRESHOLD,
  latestPlatformAccessAt,
  PATIENT_PAGE_KIND_LABELS,
  PLATFORM_WEEKDAY_LABELS,
  pad,
  roundOneDecimal,
} from "./intent";

import { dateKeyInTimeZone } from "./metrics-series";

export const patientPlatformPageLabel = (view: AdminPatientDetailPlatformPageViewRecord) => {
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

export const platformActivityHourLabel = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const nextHour = (normalizedHour + 1) % 24;

  return `${pad(normalizedHour)}h-${pad(nextHour)}h`;
};

export type PatientPlatformActivityMetric =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reviews";

export type PatientPlatformDateActivity = {
  createdAt: Date;
};

export type PatientPlatformHourlyActivityInput = {
  engagementEvents: PatientPlatformDateActivity[];
  pageViews: AdminPatientDetailPlatformPageViewRecord[];
  posts: PatientPlatformDateActivity[];
  replies: PatientPlatformDateActivity[];
  reviews: PatientPlatformDateActivity[];
};

export const emptyPlatformHourlyActivityPoint = (
  hour: number,
): AdminPatientPlatformUsage["hourly_activity"][number] => ({
  accesses: 0,
  count: 0,
  engagement: 0,
  hour,
  label: platformActivityHourLabel(hour),
  percentage: 0,
  posts: 0,
  replies: 0,
  reviews: 0,
  total: 0,
});

export const createPlatformHourlyActivityMap = () =>
  new Map(Array.from({ length: 24 }, (_, hour) => [hour, emptyPlatformHourlyActivityPoint(hour)]));

export const finalizePlatformHourlyActivityMap = (
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
  options: { includeEmpty?: boolean } = {},
) => {
  const points = [...hourly.values()];
  const total = points.reduce((sum, point) => sum + point.total, 0);
  if (total === 0 && !options.includeEmpty) return [];

  return points.map((point) => ({
    ...point,
    count: point.total,
    percentage: total > 0 ? roundOneDecimal((point.total / total) * 100) : 0,
  }));
};

export const incrementPlatformHourlyActivity = (
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
  date: Date,
  field: PatientPlatformActivityMetric,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

export const incrementPlatformHourlyActivityCollections = (
  hourly: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>,
  hourlyByWeekday: Map<
    number,
    {
      hours: Map<number, AdminPatientPlatformUsage["hourly_activity"][number]>;
      label: string;
    }
  >,
  date: Date,
  field: PatientPlatformActivityMetric,
) => {
  incrementPlatformHourlyActivity(hourly, date, field);
  const weekday = hourlyByWeekday.get(date.getDay());
  if (weekday) incrementPlatformHourlyActivity(weekday.hours, date, field);
};

export const buildPlatformHourlyActivityCollections = (
  input: PatientPlatformHourlyActivityInput,
) => {
  const hourly = createPlatformHourlyActivityMap();
  const hourlyByWeekday = new Map(
    PLATFORM_WEEKDAY_LABELS.map((label, day) => [
      day,
      {
        hours: createPlatformHourlyActivityMap(),
        label,
      },
    ]),
  );

  for (const view of input.pageViews) {
    if (!view.user_id) continue;
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      view.occurred_at,
      "accesses",
    );
  }
  for (const post of input.posts) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, post.createdAt, "posts");
  }
  for (const reply of input.replies) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, reply.createdAt, "replies");
  }
  for (const event of input.engagementEvents) {
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      event.createdAt,
      "engagement",
    );
  }
  for (const review of input.reviews) {
    incrementPlatformHourlyActivityCollections(
      hourly,
      hourlyByWeekday,
      review.createdAt,
      "reviews",
    );
  }

  return { hourly, hourlyByWeekday };
};

export const summarizePlatformHourlyActivity = (
  input: PatientPlatformHourlyActivityInput,
): AdminPatientPlatformUsage["hourly_activity"] =>
  finalizePlatformHourlyActivityMap(buildPlatformHourlyActivityCollections(input).hourly);

export const summarizePlatformHourlyActivityByWeekday = (
  input: PatientPlatformHourlyActivityInput,
): AdminPatientPlatformUsage["hourly_activity_by_weekday"] => {
  const { hourlyByWeekday } = buildPlatformHourlyActivityCollections(input);
  const hasActivity = [...hourlyByWeekday.values()].some((item) =>
    [...item.hours.values()].some((point) => point.total > 0),
  );

  if (!hasActivity) return [];

  return [...hourlyByWeekday.entries()].map(([day, item]) => ({
    day,
    hours: finalizePlatformHourlyActivityMap(item.hours, { includeEmpty: true }),
    label: item.label,
  }));
};

export const summarizePlatformPeakActivityHours = (
  pageViews: AdminPatientDetailPlatformPageViewRecord[],
): AdminPatientPlatformUsage["peak_activity_hours"] => {
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const countsByHour = Array.from({ length: 24 }, () => 0);

  for (const view of viewsWithUser) countsByHour[view.occurred_at.getHours()] += 1;

  const total = viewsWithUser.length;
  if (total === 0) return [];

  return countsByHour
    .map((count, hour) => ({
      count,
      hour,
      label: platformActivityHourLabel(hour),
      percentage: roundOneDecimal((count / total) * 100),
    }))
    .filter((point) => point.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.hour - right.hour;
    })
    .slice(0, 4);
};

export const buildPlatformUsage = (params: {
  bundle: AdminPatientEngagementBundle;
  pageViews: AdminPatientDetailPlatformPageViewRecord[];
  period: AdminPatientDetailPeriod;
  pwaInstallAction: { occurred_at: Date } | null;
  sessions: AdminPatientDetailPlatformSessionRecord[];
}): AdminPatientPlatformUsage => {
  const { bundle, pageViews, period, pwaInstallAction, sessions: platformSessions } = params;
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const pageViewSessions = new Set(viewsWithUser.map((view) => view.session_id));
  const accessDays = new Set(viewsWithUser.map((view) => dateKeyInTimeZone(view.occurred_at)));
  const durations = viewsWithUser
    .map((view) => view.duration_seconds)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
  const durationCoverage = viewsWithUser.length > 0 ? durations.length / viewsWithUser.length : 0;
  const averageDuration =
    durationCoverage >= DURATION_RELIABILITY_THRESHOLD ? average(durations) : null;
  const pageCounts = new Map<string, number>();
  for (const view of viewsWithUser) {
    const pageLabel = patientPlatformPageLabel(view);
    pageCounts.set(pageLabel, (pageCounts.get(pageLabel) ?? 0) + 1);
  }
  const hourlyActivityInput = {
    engagementEvents: [
      ...bundle.votesMade,
      ...bundle.postSaves,
      ...bundle.replySaves,
      ...bundle.membershipsInPeriod,
    ],
    pageViews,
    posts: bundle.posts,
    replies: bundle.replies,
    reviews: bundle.reviews,
  };

  return {
    access_days_count: accessDays.size,
    average_duration_seconds: averageDuration,
    device_usage: buildPlatformDeviceUsage(platformSessions),
    duration_unavailable_reason:
      viewsWithUser.length === 0
        ? "Sem visualizações autenticadas do paciente no período."
        : averageDuration === null
          ? "Duração indisponível: menos de 50% das visualizações têm duração confiável."
          : null,
    hourly_activity: summarizePlatformHourlyActivity(hourlyActivityInput),
    hourly_activity_by_weekday: summarizePlatformHourlyActivityByWeekday(hourlyActivityInput),
    last_access_at: latestPlatformAccessAt({
      pageViews: viewsWithUser,
      sessions: platformSessions,
    }),
    peak_activity_hours: summarizePlatformPeakActivityHours(pageViews),
    period_from: period.from,
    period_to: period.to,
    pwa_installation_recorded: Boolean(pwaInstallAction),
    pwa_installed_at: pwaInstallAction?.occurred_at ?? null,
    sessions_count: platformSessions.length > 0 ? platformSessions.length : pageViewSessions.size,
    source:
      "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+community_member+professional_review",
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
      viewsWithUser.length === 0 ? "Sem uso autenticado do paciente no período selecionado." : null,
  };
};
