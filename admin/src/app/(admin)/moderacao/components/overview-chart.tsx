"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

import {
  Card,
  categoryLabels,
  chartMetricValue,
  filterChartPointsByRange,
  formatOverviewPeriod,
  getOverviewRangeForPeriod,
  getOverviewSourceRange,
  type ModerationChartMetric,
  type ModerationChartPoint,
  numberFormatter,
  type OverviewPeriodPreset,
  type OverviewPeriodValue,
  type OverviewRange,
  rangeIsValid,
  withDerivedMetricValues,
} from "../modules/overview-support";

import { OverviewMetricCard, OverviewPeriodControls } from "./overview-controls";

export const OverviewTimelineChart = ({
  ariaLabel,
  metrics,
  points,
  visibleMetricKeys,
}: {
  ariaLabel: string;
  metrics: ModerationChartMetric[];
  points: ModerationChartPoint[];
  visibleMetricKeys: string[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = metrics
    .filter((metric) => visibleMetricKeys.includes(metric.key))
    .map((metric) => ({ color: metric.color, key: metric.key }));

  if (series.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de evolução foi encontrado para este período.
      </div>
    );
  }

  const metricKeys = metrics.map((metric) => metric.key);
  const sourcePoints = withDerivedMetricValues(points, metrics);
  const chartPoints = aggregateCalendarChartPoints(
    sourcePoints as ({ date: string } & Record<string, number>)[],
    metricKeys,
  );
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0))),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label={ariaLabel}
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`moderation-grid-${value}-${y}`}>
                <line
                  opacity="0.58"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: getX(index),
              y: getY(Number(point[item.key] ?? 0)),
            }));
            const path = buildSmoothSvgPath(linePoints);

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  opacity="0.88"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.05"
                />
                {linePoints.map((point, index) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${chartPoints[index].date}`}
                    opacity={index === linePoints.length - 1 ? "1" : "0.72"}
                    r={index === linePoints.length - 1 ? "3.1" : "2.1"}
                    stroke={item.color}
                    strokeWidth="1.45"
                  />
                ))}
              </g>
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
    </figure>
  );
};

export const OverviewChartBlock = ({
  ariaLabel,
  href,
  metrics,
  points,
  selector,
  title,
}: {
  ariaLabel: string;
  href: string;
  metrics: ModerationChartMetric[];
  points: ModerationChartPoint[];
  selector?: ReactNode;
  title: string;
}) => {
  const [period, setPeriod] = useState<OverviewPeriodValue>("all");
  const [customRange, setCustomRange] = useState<OverviewRange>(() =>
    getOverviewSourceRange(points),
  );
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<string[]>(() =>
    metrics.map((metric) => metric.key),
  );
  const sourceRange = useMemo(() => getOverviewSourceRange(points), [points]);
  const displayRange =
    period === "custom" ? customRange : getOverviewRangeForPeriod(period, sourceRange);
  const rangeError = rangeIsValid(displayRange)
    ? null
    : "Informe data inicial menor ou igual à final.";
  const visiblePoints = useMemo(
    () => filterChartPointsByRange(points, displayRange),
    [displayRange, points],
  );
  const activeMetricKeys = metrics
    .map((metric) => metric.key)
    .filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: string) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };
  const handlePeriodChange = (nextPeriod: OverviewPeriodPreset) => {
    setPeriod(nextPeriod);
    setCustomRange(getOverviewRangeForPeriod(nextPeriod, sourceRange));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setPeriod("custom");
    setCustomRange({ ...displayRange, [field]: value });
  };

  return (
    <Card className="min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {formatOverviewPeriod(period, displayRange, points.length > 0)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:w-auto xl:flex-nowrap xl:justify-end">
            {selector}
            <OverviewPeriodControls
              onDateChange={handleDateChange}
              onPeriodChange={handlePeriodChange}
              period={period}
              range={displayRange}
              rangeError={rangeError}
              title={title}
            />
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-control transition hover:border-border-strong hover:text-primary"
              href={href}
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir lista
            </Link>
          </div>
        </div>
      </div>
      <fieldset
        className={cn(
          "mt-5 grid grid-cols-2 gap-3",
          metrics.length === 2
            ? "md:grid-cols-2"
            : metrics.length === 4
              ? "md:grid-cols-2 xl:grid-cols-4"
              : "md:grid-cols-3",
        )}
      >
        <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
        {metrics.map((metric) => (
          <OverviewMetricCard
            active={activeMetricKeys.includes(metric.key)}
            color={metric.color}
            icon={metric.icon}
            key={metric.key}
            label={metric.label}
            onToggle={() => toggleMetric(metric.key)}
            value={chartMetricValue(visiblePoints, metric.key)}
          />
        ))}
      </fieldset>
      <OverviewTimelineChart
        ariaLabel={ariaLabel}
        metrics={metrics}
        points={visiblePoints}
        visibleMetricKeys={activeMetricKeys}
      />
    </Card>
  );
};

export const chartPoints = <T extends { date: string }>(points: T[]): ModerationChartPoint[] =>
  points as ModerationChartPoint[];

export const sensitiveCategoryOptionLabel = (category: string) =>
  category === "all" ? "Todas" : (categoryLabels[category] ?? category);
