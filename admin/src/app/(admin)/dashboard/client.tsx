"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  Flag,
  Globe2,
  Loader2,
  type LucideIcon,
  RefreshCw,
  Smartphone,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminDashboardExport, useAdminDashboardSummary } from "@/api/callers/dashboard";
import { resolveApiError } from "@/api/handle";
import type {
  AdminDashboardSummary,
  DashboardDailyPoint,
  DashboardDeviceItem,
  DashboardFinancialPoint,
  DashboardLocationItem,
  DashboardMetric,
  DashboardPendingReport,
  DashboardSummaryQuery,
} from "@/api/req/dashboard";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const COLORS = ["#3b16f3", "#1788ff", "#19b96f", "#ff7a1a"];
const QUICK_RANGES = [7, 30, 90] as const;
const SKELETON_KEYS = ["sessions", "revenue", "patients", "psychologists", "reports"] as const;

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): DashboardSummaryQuery => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return {
    from: toInputDate(from),
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

const formatMetricValue = (metric: DashboardMetric) => {
  if (metric.unit === "currency_cents") return currencyFormatter.format(metric.value / 100);

  return numberFormatter.format(metric.value);
};

const formatCurrencyCents = (value: number) => currencyFormatter.format(value / 100);

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const isValidRange = (range: DashboardSummaryQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const hasPeriodRecords = (summary: AdminDashboardSummary) => {
  const cardValues = Object.values(summary.cards).some((card) => card.value > 0);
  const communityValues = [
    ...summary.community_activity.posts,
    ...summary.community_activity.comments,
  ].some((point) => point.count > 0);
  const financialValues = summary.financial.daily.some((point) => point.value_cents > 0);

  return (
    cardValues ||
    communityValues ||
    financialValues ||
    summary.devices.total > 0 ||
    summary.locations.total > 0 ||
    summary.pending_reports.total > 0
  );
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  purple: "bg-primary-soft text-primary",
};

const TrendBadge = ({ metric }: { metric: DashboardMetric }) => {
  if (metric.unavailable)
    return <span className="text-xs font-bold text-warning">Indisponível</span>;

  return (
    <span
      className={cn(
        "text-xs font-black",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-muted",
      )}
    >
      {formatChange(metric.change_percent)}
    </span>
  );
};

const MetricCard = ({
  icon: Icon,
  metric,
  tone,
}: {
  icon: LucideIcon;
  metric: DashboardMetric;
  tone: keyof typeof toneClasses;
}) => (
  <CardShell className="min-h-40 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className={cn("grid h-12 w-12 place-items-center rounded-full", toneClasses[tone])}>
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {metric.source}
      </span>
    </div>
    <div className="mt-5 space-y-2">
      <p className="text-sm font-black text-foreground">{metric.label}</p>
      <p className="text-3xl font-black tracking-tight text-foreground">
        {formatMetricValue(metric)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-medium text-muted">vs. período anterior</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{metric.description}</p>
    </div>
  </CardShell>
);

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-40 animate-pulse bg-surface-muted"
        key={`dashboard-skeleton-${key}`}
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
          <h2 className="text-lg font-black">Não foi possível carregar o Dashboard</h2>
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

const EmptyState = ({ period }: { period: AdminDashboardSummary["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma métrica real foi encontrada entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);

const LineChart = ({
  series,
}: {
  series: Array<{ color: string; label: string; points: DashboardDailyPoint[] }>;
}) => {
  const width = 680;
  const height = 280;
  const padding = { bottom: 44, left: 44, right: 20, top: 24 };
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
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <figure className="mt-5 overflow-hidden">
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico de linhas com posts e comentários por dia"
          className="min-w-[620px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`grid-${value}-${y}`}>
                <line
                  stroke="#e8edf7"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#657094" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {chartSeries.map((item) => {
            const path = item.points
              .map(
                (point, index) => `${index === 0 ? "M" : "L"}${getX(index)},${getY(point.count)}`,
              )
              .join(" ");

            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {item.points.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point.count)}
                    fill="#fff"
                    key={`${item.label}-${point.date}`}
                    r="5"
                    stroke={item.color}
                    strokeWidth="3"
                  />
                ))}
              </g>
            );
          })}

          {labels.map((point, index) =>
            index % labelStep === 0 || index === labels.length - 1 ? (
              <text
                fill="#06104a"
                fontSize="11"
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
        <summary className="cursor-pointer font-black text-foreground">
          Resumo textual do gráfico
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {chartSeries.map((item) => (
            <div key={item.label}>
              <p className="font-black text-foreground">{item.label}</p>
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

const BarChart = ({ points }: { points: DashboardFinancialPoint[] }) => {
  const width = 520;
  const height = 250;
  const padding = { bottom: 38, left: 42, right: 16, top: 18 };
  const chartPoints = aggregateCalendarChartPoints(points, ["value_cents"] as const, {
    metricAggregations: { value_cents: "last" },
  });
  const maxValue = Math.max(1, ...chartPoints.map((point) => point.value_cents));
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barGap = 10;
  const barWidth =
    chartPoints.length > 0 ? Math.max(12, chartWidth / chartPoints.length - barGap) : 20;

  return (
    <figure className="mt-5 overflow-hidden">
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico de barras do MRR estimado por dia"
          className="min-w-[520px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.5, 1].map((ratio) => {
            const value = Math.round(maxValue * ratio);
            const y = padding.top + chartHeight - ratio * chartHeight;
            return (
              <g key={`finance-grid-${ratio}`}>
                <line
                  stroke="#e8edf7"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#657094" fontSize="10" x="0" y={y + 4}>
                  {formatCurrencyCents(value)}
                </text>
              </g>
            );
          })}
          {chartPoints.map((point, index) => {
            const barHeight = (point.value_cents / maxValue) * chartHeight;
            const x = padding.left + index * (barWidth + barGap);
            const y = padding.top + chartHeight - barHeight;

            return (
              <g key={point.date}>
                <rect
                  fill="url(#barGradient)"
                  height={barHeight}
                  rx="8"
                  width={barWidth}
                  x={x}
                  y={y}
                />
                <text
                  fill="#06104a"
                  fontSize="10"
                  textAnchor="middle"
                  x={x + barWidth / 2}
                  y={height - 12}
                >
                  {point.chartLabel}
                </text>
              </g>
            );
          })}
          <defs>
            <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#9d7bff" />
              <stop offset="100%" stopColor="#3b16f3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        MRR estimado por assinatura profissional ativa no dia, sem tratar como receita confirmada.
      </p>
    </figure>
  );
};

const DonutChart = ({ items, total }: { items: DashboardDeviceItem[]; total: number }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: DashboardDeviceItem;
      strokeDashoffset: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      const dash = share * circumference;

      return {
        cumulative: accumulator.cumulative + dash,
        items: [
          ...accumulator.items,
          {
            dash,
            item,
            strokeDashoffset: -accumulator.cumulative,
          },
        ],
      };
    },
    { cumulative: 0, items: [] },
  ).items;

  return (
    <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center">
      <svg aria-label="Distribuição de sessões por dispositivo" role="img" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#eef2fb" strokeWidth="18" />
        {segments.map(({ dash, item, strokeDashoffset }, index) => {
          return (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.device_type}
              r={radius}
              stroke={COLORS[index % COLORS.length]}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text fill="#06104a" fontSize="15" fontWeight="900" textAnchor="middle" x="60" y="58">
          {numberFormatter.format(total)}
        </text>
        <text fill="#55618a" fontSize="8" fontWeight="700" textAnchor="middle" x="60" y="72">
          sessões
        </text>
      </svg>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div className="flex items-center justify-between gap-3" key={item.device_type}>
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span
                aria-hidden
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {item.label}
            </span>
            <span className="text-sm font-black text-foreground">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LocationList = ({ items, total }: { items: DashboardLocationItem[]; total: number }) => (
  <div className="mt-5 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma localização real foi capturada no período.
      </p>
    ) : (
      items.map((item) => (
        <div key={item.country}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-foreground">{item.country}</span>
            <span className="font-bold text-muted">
              {numberFormatter.format(item.count)} ({item.percentage}%)
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, item.percentage)}%` }}
            />
          </div>
        </div>
      ))
    )}
    <p className="text-xs text-muted">
      Total de localizações consideradas: {numberFormatter.format(total)}. Sem pacote de mapa nesta
      versão; ranking por país baseado em visitor_location.
    </p>
  </div>
);

const DashboardHeader = ({
  isExporting,
  onExport,
  range,
  setRange,
}: {
  isExporting: boolean;
  onExport: () => void;
  range: DashboardSummaryQuery;
  setRange: (range: DashboardSummaryQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Dashboard</h1>
      <p className="mt-2 text-sm font-medium text-muted">Visão geral da plataforma Lectum.</p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={range.to}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
            type="date"
            value={range.from}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={range.from}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
            type="date"
            value={range.to}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 sm:w-44">
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
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
        disabled={isExporting || !isValidRange(range)}
        onClick={onExport}
        type="button"
      >
        {isExporting ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden className="h-4 w-4" />
        )}
        Exportar CSV
      </button>
    </div>
  </div>
);

const ChartCard = ({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-black text-foreground">{title}</h2>
    </div>
    {children}
  </CardShell>
);

const PendingReportsCard = ({
  reports,
  total,
}: {
  reports: DashboardPendingReport[];
  total: number;
}) => {
  const severityClasses: Record<DashboardPendingReport["severity"], string> = {
    alta: "bg-red-50 text-danger",
    baixa: "bg-surface-muted text-muted",
    media: "bg-orange-50 text-orange-600",
  };

  return (
    <CardShell className="p-5 xl:row-span-2">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-danger">
          <Flag aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground">Denúncias pendentes</h2>
          <p className="text-xs font-bold text-muted">{numberFormatter.format(total)} no período</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {reports.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhuma denúncia pendente real foi encontrada neste período.
          </p>
        ) : (
          reports.map((report) => (
            <article
              className="rounded-2xl border border-border bg-surface-muted p-4"
              key={report.id}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black text-foreground">{report.reason}</h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[0.65rem] font-black",
                    severityClasses[report.severity],
                  )}
                >
                  {report.severity}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-muted">{report.target_title}</p>
              {report.community_name ? (
                <p className="mt-1 text-xs text-muted">Comunidade: {report.community_name}</p>
              ) : null}
              <p className="mt-3 text-xs font-black text-foreground">
                {formatDateTime(report.created_at)}
              </p>
              <p className="mt-2 text-[0.7rem] text-muted">
                Caminho futuro: abrir este ID na moderação de comunidades ({report.id}).
              </p>
            </article>
          ))
        )}
      </div>
    </CardShell>
  );
};

const DashboardContent = ({ summary }: { summary: AdminDashboardSummary }) => {
  const noRecords = !hasPeriodRecords(summary);

  return (
    <div className="space-y-5">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Activity} metric={summary.cards.sessions} tone="blue" />
        <MetricCard icon={WalletCards} metric={summary.cards.revenue} tone="pink" />
        <MetricCard icon={Users} metric={summary.cards.patients} tone="green" />
        <MetricCard icon={UserRoundCheck} metric={summary.cards.psychologists} tone="purple" />
        <MetricCard icon={Flag} metric={summary.cards.pending_reports} tone="orange" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="grid gap-5 2xl:grid-cols-2">
            <ChartCard icon={Activity} title="Atividade nas comunidades">
              <LineChart
                series={[
                  { color: "#1788ff", label: "Posts", points: summary.community_activity.posts },
                  {
                    color: "#6f42ff",
                    label: "Comentários",
                    points: summary.community_activity.comments,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard icon={BarChart3} title="Faturamento">
              <div className="mt-5 rounded-2xl bg-primary-soft p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Estimativa
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {formatCurrencyCents(summary.financial.mrr_cents)}
                </p>
                <p className="mt-1 text-xs text-muted">{summary.financial.label}</p>
              </div>
              <BarChart points={summary.financial.daily} />
            </ChartCard>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <ChartCard icon={Globe2} title="Acessos por localização">
              <LocationList items={summary.locations.items} total={summary.locations.total} />
            </ChartCard>

            <ChartCard icon={Smartphone} title="Atividade por dispositivo">
              <DonutChart items={summary.devices.items} total={summary.devices.total} />
            </ChartCard>
          </div>
        </div>

        <PendingReportsCard
          reports={summary.pending_reports.items}
          total={summary.pending_reports.total}
        />
      </div>

      {summary.unavailable.length > 0 ? (
        <CardShell className="p-4">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h2 className="font-black text-foreground">Métricas indisponíveis ou estimadas</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {summary.unavailable.map((item) => (
                  <li key={item.id}>
                    <strong className="text-foreground">{item.label}:</strong> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardShell>
      ) : null}
    </div>
  );
};

export const AdminDashboardClient = () => {
  const [range, setRange] = useState<DashboardSummaryQuery>(() => getQuickRange(7));
  const validRange = isValidRange(range);
  const query = useAdminDashboardSummary(range, { enabled: validRange });
  const exportMutation = useAdminDashboardExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!range.from || !range.to) return "Selecione um período válido";

    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync(range);
      downloadBlob(result.blob, result.filename);
      toast.success("Exportação real gerada com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        isExporting={exportMutation.isPending}
        onExport={() => void handleExport()}
        range={range}
        setRange={setRange}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="h-4 w-4" />
        <span className="font-bold">Período consultado:</span>
        <span>{periodCopy}</span>
        {query.data ? <span>({query.data.period.days} dias)</span> : null}
      </div>

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={() => setRange(getQuickRange(7))}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent summary={query.data} /> : null}
    </div>
  );
};
