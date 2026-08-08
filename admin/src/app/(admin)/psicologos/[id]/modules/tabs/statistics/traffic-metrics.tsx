"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { numberFormatter } from "../../support/config";
import { formatDurationSeconds } from "../../support/formatters";
import type {
  PsychologistCommunityTrafficSourceId,
  PsychologistPresentationVideoTrafficSourceId,
  PsychologistTrafficSourceBenchmarkMap,
  PsychologistTrafficSourceDisplayItem,
  PsychologistTrafficSourceGroupId,
  PsychologistTrafficSourceGroupKind,
  PsychologistTrafficSourceItem,
  PsychologistTrafficSourcePlatformMetric,
} from "./traffic-data";
import {
  formatTrafficNullableCount,
  formatTrafficPercentage,
  getPsychologistTrafficMetricAverageValue,
  getPsychologistTrafficMetricStatus,
  normalizePsychologistTrafficMetricValue,
  PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS,
  PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_ID_SET,
  PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET,
  PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_LEGEND_ITEMS,
  PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_CLASSES,
  PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_LABELS,
} from "./traffic-data";

export const PsychologistTrafficSourceMetricLegend = () => (
  <ul
    aria-label="Legenda de comparação das médias de engajamento"
    className="flex flex-wrap items-center gap-1.5 text-[0.68rem] font-black leading-none"
  >
    {PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_LEGEND_ITEMS.map((item) => (
      <li
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-1",
          PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_CLASSES[item.status],
        )}
        key={item.status}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        {item.label}
      </li>
    ))}
  </ul>
);

export const PsychologistTrafficSourceMetricValue = ({
  className,
  percentage,
  value,
}: {
  className?: string;
  percentage: number;
  value: ReactNode;
}) => (
  <span className={cn("inline-flex items-baseline gap-1 font-black text-foreground", className)}>
    <span>{value}</span>
    <span className="text-[0.78em] font-semibold text-muted">
      ({formatTrafficPercentage(percentage)})
    </span>
  </span>
);

export const sumPsychologistTrafficSourceConsideredCounts = (
  sources: PsychologistTrafficSourceItem[],
) => {
  let hasCount = false;
  const total = sources.reduce((sum, source) => {
    if (typeof source.considered_count !== "number") return sum;

    hasCount = true;
    return sum + source.considered_count;
  }, 0);

  return hasCount ? total : null;
};

export const maxPsychologistTrafficSourceConsideredCount = (
  sources: PsychologistTrafficSourceItem[],
) => {
  let max: number | null = null;

  for (const source of sources) {
    if (typeof source.considered_count !== "number") continue;

    max = Math.max(max ?? 0, source.considered_count);
  }

  return max;
};

export const PsychologistTrafficSourceWhatsappClickActorBreakdown = ({
  align = "center",
  source,
}: {
  align?: "center" | "end" | "start";
  source: Pick<PsychologistTrafficSourceItem, "whatsapp_click_actor_breakdown">;
}) => {
  const breakdown = source.whatsapp_click_actor_breakdown;

  if (!breakdown) return null;

  const authorLabel = `Autor do conteúdo ${formatTrafficNullableCount(
    breakdown.author_clicks,
  )} (${formatTrafficPercentage(breakdown.author_percentage)})`;
  const otherUsersLabel = `Outros usuários ${formatTrafficNullableCount(
    breakdown.other_users_clicks,
  )} (${formatTrafficPercentage(breakdown.other_users_percentage)})`;

  return (
    <span
      className={cn(
        "mt-1 inline-flex flex-col gap-0.5 text-[0.68rem] font-bold leading-4 text-muted",
        align === "start" && "items-start text-left",
        align === "center" && "items-center text-center",
        align === "end" && "items-end text-right",
      )}
      title={breakdown.source}
    >
      <span>{authorLabel}</span>
      <span>{otherUsersLabel}</span>
    </span>
  );
};

const formatPsychologistTrafficSourcePlatformMetricValue = (
  metric: PsychologistTrafficSourcePlatformMetric,
  value: number | null = typeof metric.value === "number" ? metric.value : null,
) => {
  if (typeof value !== "number") return "Sem dados";
  if (metric.unit === "percentage") return formatTrafficPercentage(value);
  if (metric.unit === "seconds") return formatDurationSeconds(value);

  return numberFormatter.format(value);
};

export const PsychologistTrafficSourcePlatformMetrics = ({
  benchmarkMetricsBySourceId,
  className,
  source,
}: {
  benchmarkMetricsBySourceId: PsychologistTrafficSourceBenchmarkMap;
  className?: string;
  source: Pick<
    PsychologistTrafficSourceDisplayItem,
    "benchmarkSourceId" | "considered_count" | "description" | "id" | "platform_metrics"
  >;
}) => {
  const metrics = source.platform_metrics ?? [];
  const consideredCount =
    typeof source.considered_count === "number" ? source.considered_count : null;
  const benchmarkSourceId =
    source.benchmarkSourceId ??
    (PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_ID_SET.has(
      source.id as PsychologistTrafficSourceItem["id"],
    ) ||
    PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET.has(
      source.id as PsychologistTrafficSourceItem["id"],
    ) ||
    source.id === "profile"
      ? (source.id as PsychologistTrafficSourceItem["id"])
      : null);
  const benchmarkMetrics = benchmarkSourceId
    ? benchmarkMetricsBySourceId.get(benchmarkSourceId)
    : undefined;

  if (metrics.length === 0) {
    return (
      <p className={cn("mt-1 text-xs leading-5 text-muted", className)}>{source.description}</p>
    );
  }

  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {metrics.map((metric) => {
        const value = getPsychologistTrafficMetricAverageValue({ consideredCount, metric });
        const benchmarkMetric = benchmarkMetrics?.get(metric.id);
        const benchmarkValue = normalizePsychologistTrafficMetricValue(
          typeof benchmarkMetric?.value === "number" ? benchmarkMetric.value : null,
        );
        const status = getPsychologistTrafficMetricStatus({
          benchmarkValue,
          consideredCount,
          value,
        });
        const formattedBenchmark =
          typeof benchmarkValue === "number"
            ? formatPsychologistTrafficSourcePlatformMetricValue(metric, benchmarkValue)
            : null;
        const titleParts = [
          PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_LABELS[status],
          formattedBenchmark ? `Média global: ${formattedBenchmark}` : null,
          consideredCount !== null
            ? `Base do psicólogo: ${numberFormatter.format(consideredCount)}`
            : null,
          metric.unavailable_reason ?? metric.source,
        ].filter((item): item is string => Boolean(item));

        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.68rem] font-bold leading-none",
              PSYCHOLOGIST_TRAFFIC_SOURCE_METRIC_STATUS_CLASSES[status],
            )}
            key={metric.id}
            title={titleParts.join(" · ")}
          >
            <span>{metric.label}</span>
            <strong className="font-black text-current">
              {formatPsychologistTrafficSourcePlatformMetricValue(metric, value)}
            </strong>
          </span>
        );
      })}
    </div>
  );
};

export const PsychologistTrafficSourcePlatformMetricsDescription = ({
  context,
  source,
}: {
  context?: PsychologistTrafficSourceGroupKind;
  source: Pick<PsychologistTrafficSourceItem, "platform_metrics">;
}) => {
  if (!source.platform_metrics?.length) return null;

  return (
    <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
      {context === "profile"
        ? "Médias do psicólogo dentro do perfil, comparadas à média global."
        : context === "presentation_video"
          ? "Médias do psicólogo no vídeo de apresentação, comparadas à média global."
          : "Médias do psicólogo na categoria, comparadas à média global."}
    </p>
  );
};

const getPsychologistTrafficSourceConsideredCountLabel = (
  count: number,
  context?: PsychologistTrafficSourceGroupKind,
) => {
  const formattedCount = numberFormatter.format(count);

  if (context === "profile") {
    return `${formattedCount} ${count === 1 ? "perfil considerado" : "perfis considerados"}`;
  }

  if (context === "presentation_video") {
    return `${formattedCount} ${count === 1 ? "vídeo considerado" : "vídeos considerados"}`;
  }

  return `${formattedCount} ${count === 1 ? "conteúdo considerado" : "conteúdos considerados"}`;
};

export const PsychologistTrafficSourceConsideredBadge = ({
  context,
  source,
}: {
  context?: PsychologistTrafficSourceGroupKind;
  source: Pick<PsychologistTrafficSourceItem, "considered_count">;
}) => {
  if (typeof source.considered_count !== "number") return null;

  return (
    <span className="shrink-0 text-[0.68rem] font-bold leading-none text-muted">
      {getPsychologistTrafficSourceConsideredCountLabel(source.considered_count, context)}
    </span>
  );
};

export const PsychologistTrafficSourceGroupToggle = ({ expanded }: { expanded: boolean }) => (
  <span
    aria-hidden
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted transition"
    data-traffic-source-chevron=""
  >
    <ChevronDown
      aria-hidden
      className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
    />
  </span>
);

export const isPsychologistCommunityTrafficSource = (
  source: PsychologistTrafficSourceItem,
): source is PsychologistTrafficSourceItem & { id: PsychologistCommunityTrafficSourceId } =>
  PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_ID_SET.has(source.id);

export const isPsychologistPresentationVideoTrafficSource = (
  source: PsychologistTrafficSourceItem,
): source is PsychologistTrafficSourceItem & { id: PsychologistPresentationVideoTrafficSourceId } =>
  PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET.has(source.id);

export const isPsychologistExpandableTrafficSourceGroup = (
  source: PsychologistTrafficSourceDisplayItem,
): source is PsychologistTrafficSourceDisplayItem & {
  id: PsychologistTrafficSourceGroupId;
  isExpandableGroup: true;
} =>
  Boolean(
    source.isExpandableGroup &&
      ((source.children?.length ?? 0) > 0 || (source.platform_metrics?.length ?? 0) > 0),
  );

export const getPsychologistTrafficSourceDetailLabel = (
  source: PsychologistTrafficSourceItem,
  groupKind?: PsychologistTrafficSourceGroupKind,
) =>
  groupKind === "communities" && isPsychologistCommunityTrafficSource(source)
    ? PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS[source.id]
    : source.label;
