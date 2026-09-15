"use client";
import { useCallback, useMemo, useState } from "react";
import { useAdminCommunityStatistics } from "@/api/callers/communities";
import { CommunityPeakActivityHoursBlock } from "../components/statistics-activity-hours";
import { CommunityCareCoverageBlock } from "../components/statistics-coverage";
import { CommunityContentFormatDistributionsBlock } from "../components/statistics-formats";
import { CommunityStatisticsSegment } from "../components/statistics-metrics";
import { disabledCommunityStatisticsComparisonQuery } from "../modules/detail-support";
import {
  buildCommunityStatisticsMetricItems,
  COMMUNITY_CONTENT_STATISTICS_METRICS,
  COMMUNITY_PEOPLE_STATISTICS_METRICS,
  toggleCommunityStatisticsMetricIds,
  useCommunityStatisticsDateFilterState,
} from "../modules/statistics-support";

export const StatisticsTab = ({ createdAt, slug }: { createdAt: string; slug: string }) => {
  return (
    <div className="min-w-0 overflow-x-clip space-y-5" data-community-detail-tab="estatisticas">
      <StatisticsContent createdAt={createdAt} slug={slug} />
    </div>
  );
};

export const StatisticsContent = ({ createdAt, slug }: { createdAt: string; slug: string }) => {
  const peopleDateState = useCommunityStatisticsDateFilterState(createdAt);
  const contentDateState = useCommunityStatisticsDateFilterState(createdAt);
  const careCoverageDateState = useCommunityStatisticsDateFilterState(createdAt);
  const activityHoursDateState = useCommunityStatisticsDateFilterState(createdAt, "all");
  const peopleResult = useAdminCommunityStatistics(slug, peopleDateState.queryInput);
  const contentResult = useAdminCommunityStatistics(slug, contentDateState.queryInput);
  const careCoverageResult = useAdminCommunityStatistics(slug, careCoverageDateState.queryInput);
  const activityHoursResult = useAdminCommunityStatistics(slug, activityHoursDateState.queryInput);
  const peopleComparisonResult = useAdminCommunityStatistics(
    slug,
    peopleDateState.comparisonQueryInput ?? disabledCommunityStatisticsComparisonQuery,
    { enabled: Boolean(peopleDateState.comparisonQueryInput) },
  );
  const contentComparisonResult = useAdminCommunityStatistics(
    slug,
    contentDateState.comparisonQueryInput ?? disabledCommunityStatisticsComparisonQuery,
    { enabled: Boolean(contentDateState.comparisonQueryInput) },
  );
  const peopleStatistics = peopleResult.data;
  const contentStatistics = contentResult.data;
  const careCoverageStatistics = careCoverageResult.data;
  const activityHoursStatistics = activityHoursResult.data;
  const peopleComparisonStatistics = peopleComparisonResult.data;
  const contentComparisonStatistics = contentComparisonResult.data;
  const peopleMetrics = useMemo(
    () =>
      peopleStatistics
        ? buildCommunityStatisticsMetricItems(
            peopleStatistics,
            COMMUNITY_PEOPLE_STATISTICS_METRICS,
            peopleComparisonStatistics,
          )
        : [],
    [peopleComparisonStatistics, peopleStatistics],
  );
  const contentMetrics = useMemo(
    () =>
      contentStatistics
        ? buildCommunityStatisticsMetricItems(
            contentStatistics,
            COMMUNITY_CONTENT_STATISTICS_METRICS,
            contentComparisonStatistics,
          )
        : [],
    [contentComparisonStatistics, contentStatistics],
  );
  const [visiblePeopleMetricIds, setVisiblePeopleMetricIds] = useState<string[]>(() =>
    COMMUNITY_PEOPLE_STATISTICS_METRICS.map((metric) => metric.id),
  );
  const [visibleContentMetricIds, setVisibleContentMetricIds] = useState<string[]>(() =>
    COMMUNITY_CONTENT_STATISTICS_METRICS.map((metric) => metric.id),
  );
  const togglePeopleMetric = useCallback((metricId: string) => {
    setVisiblePeopleMetricIds((current) => toggleCommunityStatisticsMetricIds(current, metricId));
  }, []);
  const toggleContentMetric = useCallback((metricId: string) => {
    setVisibleContentMetricIds((current) => toggleCommunityStatisticsMetricIds(current, metricId));
  }, []);

  return (
    <div className="min-w-0 space-y-5">
      <CommunityStatisticsSegment
        dateFilters={contentDateState.dateFilters}
        description="Visão geral do conteúdo e engajamento da comunidade."
        error={contentResult.error}
        isFetching={contentResult.isFetching || contentComparisonResult.isFetching}
        isLoading={contentResult.isLoading}
        metrics={contentMetrics}
        onToggleMetric={toggleContentMetric}
        onRetry={() => {
          void contentResult.refetch();
          if (contentDateState.comparisonQueryInput) void contentComparisonResult.refetch();
        }}
        points={contentStatistics?.charts.daily ?? []}
        title="Estatísticas de conteúdo"
        visibleMetricIds={visibleContentMetricIds}
      />
      <CommunityCareCoverageBlock
        dateFilters={careCoverageDateState.dateFilters}
        error={careCoverageResult.error}
        isFetching={careCoverageResult.isFetching}
        isLoading={careCoverageResult.isLoading}
        onRetry={() => void careCoverageResult.refetch()}
        statistics={careCoverageStatistics}
      />
      {careCoverageStatistics ? (
        <CommunityContentFormatDistributionsBlock
          isFetching={careCoverageResult.isFetching && !careCoverageResult.isLoading}
          statistics={careCoverageStatistics}
        />
      ) : null}
      <CommunityPeakActivityHoursBlock
        dateFilters={activityHoursDateState.dateFilters}
        error={activityHoursResult.error}
        isFetching={activityHoursResult.isFetching}
        isLoading={activityHoursResult.isLoading}
        onRetry={() => void activityHoursResult.refetch()}
        statistics={activityHoursStatistics}
      />
      <CommunityStatisticsSegment
        counterLayout="grid"
        dateFilters={peopleDateState.dateFilters}
        description="Visão geral de psicólogos e pacientes da comunidade."
        error={peopleResult.error}
        isFetching={peopleResult.isFetching || peopleComparisonResult.isFetching}
        isLoading={peopleResult.isLoading}
        metrics={peopleMetrics}
        onToggleMetric={togglePeopleMetric}
        onRetry={() => {
          void peopleResult.refetch();
          if (peopleDateState.comparisonQueryInput) void peopleComparisonResult.refetch();
        }}
        points={peopleStatistics?.charts.daily ?? []}
        title="Estatísticas de pessoas"
        visibleMetricIds={visiblePeopleMetricIds}
      />
    </div>
  );
};
