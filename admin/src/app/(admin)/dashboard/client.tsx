"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Download,
  Flag,
  Loader2,
  type LucideIcon,
  RefreshCw,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { type FocusEventHandler, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminDashboardExport, useAdminDashboardSummary } from "@/api/callers/dashboard";
import { resolveApiError } from "@/api/handle";
import type {
  AdminDashboardSummary,
  DashboardDailyPoint,
  DashboardMetric,
  DashboardPendingReport,
  DashboardSummaryQuery,
} from "@/api/req/dashboard";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const DASHBOARD_PERIOD_OPTIONS = [
  { days: 7, id: "7d", label: "Últimos 7 dias" },
  { days: 30, id: "30d", label: "Últimos 30 dias" },
  { days: 90, id: "90d", label: "Últimos 90 dias" },
] as const;
const SKELETON_KEYS = ["sessions", "revenue", "patients", "psychologists", "reports"] as const;

type DashboardPeriodPreset = (typeof DASHBOARD_PERIOD_OPTIONS)[number]["id"];
type DashboardPeriodValue = DashboardPeriodPreset | "custom";

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

const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardSummaryQuery => {
  const option = DASHBOARD_PERIOD_OPTIONS.find((item) => item.id === period);

  return getQuickRange(option?.days ?? 7);
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

  return cardValues || communityValues || summary.pending_reports.total > 0;
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

const DashboardHero = ({
  isExporting,
  onExport,
  range,
}: {
  isExporting: boolean;
  onExport: () => void;
  range: DashboardSummaryQuery;
}) => (
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
          Visão geral da plataforma Lectum com indicadores reais de sessões, comunidade, financeiro,
          usuários e moderação.
        </p>
      </div>
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-white shadow-control transition hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
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
  range: DashboardSummaryQuery;
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
  <div className="mt-5 flex flex-wrap items-center gap-3">
    {items.map((item) => (
      <span
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted"
        key={item.label}
      >
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

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
      label: "Posts",
      points: summary.community_activity.posts,
    },
    {
      color: "#8b5cf6",
      label: "Comentários",
      points: summary.community_activity.comments,
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
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodValue>("7d");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<DashboardSummaryQuery>({
    initialRange: () => getDashboardRangeForPeriod("7d"),
    isValidRange,
  });
  const validRange = isValidRange(appliedRange);
  const query = useAdminDashboardSummary(appliedRange, { enabled: validRange });
  const exportMutation = useAdminDashboardExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodDescription = useMemo(() => {
    const range = query.data
      ? {
          from: query.data.period.from,
          to: query.data.period.to,
        }
      : appliedRange;

    return formatPeriodDescription(selectedPeriod, range);
  }, [appliedRange, query.data, selectedPeriod]);

  const handlePeriodChange = (period: DashboardPeriodPreset) => {
    setSelectedPeriod(period);
    applyRange(getDashboardRangeForPeriod(period));
  };

  const handleDashboardDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDateChange(field, value);
  };

  const resetPeriod = () => {
    setSelectedPeriod("7d");
    applyRange(getDashboardRangeForPeriod("7d"));
  };

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync(appliedRange);
      downloadBlob(result.blob, result.filename);
      toast.success("Exportação real gerada com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
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
      <DashboardHero
        isExporting={exportMutation.isPending}
        onExport={() => void handleExport()}
        range={draftRange}
      />

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
