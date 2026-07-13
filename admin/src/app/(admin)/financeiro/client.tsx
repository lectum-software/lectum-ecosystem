"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Download,
  FileDown,
  Loader2,
  type LucideIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import { type FocusEventHandler, useMemo, useState } from "react";
import { useAdminFinanceDashboard, useAdminFinanceExport } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type {
  AdminFinanceDashboard,
  FinanceDashboardQuery,
  FinanceMetric,
  FinanceSeriesPoint,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
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

const getQuickRange = (days: number): FinanceDashboardQuery => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return {
    from: toInputDate(from),
    groupBy: days > 45 ? "month" : "day",
    to: toInputDate(today),
  };
};

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
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
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
      "inline-flex items-center gap-1 text-xs font-black",
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
    return <span className="text-2xl font-black text-muted">Indisponível</span>;
  }

  if (metric.unit === "currency_cents") {
    return <span className="text-3xl font-black tracking-tight">{formatMoney(metric.value)}</span>;
  }

  return (
    <span className="text-3xl font-black tracking-tight">
      {numberFormatter.format(metric.value)}
    </span>
  );
};

const MetricCard = ({ metric }: { metric: FinanceMetric }) => {
  const config = metricConfig[metric.id];
  const Icon = config.icon;

  return (
    <CardShell className="min-h-44 p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn("grid h-12 w-12 place-items-center rounded-full", toneClasses[config.tone])}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          real
        </span>
      </div>
      <div className="mt-5 space-y-2 text-foreground">
        <p className="text-sm font-black">{metric.label}</p>
        <MetricValue metric={metric} />
        <div className="flex flex-wrap items-center gap-2">
          <TrendBadge metric={metric} />
          <span className="text-xs font-medium text-muted">vs. período anterior</span>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          {metric.available ? metric.description : metric.unavailable_reason || metric.description}
        </p>
      </div>
    </CardShell>
  );
};

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {CARD_ORDER.map((key) => (
      <CardShell className="h-44 animate-pulse bg-surface-muted" key={`finance-${key}`} />
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
  onDateChange,
  onDateControlsBlur,
  onExport,
  range,
  rangeError,
  setRange,
}: {
  exportError: string | null;
  exportFeedback: string | null;
  exportPending: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onExport: () => void;
  range: FinanceDashboardQuery;
  rangeError: string | null;
  setRange: (range: FinanceDashboardQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Financeiro</h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Visão geral das receitas reais da plataforma, assinaturas pagas e MRR de psicólogos.
      </p>
    </div>

    <div className="flex flex-col gap-3 xl:items-end">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_150px]" onBlur={onDateControlsBlur}>
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={range.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={range.from}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={range.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={range.to}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Agrupar
          <select
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            onChange={(event) =>
              setRange({
                ...range,
                groupBy: event.target.value as FinanceDashboardQuery["groupBy"],
              })
            }
            value={range.groupBy || "day"}
          >
            <option value="day">Diário</option>
            <option value="month">Mensal</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        {QUICK_RANGES.map((days) => (
          <button
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
            key={days}
            onClick={() => setRange(getQuickRange(days))}
            type="button"
          >
            {days} dias
          </button>
        ))}
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-glow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={exportPending || !isValidRange(range)}
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
      </div>
      {rangeError ? <p className="text-xs font-bold text-danger">{rangeError}</p> : null}
      {exportFeedback ? <p className="text-xs font-bold text-success">{exportFeedback}</p> : null}
      {exportError ? <p className="text-xs font-bold text-danger">{exportError}</p> : null}
    </div>
  </div>
);

const CardsGrid = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <section>
    <h2 className="mb-4 text-xl font-black text-foreground">Visão geral</h2>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARD_ORDER.map((key) => (
        <MetricCard key={key} metric={dashboard.cards[key]} />
      ))}
    </div>
  </section>
);

const FinanceChart = ({
  points,
  revenueAvailable,
}: {
  points: FinanceSeriesPoint[];
  revenueAvailable: boolean;
}) => {
  const width = 780;
  const height = 340;
  const padding = { bottom: 50, left: 62, right: 28, top: 24 };
  const chartPoints = aggregateCalendarChartPoints(
    points.map((point) => ({
      confirmed_payments: point.confirmed_payments,
      date: point.start_date,
      new_subscriptions: point.new_subscriptions,
      revenue_cents: point.revenue_cents,
    })),
    ["confirmed_payments", "new_subscriptions", "revenue_cents"] as const,
  );
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
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxRevenue * ratio));
  const linePath = chartPoints
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${getX(index)},${getRevenueY(point.revenue_cents)}`,
    )
    .join(" ");

  return (
    <figure className="mt-5 overflow-hidden">
      <div className="mb-4 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS.line }} />
          Receita confirmada {revenueAvailable ? "" : "(parcial/indisponível)"}
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: CHART_COLORS.subscription }}
          />
          Novas assinaturas pagas
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label="Receita e novas assinaturas ao longo do tempo"
          className="min-w-[700px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getRevenueY(value);
            return (
              <g key={`finance-grid-${value}-${y}`}>
                <line
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" x="4" y={y + 4}>
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
                opacity="0.22"
                rx="6"
                width="22"
                x={x - 11}
                y={padding.top + chartHeight - barHeight}
              />
            );
          })}

          <path
            d={linePath}
            fill="none"
            stroke={CHART_COLORS.line}
            strokeLinecap="round"
            strokeWidth="3.5"
          />
          {chartPoints.map((point, index) => (
            <circle
              cx={getX(index)}
              cy={getRevenueY(point.revenue_cents)}
              fill="var(--admin-surface)"
              key={`finance-point-${point.date}`}
              r="4.5"
              stroke={CHART_COLORS.line}
              strokeWidth="2.5"
            />
          ))}

          {chartPoints.map((point, index) => (
            <text
              fill="var(--admin-foreground)"
              fontSize="11"
              key={`finance-label-${point.date}`}
              textAnchor="middle"
              x={getX(index)}
              y={height - 15}
            >
              {point.chartLabel}
            </text>
          ))}
        </svg>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-black text-foreground">
          Resumo textual do gráfico
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {chartPoints.map((point) => (
            <p key={point.date}>
              <strong className="text-foreground">{point.tooltipLabel}:</strong>{" "}
              {formatMoney(point.revenue_cents)} em {point.confirmed_payments} pagamentos
              confirmados; {numberFormatter.format(point.new_subscriptions)} novas assinaturas
              pagas.
            </p>
          ))}
        </div>
      </details>
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

const DashboardContent = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="space-y-6">
    <CardsGrid dashboard={dashboard} />

    <CardShell className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Receita ao longo do tempo</h2>
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
    </CardShell>

    <RevenuePanel dashboard={dashboard} />
    <NewSubscriptions dashboard={dashboard} />
    <CoverageNotes dashboard={dashboard} />
  </div>
);

export const AdminFinanceClient = () => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<FinanceDashboardQuery>({
    initialRange: () => getQuickRange(30),
    isValidRange,
    onApply: () => {
      setExportFeedback(null);
      setExportError(null);
    },
  });
  const validRange = isValidRange(appliedRange);
  const query = useAdminFinanceDashboard(appliedRange, { enabled: validRange });
  const exportMutation = useAdminFinanceExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!appliedRange.from || !appliedRange.to) return "Selecione um período válido";

    return `${formatDate(appliedRange.from)} — ${formatDate(appliedRange.to)}`;
  }, [appliedRange]);

  const handleExport = async () => {
    if (!validRange) return;

    setExportFeedback(null);
    setExportError(null);

    try {
      const result = await exportMutation.mutateAsync(appliedRange);
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
        exportFeedback={exportFeedback}
        exportPending={exportMutation.isPending}
        onDateChange={handleDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onExport={handleExport}
        range={draftRange}
        rangeError={rangeError}
        setRange={applyRange}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="h-4 w-4" />
        <span className="font-bold">Período consultado:</span>
        <span>{periodCopy}</span>
        {query.data ? <span>({query.data.period.days} dias)</span> : null}
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs font-bold">
          <FileDown aria-hidden className="h-3.5 w-3.5" /> CSV real disponível
        </span>
      </div>

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={() => applyRange(getQuickRange(30))}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

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
