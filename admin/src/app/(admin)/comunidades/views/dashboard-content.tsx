"use client";

import { useState } from "react";
import type { AdminCommunitiesDashboard } from "@/api/req/communities";
import {
  CommunitiesPeakActivityHoursCard,
  DashboardCareCoverageCard,
} from "../components/activity-coverage";
import {
  DashboardPeriodControls,
  type DashboardPeriodControlsProps,
  EmptyState,
} from "../components/common";
import { DashboardContentFormatDistributionsBlock } from "../components/content-formats";
import {
  PopularPostsTable,
  RecentPostsTable,
  TopCommunitiesTable,
} from "../components/post-tables";

import { DashboardStatisticsSection } from "../components/statistics";
import { formatShortRange } from "../modules/period-support";
import {
  buildDashboardStatisticMetricItems,
  hasPeriodRecords,
} from "../modules/statistics-builders";
import {
  DASHBOARD_CONTENT_STATISTICS_METRICS,
  DASHBOARD_PEOPLE_STATISTICS_METRICS,
  type DashboardStatisticMetricId,
} from "../modules/statistics-config";

export const DashboardContent = ({
  fixedSixMonthPeriodLabel,
  fixedSixMonthSummary,
  periodControls,
  periodLabel,
  summary,
}: {
  fixedSixMonthPeriodLabel: string;
  fixedSixMonthSummary: AdminCommunitiesDashboard;
  periodControls: Omit<DashboardPeriodControlsProps, "controlIdPrefix">;
  periodLabel: string;
  summary: AdminCommunitiesDashboard;
}) => {
  const noRecords = !hasPeriodRecords(summary);
  const [visiblePeopleMetricIds, setVisiblePeopleMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_PEOPLE_STATISTICS_METRICS.map((item) => item.id));
  const [visibleContentMetricIds, setVisibleContentMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_CONTENT_STATISTICS_METRICS.map((item) => item.id));
  const previousLabel = formatShortRange(summary.period.previous_from, summary.period.previous_to);
  const peopleMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_PEOPLE_STATISTICS_METRICS,
  );
  const contentMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_CONTENT_STATISTICS_METRICS,
  );
  const togglePeopleMetric = (id: DashboardStatisticMetricId) => {
    setVisiblePeopleMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };
  const toggleContentMetric = (id: DashboardStatisticMetricId) => {
    setVisibleContentMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };
  const renderPeriodControls = (controlIdPrefix: string) => (
    <DashboardPeriodControls controlIdPrefix={controlIdPrefix} {...periodControls} />
  );

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <DashboardStatisticsSection
        counterLayout="grid"
        filters={renderPeriodControls("communities-people-statistics")}
        metrics={peopleMetrics}
        onToggleMetric={togglePeopleMetric}
        periodLabel={periodLabel}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de pessoas"
        visibleMetricIds={visiblePeopleMetricIds}
      />

      <DashboardStatisticsSection
        counterLayout="carousel"
        filters={renderPeriodControls("communities-content-statistics")}
        metrics={contentMetrics}
        onToggleMetric={toggleContentMetric}
        periodLabel={periodLabel}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de conteúdo"
        visibleMetricIds={visibleContentMetricIds}
      />

      <DashboardCareCoverageCard
        filters={renderPeriodControls("communities-care-coverage")}
        periodLabel={periodLabel}
        statistics={summary.global_statistics.current}
      />

      <DashboardContentFormatDistributionsBlock statistics={summary.global_statistics.current} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <TopCommunitiesTable
          communities={fixedSixMonthSummary.top_communities.items}
          periodLabel={fixedSixMonthPeriodLabel}
        />
        <CommunitiesPeakActivityHoursCard
          periodLabel={fixedSixMonthPeriodLabel}
          points={fixedSixMonthSummary.global_statistics.current.charts.hourly_activity}
        />
      </div>

      <div className="min-w-0 space-y-5">
        <RecentPostsTable posts={summary.recent_posts.items} />
        <PopularPostsTable posts={summary.popular_posts.items} />
      </div>
    </div>
  );
};
