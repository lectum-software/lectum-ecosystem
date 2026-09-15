"use client";

import { ChevronDown, MapPinned } from "lucide-react";
import type { FocusEvent } from "react";
import type { AdminTrafficSummary, TrafficTimelinePoint } from "@/api/req/traffic";
import { buildSmoothSvgPath } from "@/lib/chart-time-series";
import {
  formatDate,
  formatMetricRate,
  numberFormatter,
  TRAFFIC_OVERVIEW_CARD_ORDER,
  TRAFFIC_PERIOD_OPTIONS,
  type TrafficDateRange,
  type TrafficOverviewCardKey,
  type TrafficOverviewMetricKey,
  type TrafficPeriodPreset,
  type TrafficPeriodValue,
} from "../modules/traffic-support";
import { LocationOverview } from "./location";
import { PanelTitle } from "./navigation-conversions";
import {
  CardShell,
  isTrafficOverviewMetricKey,
  MetricCard,
  TRAFFIC_OVERVIEW_METRIC_CONFIG,
} from "./overview-cards";

export const LocationPanel = ({
  locations,
  periodDescription,
}: {
  locations: AdminTrafficSummary["locations"];
  periodDescription: string;
}) => {
  return (
    <CardShell className="p-5 md:p-6">
      <PanelTitle
        icon={MapPinned}
        periodDescription={periodDescription}
        title="Acessos por localização"
      />
      <LocationOverview locations={locations} />
    </CardShell>
  );
};

export const TRAFFIC_OVERVIEW_CARD_LABELS: Record<TrafficOverviewCardKey, string> = {
  new_visitors: "Novos visitantes",
  recurring_visitors: "Visitantes recorrentes",
  sessions: "Sessões",
  unique_visitors: "Visitantes únicos",
};

export const getTrafficOverviewMetricLabel = (key: TrafficOverviewMetricKey) =>
  TRAFFIC_OVERVIEW_CARD_LABELS[key];

export const getTimelineValue = (point: TrafficTimelinePoint, key: TrafficOverviewMetricKey) =>
  point[key] ?? 0;

export const TrafficTimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: TrafficTimelinePoint[];
  visibleMetricKeys: TrafficOverviewMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = visibleMetricKeys.map((key) => ({
    color: TRAFFIC_OVERVIEW_METRIC_CONFIG[key].color,
    key,
    label: getTrafficOverviewMetricLabel(key),
  }));

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
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = points;
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => getTimelineValue(point, item.key))),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))),
  ];
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: formatDate(point.date) }]
      : [],
  );
  const latestPoint = chartPoints.at(-1);

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Gráfico temporal dos contadores da visão geral de tráfego"
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
              <g key={`traffic-grid-${value}-${y}`}>
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
              y: getY(getTimelineValue(point, item.key)),
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
      <figcaption className="sr-only">
        {latestPoint
          ? series
              .map(
                (item) =>
                  `${item.label}: ${numberFormatter.format(getTimelineValue(latestPoint, item.key))} em ${formatDate(latestPoint.date)}`,
              )
              .join("; ")
          : "Sem dados disponíveis."}
      </figcaption>
    </figure>
  );
};

export const TrafficPeriodControls = ({
  displayRange,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: TrafficDateRange;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof TrafficDateRange, value: string) => void;
  onPeriodChange: (period: TrafficPeriodPreset) => void;
  period: TrafficPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="traffic-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="traffic-period"
            onChange={(event) => onPeriodChange(event.target.value as TrafficPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {TRAFFIC_PERIOD_OPTIONS.map((option) => (
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
      <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-semibold text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const TrafficOverviewPanel = ({
  children,
  periodControls,
  periodDescription,
}: {
  children: React.ReactNode;
  periodControls: React.ReactNode;
  periodDescription: string;
}) => (
  <CardShell className="min-w-0 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);

export const TrafficOverviewCardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: TrafficOverviewMetricKey[];
  onToggleMetric: (key: TrafficOverviewMetricKey) => void;
  summary: AdminTrafficSummary;
}) => {
  const cards = new Map(summary.overview_cards.map((metric) => [metric.id, metric]));
  const uniqueVisitors = cards.get("unique_visitors")?.value ?? 0;

  return (
    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <legend className="sr-only">Contadores da visão geral de Tráfego</legend>
      {TRAFFIC_OVERVIEW_CARD_ORDER.map((key) => {
        const metric = cards.get(key);
        if (!metric) return null;
        const cardMetric = { ...metric, label: TRAFFIC_OVERVIEW_CARD_LABELS[key] };
        const isChartMetric = isTrafficOverviewMetricKey(key);
        const rate =
          key === "new_visitors" || key === "recurring_visitors"
            ? formatMetricRate(metric.value, uniqueVisitors)
            : null;

        return (
          <MetricCard
            active={isChartMetric ? activeMetricKeys.includes(key) : undefined}
            key={key}
            metric={cardMetric}
            onToggle={isChartMetric ? () => onToggleMetric(key) : undefined}
            rate={rate}
            {...TRAFFIC_OVERVIEW_METRIC_CONFIG[key]}
          />
        );
      })}
    </fieldset>
  );
};
