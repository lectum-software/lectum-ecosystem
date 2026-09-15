import {
  type AdminPsychologistAnalyticsPageView,
  roundOneDecimal,
} from "./subscription-conversion";

export const PAGE_KIND_LABELS: Record<string, string> = {
  billing: "Plano",
  community: "Comunidades",
  community_post: "Comunidades",
  home: "Início",
  login: "Login",
  psychologist_profile: "Perfil",
  psychologists: "Psicólogos",
  signup: "Cadastro",
};

export const platformPageLabel = (
  view: Pick<AdminPsychologistAnalyticsPageView, "normalized_path" | "page_kind" | "path">,
) => {
  const path = (view.normalized_path || view.path || "/").split("?")[0] ?? "/";
  const segments = path.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (joined.includes("publication") || joined.includes("post")) return "Posts";
  if (joined.includes("community")) return "Comunidades";
  if (joined.includes("billing") || joined.includes("checkout") || joined.includes("plan")) {
    return "Plano";
  }
  if (
    joined.includes("analytics") ||
    joined.includes("estatisticas") ||
    joined.includes("statistics")
  ) {
    return "Analytics";
  }
  if (
    joined.includes("settings") ||
    joined.includes("configuracoes") ||
    joined.includes("account")
  ) {
    return "Configurações";
  }
  if (joined.includes("profile") || joined.includes("perfil") || joined.includes("psychologist")) {
    return "Perfil";
  }
  if (joined.startsWith("app")) return "Área do psicólogo";

  return PAGE_KIND_LABELS[view.page_kind] ?? "Outras páginas";
};

export type AdminPsychologistPlatformPeakActivityHour = {
  count: number;
  hour: number;
  label: string;
  percentage: number;
};

export type AdminPsychologistPlatformHourlyActivityPoint =
  AdminPsychologistPlatformPeakActivityHour & {
    accesses: number;
    engagement: number;
    posts: number;
    replies: number;
    reports: number;
    total: number;
  };

export type AdminPsychologistPlatformWeekdayHourlyActivity = {
  day: number;
  hours: AdminPsychologistPlatformHourlyActivityPoint[];
  label: string;
};

export type AdminPsychologistPlatformDateActivity = {
  createdAt: Date;
};

export type AdminPsychologistPlatformHourlyActivityInput = {
  engagementEvents: AdminPsychologistPlatformDateActivity[];
  pageViews: AdminPsychologistAnalyticsPageView[];
  posts: AdminPsychologistPlatformDateActivity[];
  replies: AdminPsychologistPlatformDateActivity[];
  reportEvents: AdminPsychologistPlatformDateActivity[];
};

export type AdminPsychologistPlatformHourlyActivityMetric =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reports";

export const platformActivityHourLabel = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const nextHour = (normalizedHour + 1) % 24;
  const formatHour = (value: number) => String(value).padStart(2, "0");

  return `${formatHour(normalizedHour)}h-${formatHour(nextHour)}h`;
};

export const platformWeekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const emptyPlatformHourlyActivityPoint = (
  hour: number,
): AdminPsychologistPlatformHourlyActivityPoint => ({
  accesses: 0,
  count: 0,
  engagement: 0,
  hour,
  label: platformActivityHourLabel(hour),
  percentage: 0,
  posts: 0,
  replies: 0,
  reports: 0,
  total: 0,
});

export const createPlatformHourlyActivityMap = () =>
  new Map(Array.from({ length: 24 }, (_, hour) => [hour, emptyPlatformHourlyActivityPoint(hour)]));

export const finalizePlatformHourlyActivityMap = (
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
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
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
  date: Date,
  field: AdminPsychologistPlatformHourlyActivityMetric,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

export const incrementPlatformHourlyActivityCollections = (
  hourly: Map<number, AdminPsychologistPlatformHourlyActivityPoint>,
  hourlyByWeekday: Map<
    number,
    {
      hours: Map<number, AdminPsychologistPlatformHourlyActivityPoint>;
      label: string;
    }
  >,
  date: Date,
  field: AdminPsychologistPlatformHourlyActivityMetric,
) => {
  incrementPlatformHourlyActivity(hourly, date, field);
  const weekday = hourlyByWeekday.get(date.getDay());
  if (weekday) incrementPlatformHourlyActivity(weekday.hours, date, field);
};

export const buildPlatformHourlyActivityCollections = (
  input: AdminPsychologistPlatformHourlyActivityInput,
) => {
  const hourly = createPlatformHourlyActivityMap();
  const hourlyByWeekday = new Map(
    platformWeekdayLabels.map((label, day) => [
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
  for (const event of input.reportEvents) {
    incrementPlatformHourlyActivityCollections(hourly, hourlyByWeekday, event.createdAt, "reports");
  }

  return { hourly, hourlyByWeekday };
};

export const summarizePlatformAccessHourlyActivity = (
  pageViews: AdminPsychologistAnalyticsPageView[],
): AdminPsychologistPlatformPeakActivityHour[] => {
  const viewsWithUser = pageViews.filter((view) => view.user_id);
  const countsByHour = Array.from({ length: 24 }, () => 0);

  for (const view of viewsWithUser) {
    const hour = view.occurred_at.getHours();
    countsByHour[hour] += 1;
  }

  const total = viewsWithUser.length;
  if (total === 0) return [];

  return countsByHour.map((count, hour) => ({
    count,
    hour,
    label: platformActivityHourLabel(hour),
    percentage: roundOneDecimal((count / total) * 100),
  }));
};

export const summarizePlatformHourlyActivity = (
  input: AdminPsychologistPlatformHourlyActivityInput,
): AdminPsychologistPlatformHourlyActivityPoint[] => {
  return finalizePlatformHourlyActivityMap(buildPlatformHourlyActivityCollections(input).hourly);
};

export const summarizePlatformHourlyActivityByWeekday = (
  input: AdminPsychologistPlatformHourlyActivityInput,
): AdminPsychologistPlatformWeekdayHourlyActivity[] => {
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
  pageViews: AdminPsychologistAnalyticsPageView[],
): AdminPsychologistPlatformPeakActivityHour[] => {
  return summarizePlatformAccessHourlyActivity(pageViews)
    .filter((point) => point.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.hour - right.hour;
    })
    .slice(0, 4);
};
