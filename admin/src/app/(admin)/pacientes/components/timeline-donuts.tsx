"use client";

import type { ReactNode } from "react";
import type {
  PatientsDashboardDailyPoint,
  PatientsDashboardEngagementSegment,
  PatientsDashboardIntentSegment,
} from "@/api/req/patients";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";

import {
  CARD_ORDER,
  DASHBOARD_METRIC_CONFIG,
  type DashboardMetricKey,
  formatPercentageValue,
  numberFormatter,
  PATIENT_ENGAGEMENT_CHART_COLORS,
  PATIENT_INTENT_CHART_COLORS,
} from "../modules/dashboard-support";

import { DonutChart } from "./donut-charts";

export const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PatientsDashboardDailyPoint[];
  visibleMetricKeys: DashboardMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = visibleMetricKeys.map((key) => ({
    color: DASHBOARD_METRIC_CONFIG[key].color,
    key,
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

  const chartPoints = aggregateCalendarChartPoints(points, CARD_ORDER, {
    metricAggregations: {
      active_patients: "last",
      inactive_patients: "last",
      total_patients: "last",
    },
  });

  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => point[item.key])),
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
          aria-label="Gráfico temporal dos contadores de pacientes"
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
              <g key={`patients-grid-${value}-${y}`}>
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
              y: getY(point[item.key]),
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

export const MiniBar = ({
  label,
  percentage,
  value,
}: {
  label: string;
  percentage: number;
  value: ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-xs font-black">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div
        aria-hidden
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  </div>
);

export const buildPatientIntentDonutItems = (items: PatientsDashboardIntentSegment[]) =>
  items.map((item) => ({
    color: PATIENT_INTENT_CHART_COLORS[item.id],
    count: item.count,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));

export const buildPatientEngagementDonutItems = (items: PatientsDashboardEngagementSegment[]) =>
  items.map((item) => ({
    color: PATIENT_ENGAGEMENT_CHART_COLORS[item.id],
    count: item.count,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));

export const PatientIntentDonutChart = ({
  items,
  total,
}: {
  items: PatientsDashboardIntentSegment[];
  total: number;
}) => (
  <DonutChart
    ariaLabel={`Gráfico de donut de intenção dos pacientes: ${items
      .map(
        (item) =>
          `${item.label}: ${numberFormatter.format(item.count)} pacientes, ${formatPercentageValue(
            item.percentage,
          )}`,
      )
      .join("; ")}.`}
    emptyMessage="Sem pacientes no período para calcular intenção."
    items={buildPatientIntentDonutItems(items)}
    total={total}
  />
);

export const PatientEngagementDonutChart = ({
  items,
  total,
}: {
  items: PatientsDashboardEngagementSegment[];
  total: number;
}) => (
  <DonutChart
    ariaLabel={`Gráfico de donut de engajamento dos pacientes: ${items
      .map(
        (item) =>
          `${item.label}: ${numberFormatter.format(item.count)} pacientes, ${formatPercentageValue(
            item.percentage,
          )}`,
      )
      .join("; ")}.`}
    emptyMessage="Sem pacientes no período para calcular engajamento."
    items={buildPatientEngagementDonutItems(items)}
    total={total}
  />
);
