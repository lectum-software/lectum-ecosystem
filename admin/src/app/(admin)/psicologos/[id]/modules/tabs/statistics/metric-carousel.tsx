"use client";

import type { ReactNode } from "react";
import type {
  AdminPsychologistEngagementMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import {
  AdminMetricCarousel,
  adminSixColumnMetricItemClassName,
} from "@/components/admin-metric-carousel";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import type { StatisticsChartMetric } from "../../support/config";
import { BUSINESS_SERIES_METRIC_KEYS } from "../../support/config";
import { buildStatisticsMetricComparison } from "../../support/formatters";

export const businessStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] xl:w-[calc((100%_-_1.5rem)/4)] 2xl:w-[calc((100%_-_2rem)/5)]";

export const visibilityStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)]";

export const StatisticsMetricCarousel = ({
  items,
  itemClassName = adminSixColumnMetricItemClassName,
  showNavigation = true,
  title,
}: {
  items: { content: ReactNode; id: string }[];
  itemClassName?: string;
  showNavigation?: boolean;
  title: string;
}) => {
  return (
    <AdminMetricCarousel
      constrainWidth
      itemClassName={itemClassName}
      items={items}
      showNavigation={showNavigation}
      title={title}
    />
  );
};

export const aggregateStatisticsChartPoints = (
  points: AdminPsychologistStatistics["business"]["series"],
) =>
  aggregateCalendarChartPoints(points, BUSINESS_SERIES_METRIC_KEYS, {
    metricAggregations: { coverage_rate_percent: "last" },
  });

export const sumStatisticsChartMetricValue = (
  points: AdminPsychologistStatistics["business"]["series"],
  metric: StatisticsChartMetric,
) => Math.round(points.reduce((total, point) => total + metric.getValue(point), 0));

const getPreviousStatisticsMetricValue = (
  metrics: Map<string, AdminPsychologistEngagementMetric>,
  id: string,
) => metrics.get(id)?.comparison?.previous_value ?? 0;

export const buildDerivedBusinessMetricComparison = ({
  config,
  current,
  metrics,
  period,
}: {
  config: StatisticsChartMetric;
  current: number;
  metrics: Map<string, AdminPsychologistEngagementMetric>;
  period: AdminPsychologistStatistics["period"];
}): AdminPsychologistEngagementMetric["comparison"] | null => {
  if (config.id === "engagement_score") {
    const previous = Math.max(
      0,
      getPreviousStatisticsMetricValue(metrics, "upvotes") * 2 +
        getPreviousStatisticsMetricValue(metrics, "comments_received") * 5 +
        getPreviousStatisticsMetricValue(metrics, "shares") * 8 +
        getPreviousStatisticsMetricValue(metrics, "saves") * 2 -
        getPreviousStatisticsMetricValue(metrics, "downvotes") * 3,
    );

    return buildStatisticsMetricComparison({ current, period, previous });
  }

  if (config.id === "activity_score") {
    const previous =
      getPreviousStatisticsMetricValue(metrics, "posts") +
      getPreviousStatisticsMetricValue(metrics, "replies");

    return buildStatisticsMetricComparison({ current, period, previous });
  }

  return null;
};

export const withStatisticsChartMetricConfig = (
  metric: AdminPsychologistEngagementMetric,
  config: StatisticsChartMetric,
): AdminPsychologistEngagementMetric => ({
  ...metric,
  id: config.id,
  label: config.label,
  source: config.source,
});

export const buildStatisticsOverviewMetric = ({
  comparison,
  config,
  metric,
  points,
}: {
  comparison?: AdminPsychologistEngagementMetric["comparison"] | null;
  config: StatisticsChartMetric;
  metric?: AdminPsychologistEngagementMetric;
  points: AdminPsychologistStatistics["business"]["series"];
}): AdminPsychologistEngagementMetric => {
  const value = sumStatisticsChartMetricValue(points, config);

  if (metric) {
    return withStatisticsChartMetricConfig(
      {
        ...metric,
        comparison: metric.comparison ?? comparison ?? null,
        value: metric.value ?? value,
      },
      config,
    );
  }

  return {
    available: points.length > 0,
    comparison: comparison ?? null,
    id: config.id,
    label: config.label,
    source: config.source,
    unavailable_reason: points.length > 0 ? null : "Sem pontos no período",
    unit: config.unit ?? "count",
    value,
  };
};
