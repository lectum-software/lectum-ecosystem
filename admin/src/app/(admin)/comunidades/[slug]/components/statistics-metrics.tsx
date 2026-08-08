"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useRef } from "react";
import type { AdminCommunityStatisticsDailyPoint } from "@/api/req/communities";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import {
  cardClass,
  numberFormatter,
  percentageFormatter,
  type StatisticsPeriodValue,
  statisticsPeriodOptions,
} from "../modules/detail-support";
import {
  type CommunityStatisticsDateFilterProps,
  type CommunityStatisticsMetricComparison,
  type CommunityStatisticsMetricItem,
  communityStatisticsMetricAggregations,
  formatCommunityStatisticsComparisonChange,
  formatCommunityStatisticsPreviousPeriod,
} from "../modules/statistics-support";
import { QueryStatus } from "./content-controls";
import { CommunityReportFilterSelect } from "./report-cards";

export const CommunityStatisticsMetricComparisonLine = ({
  comparison,
}: {
  comparison: CommunityStatisticsMetricComparison;
}) => {
  const hasArrow = comparison.trend === "up" || comparison.trend === "down";
  const TrendIcon = comparison.trend === "down" ? ArrowDown : ArrowUp;

  return (
    <span className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[0.68rem]">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-black",
          comparison.trend === "up" && "text-success",
          comparison.trend === "down" && "text-danger",
          (comparison.trend === "flat" || comparison.trend === "unavailable") && "text-muted",
        )}
      >
        {hasArrow ? <TrendIcon aria-hidden className="h-3 w-3" /> : null}
        {formatCommunityStatisticsComparisonChange(comparison.change_percent)}
      </span>
      <span className="min-w-0 break-words font-bold text-muted">
        vs. {formatCommunityStatisticsPreviousPeriod(comparison)}
      </span>
    </span>
  );
};

export const CommunityStatisticsMetricToggleCard = ({
  active,
  metric,
  onToggle,
}: {
  active: boolean;
  metric: CommunityStatisticsMetricItem;
  onToggle: () => void;
}) => {
  const Icon = metric.icon;
  const formattedValue = numberFormatter.format(metric.value);
  const detailTitle = metric.details
    ?.map(
      (detail) =>
        `${detail.label}: ${numberFormatter.format(detail.value)} (${percentageFormatter.format(
          detail.percentage,
        )}%)`,
    )
    .join(". ");
  const comparisonTitle = metric.comparison
    ? `${formatCommunityStatisticsComparisonChange(
        metric.comparison.change_percent,
      )} vs. ${formatCommunityStatisticsPreviousPeriod(metric.comparison)}`
    : null;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={
        metric.label +
        ": " +
        formattedValue +
        ". " +
        (comparisonTitle ? `${comparisonTitle}. ` : "") +
        (detailTitle ? `${detailTitle}. ` : "") +
        (active ? "Visível no gráfico" : "Oculto no gráfico")
      }
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          metric.iconToneClassName,
          metric.iconClassName,
        )}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="mt-4 block min-w-0 max-w-full">
        <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
          {metric.label}
        </span>
        <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
          {formattedValue}
        </span>
        {metric.comparison ? (
          <CommunityStatisticsMetricComparisonLine comparison={metric.comparison} />
        ) : null}
        {metric.details?.length ? (
          <span className="mt-3 grid gap-1">
            {metric.details.map((detail) => (
              <span
                className="flex items-center justify-between gap-2 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-extrabold leading-none text-muted"
                key={detail.id}
              >
                <span>{detail.label}</span>
                <span className="text-foreground">
                  {`${numberFormatter.format(detail.value)} (${percentageFormatter.format(
                    detail.percentage,
                  )}%)`}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

export const CommunityStatisticsMetricCarousel = ({
  metrics,
  onToggleMetric,
  title,
  visibleMetricIds,
}: {
  metrics: CommunityStatisticsMetricItem[];
  onToggleMetric: (metricId: string) => void;
  title: string;
  visibleMetricIds: string[];
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
    <fieldset className="mt-5 min-w-0">
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div className="relative min-w-0 px-11 sm:px-12">
        <button
          aria-label={`Rolar contadores de ${title} para a esquerda`}
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {metrics.map((metric) => (
            <div
              className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]"
              key={metric.id}
            >
              <CommunityStatisticsMetricToggleCard
                active={visibleMetricIds.includes(metric.id)}
                metric={metric}
                onToggle={() => onToggleMetric(metric.id)}
              />
            </div>
          ))}
        </div>
        <button
          aria-label={`Rolar contadores de ${title} para a direita`}
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
};

export const CommunityStatisticsMetricGrid = ({
  metrics,
  onToggleMetric,
  title,
  visibleMetricIds,
}: {
  metrics: CommunityStatisticsMetricItem[];
  onToggleMetric: (metricId: string) => void;
  title: string;
  visibleMetricIds: string[];
}) => (
  <fieldset className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
    <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
    {metrics.map((metric) => (
      <CommunityStatisticsMetricToggleCard
        active={visibleMetricIds.includes(metric.id)}
        key={metric.id}
        metric={metric}
        onToggle={() => onToggleMetric(metric.id)}
      />
    ))}
  </fieldset>
);

export const CommunityStatisticsSeriesChart = ({
  metrics,
  points,
}: {
  metrics: readonly CommunityStatisticsMetricItem[];
  points: AdminCommunityStatisticsDailyPoint[];
}) => {
  if (metrics.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const metricKeys = metrics.map((metric) => metric.key);
  const chartPoints = aggregateCalendarChartPoints(points, metricKeys, {
    dayThreshold: 45,
    metricAggregations: communityStatisticsMetricAggregations,
  });
  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const max = Math.max(
    1,
    ...chartPoints.flatMap((point) => metrics.map((metric) => Number(point[metric.key] ?? 0))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    id: String(ratio),
    value: Math.round(max * ratio),
  }));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <div className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Evolução do período por contador selecionado"
          className="block h-auto w-full"
          height={chartHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Evolução do período</title>
          {gridValues.map(({ id, value }) => {
            const y = yFor(value);

            return (
              <g key={`community-statistics-grid-${id}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={value === 0 ? "0" : "4 6"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="fill-muted text-[10px] font-medium"
                  dominantBaseline="middle"
                  textAnchor="end"
                  x={padding.left - 8}
                  y={y}
                >
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {metrics.map((metric) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[metric.key] ?? 0)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                className={cn("fill-none opacity-90", metric.strokeClassName)}
                d={linePath}
                key={metric.id}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {metrics.map((metric) =>
            chartPoints.map((point, index) => {
              const value = Number(point[metric.key] ?? 0);

              return (
                <circle
                  className={cn("fill-surface", metric.strokeClassName)}
                  cx={xFor(index)}
                  cy={yFor(value)}
                  key={`${metric.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {metric.label}: {numberFormatter.format(value)}
                  </title>
                </circle>
              );
            }),
          )}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CommunityStatisticsDateFilters = ({
  draftRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  periodOptions = statisticsPeriodOptions,
  rangeError,
  selectedPeriod,
}: CommunityStatisticsDateFilterProps) => (
  <div className="w-full lg:w-[min(720px,52vw)]" onBlur={onDateControlsBlur}>
    <div className="grid gap-2 sm:grid-cols-3">
      <CommunityReportFilterSelect
        className="text-xs"
        label="Período"
        onChange={(value) => onPeriodChange(value as StatisticsPeriodValue)}
        value={selectedPeriod}
      >
        {selectedPeriod === "custom" ? (
          <option disabled hidden value="custom">
            Personalizado
          </option>
        ) : null}
        {periodOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </CommunityReportFilterSelect>
      <label className="block text-xs font-black text-muted">
        De
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
          max={draftRange.to}
          onChange={(event) => onDateChange("from", event.target.value)}
          type="date"
          value={draftRange.from}
        />
      </label>
      <label className="block text-xs font-black text-muted">
        Até
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
          min={draftRange.from}
          onChange={(event) => onDateChange("to", event.target.value)}
          type="date"
          value={draftRange.to}
        />
      </label>
    </div>
    {rangeError ? <p className="mt-2 text-xs font-bold text-danger">{rangeError}</p> : null}
  </div>
);

export const CommunityStatisticsSegment = ({
  counterLayout = "carousel",
  dateFilters,
  description,
  error,
  isFetching,
  isLoading,
  metrics,
  onToggleMetric,
  onRetry,
  points,
  title,
  visibleMetricIds,
}: {
  counterLayout?: "carousel" | "grid";
  dateFilters: CommunityStatisticsDateFilterProps;
  description: string;
  error: unknown;
  isFetching: boolean;
  isLoading: boolean;
  metrics: CommunityStatisticsMetricItem[];
  onToggleMetric: (metricId: string) => void;
  onRetry: () => void;
  points: AdminCommunityStatisticsDailyPoint[];
  title: string;
  visibleMetricIds: string[];
}) => {
  const visibleMetrics = metrics.filter((metric) => visibleMetricIds.includes(metric.id));
  const hasStatistics = metrics.length > 0;
  const hasStatus = isLoading || Boolean(error);

  return (
    <section
      aria-busy={isLoading || isFetching}
      className={cn(cardClass, "min-w-0 overflow-x-clip p-5")}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-foreground">{title}</h3>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">{description}</p>
        </div>
        <CommunityStatisticsDateFilters {...dateFilters} />
      </div>
      {hasStatus ? (
        <div className="mt-5">
          <QueryStatus error={error} loading={isLoading} onRetry={onRetry} />
        </div>
      ) : null}
      {hasStatistics ? (
        <>
          {counterLayout === "grid" ? (
            <CommunityStatisticsMetricGrid
              metrics={metrics}
              onToggleMetric={onToggleMetric}
              title={title}
              visibleMetricIds={visibleMetricIds}
            />
          ) : (
            <CommunityStatisticsMetricCarousel
              metrics={metrics}
              onToggleMetric={onToggleMetric}
              title={title}
              visibleMetricIds={visibleMetricIds}
            />
          )}
          <CommunityStatisticsSeriesChart metrics={visibleMetrics} points={points} />
        </>
      ) : null}
    </section>
  );
};
