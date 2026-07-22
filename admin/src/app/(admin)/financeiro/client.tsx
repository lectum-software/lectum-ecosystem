"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  ChevronDown,
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
import { type FocusEvent, useMemo, useState } from "react";
import { useAdminFinanceDashboard, useAdminFinanceExport } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type {
  AdminFinanceDashboard,
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
  "new_subscriptions",
  "active_subscriptions",
  "cancellations",
] as const;
const CHART_COLORS = {
  bar: "var(--admin-primary-soft)",
  line: "var(--admin-primary)",
  subscription: "var(--admin-success)",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");

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

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);

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

const toneClasses = {
  danger: "bg-red-50 text-danger",
  green: "bg-emerald-50 text-success",
  purple: "bg-primary-soft text-primary",
  yellow: "bg-yellow-50 text-yellow-700",
};

const metricConfig: Record<
  (typeof CARD_ORDER)[number],
  { icon: LucideIcon; tone: keyof typeof toneClasses }
> = {
  active_subscriptions: { icon: UsersRound, tone: "purple" },
  cancellations: { icon: XCircle, tone: "danger" },
  new_subscriptions: { icon: UserPlus, tone: "green" },
  revenue_total: { icon: BadgeDollarSign, tone: "purple" },
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

const MetricCard = ({ metric }: { metric: FinanceMetric }) => {
  const config = metricConfig[metric.id];
  const Icon = config.icon;
  const description = metric.available
    ? metric.description
    : metric.unavailable_reason || metric.description;

  return (
    <article
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border border-primary/35 bg-surface p-3 text-left shadow-admin-soft ring-1 ring-primary/10 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        !metric.available && "border-border/80 bg-border/50 shadow-none ring-0",
      )}
      title={`${metric.label}: ${description}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8",
            toneClasses[config.tone],
          )}
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
      </div>
    </article>
  );
};

const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

const CardsGrid = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {CARD_ORDER.map((key) => (
      <MetricCard key={key} metric={dashboard.cards[key]} />
    ))}
  </div>
);

const FinanceChart = ({
  points,
  revenueAvailable,
}: {
  points: FinanceSeriesPoint[];
  revenueAvailable: boolean;
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 68, right: 28, top: 28 };
  const chartPoints = aggregateCalendarChartPoints(
    points.map((point) => ({
      confirmed_payments: point.confirmed_payments,
      date: point.start_date,
      new_subscriptions: point.new_subscriptions,
      revenue_cents: point.revenue_cents,
    })),
    ["confirmed_payments", "new_subscriptions", "revenue_cents"] as const,
  );

  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de receita foi encontrado para o período.
      </div>
    );
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(1, ...chartPoints.map((point) => point.revenue_cents));
  const maxSubscriptions = Math.max(1, ...chartPoints.map((point) => point.new_subscriptions));
  const getX = (index: number) =>
    chartPoints.length <= 1
      ? padding.left + chartWidth / 2
      : padding.left + (index * chartWidth) / (chartPoints.length - 1);
  const getRevenueY = (value: number) =>
    padding.top + chartHeight - (value / maxRevenue) * chartHeight;
  const getBarHeight = (value: number) => (value / maxSubscriptions) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxRevenue * ratio),
  }));
  const linePoints = chartPoints.map((point, index) => ({
    x: getX(index),
    y: getRevenueY(point.revenue_cents),
  }));
  const linePath = buildSmoothSvgPath(linePoints);
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <figcaption className="sr-only">
        Receita confirmada {revenueAvailable ? "" : "parcial ou indisponível"} e novas assinaturas
        pagas ao longo do tempo.
      </figcaption>
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Receita e novas assinaturas ao longo do tempo"
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridValues.map(({ ratio, value }) => {
            const y = getRevenueY(value);
            return (
              <g key={`finance-grid-${ratio}-${value}-${y}`}>
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
                  {formatMoney(value)}
                </text>
              </g>
            );
          })}

          {chartPoints.map((point, index) => {
            const x = getX(index);
            const barHeight = getBarHeight(point.new_subscriptions);
            return (
              <rect
                fill={CHART_COLORS.subscription}
                height={barHeight}
                key={`finance-bar-${point.date}`}
                opacity="0.16"
                rx="6"
                width="18"
                x={x - 9}
                y={padding.top + chartHeight - barHeight}
              />
            );
          })}

          <path
            d={linePath}
            fill="none"
            opacity="0.88"
            stroke={CHART_COLORS.line}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.1"
          />
          {linePoints.map((point, index) => (
            <circle
              cx={point.x}
              cy={point.y}
              fill="var(--admin-surface)"
              key={`finance-point-${chartPoints[index].date}`}
              opacity={index === linePoints.length - 1 ? "1" : "0.72"}
              r={index === linePoints.length - 1 ? "3.1" : "2.1"}
              stroke={CHART_COLORS.line}
              strokeWidth="1.45"
            />
          ))}
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
  <div className="grid gap-4 xl:grid-cols-2">
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <CreditCard aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Receita recorrente mensal (MRR)</h2>
          <p className="text-sm text-muted">{dashboard.mrr.description}</p>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        {formatMoney(dashboard.mrr.value_cents)}
      </p>
      <span className="mt-3 inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
        {dashboard.mrr.source}
      </span>
    </CardShell>

    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-success">
          <BadgeDollarSign aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Ticket médio mensal por assinatura</h2>
          <p className="text-sm text-muted">{dashboard.average_ticket.description}</p>
        </div>
      </div>
      <p className="mt-6 text-4xl font-black tracking-tight text-foreground">
        {formatMoney(dashboard.average_ticket.value_cents)}
      </p>
      <span className="mt-3 inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
        {dashboard.average_ticket.source}
      </span>
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

const NewSubscriptions = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Novas assinaturas de psicólogos</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(dashboard.new_subscriptions.items.length)} de{" "}
          {numberFormatter.format(dashboard.new_subscriptions.total)} assinaturas pagas iniciadas no
          período.
        </p>
      </div>
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {dashboard.new_subscriptions.source}
      </span>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {dashboard.new_subscriptions.items.map((item) => (
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
                CRP {item.psychologist.crp || "não informado"} · Início{" "}
                {formatDateTime(item.started_at)}
              </p>
            </div>
          </div>
        </article>
      ))}
      {dashboard.new_subscriptions.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma assinatura paga real foi iniciada neste período.
        </p>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <caption className="sr-only">Novas assinaturas de psicólogos no período</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Data</th>
            <th className="px-5 py-3 font-black">Psicólogo</th>
            <th className="px-5 py-3 font-black">CRP</th>
            <th className="px-5 py-3 font-black">Plano</th>
            <th className="px-5 py-3 font-black">Início da assinatura</th>
            <th className="px-5 py-3 font-black">Valor</th>
            <th className="px-5 py-3 font-black">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dashboard.new_subscriptions.items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.created_at)}</td>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.psychologist.name} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{item.psychologist.name}</p>
                    <p className="truncate text-xs text-muted">{item.psychologist.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-muted">{item.psychologist.crp || "—"}</td>
              <td className="px-5 py-4 text-foreground">{item.plan.name}</td>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.started_at)}</td>
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
      {dashboard.new_subscriptions.items.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          Nenhuma assinatura paga real foi iniciada neste período.
        </p>
      ) : null}
    </div>
  </CardShell>
);

const CoverageNotes = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="bg-primary-soft/70 p-5">
    <div className="flex gap-3">
      <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-black text-foreground">Cobertura dos dados financeiros</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {dashboard.coverage_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          {dashboard.unavailable.map((item) => (
            <li key={item.id}>
              <strong className="text-foreground">{item.label}:</strong> {item.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </CardShell>
);

const FinanceOverview = ({
  dashboard,
  displayRange,
  isLoading,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
  rangeValid,
}: {
  dashboard?: AdminFinanceDashboard;
  displayRange: FinanceDashboardRange;
  isLoading: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: FinancePeriodPreset) => void;
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
          <CardsGrid dashboard={dashboard} />
          <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground">Receita ao longo do tempo</h3>
              <p className="mt-1 text-sm text-muted">
                Linha com pagamentos confirmados reais e barras com novas assinaturas profissionais
                pagas.
              </p>
            </div>
            <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
              {dashboard.series.source}
            </span>
          </div>
          <FinanceChart
            points={dashboard.series.points}
            revenueAvailable={dashboard.cards.revenue_total.available}
          />
        </>
      ) : null}
    </CardShell>
  );
};

const DashboardContent = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="space-y-6">
    <RevenuePanel dashboard={dashboard} />
    <NewSubscriptions dashboard={dashboard} />
    <CoverageNotes dashboard={dashboard} />
  </div>
);

export const AdminFinanceClient = () => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
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
        dashboard={query.data}
        displayRange={displayRange}
        isLoading={validRange && query.isLoading}
        onDateChange={handleFinanceDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handleFinancePeriodChange}
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
