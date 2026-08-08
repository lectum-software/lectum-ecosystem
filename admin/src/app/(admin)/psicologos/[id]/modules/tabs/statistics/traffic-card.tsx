"use client";

import { Loader2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistsDashboard } from "@/api/callers/psychologists";
import type {
  AdminPsychologistStatistics,
  PsychologistsDashboardQuery,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { CardShell } from "../../components/shared";
import { formatStatisticsPeriodSummary } from "../../support/formatters";
import type {
  PsychologistCommunityTrafficSourceId,
  PsychologistPresentationVideoTrafficSourceId,
  PsychologistTrafficSourceBenchmarkMap,
  PsychologistTrafficSourceDisplayItem,
  PsychologistTrafficSourceGroupId,
  PsychologistTrafficSourceItem,
} from "./traffic-data";
import {
  buildPsychologistTrafficSourceBenchmarkMap,
  formatTrafficNullableCount,
  getTrafficPercentageFromTotal,
  PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_IDS,
  PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS,
  roundTrafficOneDecimal,
} from "./traffic-data";
import {
  getPsychologistTrafficSourceDetailLabel,
  isPsychologistCommunityTrafficSource,
  isPsychologistExpandableTrafficSourceGroup,
  isPsychologistPresentationVideoTrafficSource,
  maxPsychologistTrafficSourceConsideredCount,
  PsychologistTrafficSourceConsideredBadge,
  PsychologistTrafficSourceGroupToggle,
  PsychologistTrafficSourceMetricLegend,
  PsychologistTrafficSourceMetricValue,
  PsychologistTrafficSourcePlatformMetrics,
  PsychologistTrafficSourcePlatformMetricsDescription,
  PsychologistTrafficSourceWhatsappClickActorBreakdown,
  sumPsychologistTrafficSourceConsideredCounts,
} from "./traffic-metrics";

const sumPsychologistTrafficSourceValue = (
  sources: PsychologistTrafficSourceItem[],
  key: "percentage" | "profile_views" | "sessions" | "whatsapp_clicks",
) => sources.reduce((total, source) => total + (source[key] ?? 0), 0);

const buildPsychologistTrafficSourceDisplayRows = (
  sources: PsychologistTrafficSourceItem[],
): PsychologistTrafficSourceDisplayItem[] => {
  const displayCandidates: Array<{
    index: number;
    source: PsychologistTrafficSourceDisplayItem;
  }> = [];
  const communitySourcesById = new Map<
    PsychologistCommunityTrafficSourceId,
    PsychologistTrafficSourceItem
  >();
  const communitySources: PsychologistTrafficSourceItem[] = [];
  let communitySortIndex = sources.length;
  const presentationVideoSourcesById = new Map<
    PsychologistPresentationVideoTrafficSourceId,
    PsychologistTrafficSourceItem
  >();
  const presentationVideoSources: PsychologistTrafficSourceItem[] = [];
  let presentationVideoSortIndex = sources.length;

  sources.forEach((source, index) => {
    if (isPsychologistCommunityTrafficSource(source)) {
      communitySourcesById.set(source.id, source);
      communitySources.push(source);
      communitySortIndex = Math.min(communitySortIndex, index);
      return;
    }

    if (isPsychologistPresentationVideoTrafficSource(source)) {
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
          benchmarkSourceId: "profile",
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
    const communityDetails = PSYCHOLOGIST_COMMUNITY_TRAFFIC_SOURCE_IDS.map((id) =>
      communitySourcesById.get(id),
    ).filter((source): source is PsychologistTrafficSourceItem => Boolean(source));
    const communityGroup: PsychologistTrafficSourceDisplayItem = {
      ...communitySources[0],
      badge: null,
      children: communityDetails,
      considered_count: sumPsychologistTrafficSourceConsideredCounts(communityDetails),
      description: "Somatório dos cliques de WhatsApp originados nas comunidades.",
      groupKind: "communities",
      id: "communities_group",
      isExpandableGroup: true,
      label: "Comunidades",
      percentage: sumPsychologistTrafficSourceValue(communitySources, "percentage"),
      platform_metrics: null,
      profile_views: sumPsychologistTrafficSourceValue(communitySources, "profile_views"),
      sessions: sumPsychologistTrafficSourceValue(communitySources, "sessions"),
      whatsapp_clicks: sumPsychologistTrafficSourceValue(communitySources, "whatsapp_clicks"),
    };

    displayCandidates.push({ index: communitySortIndex, source: communityGroup });
  }

  if (presentationVideoSources.length > 0) {
    const presentationVideoDetails = PSYCHOLOGIST_PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS.map((id) =>
      presentationVideoSourcesById.get(id),
    ).filter((source): source is PsychologistTrafficSourceItem => Boolean(source));
    const presentationVideoGroup: PsychologistTrafficSourceDisplayItem = {
      ...presentationVideoSources[0],
      badge: null,
      children: presentationVideoDetails,
      considered_count: maxPsychologistTrafficSourceConsideredCount(presentationVideoDetails),
      description:
        "Somatório dos cliques de WhatsApp associados ao vídeo de apresentação em Explorar e buscas/filtros.",
      groupKind: "presentation_video",
      id: "presentation_video_group",
      isExpandableGroup: true,
      label: "Vídeo de apresentação",
      percentage: sumPsychologistTrafficSourceValue(presentationVideoSources, "percentage"),
      platform_metrics: null,
      profile_views: sumPsychologistTrafficSourceValue(presentationVideoSources, "profile_views"),
      sessions: sumPsychologistTrafficSourceValue(presentationVideoSources, "sessions"),
      whatsapp_clicks: sumPsychologistTrafficSourceValue(
        presentationVideoSources,
        "whatsapp_clicks",
      ),
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

const PsychologistTrafficSourceMetricsDetail = ({
  benchmarkMetricsBySourceId,
  className,
  source,
}: {
  benchmarkMetricsBySourceId: PsychologistTrafficSourceBenchmarkMap;
  className?: string;
  source: PsychologistTrafficSourceDisplayItem;
}) => (
  <div className={cn("min-w-0 border-primary/25 border-l-2 pl-4", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-xs font-black text-foreground">
        {source.groupKind === "profile"
          ? "Engajamento dentro do perfil"
          : source.groupKind === "presentation_video"
            ? "Engajamento do vídeo de apresentação"
            : "Engajamento da origem"}
      </p>
      <PsychologistTrafficSourceConsideredBadge context={source.groupKind} source={source} />
    </div>
    <PsychologistTrafficSourcePlatformMetricsDescription
      context={source.groupKind}
      source={source}
    />
    <PsychologistTrafficSourcePlatformMetrics
      benchmarkMetricsBySourceId={benchmarkMetricsBySourceId}
      source={source}
    />
  </div>
);

export const PsychologistTrafficSourcesCard = ({
  isRefreshing = false,
  periodControls,
  statistics,
}: {
  isRefreshing?: boolean;
  periodControls: ReactNode;
  statistics: AdminPsychologistStatistics;
}) => {
  const [expandedTrafficSourceGroups, setExpandedTrafficSourceGroups] = useState<
    Set<PsychologistTrafficSourceGroupId>
  >(() => new Set());
  const traffic = statistics.traffic_sources;
  const benchmarkQuery = useMemo<PsychologistsDashboardQuery>(
    () => ({
      from: statistics.period.from,
      period: "custom",
      to: statistics.period.to,
    }),
    [statistics.period.from, statistics.period.to],
  );
  const dashboardBenchmark = useAdminPsychologistsDashboard(benchmarkQuery, {
    enabled: traffic.sources.some((source) => (source.platform_metrics?.length ?? 0) > 0),
  });
  const benchmarkMetricsBySourceId = useMemo(
    () => buildPsychologistTrafficSourceBenchmarkMap(dashboardBenchmark.data?.traffic_sources),
    [dashboardBenchmark.data?.traffic_sources],
  );
  const trafficRows = buildPsychologistTrafficSourceDisplayRows(traffic.sources);
  const totalWhatsappClicks = traffic.sources.reduce(
    (total, source) => total + (source.whatsapp_clicks ?? 0),
    0,
  );
  const trafficDescription = formatStatisticsPeriodSummary(statistics.period);
  const getWhatsappClicksPercentage = (value: number | null) =>
    roundTrafficOneDecimal(getTrafficPercentageFromTotal(value, totalWhatsappClicks));
  const toggleTrafficSourceGroup = (groupId: PsychologistTrafficSourceGroupId) => {
    setExpandedTrafficSourceGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
        return next;
      }

      next.add(groupId);
      return next;
    });
  };

  return (
    <CardShell className="p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Origem do tráfego</h2>
              {isRefreshing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                  <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  Atualizando
                </span>
              ) : null}
            </div>
            <PsychologistTrafficSourceMetricLegend />
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{trafficDescription}</p>
        </div>
        {periodControls}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.35rem] border border-border/70 md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {trafficRows.map((source) => {
            if (isPsychologistExpandableTrafficSourceGroup(source)) {
              const isExpanded = expandedTrafficSourceGroups.has(source.id);

              return (
                <div className="bg-surface" key={source.id}>
                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Ocultar" : "Expandir"} detalhes de ${source.label}`}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_minmax(150px,0.35fr)] items-center gap-3 px-4 py-4 text-left transition hover:bg-surface-muted/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => toggleTrafficSourceGroup(source.id)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground">
                          {source.label}
                        </p>
                        {source.badge === "primary_source" ? (
                          <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                            Principal origem
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {source.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 text-center">
                      <div className="flex justify-center">
                        <PsychologistTrafficSourceMetricValue
                          className="text-lg"
                          percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                          value={formatTrafficNullableCount(source.whatsapp_clicks)}
                        />
                      </div>
                      <PsychologistTrafficSourceGroupToggle expanded={isExpanded} />
                    </div>
                  </button>
                  {isExpanded ? (
                    <div className="divide-y divide-border/70 border-border/70 border-t bg-surface-muted/35">
                      {source.children?.length ? (
                        source.children.map((childSource) => (
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] items-center gap-3 px-4 py-3"
                            key={childSource.id}
                          >
                            <div className="min-w-0 border-primary/25 border-l-2 pl-4">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="truncate text-xs font-black text-foreground">
                                  {getPsychologistTrafficSourceDetailLabel(
                                    childSource,
                                    source.groupKind,
                                  )}
                                </p>
                                <PsychologistTrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                              </div>
                              <PsychologistTrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <PsychologistTrafficSourcePlatformMetrics
                                benchmarkMetricsBySourceId={benchmarkMetricsBySourceId}
                                source={childSource}
                              />
                            </div>
                            <div className="flex justify-center text-center">
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <PsychologistTrafficSourceMetricValue
                                  className="text-base"
                                  percentage={getWhatsappClicksPercentage(
                                    childSource.whatsapp_clicks,
                                  )}
                                  value={formatTrafficNullableCount(childSource.whatsapp_clicks)}
                                />
                                <PsychologistTrafficSourceWhatsappClickActorBreakdown
                                  source={childSource}
                                />
                              </span>
                            </div>
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="px-4 py-3">
                          <PsychologistTrafficSourceMetricsDetail
                            benchmarkMetricsBySourceId={benchmarkMetricsBySourceId}
                            source={source}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] items-center gap-3 px-4 py-4"
                key={source.id}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-foreground">{source.label}</p>
                    {source.badge === "primary_source" ? (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                        Principal origem
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                    {source.description}
                  </p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 text-center">
                  <div className="flex justify-center">
                    <PsychologistTrafficSourceMetricValue
                      className="text-lg"
                      percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                      value={formatTrafficNullableCount(source.whatsapp_clicks)}
                    />
                  </div>
                  <span aria-hidden className="h-6 w-6" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {trafficRows.map((source) => {
          const isExpandableGroup = isPsychologistExpandableTrafficSourceGroup(source);
          const isExpanded = isExpandableGroup ? expandedTrafficSourceGroups.has(source.id) : false;
          const metricBlock = (
            <div className="mt-4 rounded-2xl bg-surface p-3">
              <p className="text-[0.68rem] font-black text-muted">WhatsApp</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="inline-flex flex-col items-start gap-0.5">
                  <PsychologistTrafficSourceMetricValue
                    className="text-base"
                    percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                    value={formatTrafficNullableCount(source.whatsapp_clicks)}
                  />
                  <PsychologistTrafficSourceWhatsappClickActorBreakdown
                    align="start"
                    source={source}
                  />
                </span>
                {isExpandableGroup ? (
                  <PsychologistTrafficSourceGroupToggle expanded={isExpanded} />
                ) : null}
              </div>
            </div>
          );
          const summaryContent = (
            <>
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-foreground">{source.label}</h4>
                    {source.badge === "primary_source" ? (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                        Principal origem
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted">{source.description}</p>
                </div>
              </div>
              {metricBlock}
            </>
          );

          return (
            <article
              className={cn(
                "rounded-[1.35rem] border border-border/70 bg-surface-muted p-4",
                isExpandableGroup && "transition hover:border-primary/30",
              )}
              key={source.id}
            >
              {isExpandableGroup ? (
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Ocultar" : "Expandir"} detalhes de ${source.label}`}
                  className="w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => toggleTrafficSourceGroup(source.id)}
                  type="button"
                >
                  {summaryContent}
                </button>
              ) : (
                summaryContent
              )}
              <div className="mt-2 grid gap-2">
                {isExpandableGroup && isExpanded ? (
                  <div className="rounded-2xl border border-border/70 bg-surface p-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-muted">
                      Detalhamento de {source.label}
                    </p>
                    <div className="mt-2 divide-y divide-border/70">
                      {source.children?.length ? (
                        source.children.map((childSource) => (
                          <div
                            className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                            key={childSource.id}
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="text-xs font-black text-foreground">
                                  {getPsychologistTrafficSourceDetailLabel(
                                    childSource,
                                    source.groupKind,
                                  )}
                                </p>
                                <PsychologistTrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                              </div>
                              <PsychologistTrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <PsychologistTrafficSourcePlatformMetrics
                                benchmarkMetricsBySourceId={benchmarkMetricsBySourceId}
                                source={childSource}
                              />
                            </div>
                            <span className="inline-flex shrink-0 flex-col items-end gap-0.5 text-right">
                              <PsychologistTrafficSourceMetricValue
                                className="text-sm"
                                percentage={getWhatsappClicksPercentage(
                                  childSource.whatsapp_clicks,
                                )}
                                value={formatTrafficNullableCount(childSource.whatsapp_clicks)}
                              />
                              <PsychologistTrafficSourceWhatsappClickActorBreakdown
                                align="end"
                                source={childSource}
                              />
                            </span>
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="py-2 first:pt-0 last:pb-0">
                          <PsychologistTrafficSourceMetricsDetail
                            benchmarkMetricsBySourceId={benchmarkMetricsBySourceId}
                            className="pl-3"
                            source={source}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </CardShell>
  );
};
