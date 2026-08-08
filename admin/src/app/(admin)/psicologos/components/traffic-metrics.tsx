"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import {
  COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS,
  COMMUNITY_TRAFFIC_SOURCE_ID_SET,
  COMMUNITY_TRAFFIC_SOURCE_IDS,
  type CommunityTrafficSourceId,
  formatNullableCount,
  formatPercentageValue,
  formatSecondsMetric,
  numberFormatter,
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET,
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS,
  type PresentationVideoTrafficSourceId,
  type TrafficSourceDisplayItem,
  type TrafficSourceGroupId,
  type TrafficSourceGroupKind,
  type TrafficSourceItem,
  toOneDecimal,
} from "../modules/dashboard-support";

export const TrafficSourceMetricValue = ({
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
      ({formatPercentageValue(percentage)})
    </span>
  </span>
);

export type TrafficSourceAverageUnit = "content" | "psychologist" | "video";

export type TrafficSourceAverageSource = Pick<
  TrafficSourceItem,
  "considered_count" | "whatsapp_clicks"
> & {
  id: TrafficSourceDisplayItem["id"];
};

export type TrafficSourceWhatsappAverage = {
  label: string;
  value: number;
};

export const positiveTrafficSourceConsideredCount = (
  source: Pick<TrafficSourceItem, "considered_count">,
) =>
  typeof source.considered_count === "number" && source.considered_count > 0
    ? source.considered_count
    : null;

export const sumTrafficSourceConsideredCounts = (sources: TrafficSourceItem[]) => {
  let hasCount = false;
  const total = sources.reduce((sum, source) => {
    if (typeof source.considered_count !== "number") return sum;

    hasCount = true;
    return sum + source.considered_count;
  }, 0);

  return hasCount ? total : null;
};

export const maxTrafficSourceConsideredCount = (sources: TrafficSourceItem[]) => {
  let max: number | null = null;

  for (const source of sources) {
    if (typeof source.considered_count !== "number") continue;

    max = Math.max(max ?? 0, source.considered_count);
  }

  return max;
};

export const getTrafficSourceAverageUnit = (
  source: TrafficSourceAverageSource,
  context?: TrafficSourceGroupKind,
): TrafficSourceAverageUnit => {
  if (context === "communities") {
    return source.id === "community_top_mentors" ? "psychologist" : "content";
  }

  if (
    context === "presentation_video" ||
    source.id === "explore" ||
    source.id === "search_filters"
  ) {
    return "video";
  }

  return "psychologist";
};

export const getTrafficSourceAverageLabel = (unit: TrafficSourceAverageUnit) => {
  if (unit === "content") return "por conteúdo";
  if (unit === "video") return "por vídeo";

  return "por psicólogo";
};

export const getTrafficSourceWhatsappAverage = ({
  context,
  fallbackPsychologistsCount,
  source,
}: {
  context?: TrafficSourceGroupKind;
  fallbackPsychologistsCount: number;
  source: TrafficSourceAverageSource;
}): TrafficSourceWhatsappAverage | null => {
  const unit = getTrafficSourceAverageUnit(source, context);
  const consideredCount = positiveTrafficSourceConsideredCount(source);
  const denominator =
    consideredCount ??
    (unit === "psychologist" && fallbackPsychologistsCount > 0 ? fallbackPsychologistsCount : null);

  if (!denominator) return null;

  return {
    label: getTrafficSourceAverageLabel(unit),
    value: toOneDecimal((source.whatsapp_clicks ?? 0) / denominator),
  };
};

export const TrafficSourceAverageBadge = ({
  context,
  fallbackPsychologistsCount,
  source,
}: {
  context?: TrafficSourceGroupKind;
  fallbackPsychologistsCount: number;
  source: TrafficSourceAverageSource;
}) => {
  const average = getTrafficSourceWhatsappAverage({
    context,
    fallbackPsychologistsCount,
    source,
  });

  if (!average) return null;

  return (
    <span className="shrink-0 text-[0.68rem] font-bold leading-none text-muted">
      {numberFormatter.format(average.value)} {average.label}
    </span>
  );
};

export const TrafficSourceWhatsappClickActorBreakdown = ({
  align = "center",
  source,
}: {
  align?: "center" | "end" | "start";
  source: Pick<TrafficSourceItem, "whatsapp_click_actor_breakdown">;
}) => {
  const breakdown = source.whatsapp_click_actor_breakdown;

  if (!breakdown) return null;

  const authorLabel = `Autor do conteúdo ${formatNullableCount(
    breakdown.author_clicks,
  )} (${formatPercentageValue(breakdown.author_percentage)})`;
  const otherUsersLabel = `Outros usuários ${formatNullableCount(
    breakdown.other_users_clicks,
  )} (${formatPercentageValue(breakdown.other_users_percentage)})`;

  return (
    <span
      className={cn(
        "mt-1 inline-flex flex-col gap-0.5 text-[0.68rem] font-bold leading-4 text-muted",
        align === "start" && "items-start text-left",
        align === "center" && "items-center text-center",
        align === "end" && "items-end text-right",
      )}
    >
      <span>{authorLabel}</span>
      <span>{otherUsersLabel}</span>
    </span>
  );
};

export const formatTrafficSourcePlatformMetricValue = (
  metric: NonNullable<TrafficSourceItem["platform_metrics"]>[number],
) => {
  if (typeof metric.value !== "number") return "Sem dados";
  if (metric.unit === "percentage") return formatPercentageValue(metric.value);
  if (metric.unit === "seconds") return formatSecondsMetric(metric.value);

  return numberFormatter.format(metric.value);
};

export const TrafficSourcePlatformMetrics = ({
  className,
  source,
}: {
  className?: string;
  source: Pick<TrafficSourceItem, "description" | "platform_metrics">;
}) => {
  const metrics = source.platform_metrics ?? [];

  if (metrics.length === 0) {
    return (
      <p className={cn("mt-1 text-xs leading-5 text-muted", className)}>{source.description}</p>
    );
  }

  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {metrics.map((metric) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface px-2 py-1 text-[0.68rem] font-bold leading-none text-muted"
          key={metric.id}
          title={metric.unavailable_reason || undefined}
        >
          <span>{metric.label}</span>
          <strong className="font-black text-foreground">
            {formatTrafficSourcePlatformMetricValue(metric)}
          </strong>
        </span>
      ))}
    </div>
  );
};

export const TrafficSourcePlatformMetricsDescription = ({
  context,
  source,
}: {
  context?: TrafficSourceGroupKind;
  source: Pick<TrafficSourceItem, "platform_metrics">;
}) => {
  if (!source.platform_metrics?.length) return null;

  return (
    <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
      {context === "profile"
        ? "Valores médios de engajamento dentro do perfil."
        : context === "presentation_video"
          ? "Valores médios de engajamento do vídeo de apresentação."
          : "Valores médios de engajamento da categoria."}
    </p>
  );
};

export const getTrafficSourceConsideredCountLabel = (
  count: number,
  context?: TrafficSourceGroupKind,
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

export const TrafficSourceConsideredBadge = ({
  context,
  source,
}: {
  context?: TrafficSourceGroupKind;
  source: Pick<TrafficSourceItem, "considered_count">;
}) => {
  if (typeof source.considered_count !== "number") return null;

  return (
    <span className="shrink-0 text-[0.68rem] font-bold leading-none text-muted">
      {getTrafficSourceConsideredCountLabel(source.considered_count, context)}
    </span>
  );
};

export const TrafficSourceGroupToggle = ({ expanded }: { expanded: boolean }) => (
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

export const isCommunityTrafficSource = (
  source: TrafficSourceItem,
): source is TrafficSourceItem & { id: CommunityTrafficSourceId } =>
  COMMUNITY_TRAFFIC_SOURCE_ID_SET.has(source.id);

export const isPresentationVideoTrafficSource = (
  source: TrafficSourceItem,
): source is TrafficSourceItem & { id: PresentationVideoTrafficSourceId } =>
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET.has(source.id);

export const isExpandableTrafficSourceGroup = (
  source: TrafficSourceDisplayItem,
): source is TrafficSourceDisplayItem & {
  id: TrafficSourceGroupId;
  isExpandableGroup: true;
} =>
  Boolean(
    source.isExpandableGroup &&
      ((source.children?.length ?? 0) > 0 || (source.platform_metrics?.length ?? 0) > 0),
  );

export const getTrafficSourceDetailLabel = (
  source: TrafficSourceItem,
  groupKind?: TrafficSourceGroupKind,
) =>
  groupKind === "communities" && isCommunityTrafficSource(source)
    ? COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS[source.id]
    : source.label;

export const sumTrafficSourceValue = (
  sources: TrafficSourceItem[],
  key: "percentage" | "profile_views" | "sessions" | "whatsapp_clicks",
) => sources.reduce((total, source) => total + (source[key] ?? 0), 0);

export const buildTrafficSourceDisplayRows = (
  sources: TrafficSourceItem[],
): TrafficSourceDisplayItem[] => {
  const displayCandidates: Array<{ index: number; source: TrafficSourceDisplayItem }> = [];
  const communitySourcesById = new Map<CommunityTrafficSourceId, TrafficSourceItem>();
  const communitySources: TrafficSourceItem[] = [];
  let communitySortIndex = sources.length;
  const presentationVideoSourcesById = new Map<
    PresentationVideoTrafficSourceId,
    TrafficSourceItem
  >();
  const presentationVideoSources: TrafficSourceItem[] = [];
  let presentationVideoSortIndex = sources.length;

  sources.forEach((source, index) => {
    if (isCommunityTrafficSource(source)) {
      communitySourcesById.set(source.id, source);
      communitySources.push(source);
      communitySortIndex = Math.min(communitySortIndex, index);
      return;
    }

    if (isPresentationVideoTrafficSource(source)) {
      presentationVideoSourcesById.set(source.id, source);
      presentationVideoSources.push(source);
      presentationVideoSortIndex = Math.min(presentationVideoSortIndex, index);
      return;
    }

    if (source.id === "profile") {
      displayCandidates.push({
        index,
        source: {
          ...source,
          groupKind: "profile",
          id: "profile_group",
          isExpandableGroup: true,
        },
      });
      return;
    }

    displayCandidates.push({ index, source });
  });

  if (communitySources.length > 0) {
    const communityDetails = COMMUNITY_TRAFFIC_SOURCE_IDS.map((id) =>
      communitySourcesById.get(id),
    ).filter((source): source is TrafficSourceItem => Boolean(source));
    const communityGroup: TrafficSourceDisplayItem = {
      ...communitySources[0],
      badge: null,
      children: communityDetails,
      considered_count: sumTrafficSourceConsideredCounts(communityDetails),
      description: "Somatório dos cliques de WhatsApp originados nas comunidades.",
      groupKind: "communities",
      id: "communities_group",
      isExpandableGroup: true,
      label: "Comunidades",
      percentage: sumTrafficSourceValue(communitySources, "percentage"),
      platform_metrics: null,
      profile_views: sumTrafficSourceValue(communitySources, "profile_views"),
      sessions: sumTrafficSourceValue(communitySources, "sessions"),
      whatsapp_clicks: sumTrafficSourceValue(communitySources, "whatsapp_clicks"),
    };

    displayCandidates.push({ index: communitySortIndex, source: communityGroup });
  }

  if (presentationVideoSources.length > 0) {
    const presentationVideoDetails = PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS.map((id) =>
      presentationVideoSourcesById.get(id),
    ).filter((source): source is TrafficSourceItem => Boolean(source));
    const presentationVideoGroup: TrafficSourceDisplayItem = {
      ...presentationVideoSources[0],
      badge: null,
      children: presentationVideoDetails,
      considered_count: maxTrafficSourceConsideredCount(presentationVideoDetails),
      description:
        "Somatório dos cliques de WhatsApp associados ao vídeo de apresentação em Explorar e buscas/filtros.",
      groupKind: "presentation_video",
      id: "presentation_video_group",
      isExpandableGroup: true,
      label: "Vídeo de apresentação",
      percentage: sumTrafficSourceValue(presentationVideoSources, "percentage"),
      platform_metrics: null,
      profile_views: sumTrafficSourceValue(presentationVideoSources, "profile_views"),
      sessions: sumTrafficSourceValue(presentationVideoSources, "sessions"),
      whatsapp_clicks: sumTrafficSourceValue(presentationVideoSources, "whatsapp_clicks"),
    };

    displayCandidates.push({ index: presentationVideoSortIndex, source: presentationVideoGroup });
  }

  const sortedCandidates = displayCandidates.sort((left, right) => {
    const rightClicks = right.source.whatsapp_clicks ?? 0;
    const leftClicks = left.source.whatsapp_clicks ?? 0;

    if (rightClicks !== leftClicks) return rightClicks - leftClicks;

    return left.index - right.index;
  });
  const maxWhatsappClicks = sortedCandidates.reduce(
    (max, item) => Math.max(max, item.source.whatsapp_clicks ?? 0),
    0,
  );

  return sortedCandidates.map(({ source }, index) => ({
    ...source,
    badge: maxWhatsappClicks > 0 && index === 0 ? "primary_source" : null,
  }));
};
