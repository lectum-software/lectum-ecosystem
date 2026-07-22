"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Loader2,
  type LucideIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { type FocusEvent, useMemo, useState } from "react";
import { useAdminFinanceDashboard, useAdminFinanceExport } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type {
  AdminFinanceDashboard,
  FinanceChargeItem,
  FinanceDashboardQuery,
  FinanceMetric,
  FinanceSeriesPoint,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

type FinancePeriodValue = NonNullable<FinanceDashboardQuery["period"]>;
type FinancePeriodPreset = Exclude<FinancePeriodValue, "custom">;
type FinanceDashboardRange = Pick<FinanceDashboardQuery, "from" | "to">;

const FINANCE_PERIOD_OPTIONS: {
  id: FinancePeriodPreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];
const DEFAULT_FINANCE_PERIOD: FinancePeriodPreset = "all";
const CARD_ORDER = [
  "revenue_total",
  "active_subscriptions",
  "new_subscriptions_revenue",
  "new_subscriptions",
  "cancellations",
] as const;
type FinanceMetricKey = (typeof CARD_ORDER)[number];

const FINANCE_METRIC_CONFIG = {
  active_subscriptions: { color: "#5d9df6", icon: UsersRound },
  cancellations: { color: "#e5484d", icon: XCircle },
  new_subscriptions: { color: "#13a85b", icon: UserPlus },
  new_subscriptions_revenue: { color: "#8b5cf6", icon: BadgeDollarSign },
  revenue_total: { color: "#308ce8", icon: BadgeDollarSign },
} satisfies Record<FinanceMetricKey, { color: string; icon: LucideIcon }>;

const CURRENCY_METRIC_KEYS = [
  "revenue_total",
  "new_subscriptions_revenue",
] as const satisfies readonly FinanceMetricKey[];

const COUNT_METRIC_KEYS = [
  "active_subscriptions",
  "new_subscriptions",
  "cancellations",
] as const satisfies readonly FinanceMetricKey[];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const startOfCurrentYear = () => {
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1);
};

const getDashboardRangeForPeriod = (period: FinancePeriodPreset): FinanceDashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildFinanceDashboardQuery = (
  period: FinancePeriodValue,
  range: FinanceDashboardRange,
): FinanceDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatAnalysisRange = (from: string, to: string) => `${formatDate(from)} a ${formatDate(to)}`;

const formatFilteredAnalysisPeriod = (period: AdminFinanceDashboard["period"]) =>
  `${period.label} · ${formatAnalysisRange(period.from, period.to)}`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);
const formatMaybeMoney = (cents: number | null) =>
  cents === null ? "Indisponível" : formatMoney(cents);

const formatNullableDateTime = (value: string | null) => (value ? formatDateTime(value) : "â€”");

const shortReference = (value: string | null) => {
  if (!value) return "â€”";
  if (value.length <= 16) return value;

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

const detailsHref = (
  base: "/financeiro/assinaturas" | "/financeiro/cobrancas",
  dashboard: AdminFinanceDashboard,
) => {
  const params = new URLSearchParams({
    from: dashboard.period.from,
    period: "custom",
    to: dashboard.period.to,
  });

  return `${base}?${params.toString()}`;
};

const formatPercent = (value: number | null) =>
  value === null ? "sem base" : `${percentFormatter.format(value)}%`;

const formatChange = (value: number | null) => {
  if (value === null) return "sem base confiável";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const isValidRange = (range: FinanceDashboardQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const TrendBadge = ({ metric }: { metric: FinanceMetric }) => (
  <span
    className={cn(
      "inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-[0.68rem] font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      (metric.trend === "flat" || metric.trend === "unavailable") && "text-muted",
    )}
  >
    {metric.trend === "up" ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : null}
    {metric.trend === "down" ? <TrendingDown aria-hidden className="h-3.5 w-3.5" /> : null}
    {formatChange(metric.change_percent)}
  </span>
);

const MetricValue = ({ metric }: { metric: FinanceMetric }) => {
  if (!metric.available) {
    return <span className="min-w-0 truncate text-muted">Indisponível</span>;
  }

  if (metric.unit === "currency_cents") {
    return <span className="min-w-0 truncate">{formatMoney(metric.value)}</span>;
  }

  return <span className="min-w-0 truncate">{numberFormatter.format(metric.value)}</span>;
};

const LtvValue = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => {
  if (dashboard.average_ltv.available) {
    return <span>{formatMoney(dashboard.average_ltv.value_cents)}</span>;
  }

  return <span className="text-muted">Indisponível</span>;
};

const LifetimeValue = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => {
  const lifetime = dashboard.average_subscription_lifetime;

  if (!lifetime.available) {
    return <span className="text-muted">Indisponível</span>;
  }

  if (lifetime.value_months >= 1) {
    return (
      <span>
        {decimalFormatter.format(lifetime.value_months)}{" "}
        {lifetime.value_months === 1 ? "mês" : "meses"}
      </span>
    );
  }

  return (
    <span>
      {decimalFormatter.format(lifetime.value_days)} {lifetime.value_days === 1 ? "dia" : "dias"}
    </span>
  );
};

const AnalysisPeriodNote = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-xs font-semibold leading-5 text-muted">
    Período de análise: <span className="font-black text-foreground">{children}</span>
  </p>
);

const ChurnRate = ({ metric }: { metric: FinanceMetric }) => {
  if (metric.id !== "cancellations" || !metric.available) return null;

  return (
    <span className="shrink-0 text-sm font-medium tracking-normal text-muted xl:text-xs">
      ({formatPercent(metric.rate_percent)})
    </span>
  );
};

const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: FinanceMetric;
  onToggle: () => void;
}) => {
  const description = metric.available
    ? metric.description
    : metric.unavailable_reason || metric.description;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
        !metric.available && active && "border-border/80 bg-surface-muted ring-0",
      )}
      onClick={onToggle}
      title={`${metric.label}: ${description}. ${
        active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p
          className="truncate whitespace-nowrap text-xs font-semibold text-foreground"
          title={metric.label}
        >
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <MetricValue metric={metric} />
          <ChurnRate metric={metric} />
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        {metric.available ? null : (
          <p className="truncate text-[0.68rem] font-semibold text-muted">{description}</p>
        )}
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

const LoadingGrid = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`finance-${key}`}
      />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar Financeiro</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const FinanceHeader = ({
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
          Visão geral das receitas reais da plataforma, assinaturas pagas e MRR de psicólogos.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

const FinancePeriodControls = ({
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

const CardsGrid = ({
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

const FinanceChart = ({
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
        Nenhum ponto real de receita foi encontrado para o período.
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
const RevenuePanel = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="grid gap-4 xl:grid-cols-3">
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <CreditCard aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-foreground">Receita recorrente mensal (MRR)</h2>
          <AnalysisPeriodNote>{formatFilteredAnalysisPeriod(dashboard.period)}</AnalysisPeriodNote>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        {formatMoney(dashboard.mrr.value_cents)}
      </p>
    </CardShell>

    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-success">
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

const StatusBadge = ({ item }: { item: FinanceSubscriptionItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.status === "ativa" && "bg-emerald-50 text-success",
      item.status === "cancelada" && "bg-red-50 text-danger",
      item.status === "inadimplente" && "bg-yellow-50 text-yellow-700",
      !["ativa", "cancelada", "inadimplente"].includes(item.status) &&
        "bg-surface-muted text-muted",
    )}
  >
    {item.status_label}
  </span>
);

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials || "PS"}
    </span>
  );
};

const ChargeStatusBadge = ({ item }: { item: FinanceChargeItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.amount_available ? "bg-emerald-50 text-success" : "bg-yellow-50 text-yellow-700",
    )}
  >
    {item.status_label}
  </span>
);

const LatestCharges = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Últimas cobranças realizadas</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(dashboard.latest_charges.items.length)} de{" "}
          {numberFormatter.format(dashboard.latest_charges.total)} cobranças confirmadas no período.
        </p>
      </div>
      <Link
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-black text-primary transition hover:bg-primary/10"
        href={detailsHref("/financeiro/cobrancas", dashboard)}
      >
        Ver todas
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {dashboard.latest_charges.items.map((item) => (
        <article className="rounded-2xl border border-border p-4" key={item.event_id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">
                  {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                </h3>
                <ChargeStatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">
                {item.subscription?.psychologist.email ?? item.external_id}
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {formatMaybeMoney(item.amount_cents)} · {formatDateTime(item.occurred_at)}
              </p>
              <p className="text-xs text-muted">
                {item.subscription?.plan.name ?? "Plano não identificado"} · Ref.{" "}
                {shortReference(item.reference)}
              </p>
            </div>
          </div>
        </article>
      ))}
      {dashboard.latest_charges.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma cobrança confirmada real foi registrada neste período.
        </p>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <caption className="sr-only">Últimas cobranças confirmadas no período</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Data</th>
            <th className="px-5 py-3 font-black">Psicólogo</th>
            <th className="px-5 py-3 font-black">Assinatura</th>
            <th className="px-5 py-3 font-black">Evento</th>
            <th className="px-5 py-3 font-black">Valor</th>
            <th className="px-5 py-3 font-black">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dashboard.latest_charges.items.map((item) => (
            <tr key={item.event_id}>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.occurred_at)}</td>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">
                      {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {item.subscription?.psychologist.email ?? "Sem vínculo local"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-foreground">
                  {item.subscription?.plan.name ?? "Não identificada"}
                </p>
                <p className="text-xs text-muted">{shortReference(item.reference)}</p>
              </td>
              <td className="px-5 py-4 text-muted" title={item.external_id}>
                <p className="font-bold text-foreground">{item.event_type}</p>
                <p className="text-xs">{shortReference(item.external_id)}</p>
              </td>
              <td className="px-5 py-4 font-black text-foreground">
                {formatMaybeMoney(item.amount_cents)}
              </td>
              <td className="px-5 py-4">
                <ChargeStatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dashboard.latest_charges.items.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          Nenhuma cobrança confirmada real foi registrada neste período.
        </p>
      ) : null}
    </div>
  </CardShell>
);

const SubscriptionRelation = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Relação de assinaturas</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(dashboard.subscription_relation.items.length)} de{" "}
          {numberFormatter.format(dashboard.subscription_relation.total)} assinaturas pagas do
          período.
        </p>
      </div>
      <Link
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-black text-primary transition hover:bg-primary/10"
        href={detailsHref("/financeiro/assinaturas", dashboard)}
      >
        Ver todas
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {dashboard.subscription_relation.items.map((item) => (
        <article className="rounded-2xl border border-border p-4" key={item.id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.psychologist.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">{item.psychologist.name}</h3>
                <StatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">{item.psychologist.email}</p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {item.plan.name} · {formatMoney(item.plan.price_cents)}
              </p>
              <p className="text-xs text-muted">
                Início {formatDateTime(item.started_at)} · Período até{" "}
                {formatNullableDateTime(item.current_period_end)}
              </p>
            </div>
          </div>
        </article>
      ))}
      {dashboard.subscription_relation.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma assinatura paga real foi encontrada neste período.
        </p>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[960px] text-left text-sm">
        <caption className="sr-only">Relação de assinaturas pagas no período</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Psicólogo</th>
            <th className="px-5 py-3 font-black">Plano</th>
            <th className="px-5 py-3 font-black">Início</th>
            <th className="px-5 py-3 font-black">Período atual</th>
            <th className="px-5 py-3 font-black">Valor</th>
            <th className="px-5 py-3 font-black">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dashboard.subscription_relation.items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.psychologist.name} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{item.psychologist.name}</p>
                    <p className="truncate text-xs text-muted">{item.psychologist.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-foreground">{item.plan.name}</p>
                <p className="text-xs text-muted">{shortReference(item.gateway_subscription_id)}</p>
              </td>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.started_at)}</td>
              <td className="px-5 py-4 text-muted">
                {formatNullableDateTime(item.current_period_end)}
              </td>
              <td className="px-5 py-4 font-black text-foreground">
                {formatMoney(item.plan.price_cents)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dashboard.subscription_relation.items.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          Nenhuma assinatura paga real foi encontrada neste período.
        </p>
      ) : null}
    </div>
  </CardShell>
);

const FinanceOverview = ({
  activeMetricKeys,
  dashboard,
  displayRange,
  isLoading,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  onToggleMetric,
  period,
  rangeError,
  rangeValid,
}: {
  activeMetricKeys: FinanceMetricKey[];
  dashboard?: AdminFinanceDashboard;
  displayRange: FinanceDashboardRange;
  isLoading: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: FinancePeriodPreset) => void;
  onToggleMetric: (key: FinanceMetricKey) => void;
  period: FinancePeriodValue;
  rangeError: string | null;
  rangeValid: boolean;
}) => {
  const selectedPeriodLabel =
    FINANCE_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Personalizado";
  const periodSummary =
    period === "custom"
      ? rangeValid
        ? `Período personalizado · ${formatDate(displayRange.from ?? "")} a ${formatDate(
            displayRange.to ?? "",
          )}`
        : "Período personalizado"
      : dashboard
        ? `${dashboard.period.label} · ${formatDate(dashboard.period.from)} a ${formatDate(
            dashboard.period.to,
          )}`
        : selectedPeriodLabel;

  return (
    <CardShell className="min-w-0 p-5">
      <div className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodSummary}</p>
        </div>

        <FinancePeriodControls
          displayRange={displayRange}
          onDateChange={onDateChange}
          onDateControlsBlur={onDateControlsBlur}
          onPeriodChange={onPeriodChange}
          period={period}
          rangeError={rangeError}
        />
      </div>

      {isLoading ? <LoadingGrid /> : null}
      {!isLoading && !rangeValid ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Ajuste o período personalizado para carregar a visão geral financeira.
        </p>
      ) : null}
      {!isLoading && rangeValid && dashboard ? (
        <>
          <CardsGrid
            activeMetricKeys={activeMetricKeys}
            dashboard={dashboard}
            onToggleMetric={onToggleMetric}
          />
          <FinanceChart points={dashboard.series.points} visibleMetricKeys={activeMetricKeys} />
        </>
      ) : null}
    </CardShell>
  );
};

const DashboardContent = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="space-y-6">
    <RevenuePanel dashboard={dashboard} />
    <LatestCharges dashboard={dashboard} />
    <SubscriptionRelation dashboard={dashboard} />
  </div>
);

export const AdminFinanceClient = () => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<FinanceMetricKey[]>(() => [
    ...CARD_ORDER,
  ]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<FinanceDashboardRange>(() =>
    getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD),
  );
  const [appliedRange, setAppliedRange] = useState<FinanceDashboardRange>(() =>
    getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD),
  );
  const queryInput = useMemo(
    () => buildFinanceDashboardQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = appliedPeriod !== "custom" || isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const visibleRangeValid = selectedPeriod !== "custom" || validDraftRange;
  const activeMetricKeys = CARD_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const query = useAdminFinanceDashboard(queryInput, { enabled: validRange });
  const exportMutation = useAdminFinanceExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;

  const clearExportMessages = () => {
    setExportFeedback(null);
    setExportError(null);
  };

  const resetToDefaultPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD);
    setRangeError(null);
    setSelectedPeriod(DEFAULT_FINANCE_PERIOD);
    setAppliedPeriod(DEFAULT_FINANCE_PERIOD);
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
    clearExportMessages();
  };

  const handleFinancePeriodChange = (nextPeriod: FinancePeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    clearExportMessages();
  };

  const handleFinanceDateChange = (field: "from" | "to", value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange({ ...displayRange, [field]: value });
  };

  const commitCustomRange = () => {
    if (selectedPeriod !== "custom") return;

    if (!validDraftRange) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setSelectedPeriod("custom");
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
    clearExportMessages();
  };

  const handleDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitCustomRange();
    }, 0);
  };

  const toggleMetric = (metricKey: FinanceMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (current.includes(metricKey)) {
        if (current.length === 1) return current;

        return current.filter((key) => key !== metricKey);
      }

      return [...current, metricKey];
    });
  };

  const handleExport = async () => {
    if (selectedPeriod === "custom" && !validDraftRange) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    if (!validRange) return;

    setExportFeedback(null);
    setExportError(null);

    const exportQuery =
      selectedPeriod === "custom" ? buildFinanceDashboardQuery("custom", draftRange) : queryInput;

    if (selectedPeriod === "custom") {
      setAppliedPeriod("custom");
      setAppliedRange(draftRange);
    }

    try {
      const result = await exportMutation.mutateAsync(exportQuery);
      downloadBlob(result.blob, result.filename);
      setExportFeedback(`Relatório ${result.filename} baixado em CSV.`);
    } catch (error) {
      setExportError(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <FinanceHeader
        exportError={exportError}
        exportDisabled={!validRange || !visibleRangeValid}
        exportFeedback={exportFeedback}
        exportPending={exportMutation.isPending}
        onExport={handleExport}
      />

      <FinanceOverview
        activeMetricKeys={activeMetricKeys}
        dashboard={query.data}
        displayRange={displayRange}
        isLoading={validRange && query.isLoading}
        onDateChange={handleFinanceDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handleFinancePeriodChange}
        onToggleMetric={toggleMetric}
        period={selectedPeriod}
        rangeError={rangeError}
        rangeValid={visibleRangeValid}
      />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetToDefaultPeriod}
        />
      ) : null}

      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados financeiros reais...
        </p>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent dashboard={query.data} /> : null}
    </div>
  );
};
