"use client";

import { BadgeDollarSign, ChevronDown, Clock, CreditCard, Download, Loader2 } from "lucide-react";
import type { FocusEvent } from "react";
import type { AdminFinanceDashboard, FinanceSeriesPoint } from "@/api/req/finance";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import {
  CARD_ORDER,
  COUNT_METRIC_KEYS,
  CURRENCY_METRIC_KEYS,
  FINANCE_METRIC_CONFIG,
  FINANCE_PERIOD_OPTIONS,
  type FinanceDashboardRange,
  type FinanceMetricKey,
  type FinancePeriodPreset,
  type FinancePeriodValue,
  formatMoney,
  numberFormatter,
} from "../modules/finance-support";
import { AnalysisPeriodNote, CardShell, LifetimeValue, LtvValue, MetricCard } from "./metrics";

export const FinanceHeader = ({
  exportError,
  exportFeedback,
  exportPending,
  exportDisabled,
  onExport,
}: {
  exportError: string | null;
  exportFeedback: string | null;
  exportPending: boolean;
  exportDisabled: boolean;
  onExport: () => void;
}) => (
  <CardShell className="border-border/70 bg-surface/90 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Receitas e assinaturas
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Financeiro
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Visão geral das receitas registradas, assinaturas pagas e MRR de psicólogos.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-admin-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={exportPending || exportDisabled}
          onClick={onExport}
          type="button"
        >
          {exportPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Download aria-hidden className="h-4 w-4" />
          )}
          Exportar relatório
        </button>
        {exportFeedback ? <p className="text-xs font-bold text-success">{exportFeedback}</p> : null}
        {exportError ? <p className="text-xs font-bold text-danger">{exportError}</p> : null}
      </div>
    </div>
  </CardShell>
);

export const FinancePeriodControls = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: FinanceDashboardRange;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: FinancePeriodPreset) => void;
  period: FinancePeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="finance-period">
        Período
        <span className="relative">
          <select
            className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="finance-period"
            onChange={(event) => onPeriodChange(event.target.value as FinancePeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {FINANCE_PERIOD_OPTIONS.map((option) => (
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
            max={displayRange.to || undefined}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            min={displayRange.from || undefined}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const CardsGrid = ({
  activeMetricKeys,
  dashboard,
  onToggleMetric,
}: {
  activeMetricKeys: FinanceMetricKey[];
  dashboard: AdminFinanceDashboard;
  onToggleMetric: (key: FinanceMetricKey) => void;
}) => (
  <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <legend className="sr-only">Contadores exibidos no gráfico da visão geral financeira</legend>
    {CARD_ORDER.map((key) => {
      const config = FINANCE_METRIC_CONFIG[key];

      return (
        <MetricCard
          active={activeMetricKeys.includes(key)}
          key={key}
          metric={dashboard.cards[key]}
          onToggle={() => onToggleMetric(key)}
          {...config}
        />
      );
    })}
  </fieldset>
);

export const FinanceChart = ({
  points,
  visibleMetricKeys,
}: {
  points: FinanceSeriesPoint[];
  visibleMetricKeys: FinanceMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const series = visibleMetricKeys.map((key) => ({
    color: FINANCE_METRIC_CONFIG[key].color,
    key,
    unit: CURRENCY_METRIC_KEYS.some((currencyKey) => currencyKey === key)
      ? "currency_cents"
      : "count",
  }));

  if (series.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }

  const chartPoints = aggregateCalendarChartPoints(
    points.map((point) => ({
      active_subscriptions: point.active_subscriptions,
      cancellations: point.cancellations,
      date: point.start_date,
      new_subscriptions: point.new_subscriptions,
      new_subscriptions_revenue: point.new_subscriptions_revenue_cents,
      revenue_total: point.revenue_cents,
    })),
    CARD_ORDER,
    {
      metricAggregations: {
        active_subscriptions: "last",
      },
    },
  );

  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de receita foi encontrado para o período.
      </div>
    );
  }

  const hasCurrencySeries = series.some((item) => item.unit === "currency_cents");
  const hasCountSeries = series.some((item) => item.unit === "count");
  const padding = {
    bottom: 28,
    left: hasCurrencySeries ? 68 : 42,
    right: hasCurrencySeries && hasCountSeries ? 62 : 28,
    top: 28,
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const currencyMetricKeys = CURRENCY_METRIC_KEYS.filter((key) => visibleMetricKeys.includes(key));
  const countMetricKeys = COUNT_METRIC_KEYS.filter((key) => visibleMetricKeys.includes(key));
  const maxCurrency = Math.max(
    1,
    ...chartPoints.flatMap((point) => currencyMetricKeys.map((key) => point[key])),
  );
  const maxCount = Math.max(
    1,
    ...chartPoints.flatMap((point) => countMetricKeys.map((key) => point[key])),
  );
  const getX = (index: number) =>
    chartPoints.length <= 1
      ? padding.left + chartWidth / 2
      : padding.left + (index * chartWidth) / (chartPoints.length - 1);
  const getY = (value: number, maxValue: number) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridRatios = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <figcaption className="sr-only">Gráfico temporal dos contadores financeiros.</figcaption>
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Gráfico temporal dos contadores financeiros"
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridRatios.map((ratio) => {
            const y = padding.top + chartHeight - ratio * chartHeight;
            const leftValue = hasCurrencySeries
              ? formatMoney(Math.round(maxCurrency * ratio))
              : numberFormatter.format(Math.round(maxCount * ratio));
            const rightValue = numberFormatter.format(Math.round(maxCount * ratio));

            return (
              <g key={`finance-grid-${ratio}-${y}`}>
                <line
                  opacity="0.58"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="6" y={y + 4}>
                  {leftValue}
                </text>
                {hasCurrencySeries && hasCountSeries ? (
                  <text
                    fill="var(--admin-muted)"
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="end"
                    x={width - 4}
                    y={y + 4}
                  >
                    {rightValue}
                  </text>
                ) : null}
              </g>
            );
          })}

          {series.map((item) => {
            const maxValue = item.unit === "currency_cents" ? maxCurrency : maxCount;
            const linePoints = chartPoints.map((point, index) => ({
              x: getX(index),
              y: getY(point[item.key], maxValue),
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

export const RevenuePanel = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="grid gap-4 xl:grid-cols-3">
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <CreditCard aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-foreground">Receita recorrente mensal (MRR)</h2>
          <AnalysisPeriodNote>Todo o período</AnalysisPeriodNote>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        {formatMoney(dashboard.mrr.value_cents)}
      </p>
    </CardShell>

    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-success-soft text-success">
          <BadgeDollarSign aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-foreground">LTV médio dos psicólogos</h2>
          <AnalysisPeriodNote>Todo o período</AnalysisPeriodNote>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        <LtvValue dashboard={dashboard} />
      </p>
      {!dashboard.average_ltv.available && dashboard.average_ltv.unavailable_reason ? (
        <p className="mt-2 text-xs font-bold text-muted">
          {dashboard.average_ltv.unavailable_reason}
        </p>
      ) : null}
    </CardShell>

    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <Clock aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-foreground">Lifetime médio dos psicólogos</h2>
          <AnalysisPeriodNote>Todo o período</AnalysisPeriodNote>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        <LifetimeValue dashboard={dashboard} />
      </p>
    </CardShell>
  </div>
);
