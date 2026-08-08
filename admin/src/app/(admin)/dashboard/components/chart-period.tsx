"use client";

import { ChevronDown } from "lucide-react";
import type { FocusEventHandler } from "react";
import type { DashboardDailyPoint, DashboardPeriodPreset } from "@/api/req/dashboard";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";

import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardDateRange,
  type DashboardPeriodValue,
  numberFormatter,
} from "../modules/dashboard-support";

import { CardShell } from "./common";

export const LineChart = ({
  series,
}: {
  series: Array<{ color: string; label: string; points: DashboardDailyPoint[] }>;
}) => {
  const width = 680;
  const height = 280;
  const padding = { bottom: 34, left: 44, right: 24, top: 28 };
  const chartSeries = series.map((item) => ({
    ...item,
    points: aggregateCalendarChartPoints(item.points, ["count"] as const),
  }));
  const labels = chartSeries[0]?.points ?? [];
  const maxValue = Math.max(
    1,
    ...chartSeries.flatMap((item) => item.points.map((point) => point.count)),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    labels.length <= 1 ? width / 2 : padding.left + (index * chartWidth) / (labels.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))),
  ];
  const labelStep = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <figure className="mt-4 overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico de linhas com atividade das comunidades por autoria e tipo"
          className="min-w-[620px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`grid-${value}-${y}`}>
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

          {chartSeries.map((item) => {
            const path = buildSmoothSvgPath(
              item.points.map((point, index) => ({
                x: getX(index),
                y: getY(point.count),
              })),
            );

            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.05"
                />
                {item.points.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point.count)}
                    fill="var(--admin-surface)"
                    key={`${item.label}-${point.date}`}
                    opacity={index === item.points.length - 1 ? "1" : "0.72"}
                    r={index === item.points.length - 1 ? "3.1" : "2.1"}
                    stroke={item.color}
                    strokeWidth="1.45"
                  />
                ))}
              </g>
            );
          })}

          {labels.map((point, index) =>
            index % labelStep === 0 || index === labels.length - 1 ? (
              <text
                fill="var(--admin-muted)"
                fontSize="11"
                fontWeight="500"
                key={point.date}
                textAnchor="middle"
                x={getX(index)}
                y={height - 12}
              >
                {point.chartLabel}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-semibold text-foreground">
          Resumo textual do gráfico
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {chartSeries.map((item) => (
            <div key={item.label}>
              <p className="font-semibold text-foreground">{item.label}</p>
              <p>
                {item.points.map((point) => `${point.tooltipLabel}: ${point.count}`).join("; ")}
              </p>
            </div>
          ))}
        </div>
      </details>
    </figure>
  );
};

export const DashboardHero = () => (
  <CardShell className="border-border/70 bg-surface/90 p-5 md:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Painel executivo
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Visão geral com os principais indicadores da plataforma
        </p>
      </div>
    </div>
  </CardShell>
);

export const DashboardPeriodControls = ({
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  range,
  rangeError,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onPeriodChange: (period: DashboardPeriodPreset) => void;
  period: DashboardPeriodValue;
  range: DashboardDateRange;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="dashboard-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="dashboard-period"
            onChange={(event) => onPeriodChange(event.target.value as DashboardPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {DASHBOARD_PERIOD_OPTIONS.map((option) => (
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
            max={range.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={range.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            min={range.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={range.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);
