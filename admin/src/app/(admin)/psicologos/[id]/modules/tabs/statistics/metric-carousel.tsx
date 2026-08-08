"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useRef } from "react";
import type {
  AdminPsychologistEngagementMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import type { StatisticsChartMetric } from "../../support/config";
import { BUSINESS_SERIES_METRIC_KEYS } from "../../support/config";
import { buildStatisticsMetricComparison } from "../../support/formatters";

const defaultStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]";

export const businessStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] xl:w-[calc((100%_-_1.5rem)/4)] 2xl:w-[calc((100%_-_2rem)/5)]";

export const visibilityStatisticsMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)]";

export const StatisticsMetricCarousel = ({
  items,
  itemClassName = defaultStatisticsMetricItemClassName,
  showNavigation = true,
  title,
}: {
  items: { content: ReactNode; id: string }[];
  itemClassName?: string;
  showNavigation?: boolean;
  title: string;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMetrics = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(260, scroller.clientWidth * 0.82),
    });
  }, []);

  return (
    <fieldset className="mt-5 min-w-0 max-w-full overflow-x-clip">
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div
        className={cn("relative min-w-0 max-w-full", showNavigation ? "px-11 sm:px-12" : "px-0")}
      >
        {showNavigation ? (
          <button
            aria-label={`Rolar contadores de ${title} para a esquerda`}
            className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={() => scrollMetrics(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {items.map((item) => (
            <div className={itemClassName} key={item.id}>
              {item.content}
            </div>
          ))}
        </div>
        {showNavigation ? (
          <button
            aria-label={`Rolar contadores de ${title} para a direita`}
            className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={() => scrollMetrics(1)}
            type="button"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </fieldset>
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
