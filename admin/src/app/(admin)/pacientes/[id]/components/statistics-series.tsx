"use client";
import { Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { AdminPatientDetail, PatientsDetailSeriesPoint } from "@/api/req/patients";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

import {
  numberFormatter,
  PATIENT_COMMUNITY_CHART_METRICS,
  PATIENT_STATISTICS_SERIES_METRIC_KEYS,
  type PatientCommunityChartMetricId,
  type PatientStatisticsChartMetric,
} from "../modules/detail-config";

import {
  CardShell,
  PatientStatisticsMetricCarousel,
  PatientStatisticsMetricToggleCard,
} from "./common";

export const aggregatePatientStatisticsChartPoints = (points: PatientsDetailSeriesPoint[]) =>
  aggregateCalendarChartPoints(points, PATIENT_STATISTICS_SERIES_METRIC_KEYS);

export const PatientStatisticsSeriesChart = ({
  keys,
  points,
}: {
  keys: readonly PatientStatisticsChartMetric[];
  points: PatientsDetailSeriesPoint[];
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

  const chartPoints = aggregatePatientStatisticsChartPoints(points);
  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const max = Math.max(
    1,
    ...chartPoints.flatMap((point) => keys.map((item) => Number(point[item.key] ?? 0))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
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
          {gridValues.map((value) => {
            const y = yFor(value);

            return (
              <g key={`patient-statistics-grid-${value}-${y}`}>
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
          {keys.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[item.key] ?? 0)),
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
              const value = Number(point[item.key] ?? 0);

              return (
                <circle
                  className={cn("fill-surface", item.strokeClassName)}
                  cx={xFor(index)}
                  cy={yFor(value)}
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
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
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const EngagementChart = ({
  detail,
  isRefreshing,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing: boolean;
  periodControls: ReactNode;
}) => {
  const metricMap = new Map(detail.metrics.map((metric) => [metric.id, metric]));
  const cards = PATIENT_COMMUNITY_CHART_METRICS.flatMap((config) => {
    const metric = metricMap.get(config.id);

    return metric ? [{ config, metric }] : [];
  });
  const [visibleMetricIds, setVisibleMetricIds] = useState<PatientCommunityChartMetricId[]>(() =>
    PATIENT_COMMUNITY_CHART_METRICS.map((item) => item.id),
  );
  const visibleChartKeys = cards
    .filter(({ config }) => visibleMetricIds.includes(config.id))
    .map(({ config }) => config);
  const toggleMetric = (metricId: PatientCommunityChartMetricId) => {
    setVisibleMetricIds((current) => {
      if (!current.includes(metricId)) return [...current, metricId];

      const next = current.filter((item) => item !== metricId);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Estatísticas de comunidade</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Publicações que realizou e respostas, votos, denúncias, salvamentos e compartilhamentos
            que recebeu.
          </p>
        </div>
        {periodControls}
      </div>

      <PatientStatisticsMetricCarousel
        items={cards.map(({ config, metric }) => ({
          content: (
            <PatientStatisticsMetricToggleCard
              active={visibleMetricIds.includes(config.id)}
              config={config}
              metric={metric}
              onToggle={() => toggleMetric(config.id)}
              period={detail.period}
            />
          ),
          id: config.id,
        }))}
        title="estatísticas de comunidade"
      />

      <PatientStatisticsSeriesChart keys={visibleChartKeys} points={detail.series.points} />
    </CardShell>
  );
};
