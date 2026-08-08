import type { AdminPsychologistStatistics } from "@/api/req/psychologists";
import { numberFormatter } from "../../support/config";

export const formatTrafficNullableCount = (value: number | null) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

export const formatTrafficPercentage = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;

export const getTrafficPercentageFromTotal = (value: number | null, total: number) =>
  total > 0 ? Math.round(((value ?? 0) / total) * 1000) / 10 : 0;

type PsychologistPlatformHourlyActivityPoint = NonNullable<
  AdminPsychologistStatistics["platform_usage"]["hourly_activity"]
>[number];

type PsychologistPlatformHourlyActivityMetricKey =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reports";

export type PsychologistPlatformHourlyActivitySelection = "all" | `${number}`;

export const psychologistPlatformHourlyActivityBreakdown: {
  className: string;
  key: PsychologistPlatformHourlyActivityMetricKey;
  label: string;
}[] = [
  { className: "bg-primary", key: "accesses", label: "Acessos" },
  { className: "bg-success", key: "posts", label: "Posts" },
  { className: "bg-warning", key: "replies", label: "Respostas" },
  { className: "bg-muted", key: "engagement", label: "Interações" },
  { className: "bg-danger", key: "reports", label: "Denúncias" },
];

export const psychologistPlatformWeekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export const psychologistPlatformWeekdayLabel = (day: number) =>
  day === 0
    ? "Dom"
    : day === 1
      ? "Seg"
      : day === 2
        ? "Ter"
        : day === 3
          ? "Qua"
          : day === 4
            ? "Qui"
            : day === 5
              ? "Sex"
              : "Sáb";

const safePsychologistActivityCount = (value: number | null | undefined) => {
  const numeric = Number(value ?? 0);

  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0;
};

const formatPsychologistPlatformActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const nextHour = (normalizedHour + 1) % 24;

  return `${String(normalizedHour).padStart(2, "0")}h-${String(nextHour).padStart(2, "0")}h`;
};

export const normalizePsychologistPlatformHourlyActivityPoint = (
  point: Partial<PsychologistPlatformHourlyActivityPoint> | undefined,
  hour: number,
): PsychologistPlatformHourlyActivityPoint => {
  const fallbackAccesses = safePsychologistActivityCount(point?.count);
  const accesses =
    point?.accesses === undefined || point.accesses === null
      ? fallbackAccesses
      : safePsychologistActivityCount(point.accesses);
  const posts = safePsychologistActivityCount(point?.posts);
  const replies = safePsychologistActivityCount(point?.replies);
  const engagement = safePsychologistActivityCount(point?.engagement);
  const reports = safePsychologistActivityCount(point?.reports);
  const total =
    point?.total === undefined || point.total === null
      ? accesses + posts + replies + engagement + reports
      : safePsychologistActivityCount(point.total);

  return {
    accesses,
    count: total,
    engagement,
    hour,
    label: point?.label || formatPsychologistPlatformActivityHourRange(hour),
    percentage: point?.percentage ?? 0,
    posts,
    replies,
    reports,
    total,
  };
};

export type PsychologistTrafficSourceItem =
  AdminPsychologistStatistics["traffic_sources"]["sources"][number];

export type PsychologistCommunityTrafficSourceId = Extract<
  PsychologistTrafficSourceItem["id"],
  | "community_post_text"
  | "community_post_video"
  | "community_reply_text"
  | "community_reply_video"
  | "community_top_mentors"
>;

export type PsychologistPresentationVideoTrafficSourceId = Extract<
  PsychologistTrafficSourceItem["id"],
  "explore" | "search_filters"
>;

export type PsychologistTrafficSourceGroupId =
  | "communities_group"
  | "presentation_video_group"
  | "profile_group";

export type PsychologistTrafficSourceGroupKind = "communities" | "presentation_video" | "profile";

export type PsychologistTrafficSourceDisplayItem = Omit<PsychologistTrafficSourceItem, "id"> & {
  benchmarkSourceId?: PsychologistTrafficSourceItem["id"];
  children?: PsychologistTrafficSourceItem[];
  groupKind?: PsychologistTrafficSourceGroupKind;
  id: PsychologistTrafficSourceItem["id"] | PsychologistTrafficSourceGroupId;
  isExpandableGroup?: boolean;
};

export const PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_IDS = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
  "community_top_mentors",
] as const satisfies readonly PsychologistCommunityTrafficSourceId[];

export const PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_ID_SET = new Set<
  PsychologistTrafficSourceItem["id"]
>(PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_IDS);

export const PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS = {
  community_post_text: "Posts sem vídeo",
  community_post_video: "Posts com vídeo",
  community_reply_text: "Respostas sem vídeo",
  community_reply_video: "Respostas com vídeo",
  community_top_mentors: "Ranking Top Mentores",
} satisfies Record<PsychologistCommunityTrafficSourceId, string>;

export const PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS = [
  "explore",
  "search_filters",
] as const satisfies readonly PsychologistPresentationVideoTrafficSourceId[];

export const PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET = new Set<
  PsychologistTrafficSourceItem["id"]
>(PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS);

export type PsychologistTrafficSourcePlatformMetric = NonNullable<
  PsychologistTrafficSourceItem["platform_metrics"]
>[number];

type PsychologistTrafficSourceMetricStatus =
  | "above_average"
  | "average"
  | "below_average"
  | "small_base"
  | "zero";

export type PsychologistTrafficSourceBenchmarkMap = Map<
  PsychologistTrafficSourceItem["id"],
  Map<PsychologistTrafficSourcePlatformMetric["id"], PsychologistTrafficSourcePlatformMetric>
>;

export const roundTrafficOneDecimal = (value: number) => Math.round(value * 10) / 10;

const PSYCHOLOGIST_TRAFFIC_SOURCE_AVERAGE_TOLERANCE_PERCENT = 15;

const PSYCHOLOGIST_TRAFFIC_SOURCE_MIN_BASE_COUNT = 2;

export const PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_LABELS = {
  above_average: "Acima da média",
  average: "Na média",
  below_average: "Abaixo da média",
  small_base: "Base pequena",
  zero: "Zero",
} satisfies Record<PsychologistTrafficSourceMetricStatus, string>;

export const PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_CLASSES = {
  above_average: "border-success/25 bg-success/10 text-success",
  average: "border-primary/25 bg-primary-soft text-primary",
  below_average: "border-warning/25 bg-warning/10 text-warning",
  small_base: "border-border/70 bg-surface text-muted",
  zero: "border-danger/25 bg-danger/10 text-danger",
} satisfies Record<PsychologistTrafficSourceMetricStatus, string>;

export const PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_LEGEND_ITEMS = [
  { label: "Acima da média", status: "above_average" },
  { label: "Na média", status: "average" },
  { label: "Abaixo da média", status: "below_average" },
  { label: "Zero", status: "zero" },
  { label: "Base pequena", status: "small_base" },
] as const satisfies readonly {
  label: string;
  status: PsychologistTrafficSourceMetricStatus;
}[];

export const normalizePsychologistTrafficMetricValue = (value: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? roundTrafficOneDecimal(value) : null;

export const getPsychologistTrafficMetricAverageValue = ({
  consideredCount,
  metric,
}: {
  consideredCount: number | null;
  metric: PsychologistTrafficSourcePlatformMetric;
}) => {
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return null;
  if (metric.unit === "percentage") return normalizePsychologistTrafficMetricValue(metric.value);
  if (typeof consideredCount === "number" && consideredCount > 0) {
    return normalizePsychologistTrafficMetricValue(metric.value / consideredCount);
  }

  return normalizePsychologistTrafficMetricValue(metric.value);
};

export const getPsychologistTrafficMetricStatus = ({
  benchmarkValue,
  consideredCount,
  value,
}: {
  benchmarkValue: number | null;
  consideredCount: number | null;
  value: number | null;
}): PsychologistTrafficSourceMetricStatus => {
  if (typeof value !== "number") return "small_base";
  if (
    typeof consideredCount === "number" &&
    consideredCount < PSYCHOLOGIST_TRAFFIC_SOURCE_MIN_BASE_COUNT
  ) {
    return "small_base";
  }
  if (value === 0) return "zero";
  if (typeof benchmarkValue !== "number") return "small_base";
  if (benchmarkValue === 0) return value > 0 ? "above_average" : "zero";

  const deltaPercent = ((value - benchmarkValue) / benchmarkValue) * 100;

  if (deltaPercent >= PSYCHOLOGIST_TRAFFIC_SOURCE_AVERAGE_TOLERANCE_PERCENT) {
    return "above_average";
  }
  if (deltaPercent <= -PSYCHOLOGIST_TRAFFIC_SOURCE_AVERAGE_TOLERANCE_PERCENT) {
    return "below_average";
  }

  return "average";
};

export const buildPsychologistTrafficSourceBenchmarkMap = (
  traffic: AdminPsychologistStatistics["traffic_sources"] | undefined,
) => {
  const benchmarkMap: PsychologistTrafficSourceBenchmarkMap = new Map();

  for (const source of traffic?.sources ?? []) {
    const metricMap = new Map<
      PsychologistTrafficSourcePlatformMetric["id"],
      PsychologistTrafficSourcePlatformMetric
    >();

    for (const metric of source.platform_metrics ?? []) {
      metricMap.set(metric.id, metric);
    }

    if (metricMap.size > 0) {
      benchmarkMap.set(source.id, metricMap);
    }
  }

  return benchmarkMap;
};
