"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Flag,
  type LucideIcon,
  RefreshCw,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { type FocusEventHandler, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAdminDashboardSummary } from "@/api/callers/dashboard";
import { resolveApiError } from "@/api/handle";
import type {
  AdminDashboardSummary,
  DashboardDailyPoint,
  DashboardMetric,
  DashboardPendingReport,
  DashboardPeriodPreset,
  DashboardSummaryQuery,
  DashboardWhatsAppClickDistribution,
} from "@/api/req/dashboard";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const DASHBOARD_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const;
const SKELETON_KEYS = ["sessions", "revenue", "patients", "psychologists", "reports"] as const;

type DashboardPeriodValue = DashboardPeriodPreset | "custom";
type DashboardDateRange = Required<Pick<DashboardSummaryQuery, "from" | "to">>;
const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

const startOfCurrentYear = () => {
  const date = new Date();
  date.setMonth(0, 1);

  return date;
};

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): DashboardDateRange => {
  const today = new Date();

  return {
    from: toInputDate(startOfLastDays(days)),
    to: toInputDate(today),
  };
};

const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardDateRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toInputDate(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "30d") return getQuickRange(30);
  if (period === "90d") return getQuickRange(90);

  return getQuickRange(7);
};

const getDashboardPeriodLabel = (period: DashboardPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Últimos 7 dias";
};

const formatPeriodDescription = (period: DashboardPeriodValue, range: DashboardSummaryQuery) => {
  const label = getDashboardPeriodLabel(period);
  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}`;
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

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPercent = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })}%`;

const formatGini = (value: number | null) => {
  if (value === null) return "—";

  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 2,
  });
};

const LOCAL_VISUAL_EXAMPLE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_VISUAL_WHATSAPP_CLICK_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 35];

const isLocalVisualExampleHost = () =>
  typeof window !== "undefined" && LOCAL_VISUAL_EXAMPLE_HOSTS.has(window.location.hostname);

const subscribeToLocalVisualExampleHost = () => () => undefined;
const getLocalVisualExampleHostSnapshot = () => isLocalVisualExampleHost();
const getServerLocalVisualExampleHostSnapshot = () => false;

const sumValues = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

const calculatePercentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

const buildLocalDistributionCurve = (
  sortedAscendingCounts: number[],
  totalClicks: number,
): DashboardWhatsAppClickDistribution["curve"] => {
  let cumulativeClicks = 0;

  return [
    {
      click_percentage: 0,
      cumulative_clicks: 0,
      psychologist_percentage: 0,
      psychologists: 0,
    },
    ...sortedAscendingCounts.map((clicks, index) => {
      cumulativeClicks += clicks;

      return {
        click_percentage: calculatePercentage(cumulativeClicks, totalClicks),
        cumulative_clicks: cumulativeClicks,
        psychologist_percentage: calculatePercentage(index + 1, sortedAscendingCounts.length),
        psychologists: index + 1,
      };
    }),
  ];
};

const buildLocalDistributionSegment = (
  sortedDescendingCounts: number[],
  totalClicks: number,
  targetPercentage: number,
): DashboardWhatsAppClickDistribution["top_10_percent"] => {
  const psychologistCount =
    sortedDescendingCounts.length > 0
      ? Math.max(1, Math.ceil(sortedDescendingCounts.length * targetPercentage))
      : 0;
  const clicks = sumValues(sortedDescendingCounts.slice(0, psychologistCount));

  return {
    click_percentage: calculatePercentage(clicks, totalClicks),
    clicks,
    psychologist_count: psychologistCount,
    psychologist_percentage: calculatePercentage(psychologistCount, sortedDescendingCounts.length),
  };
};

const calculateLocalGini = (sortedAscendingCounts: number[], totalClicks: number) => {
  if (sortedAscendingCounts.length === 0 || totalClicks === 0) return null;

  const weightedSum = sortedAscendingCounts.reduce(
    (sum, value, index) => sum + (index + 1) * value,
    0,
  );
  const length = sortedAscendingCounts.length;

  return (2 * weightedSum) / (length * totalClicks) - (length + 1) / length;
};

const buildLocalWhatsAppDistributionExample = (): DashboardWhatsAppClickDistribution => {
  const sortedAscendingCounts = [...LOCAL_VISUAL_WHATSAPP_CLICK_COUNTS].sort((a, b) => a - b);
  const sortedDescendingCounts = [...sortedAscendingCounts].reverse();
  const totalClicks = sumValues(sortedAscendingCounts);
  const psychologistsWithClicks = sortedAscendingCounts.filter((count) => count > 0).length;
  const top10 = buildLocalDistributionSegment(sortedDescendingCounts, totalClicks, 0.1);
  const top20 = buildLocalDistributionSegment(sortedDescendingCounts, totalClicks, 0.2);

  return {
    concentration_label: "Concentração moderada",
    concentration_level: "moderate",
    curve: buildLocalDistributionCurve(sortedAscendingCounts, totalClicks),
    gini: calculateLocalGini(sortedAscendingCounts, totalClicks),
    psychologists_with_clicks: psychologistsWithClicks,
    psychologists_without_clicks: sortedAscendingCounts.length - psychologistsWithClicks,
    source: "contact_request.channel=whatsapp+psychologist_profile.published",
    summary: `Exemplo visual local: top 20% (${numberFormatter.format(
      top20.psychologist_count,
    )} psicólogos) concentrariam ${formatPercent(
      top20.click_percentage,
    )} dos ${numberFormatter.format(totalClicks)} cliques de WhatsApp.`,
    top_10_percent: top10,
    top_20_percent: top20,
    total_clicks: totalClicks,
    total_psychologists: sortedAscendingCounts.length,
  };
};

const isValidRange = (range: DashboardSummaryQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const hasPeriodRecords = (summary: AdminDashboardSummary) => {
  const cardValues = Object.values(summary.cards).some((card) => card.value > 0);
  const communityValues = [
    ...summary.community_activity.patient_posts,
    ...summary.community_activity.psychologist_posts,
    ...summary.community_activity.patient_comments,
    ...summary.community_activity.psychologist_replies,
  ].some((point) => point.count > 0);

  return (
    cardValues ||
    communityValues ||
    summary.pending_reports.total > 0 ||
    summary.whatsapp_click_distribution.total_clicks > 0
  );
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-primary-soft text-primary",
  green: "bg-success/10 text-success",
  orange: "bg-warning/10 text-warning",
  pink: "bg-primary-soft text-primary",
  purple: "bg-primary-soft text-primary",
};

const TrendBadge = ({ metric }: { metric: DashboardMetric }) => {
  if (metric.unavailable)
    return <span className="text-[0.68rem] font-semibold text-warning">Indisponível</span>;

  return (
    <span
      className={cn(
        "text-[0.68rem] font-semibold",
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
  <CardShell className="min-h-[7.25rem] rounded-card border-primary/20 p-3 transition duration-200 ease-out hover:border-primary/30 md:p-4">
    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", toneClasses[tone])}>
      <Icon aria-hidden className="h-4 w-4" />
    </div>
    <div className="mt-4 min-w-0 space-y-1.5">
      <p className="min-h-8 text-xs font-semibold leading-4 text-foreground" title={metric.label}>
        {metric.label}
      </p>
      <p className="truncate whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.7rem]">
        {formatMetricValue(metric)}
      </p>
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
        <TrendBadge metric={metric} />
        <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
          vs. período anterior
        </span>
      </div>
    </div>
  </CardShell>
);

const LoadingGrid = () => (
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-[9.25rem] animate-pulse bg-surface-muted"
        key={`dashboard-skeleton-${key}`}
      />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Não foi possível carregar o Dashboard</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-control transition hover:border-primary/40 hover:text-primary"
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
        <h2 className="font-bold">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-muted">
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

const DashboardHero = () => (
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

const DashboardPeriodControls = ({
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

const ChartCard = ({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-medium leading-6 text-muted">{description}</p>
        ) : null}
      </div>
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
    alta: "bg-danger/10 text-danger",
    baixa: "bg-surface-muted text-muted",
    media: "bg-warning/10 text-warning",
  };

  return (
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger">
          <Flag aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Denúncias pendentes</h2>
          <p className="text-xs font-semibold text-muted">
            {numberFormatter.format(total)} no período
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {reports.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-medium text-muted">
            Nenhuma denúncia pendente real foi encontrada neste período.
          </p>
        ) : (
          reports.map((report) => (
            <article
              className="rounded-2xl border border-border/70 bg-surface-muted p-4"
              key={report.id}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">{report.reason}</h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[0.65rem] font-bold",
                    severityClasses[report.severity],
                  )}
                >
                  {report.severity}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted">{report.target_title}</p>
              {report.community_name ? (
                <p className="mt-1 text-xs text-muted">Comunidade: {report.community_name}</p>
              ) : null}
              <p className="mt-3 text-xs font-bold text-foreground">
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

const DashboardOverviewPanel = ({
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
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        </div>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);

const ChartLegend = ({
  items,
}: {
  items: Array<{
    color: string;
    label: string;
  }>;
}) => (
  <div className="mt-5 grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-center">
    {items.map((item) => (
      <span
        className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-muted"
        key={item.label}
      >
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="min-w-0 break-words">{item.label}</span>
      </span>
    ))}
  </div>
);

const concentrationToneClasses: Record<
  DashboardWhatsAppClickDistribution["concentration_level"],
  string
> = {
  balanced: "bg-success/10 text-success",
  concentrated: "bg-danger/10 text-danger",
  moderate: "bg-warning/10 text-warning",
  unavailable: "bg-surface-muted text-muted",
};

const DistributionStatCard = ({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-[1.25rem] border border-border/70 bg-surface p-3 shadow-control">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-[0.72rem] font-medium leading-4 text-muted">{detail}</p>
  </div>
);

const buildSvgLinePath = (points: Array<{ x: number; y: number }>) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

const WhatsAppDistributionChart = ({
  distribution,
  isLocalVisualExample = false,
}: {
  distribution: DashboardWhatsAppClickDistribution;
  isLocalVisualExample?: boolean;
}) => {
  const hasClickableDistribution =
    distribution.total_psychologists > 0 && distribution.total_clicks > 0;

  if (!hasClickableDistribution) {
    return (
      <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-surface-muted p-4 text-sm font-medium leading-6 text-muted">
        {distribution.summary}
      </div>
    );
  }

  const width = 680;
  const height = 300;
  const padding = { bottom: 42, left: 48, right: 24, top: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (percentage: number) => padding.left + (percentage / 100) * chartWidth;
  const getY = (percentage: number) => padding.top + chartHeight - (percentage / 100) * chartHeight;
  const curvePoints = distribution.curve.map((point) => ({
    x: getX(point.psychologist_percentage),
    y: getY(point.click_percentage),
  }));
  const curvePath = buildSvgLinePath(curvePoints);
  const equalityPath = buildSvgLinePath([
    { x: getX(0), y: getY(0) },
    { x: getX(100), y: getY(100) },
  ]);
  const gridValues = [0, 25, 50, 75, 100];

  return (
    <figure className="mt-5 overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="overflow-x-auto">
        <svg
          aria-label={`Curva acumulada da distribuição de cliques de WhatsApp: ${distribution.summary}`}
          className="min-w-[620px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const x = getX(value);
            const y = getY(value);

            return (
              <g key={`whatsapp-distribution-grid-${value}`}>
                <line
                  opacity="0.54"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <line
                  opacity="0.28"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={height - padding.bottom}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="600" x="8" y={y + 4}>
                  {value}%
                </text>
                <text
                  fill="var(--admin-muted)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  x={x}
                  y={height - 13}
                >
                  {value}%
                </text>
              </g>
            );
          })}

          <path
            d={equalityPath}
            fill="none"
            stroke="var(--admin-muted)"
            strokeDasharray="7 7"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d={curvePath}
            fill="none"
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <circle
            cx={getX(100)}
            cy={getY(100)}
            fill="var(--admin-surface)"
            r="4"
            stroke="var(--admin-primary)"
            strokeWidth="2"
          />
          <text
            fill="var(--admin-foreground)"
            fontSize="12"
            fontWeight="700"
            textAnchor="middle"
            x={padding.left + chartWidth / 2}
            y={height - 2}
          >
            % acumulado de psicólogos
          </text>
          <text
            fill="var(--admin-foreground)"
            fontSize="12"
            fontWeight="700"
            transform={`rotate(-90 ${14} ${padding.top + chartHeight / 2})`}
            x="14"
            y={padding.top + chartHeight / 2}
          >
            % acumulado de cliques
          </text>
        </svg>
      </div>
      <div className="mt-4 flex flex-col gap-3 text-xs font-semibold text-muted sm:flex-row sm:flex-wrap">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-7 rounded-full bg-primary" />
          {isLocalVisualExample ? "Distribuição de exemplo" : "Distribuição real"}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0 w-7 border-t border-dashed border-border" />
          Distribuição equilibrada
        </span>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-semibold text-foreground">
          Resumo textual do gráfico
        </summary>
        <p className="mt-2 leading-5">{distribution.summary}</p>
        <p className="mt-2 leading-5">
          Top 10% {isLocalVisualExample ? "concentrariam" : "concentram"}{" "}
          {formatPercent(distribution.top_10_percent.click_percentage)} dos cliques; top 20%{" "}
          {isLocalVisualExample ? "concentrariam" : "concentram"}{" "}
          {formatPercent(distribution.top_20_percent.click_percentage)} dos cliques. Psicólogos sem
          clique: {numberFormatter.format(distribution.psychologists_without_clicks)}.
        </p>
      </details>
    </figure>
  );
};

const WhatsAppDistributionCard = ({
  distribution,
  periodDescription,
}: {
  distribution: DashboardWhatsAppClickDistribution;
  periodDescription: string;
}) => {
  const isLocalPreviewHost = useSyncExternalStore(
    subscribeToLocalVisualExampleHost,
    getLocalVisualExampleHostSnapshot,
    getServerLocalVisualExampleHostSnapshot,
  );
  const showLocalVisualExample = isLocalPreviewHost && distribution.total_clicks === 0;
  const displayDistribution = showLocalVisualExample
    ? buildLocalWhatsAppDistributionExample()
    : distribution;
  const withoutClicksPercentage = formatPercent(
    displayDistribution.total_psychologists > 0
      ? (displayDistribution.psychologists_without_clicks /
          displayDistribution.total_psychologists) *
          100
      : 0,
  );

  return (
    <ChartCard
      description={periodDescription}
      icon={Activity}
      title="Distribuição dos cliques de WhatsApp"
    >
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-3xl text-sm font-medium leading-6 text-muted">
          {displayDistribution.summary}
        </p>
        <div className="flex flex-wrap gap-2">
          {showLocalVisualExample ? (
            <span className="inline-flex w-fit items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              Exemplo visual local
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold",
              concentrationToneClasses[displayDistribution.concentration_level],
            )}
          >
            {displayDistribution.concentration_label}
            {displayDistribution.gini !== null
              ? ` · Gini ${formatGini(displayDistribution.gini)}`
              : ""}
          </span>
        </div>
      </div>

      {showLocalVisualExample ? (
        <p className="mt-3 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/45 p-3 text-xs font-semibold leading-5 text-muted">
          Números ilustrativos visíveis apenas em localhost para validar a leitura visual. A API
          real retornou {numberFormatter.format(distribution.total_clicks)} clique(s) neste período;
          nenhum dado foi criado ou persistido.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DistributionStatCard
          detail={
            showLocalVisualExample ? "Exemplo visual — API real: 0" : "Registros reais de contato"
          }
          label="Cliques de WhatsApp"
          value={numberFormatter.format(displayDistribution.total_clicks)}
        />
        <DistributionStatCard
          detail={showLocalVisualExample ? "Base ilustrativa local" : "Ativos e publicados"}
          label="Psicólogos considerados"
          value={numberFormatter.format(displayDistribution.total_psychologists)}
        />
        <DistributionStatCard
          detail={`${withoutClicksPercentage} da base`}
          label="Sem clique"
          value={numberFormatter.format(displayDistribution.psychologists_without_clicks)}
        />
        <DistributionStatCard
          detail={`${numberFormatter.format(
            displayDistribution.top_10_percent.psychologist_count,
          )} psicólogo(s)`}
          label="Top 10%"
          value={formatPercent(displayDistribution.top_10_percent.click_percentage)}
        />
        <DistributionStatCard
          detail={`${numberFormatter.format(
            displayDistribution.top_20_percent.psychologist_count,
          )} psicólogo(s)`}
          label="Top 20%"
          value={formatPercent(displayDistribution.top_20_percent.click_percentage)}
        />
      </div>

      <WhatsAppDistributionChart
        distribution={displayDistribution}
        isLocalVisualExample={showLocalVisualExample}
      />
    </ChartCard>
  );
};

const DashboardContent = ({
  periodControls,
  periodDescription,
  summary,
}: {
  periodControls: React.ReactNode;
  periodDescription: string;
  summary: AdminDashboardSummary;
}) => {
  const noRecords = !hasPeriodRecords(summary);
  const communitySeries = [
    {
      color: "var(--admin-primary)",
      label: "Posts de pacientes",
      points: summary.community_activity.patient_posts,
    },
    {
      color: "var(--admin-success)",
      label: "Posts de psicólogos",
      points: summary.community_activity.psychologist_posts,
    },
    {
      color: "var(--admin-warning)",
      label: "Comentários de pacientes",
      points: summary.community_activity.patient_comments,
    },
    {
      color: "var(--admin-danger)",
      label: "Respostas de psicólogos",
      points: summary.community_activity.psychologist_replies,
    },
  ];

  return (
    <div className="space-y-6">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <DashboardOverviewPanel periodControls={periodControls} periodDescription={periodDescription}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Activity} metric={summary.cards.sessions} tone="blue" />
          <MetricCard icon={WalletCards} metric={summary.cards.revenue} tone="pink" />
          <MetricCard icon={Users} metric={summary.cards.patients} tone="green" />
          <MetricCard icon={UserRoundCheck} metric={summary.cards.psychologists} tone="purple" />
          <MetricCard icon={Flag} metric={summary.cards.pending_reports} tone="orange" />
        </div>
      </DashboardOverviewPanel>

      <WhatsAppDistributionCard
        distribution={summary.whatsapp_click_distribution}
        periodDescription={periodDescription}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <div className="space-y-5">
          <ChartCard
            description={periodDescription}
            icon={Activity}
            title="Atividade nas comunidades"
          >
            <ChartLegend items={communitySeries} />
            <LineChart series={communitySeries} />
          </ChartCard>
        </div>

        <PendingReportsCard
          reports={summary.pending_reports.items}
          total={summary.pending_reports.total}
        />
      </div>
    </div>
  );
};

export const AdminDashboardClient = () => {
  const initialRange = useMemo(() => getDashboardRangeForPeriod("7d"), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodValue>("7d");
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPeriodValue>("7d");
  const [draftRange, setDraftRange] = useState<DashboardDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DashboardDateRange>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validRange = isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const appliedQuery = useMemo<DashboardSummaryQuery>(
    () =>
      appliedPeriod === "custom"
        ? { from: appliedRange.from, period: "custom", to: appliedRange.to }
        : { period: appliedPeriod },
    [appliedPeriod, appliedRange.from, appliedRange.to],
  );
  const query = useAdminDashboardSummary(appliedQuery, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodDescription = useMemo(() => {
    const range = query.data
      ? {
          from: query.data.period.from,
          to: query.data.period.to,
        }
      : draftRange;

    return formatPeriodDescription(query.data ? appliedPeriod : selectedPeriod, range);
  }, [appliedPeriod, draftRange, query.data, selectedPeriod]);

  useEffect(() => {
    if (!query.data || appliedPeriod === "custom") return;

    const resolvedRange = {
      from: query.data.period.from,
      to: query.data.period.to,
    };

    const timeout = window.setTimeout(() => {
      setAppliedRange(resolvedRange);

      if (selectedPeriod === appliedPeriod) {
        setDraftRange(resolvedRange);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [appliedPeriod, query.data, selectedPeriod]);

  const handlePeriodChange = (period: DashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(period);

    setRangeError(null);
    setSelectedPeriod(period);
    setAppliedPeriod(period);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };

  const handleDashboardDateChange = (field: keyof DashboardDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({ ...current, [field]: value }));
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
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
  };

  const handleDateControlsBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitCustomRange();
    }, 0);
  };

  const resetPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod("7d");

    setRangeError(null);
    setSelectedPeriod("7d");
    setAppliedPeriod("7d");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };

  const periodControls = (
    <DashboardPeriodControls
      onDateChange={handleDashboardDateChange}
      onDateControlsBlur={handleDateControlsBlur}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      range={draftRange}
      rangeError={rangeError}
    />
  );

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      <DashboardHero />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={periodDescription}
        >
          <LoadingGrid />
        </DashboardOverviewPanel>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent
          periodControls={periodControls}
          periodDescription={periodDescription}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
