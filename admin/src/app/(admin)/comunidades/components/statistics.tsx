"use client";

import type { CommunitiesDashboardStatisticsDailyPoint } from "@/api/req/communities";
import {
  AdminMetricCarousel,
  adminSixColumnMetricItemClassName,
} from "@/components/admin-metric-carousel";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import { formatChange } from "../modules/period-support";
import {
  DASHBOARD_STATISTIC_METRIC_AGGREGATIONS,
  type DashboardStatisticMetricId,
  type DashboardStatisticMetricItem,
  dashboardStatisticToneClasses,
  numberFormatter,
  percentageFormatter,
} from "../modules/statistics-config";

import { CardShell } from "./common";

import { BlockPeriodLabel } from "./post-actions";

export const DashboardStatisticCard = ({
  item,
  onToggle,
  previousLabel,
  selected,
}: {
  item: DashboardStatisticMetricItem;
  onToggle: (id: DashboardStatisticMetricId) => void;
  previousLabel: string;
  selected: boolean;
}) => {
  const Icon = item.icon;
  const formattedValue = numberFormatter.format(item.value);
  const detailTitle = item.details
    ?.map(
      (detail) =>
        `${detail.label}: ${numberFormatter.format(detail.value)} (${percentageFormatter.format(
          detail.percentage,
        )}%)`,
    )
    .join(". ");

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={() => onToggle(item.id)}
      title={`${item.label}: ${formattedValue}. ${formatChange(
        item.changePercent,
      )} vs. ${previousLabel}. ${detailTitle ? `${detailTitle}. ` : ""}${
        selected ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          dashboardStatisticToneClasses[item.tone],
        )}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="mt-4 block min-w-0 max-w-full">
        <span className="block max-w-full break-words text-xs font-semibold leading-snug text-foreground">
          {item.label}
        </span>
        <span className="mt-2 block text-2xl font-semibold leading-none text-foreground">
          {formattedValue}
        </span>
        <span className="mt-3 block text-xs leading-5">
          <span
            className={cn(
              "font-semibold",
              item.changePercent === null
                ? "text-muted"
                : item.changePercent > 0
                  ? "text-success"
                  : item.changePercent < 0
                    ? "text-danger"
                    : "text-muted",
            )}
          >
            {formatChange(item.changePercent)}
          </span>
          <span className="ml-1 font-medium text-muted">vs. {previousLabel}</span>
        </span>

        {item.details?.length ? (
          <span className="mt-3 grid gap-1">
            {item.details.map((detail) => (
              <span
                className="flex items-center justify-between gap-2 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold leading-none text-muted"
                key={detail.label}
              >
                <span className="truncate">{detail.label}</span>
                <span className="shrink-0 text-foreground">
                  {`${numberFormatter.format(detail.value)} (${percentageFormatter.format(
                    detail.percentage,
                  )}%)`}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{selected ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

export const DashboardStatisticsMetricGrid = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => (
  <fieldset className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
    <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
    {metrics.map((metric) => (
      <DashboardStatisticCard
        item={metric}
        key={metric.id}
        onToggle={onToggleMetric}
        previousLabel={previousLabel}
        selected={visibleMetricIds.includes(metric.id)}
      />
    ))}
  </fieldset>
);

export const DashboardStatisticsMetricCarousel = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  return (
    <AdminMetricCarousel
      itemClassName={adminSixColumnMetricItemClassName}
      items={metrics.map((metric) => ({
        content: (
          <DashboardStatisticCard
            item={metric}
            onToggle={onToggleMetric}
            previousLabel={previousLabel}
            selected={visibleMetricIds.includes(metric.id)}
          />
        ),
        id: metric.id,
      }))}
      title={title}
    />
  );
};

export const DashboardStatisticsLineChart = ({
  items,
  points,
}: {
  items: DashboardStatisticMetricItem[];
  points: CommunitiesDashboardStatisticsDailyPoint[];
}) => {
  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-medium text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-medium text-muted">
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const metricKeys = items.map((item) => item.key);
  const chartPoints = aggregateCalendarChartPoints(points, metricKeys, {
    dayThreshold: 45,
    metricAggregations: DASHBOARD_STATISTIC_METRIC_AGGREGATIONS,
  });
  const max = Math.max(
    1,
    ...items.flatMap((item) => chartPoints.map((point) => Number(point[item.key] ?? 0))),
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
              <g key={`dashboard-statistics-grid-${id}`}>
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
          {items.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[item.key] ?? 0)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                d={linePath}
                fill="none"
                key={item.id}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {items.map((item) =>
            chartPoints.map((point, index) => {
              const value = Number(point[item.key] ?? 0);

              return (
                <circle
                  cx={xFor(index)}
                  cy={yFor(value)}
                  fill="var(--admin-surface)"
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  stroke={item.color}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {item.label}: {numberFormatter.format(value)}
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
            <span className="min-w-0 text-center text-[10px] font-medium text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardStatisticsSection = ({
  counterLayout = "grid",
  filters,
  metrics,
  onToggleMetric,
  points,
  periodLabel,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  counterLayout?: "carousel" | "grid";
  filters?: React.ReactNode;
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (id: DashboardStatisticMetricId) => void;
  periodLabel: string;
  points: CommunitiesDashboardStatisticsDailyPoint[];
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  const visibleMetrics = metrics.filter((item) => visibleMetricIds.includes(item.id));

  return (
    <CardShell className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
        </div>
        {filters ? <div className="w-full min-w-0 xl:max-w-xl">{filters}</div> : null}
      </div>
      {counterLayout === "grid" ? (
        <DashboardStatisticsMetricGrid
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      ) : (
        <DashboardStatisticsMetricCarousel
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      )}
      <DashboardStatisticsLineChart items={visibleMetrics} points={points} />
    </CardShell>
  );
};
