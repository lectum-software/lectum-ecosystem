"use client";
import { useState } from "react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";

import {
  formatDate,
  formatNullableCount,
  type PlanSegmentFilter,
  type TrafficSourceDisplayItem,
  type TrafficSourceGroupId,
  toOneDecimal,
} from "../modules/dashboard-support";
import { CardShell } from "./metric-cards";

import { getPlanSegmentSummary, PlanSegmentSelect } from "./timeline-filters";
import {
  buildTrafficSourceDisplayRows,
  getTrafficSourceDetailLabel,
  isExpandableTrafficSourceGroup,
  TrafficSourceAverageBadge,
  TrafficSourceConsideredBadge,
  TrafficSourceGroupToggle,
  TrafficSourceMetricValue,
  TrafficSourcePlatformMetrics,
  TrafficSourcePlatformMetricsDescription,
  TrafficSourceWhatsappClickActorBreakdown,
} from "./traffic-metrics";

export const TrafficSourceProfileMetricsDetail = ({
  className,
  fallbackPsychologistsCount,
  source,
}: {
  className?: string;
  fallbackPsychologistsCount: number;
  source: TrafficSourceDisplayItem;
}) => (
  <div className={cn("min-w-0 border-primary/25 border-l-2 pl-4", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-xs font-black text-foreground">Engajamento dentro do perfil</p>
      <TrafficSourceConsideredBadge context="profile" source={source} />
      <TrafficSourceAverageBadge
        context="profile"
        fallbackPsychologistsCount={fallbackPsychologistsCount}
        source={source}
      />
    </div>
    <TrafficSourcePlatformMetricsDescription context="profile" source={source} />
    <TrafficSourcePlatformMetrics source={source} />
  </div>
);

export const DashboardTrafficSourcesCard = ({
  summary,
}: {
  summary: AdminPsychologistsDashboard;
}) => {
  const [trafficPlanSegment, setTrafficPlanSegment] = useState<PlanSegmentFilter>("all");
  const [expandedTrafficSourceGroups, setExpandedTrafficSourceGroups] = useState<
    Set<TrafficSourceGroupId>
  >(() => new Set());
  const trafficSegmentSummary = getPlanSegmentSummary(summary, trafficPlanSegment);
  const traffic = trafficSegmentSummary.traffic_sources;
  const trafficRows = buildTrafficSourceDisplayRows(traffic.sources);
  const totalWhatsappClicks = traffic.sources.reduce(
    (total, source) => total + (source.whatsapp_clicks ?? 0),
    0,
  );
  const getWhatsappClicksPercentage = (value: number | null) =>
    totalWhatsappClicks > 0 ? toOneDecimal(((value ?? 0) / totalWhatsappClicks) * 100) : 0;
  const toggleTrafficSourceGroup = (groupId: TrafficSourceGroupId) => {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-foreground">Origem do tráfego para psicólogos</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {summary.period.label} · {formatDate(summary.period.from)} a{" "}
            {formatDate(summary.period.to)}
          </p>
        </div>
        <PlanSegmentSelect
          id="traffic-source-plan-segment"
          onChange={setTrafficPlanSegment}
          value={trafficPlanSegment}
        />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.35rem] border border-border/70 md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {trafficRows.map((source) => {
            if (isExpandableTrafficSourceGroup(source)) {
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
                        <TrafficSourceMetricValue
                          className="text-lg"
                          percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                          value={formatNullableCount(source.whatsapp_clicks)}
                        />
                      </div>
                      <TrafficSourceGroupToggle expanded={isExpanded} />
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
                                  {getTrafficSourceDetailLabel(childSource, source.groupKind)}
                                </p>
                                <TrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                                <TrafficSourceAverageBadge
                                  context={source.groupKind}
                                  fallbackPsychologistsCount={
                                    trafficSegmentSummary.psychologists_count
                                  }
                                  source={childSource}
                                />
                              </div>
                              <TrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <TrafficSourcePlatformMetrics source={childSource} />
                            </div>
                            <div className="flex justify-center text-center">
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <TrafficSourceMetricValue
                                  className="text-base"
                                  percentage={getWhatsappClicksPercentage(
                                    childSource.whatsapp_clicks,
                                  )}
                                  value={formatNullableCount(childSource.whatsapp_clicks)}
                                />
                                <TrafficSourceWhatsappClickActorBreakdown source={childSource} />
                              </span>
                            </div>
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="px-4 py-3">
                          <TrafficSourceProfileMetricsDetail
                            fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
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
                    <TrafficSourceAverageBadge
                      context={source.groupKind}
                      fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                      source={source}
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                    {source.description}
                  </p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 text-center">
                  <div className="flex justify-center">
                    <TrafficSourceMetricValue
                      className="text-lg"
                      percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                      value={formatNullableCount(source.whatsapp_clicks)}
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
          const isExpandableGroup = isExpandableTrafficSourceGroup(source);
          const isExpanded = isExpandableGroup ? expandedTrafficSourceGroups.has(source.id) : false;
          const metricBlock = (
            <div className="mt-4 rounded-2xl bg-surface p-3">
              <p className="text-[0.68rem] font-black text-muted">WhatsApp</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="inline-flex flex-col items-start gap-0.5">
                  <TrafficSourceMetricValue
                    className="text-base"
                    percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                    value={formatNullableCount(source.whatsapp_clicks)}
                  />
                  <TrafficSourceWhatsappClickActorBreakdown align="start" source={source} />
                </span>
                {isExpandableGroup ? <TrafficSourceGroupToggle expanded={isExpanded} /> : null}
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
                    {!isExpandableGroup ? (
                      <TrafficSourceAverageBadge
                        context={source.groupKind}
                        fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                        source={source}
                      />
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
                                  {getTrafficSourceDetailLabel(childSource, source.groupKind)}
                                </p>
                                <TrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                                <TrafficSourceAverageBadge
                                  context={source.groupKind}
                                  fallbackPsychologistsCount={
                                    trafficSegmentSummary.psychologists_count
                                  }
                                  source={childSource}
                                />
                              </div>
                              <TrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <TrafficSourcePlatformMetrics source={childSource} />
                            </div>
                            <span className="inline-flex shrink-0 flex-col items-end gap-0.5 text-right">
                              <TrafficSourceMetricValue
                                className="text-sm"
                                percentage={getWhatsappClicksPercentage(
                                  childSource.whatsapp_clicks,
                                )}
                                value={formatNullableCount(childSource.whatsapp_clicks)}
                              />
                              <TrafficSourceWhatsappClickActorBreakdown
                                align="end"
                                source={childSource}
                              />
                            </span>
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="py-2 first:pt-0 last:pb-0">
                          <TrafficSourceProfileMetricsDetail
                            className="pl-3"
                            fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
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
