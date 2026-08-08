"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminPsychologistStatistics } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { Badge, CardShell, ErrorState } from "../../components/shared";
import type {
  BusinessChartMetricId,
  CommunityChartMetricId,
  VisibilityChartMetricId,
} from "../../support/config";
import {
  BUSINESS_CHART_METRICS,
  BUSINESS_PROFILE_CONVERSION_QUALITY_BADGE_CLASS,
  BUSINESS_VISIBILITY_DIAGNOSIS_BADGE_CLASS,
  BUSINESS_VISIBILITY_DIAGNOSIS_LABEL,
  COMMUNITY_CHART_METRICS,
  VISIBILITY_CHART_METRICS,
} from "../../support/config";
import { StatisticsGlobalPeriodCard, useStatisticsPeriodFilter } from "../../support/date-period";
import { formatStatisticsPeriodSummary } from "../../support/formatters";
import { EngagementLoadingState, StatisticsMetricToggleCard } from "./common";
import {
  ActiveCommunitiesTable,
  ContentFormatDistributionsBlock,
  communityEngagementDiagnosisClassName,
  formatPsychologistCommunityEngagementLabel,
  getPsychologistCommunityInteractions,
  resolvePsychologistCommunityActivityDiagnosis,
} from "./community";
import {
  buildDerivedBusinessMetricComparison,
  buildStatisticsOverviewMetric,
  businessStatisticsMetricItemClassName,
  StatisticsMetricCarousel,
  sumStatisticsChartMetricValue,
  visibilityStatisticsMetricItemClassName,
  withStatisticsChartMetricConfig,
} from "./metric-carousel";
import { PsychologistPlatformActivityHoursCard, PsychologistPlatformUsageCard } from "./platform";
import {
  StatisticsSeriesChart,
  sumVisibilityChartMetricValue,
  VisibilityCountersGrid,
  VisibilityMetricToggleCard,
  VisibilityStackedTimeChart,
} from "./series";
import { PsychologistTrafficSourcesCard } from "./traffic-card";
import { StatisticsVideoCard } from "./video";

export const StatisticsTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const statisticsPeriodFilter = useStatisticsPeriodFilter(detail.header.created_at);
  const [communityStatisticsSelectedCommunity, setCommunityStatisticsSelectedCommunity] =
    useState("all");
  const communityStatisticsPeriodQuery = useMemo(
    () => ({
      ...statisticsPeriodFilter.periodQuery,
      ...(communityStatisticsSelectedCommunity !== "all"
        ? { community: communityStatisticsSelectedCommunity }
        : {}),
    }),
    [statisticsPeriodFilter.periodQuery, communityStatisticsSelectedCommunity],
  );
  const statisticsQuery = useAdminPsychologistStatistics(id, statisticsPeriodFilter.periodQuery);
  const communityStatisticsQuery = useAdminPsychologistStatistics(
    id,
    communityStatisticsPeriodQuery,
  );
  const statisticsQueries = [statisticsQuery, communityStatisticsQuery] as const;
  const [visibleBusinessMetricIds, setVisibleBusinessMetricIds] = useState<BusinessChartMetricId[]>(
    () => BUSINESS_CHART_METRICS.map((item) => item.id),
  );
  const [visibleVisibilityMetricIds, setVisibleVisibilityMetricIds] = useState<
    VisibilityChartMetricId[]
  >(() => VISIBILITY_CHART_METRICS.map((item) => item.id));
  const [visibleCommunityMetricIds, setVisibleCommunityMetricIds] = useState<
    CommunityChartMetricId[]
  >(() => COMMUNITY_CHART_METRICS.map((item) => item.id));
  const availableBusinessMetricIds = useMemo<BusinessChartMetricId[]>(() => {
    return BUSINESS_CHART_METRICS.map((item) => item.id);
  }, []);
  const availableVisibilityMetricIds = useMemo<VisibilityChartMetricId[]>(() => {
    const availableIds = new Set(
      (statisticsQuery.data?.business.visibility.cards ?? [])
        .filter((metric) => metric.available)
        .map((metric) => metric.id),
    );
    const ids = VISIBILITY_CHART_METRICS.filter((item) => availableIds.has(item.id)).map(
      (item) => item.id,
    );

    return ids.length > 0 ? ids : VISIBILITY_CHART_METRICS.map((item) => item.id);
  }, [statisticsQuery.data?.business.visibility.cards]);
  const availableCommunityMetricIds = useMemo<CommunityChartMetricId[]>(() => {
    const availableIds = new Set(
      (communityStatisticsQuery.data?.community.cards ?? [])
        .filter((metric) => metric.available)
        .map((metric) => metric.id),
    );
    const ids = COMMUNITY_CHART_METRICS.filter((item) => availableIds.has(item.id)).map(
      (item) => item.id,
    );

    return ids.length > 0 ? ids : COMMUNITY_CHART_METRICS.map((item) => item.id);
  }, [communityStatisticsQuery.data?.community.cards]);
  const isInitialStatisticsLoading = statisticsQueries.some(
    (query) => query.isLoading && !query.data,
  );
  const initialStatisticsErrorMessage = statisticsQueries.reduce<string | null>(
    (message, query) =>
      message ||
      (!query.data && query.isError && query.error ? resolveApiError(query.error) : null),
    null,
  );
  const isGlobalStatisticsRefreshing = statisticsQuery.isFetching && Boolean(statisticsQuery.data);
  const isCommunityRefreshing =
    communityStatisticsQuery.isFetching && Boolean(communityStatisticsQuery.data);
  const isBusinessRefreshing = isGlobalStatisticsRefreshing;
  const isVideoRefreshing = isGlobalStatisticsRefreshing;
  const isTrafficRefreshing = isGlobalStatisticsRefreshing;
  const isPlatformRefreshing = isGlobalStatisticsRefreshing;
  const isActiveCommunitiesRefreshing = isCommunityRefreshing;
  const isActivityHoursRefreshing = isGlobalStatisticsRefreshing;
  const refetchStatisticsQueries = () => {
    statisticsQueries.forEach((query) => {
      void query.refetch();
    });
  };

  if (isInitialStatisticsLoading) {
    return <EngagementLoadingState />;
  }
  if (initialStatisticsErrorMessage) {
    return (
      <ErrorState message={initialStatisticsErrorMessage} onRetry={refetchStatisticsQueries} />
    );
  }
  if (!statisticsQuery.data || !communityStatisticsQuery.data) {
    return null;
  }

  const businessStatistics = statisticsQuery.data;
  const videoStatistics = statisticsQuery.data;
  const trafficStatistics = statisticsQuery.data;
  const platformStatistics = statisticsQuery.data;
  const communityStatistics = communityStatisticsQuery.data;
  const activeCommunitiesStatistics = communityStatistics;
  const activityHoursStatistics = statisticsQuery.data;
  const businessProfileConversion = businessStatistics.business.profile_conversion;
  const businessVisibilityDiagnosis = businessStatistics.business.visibility.diagnosis;
  const businessVisibilityDiagnosisLabel =
    BUSINESS_VISIBILITY_DIAGNOSIS_LABEL[businessVisibilityDiagnosis.id] ??
    businessVisibilityDiagnosis.label;
  const businessMetricMap = new Map(
    businessStatistics.business.cards.map((metric) => [metric.id, metric]),
  );
  const businessCommunityMetricMap = new Map(
    businessStatistics.community.cards.map((metric) => [metric.id, metric]),
  );
  const communityMetricMap = new Map(
    communityStatistics.community.cards.map((metric) => [metric.id, metric]),
  );
  const visibilityMetricMap = new Map(
    businessStatistics.business.visibility.cards.map((metric) => [metric.id, metric]),
  );
  const businessCards = BUSINESS_CHART_METRICS.map((config) => {
    const sourceMetric =
      businessMetricMap.get(config.id) ?? businessCommunityMetricMap.get(config.id);
    const current = sumStatisticsChartMetricValue(businessStatistics.business.series, config);
    const comparison =
      sourceMetric?.comparison ??
      buildDerivedBusinessMetricComparison({
        config,
        current,
        metrics: businessCommunityMetricMap,
        period: businessStatistics.period,
      });

    return {
      config,
      metric: buildStatisticsOverviewMetric({
        comparison,
        config,
        metric: sourceMetric,
        points: businessStatistics.business.series,
      }),
    };
  });
  const visibilityCards = VISIBILITY_CHART_METRICS.map((config) => {
    const metric = visibilityMetricMap.get(config.id);
    const fallbackValue = sumVisibilityChartMetricValue(
      businessStatistics.business.visibility.series,
      config,
    );

    return {
      config,
      metric: metric
        ? {
            ...metric,
            id: config.id,
            label: config.label,
            unit: "seconds" as const,
            value: metric.value ?? fallbackValue,
          }
        : {
            available: businessStatistics.business.visibility.series.length > 0,
            comparison: null,
            id: config.id,
            label: config.label,
            source: businessStatistics.business.visibility.source,
            unavailable_reason:
              businessStatistics.business.visibility.series.length > 0
                ? null
                : "Sem pontos reais no período",
            unit: "seconds" as const,
            value: fallbackValue,
          },
    };
  });
  const communityCards = COMMUNITY_CHART_METRICS.flatMap((config) => {
    const metric = communityMetricMap.get(config.id);

    return metric ? [{ config, metric: withStatisticsChartMetricConfig(metric, config) }] : [];
  });
  const communityActivityActions =
    Math.max(0, Math.trunc(communityMetricMap.get("posts")?.value ?? 0)) +
    Math.max(0, Math.trunc(communityMetricMap.get("replies")?.value ?? 0));
  const communityActivityDiagnosis =
    resolvePsychologistCommunityActivityDiagnosis(communityActivityActions);
  const communityEngagementDiagnosis = communityStatistics.community.engagement_diagnosis;
  const hasSelectedCommunity =
    communityStatisticsSelectedCommunity === "all" ||
    statisticsQuery.data.community.communities.some(
      (community) =>
        community.id === communityStatisticsSelectedCommunity ||
        community.slug === communityStatisticsSelectedCommunity,
    );
  const communitySelectValue =
    communityStatisticsSelectedCommunity === "all" || hasSelectedCommunity
      ? communityStatisticsSelectedCommunity
      : "all";
  const activeCommunities = [...activeCommunitiesStatistics.community.communities]
    .filter((community) => getPsychologistCommunityInteractions(community) > 0)
    .sort((left, right) => {
      const leftTotal = getPsychologistCommunityInteractions(left);
      const rightTotal = getPsychologistCommunityInteractions(right);
      if (leftTotal !== rightTotal) return rightTotal - leftTotal;

      return left.name.localeCompare(right.name, "pt-BR");
    });
  const communityFilterOptions = [
    { id: "all", label: "Todas" },
    ...statisticsQuery.data.community.communities.map((community) => ({
      id: community.id,
      label: community.name,
    })),
  ];
  const visibleBusinessChartKeys = businessCards
    .filter(
      ({ config, metric }) => visibleBusinessMetricIds.includes(config.id) && metric.available,
    )
    .map(({ config }) => config);
  const visibleVisibilityChartKeys = visibilityCards
    .filter(
      ({ config, metric }) => visibleVisibilityMetricIds.includes(config.id) && metric.available,
    )
    .map(({ config }) => config);
  const visibleCommunityChartKeys = communityCards
    .filter(
      ({ config, metric }) => visibleCommunityMetricIds.includes(config.id) && metric.available,
    )
    .map(({ config }) => config);
  const toggleBusinessMetric = (metricId: BusinessChartMetricId) => {
    const metric = businessCards.find(({ config }) => config.id === metricId)?.metric;
    if (!metric?.available) return;

    setVisibleBusinessMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      const hasAnotherAvailable = next.some((item) => availableBusinessMetricIds.includes(item));

      return hasAnotherAvailable ? next : current;
    });
  };
  const toggleVisibilityMetric = (metricId: VisibilityChartMetricId) => {
    const metric = visibilityCards.find(({ config }) => config.id === metricId)?.metric;
    if (!metric?.available) return;

    setVisibleVisibilityMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      const hasAnotherAvailable = next.some((item) => availableVisibilityMetricIds.includes(item));

      return hasAnotherAvailable ? next : current;
    });
  };
  const toggleCommunityMetric = (metricId: CommunityChartMetricId) => {
    const metric = communityMetricMap.get(metricId);
    if (!metric?.available) return;

    setVisibleCommunityMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      const hasAnotherAvailable = next.some((item) => availableCommunityMetricIds.includes(item));

      return hasAnotherAvailable ? next : current;
    });
  };

  return (
    <div
      className="max-w-full space-y-5 overflow-x-clip"
      data-psychologist-detail-tab="estatisticas"
    >
      <StatisticsGlobalPeriodCard
        idPrefix="psychologist-statistics-global"
        onDateControlsBlur={statisticsPeriodFilter.handleDateControlsBlur}
        onDateChange={statisticsPeriodFilter.handleDateChange}
        onPeriodChange={statisticsPeriodFilter.handlePeriodChange}
        period={statisticsPeriodFilter.selectedPeriod}
        range={statisticsPeriodFilter.draftRange}
        rangeError={statisticsPeriodFilter.rangeError}
      />

      <section aria-busy={isTrafficRefreshing} className="grid max-w-full gap-5 overflow-x-clip">
        <PsychologistTrafficSourcesCard
          isRefreshing={isTrafficRefreshing}
          periodControls={null}
          statistics={trafficStatistics}
        />
      </section>

      <section
        aria-busy={isBusinessRefreshing || isVideoRefreshing}
        className="grid max-w-full gap-5 overflow-x-clip"
      >
        <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
          <div className="grid gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Conversão</h2>
                <Badge
                  className={cn(
                    "border border-current/10",
                    BUSINESS_PROFILE_CONVERSION_QUALITY_BADGE_CLASS[
                      businessProfileConversion.quality.id
                    ],
                  )}
                >
                  {businessProfileConversion.quality.label}
                </Badge>
                {isBusinessRefreshing ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                    Atualizando
                  </span>
                ) : null}
              </div>
            </div>
            <p className="min-w-0 text-xs font-bold leading-5 text-muted">
              {formatStatisticsPeriodSummary(businessStatistics.period)}
            </p>
          </div>

          <StatisticsMetricCarousel
            itemClassName={businessStatisticsMetricItemClassName}
            items={businessCards.map(({ config, metric }) => ({
              content: (
                <StatisticsMetricToggleCard
                  active={visibleBusinessMetricIds.includes(config.id) && metric.available}
                  config={config}
                  metric={metric}
                  onToggle={() => toggleBusinessMetric(config.id)}
                />
              ),
              id: config.id,
            }))}
            showNavigation={false}
            title="conversão"
          />

          <StatisticsSeriesChart
            keys={visibleBusinessChartKeys}
            points={businessStatistics.business.series}
          />
        </CardShell>

        <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
          <div className="grid gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Visibilidade</h2>
                <Badge
                  className={cn(
                    "border border-current/10",
                    BUSINESS_VISIBILITY_DIAGNOSIS_BADGE_CLASS[businessVisibilityDiagnosis.id],
                  )}
                  title={businessVisibilityDiagnosis.description}
                >
                  {businessVisibilityDiagnosisLabel}
                </Badge>
                {isBusinessRefreshing ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                    Atualizando
                  </span>
                ) : null}
              </div>
            </div>
            <p className="min-w-0 text-xs font-bold leading-5 text-muted">
              {formatStatisticsPeriodSummary(businessStatistics.period)}
            </p>
          </div>

          <StatisticsMetricCarousel
            itemClassName={visibilityStatisticsMetricItemClassName}
            items={visibilityCards.map(({ config, metric }) => ({
              content: (
                <VisibilityMetricToggleCard
                  active={visibleVisibilityMetricIds.includes(config.id) && metric.available}
                  config={config}
                  metric={metric}
                  onToggle={() => toggleVisibilityMetric(config.id)}
                />
              ),
              id: config.id,
            }))}
            showNavigation={false}
            title="visibilidade"
          />

          <VisibilityStackedTimeChart
            metrics={visibleVisibilityChartKeys}
            points={businessStatistics.business.visibility.series}
          />

          <VisibilityCountersGrid counters={businessStatistics.business.visibility.counters} />
        </CardShell>

        <StatisticsVideoCard
          detail={detail}
          isRefreshing={isVideoRefreshing}
          periodControls={null}
          statistics={videoStatistics}
        />
      </section>

      <section
        aria-busy={
          isCommunityRefreshing ||
          isActiveCommunitiesRefreshing ||
          isActivityHoursRefreshing ||
          isPlatformRefreshing
        }
        className="grid max-w-full gap-5 overflow-x-clip"
      >
        <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Atividade e engajamento</h2>
                <Badge
                  className={communityEngagementDiagnosisClassName(communityActivityDiagnosis.id)}
                  title={`Atividade: ${communityActivityDiagnosis.label}`}
                >
                  {communityActivityDiagnosis.label}
                </Badge>
                <Badge
                  className={communityEngagementDiagnosisClassName(communityEngagementDiagnosis.id)}
                  title={`Engajamento: ${formatPsychologistCommunityEngagementLabel(
                    communityEngagementDiagnosis,
                  )}`}
                >
                  {formatPsychologistCommunityEngagementLabel(communityEngagementDiagnosis)}
                </Badge>
                {isCommunityRefreshing ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                    Atualizando
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">
                {formatStatisticsPeriodSummary(communityStatistics.period)}
              </p>
            </div>
            <div className="w-full xl:w-72">
              <label
                className="block text-xs font-black text-muted"
                htmlFor="community-statistics-community"
              >
                Comunidade
                <span className="relative mt-2 block">
                  <select
                    className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-black text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    id="community-statistics-community"
                    onChange={(event) =>
                      setCommunityStatisticsSelectedCommunity(event.target.value)
                    }
                    value={communitySelectValue}
                  >
                    {communityFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                  />
                </span>
              </label>
            </div>
          </div>

          <StatisticsMetricCarousel
            items={communityCards.map(({ config, metric }) => ({
              content: (
                <StatisticsMetricToggleCard
                  active={visibleCommunityMetricIds.includes(config.id) && metric.available}
                  config={config}
                  metric={metric}
                  onToggle={() => toggleCommunityMetric(config.id)}
                />
              ),
              id: config.id,
            }))}
            title="atividade e engajamento"
          />

          <StatisticsSeriesChart
            keys={visibleCommunityChartKeys}
            points={communityStatistics.community.series}
          />

          <ActiveCommunitiesTable communities={activeCommunities} />

          <ContentFormatDistributionsBlock
            cardClassName="bg-surface-muted/35 shadow-none"
            className="mt-5"
            distribution={activeCommunitiesStatistics.community.content_distribution}
            isRefreshing={isActiveCommunitiesRefreshing}
          />
        </CardShell>

        <PsychologistPlatformActivityHoursCard
          isRefreshing={isActivityHoursRefreshing}
          periodControls={null}
          statistics={activityHoursStatistics}
        />

        <PsychologistPlatformUsageCard
          isRefreshing={isPlatformRefreshing}
          periodControls={null}
          statistics={platformStatistics}
        />
      </section>
    </div>
  );
};
