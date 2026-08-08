"use client";

import { Eye, type LucideIcon, Search, UserRound, Video } from "lucide-react";
import type {
  AdminPsychologistEngagementMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import type {
  StatisticsChartMetric,
  VisibilityChartMetric,
  VisibilityMetricValuePoint,
} from "../../support/config";
import { numberFormatter, VISIBILITY_SERIES_METRIC_KEYS } from "../../support/config";
import { formatDurationSeconds, formatEngagementMetricValue } from "../../support/formatters";
import { MetricComparisonLine } from "./common";
import { aggregateStatisticsChartPoints } from "./metric-carousel";

const formatStatisticsChartMetricValue = (value: number, metric?: StatisticsChartMetric) => {
  if (metric?.unit === "seconds") return formatDurationSeconds(value);
  if (metric?.unit === "percentage") {
    return `${value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })}%`;
  }

  return numberFormatter.format(value);
};

export const StatisticsSeriesChart = ({
  keys,
  points,
}: {
  keys: readonly StatisticsChartMetric[];
  points: AdminPsychologistStatistics["business"]["series"];
}) => {
  if (keys.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador disponível para visualizar a evolução.
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

  const chartPoints = aggregateStatisticsChartPoints(points);
  const chartWidth = 1120;
  const chartHeight = 280;
  const rightAxisKeys = keys.filter((item) => item.unit === "seconds");
  const leftAxisKeys = keys.filter((item) => item.unit !== "seconds");
  const hasRightAxis = rightAxisKeys.length > 0;
  const hasLeftAxis = leftAxisKeys.length > 0;
  const padding = { bottom: 28, left: 42, right: hasRightAxis ? 86 : 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const leftMax = Math.max(
    1,
    ...chartPoints.flatMap((point) => leftAxisKeys.map((item) => item.getValue(point))),
  );
  const rightMax = Math.max(
    1,
    ...chartPoints.flatMap((point) => rightAxisKeys.map((item) => item.getValue(point))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yForRatio = (ratio: number) => padding.top + innerHeight - ratio * innerHeight;
  const yForMetric = (metric: StatisticsChartMetric, value: number) => {
    const axisMax = metric.unit === "seconds" ? rightMax : leftMax;

    return yForRatio(value / axisMax);
  };
  const gridRatios = [0, 0.25, 0.5, 0.75, 1];
  const leftAxisMetric = leftAxisKeys.length === 1 ? leftAxisKeys[0] : undefined;
  const rightAxisMetric = rightAxisKeys[0];
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
          {gridRatios.map((ratio) => {
            const y = yForRatio(ratio);
            const leftValue = Math.round(leftMax * ratio);
            const rightValue = Math.round(rightMax * ratio);

            return (
              <g key={`business-grid-${ratio}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={ratio === 0 ? "0" : "4 6"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                {hasLeftAxis ? (
                  <text
                    className="fill-muted text-[10px] font-medium"
                    dominantBaseline="middle"
                    textAnchor="end"
                    x={padding.left - 8}
                    y={y}
                  >
                    {formatStatisticsChartMetricValue(leftValue, leftAxisMetric)}
                  </text>
                ) : null}
                {hasRightAxis ? (
                  <text
                    className="fill-muted text-[10px] font-medium"
                    dominantBaseline="middle"
                    textAnchor="start"
                    x={chartWidth - padding.right + 10}
                    y={y}
                  >
                    {formatStatisticsChartMetricValue(rightValue, rightAxisMetric)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {hasLeftAxis ? (
            <line
              className="stroke-border"
              opacity="0.72"
              strokeWidth="1"
              x1={padding.left}
              x2={padding.left}
              y1={padding.top}
              y2={padding.top + innerHeight}
            />
          ) : null}
          {hasRightAxis ? (
            <line
              className="stroke-border"
              opacity="0.72"
              strokeWidth="1"
              x1={chartWidth - padding.right}
              x2={chartWidth - padding.right}
              y1={padding.top}
              y2={padding.top + innerHeight}
            />
          ) : null}
          {keys.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yForMetric(item, item.getValue(point)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                className={cn("fill-none opacity-90", item.strokeClassName)}
                d={linePath}
                key={item.id}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {keys.map((item) =>
            chartPoints.map((point, index) => {
              const value = item.getValue(point);

              return (
                <circle
                  className={cn("fill-surface", item.strokeClassName)}
                  cx={xFor(index)}
                  cy={yForMetric(item, value)}
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {item.label}:{" "}
                    {formatStatisticsChartMetricValue(value, item)}
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

const aggregateVisibilityChartPoints = (
  points: AdminPsychologistStatistics["business"]["visibility"]["series"],
) => aggregateCalendarChartPoints(points, VISIBILITY_SERIES_METRIC_KEYS);

export const sumVisibilityChartMetricValue = (
  points: AdminPsychologistStatistics["business"]["visibility"]["series"],
  metric: VisibilityChartMetric,
) => Math.round(points.reduce((total, point) => total + metric.getValue(point), 0));

export const VisibilityMetricToggleCard = ({
  active,
  config,
  metric,
  onToggle,
}: {
  active: boolean;
  config: VisibilityChartMetric;
  metric: AdminPsychologistEngagementMetric;
  onToggle: () => void;
}) => {
  const displayValue = metric.available ? formatEngagementMetricValue(metric) : "—";
  const Icon = config.icon;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
        !metric.available &&
          "cursor-not-allowed border-border bg-surface-muted opacity-60 shadow-none hover:border-border",
      )}
      disabled={!metric.available}
      onClick={onToggle}
      title={`${metric.label}: ${displayValue}. ${
        !metric.available ? "Indisponível" : active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <span className="block min-w-0 max-w-full">
        <span className="block">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              config.iconToneClassName,
              config.iconClassName,
            )}
          >
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </span>
        <span className="mt-4 block min-w-0 max-w-full">
          <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
            {metric.label}
          </span>
          <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
            {displayValue}
          </span>
        </span>
      </span>
      {metric.available && metric.comparison ? (
        <MetricComparisonLine className="mt-3" comparison={metric.comparison} />
      ) : metric.unavailable_reason ? (
        <span className="mt-3 block text-xs font-bold text-muted">{metric.unavailable_reason}</span>
      ) : null}
      <span className="sr-only">
        {!metric.available ? "Indisponível" : active ? "visível no gráfico" : "oculto no gráfico"}
      </span>
    </button>
  );
};

export const VisibilityStackedTimeChart = ({
  metrics,
  points,
}: {
  metrics: readonly VisibilityChartMetric[];
  points: AdminPsychologistStatistics["business"]["visibility"]["series"];
}) => {
  if (metrics.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador disponível para visualizar a visibilidade.
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de visibilidade foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = aggregateVisibilityChartPoints(points);
  const chartWidth = 1120;
  const chartHeight = 320;
  const padding = { bottom: 34, left: 54, right: 32, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const totalFor = (point: VisibilityMetricValuePoint) =>
    metrics.reduce((total, metric) => total + metric.getValue(point), 0);
  const max = Math.max(1, ...chartPoints.map(totalFor));
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridRatios = [0, 0.25, 0.5, 0.75, 1];
  const barWidth = Math.max(9, Math.min(28, (innerWidth / Math.max(1, chartPoints.length)) * 0.56));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );
  const linePoints = chartPoints.map((point, index) => ({
    x: xFor(index),
    y: yFor(totalFor(point)),
  }));
  const linePath = buildSmoothSvgPath(linePoints);

  return (
    <div className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Visibilidade por tempo de perfil, vídeo e conteúdo"
          className="block h-auto w-full"
          height={chartHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Visibilidade por tempo</title>
          {gridRatios.map((ratio) => {
            const y = yFor(max * ratio);

            return (
              <g key={`visibility-grid-${ratio}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={ratio === 0 ? "0" : "4 6"}
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
                  {formatDurationSeconds(max * ratio)}
                </text>
              </g>
            );
          })}
          <line
            className="stroke-border"
            opacity="0.72"
            strokeWidth="1"
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + innerHeight}
          />
          {chartPoints.map((point, pointIndex) => {
            let stackStart = 0;

            return (
              <g key={point.date}>
                {metrics.map((metric) => {
                  const value = metric.getValue(point);
                  const yTop = yFor(stackStart + value);
                  const yBottom = yFor(stackStart);
                  stackStart += value;

                  return value > 0 ? (
                    <rect
                      className={metric.fillClassName}
                      height={Math.max(0, yBottom - yTop)}
                      key={metric.id}
                      opacity="0.72"
                      rx="4"
                      width={barWidth}
                      x={xFor(pointIndex) - barWidth / 2}
                      y={yTop}
                    >
                      <title>
                        {point.tooltipLabel} · {metric.label}: {formatDurationSeconds(value)}
                      </title>
                    </rect>
                  ) : null;
                })}
              </g>
            );
          })}
          <path
            className="fill-none stroke-foreground"
            d={linePath}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.35"
          />
          {linePoints.map((point, index) => {
            const chartPoint = chartPoints[index];

            return (
              <circle
                className="fill-surface stroke-foreground"
                cx={point.x}
                cy={point.y}
                key={`visibility-total-${chartPoint?.date ?? index}`}
                r={index === linePoints.length - 1 ? "3.7" : "2.7"}
                strokeWidth="1.65"
              >
                <title>
                  {chartPoint?.tooltipLabel} · Soma:{" "}
                  {formatDurationSeconds(chartPoint ? totalFor(chartPoint) : 0)}
                </title>
              </circle>
            );
          })}
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

const visibilityCounterIcon: Record<
  AdminPsychologistStatistics["business"]["visibility"]["counters"][number]["id"],
  LucideIcon
> = {
  content_views: Eye,
  presentation_video_explore_views: Video,
  profile_opens: UserRound,
  search_result_views: Search,
};

export const VisibilityCountersGrid = ({
  counters,
}: {
  counters: AdminPsychologistStatistics["business"]["visibility"]["counters"];
}) => (
  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {counters.map((counter) => {
      const Icon = visibilityCounterIcon[counter.id];

      return (
        <div
          className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/55 p-4"
          key={counter.id}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-primary ring-1 ring-border/80">
              <Icon aria-hidden className="h-4 w-4" />
            </span>
            <p className="min-w-0 text-xs font-black leading-snug text-muted">{counter.label}</p>
          </div>
          <p className="mt-3 text-2xl font-black leading-none text-foreground">
            {numberFormatter.format(counter.value)}
          </p>
        </div>
      );
    })}
  </div>
);
