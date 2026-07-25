"use client";

import {
  Activity,
  AlertTriangle,
  Award,
  ChevronDown,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { type FocusEvent, type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistsDashboard } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardBreakdownItem,
  PsychologistsDashboardDailyPoint,
  PsychologistsDashboardMetric,
  PsychologistsDashboardPlanSegment,
  PsychologistsDashboardQuery,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const CARD_ORDER = [
  "total_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
  "courtesy_psychologists",
  "new_signups",
  "churn",
] as const;

type DashboardMetricKey = (typeof CARD_ORDER)[number];
type DashboardPeriodValue = NonNullable<PsychologistsDashboardQuery["period"]>;
type DashboardPeriodPreset = Exclude<DashboardPeriodValue, "custom">;
type DashboardRange = Pick<PsychologistsDashboardQuery, "from" | "to">;
type DeviceUsageItem = AdminPsychologistsDashboard["device_usage"]["items"][number];
type PlanSegmentFilter = PsychologistsDashboardPlanSegment;
type SignupMethodItem = AdminPsychologistsDashboard["signup_method"]["items"][number];
type SupplyDemandSortKey = "psychologists" | "searches" | "searches_per_psychologist";

const PLAN_SEGMENT_FILTER_OPTIONS: { id: PlanSegmentFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "free", label: "Gratuitos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "courtesy", label: "Cortesia" },
];

const SUPPLY_DEMAND_SORT_OPTIONS: { id: SupplyDemandSortKey; label: string }[] = [
  { id: "searches", label: "Mais buscas" },
  { id: "psychologists", label: "Mais psicólogos" },
  { id: "searches_per_psychologist", label: "Mais buscas por psicólogo" },
];

const toOneDecimal = (value: number) => Math.round(value * 10) / 10;

const normalizeFilterOptionKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const DASHBOARD_PERIOD_OPTIONS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

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

const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildDashboardPeriodQuery = (
  period: DashboardPeriodValue,
  range: DashboardRange,
): PsychologistsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatSelectedPeriod = (period: AdminPsychologistsDashboard["period"]) => {
  if (!period.from || !period.to) return period.label;

  return `${period.label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;
};

const getDashboardPeriodLabel = (period: DashboardPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Todo o período";
};

const formatDraftSelectedPeriod = (period: DashboardPeriodValue, range: DashboardRange) => {
  const label = getDashboardPeriodLabel(period);

  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}`;
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

const formatNullablePercentage = (value: number | null) =>
  typeof value === "number" ? formatPercentageValue(value) : "Indisponível";

const formatDaysMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";
  if (value === 0) return "Mesmo dia";

  return `${numberFormatter.format(value)} dias`;
};

const formatDecimalMetric = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "Indisponível";

const formatSecondsMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

const formatNullableCount = (value: number | null) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

const isValidRange = (range: DashboardRange, period: DashboardPeriodValue) => {
  if (period !== "custom") return true;
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const hasDashboardRecords = (summary: AdminPsychologistsDashboard) => {
  const cardsHaveData = Object.values(summary.cards).some((metric) => metric.value > 0);
  const timelineHasData = summary.timeline.points.some(
    (point) =>
      point.total_psychologists > 0 ||
      point.free_psychologists > 0 ||
      point.subscriber_psychologists > 0 ||
      point.courtesy_psychologists > 0 ||
      point.new_signups > 0 ||
      point.churn > 0,
  );

  return cardsHaveData || timelineHasData;
};

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
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

const DASHBOARD_METRIC_CONFIG = {
  churn: { color: "#e5484d", icon: TrendingDown },
  courtesy_psychologists: { color: "#8b5cf6", icon: Award },
  free_psychologists: { color: "#13a85b", icon: UsersRound },
  new_signups: { color: "#f59f00", icon: UserPlus },
  subscriber_psychologists: { color: "#5d9df6", icon: UserCheck },
  total_psychologists: { color: "#308ce8", icon: UsersRound },
} satisfies Record<DashboardMetricKey, { color: string; icon: LucideIcon }>;

const SIGNUP_METHOD_CHART_COLORS = {
  email_password: "#13a85b",
  google: "#308ce8",
} satisfies Record<SignupMethodItem["id"], string>;

const RATE_WITH_COUNT_METRICS = [
  "courtesy_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
] as const;

const shouldShowPlanShareRate = (metric: PsychologistsDashboardMetric) =>
  RATE_WITH_COUNT_METRICS.includes(metric.id as (typeof RATE_WITH_COUNT_METRICS)[number]);

const getPlanShareRate = (metric: PsychologistsDashboardMetric, total: number | undefined) => {
  if (!shouldShowPlanShareRate(metric)) return null;

  return total && total > 0 ? toOneDecimal((metric.value / total) * 100) : 0;
};

const getMetricValueParts = (
  metric: PsychologistsDashboardMetric,
  options?: { totalPsychologists?: number },
) => {
  const planShareRate = getPlanShareRate(metric, options?.totalPsychologists);

  if (planShareRate !== null) {
    return {
      main: numberFormatter.format(metric.value),
      rate: `(${formatPercentageValue(planShareRate)})`,
    };
  }

  if (metric.id === "churn" && typeof metric.value_count === "number") {
    return {
      main: numberFormatter.format(metric.value_count),
      rate: `(${formatPercentageValue(metric.value)})`,
    };
  }

  if (metric.unit === "currency_cents") {
    return { main: currencyFormatter.format(metric.value / 100), rate: null };
  }

  if (metric.unit === "percentage") {
    return { main: formatPercentageValue(metric.value), rate: null };
  }

  return { main: numberFormatter.format(metric.value), rate: null };
};

const TrendBadge = ({ metric }: { metric: PsychologistsDashboardMetric }) => {
  if (metric.unavailable)
    return (
      <span className="whitespace-nowrap text-[0.68rem] font-bold text-warning">Indisponível</span>
    );

  return (
    <span
      className={cn(
        "whitespace-nowrap text-[0.68rem] font-semibold",
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
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
  totalPsychologists,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PsychologistsDashboardMetric;
  onToggle: () => void;
  totalPsychologists?: number;
}) => {
  const valueParts = getMetricValueParts(metric, { totalPsychologists });
  const formattedValue = valueParts.rate
    ? `${valueParts.main} ${valueParts.rate}`
    : valueParts.main;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${metric.label}: ${formattedValue}. ${
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
          <span className="min-w-0 truncate">{valueParts.main}</span>
          {valueParts.rate ? (
            <span className="shrink-0 text-base font-semibold text-muted xl:text-sm">
              {valueParts.rate}
            </span>
          ) : null}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`psych-skeleton-${key}`}
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
          <h2 className="text-lg font-semibold">Não foi possível carregar Psicólogos</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = ({ period }: { period: AdminPsychologistsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma métrica real foi encontrada entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);

const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PsychologistsDashboardDailyPoint[];
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
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = aggregateCalendarChartPoints(points, CARD_ORDER, {
    metricAggregations: {
      churn: "last",
      courtesy_psychologists: "last",
      free_psychologists: "last",
      subscriber_psychologists: "last",
      total_psychologists: "last",
    },
  });
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
          aria-label="Gráfico temporal dos contadores de psicólogos"
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
              <g key={`psych-grid-${value}-${y}`}>
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

const PanelTitle = ({
  description,
  icon: Icon,
  source,
  title,
}: {
  description?: string;
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
    {source ? (
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {source}
      </span>
    ) : null}
  </div>
);

const PlanSegmentSelect = ({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: PlanSegmentFilter) => void;
  value: PlanSegmentFilter;
}) => (
  <label className="block" htmlFor={id}>
    <span className="sr-only">Filtrar por plano do psicólogo</span>
    <span className="relative block">
      <select
        className="h-10 w-full min-w-[9.25rem] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as PlanSegmentFilter)}
        value={value}
      >
        {PLAN_SEGMENT_FILTER_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

const getPlanSegmentSummary = (summary: AdminPsychologistsDashboard, segment: PlanSegmentFilter) =>
  summary.plan_segments?.[segment] ?? {
    device_usage: summary.device_usage,
    id: "all" as const,
    label: "Todos",
    platform_usage: summary.platform_usage,
    psychologists_count: summary.cards.total_psychologists.value,
    signup_method: summary.signup_method,
    statistics: summary.statistics,
    traffic_sources: summary.traffic_sources,
  };

const formatComparisonNumber = (value: number) =>
  value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });

const normalizeComparisonLabel = normalizeFilterOptionKey;

const findSupplyItem = (
  demandItem: PsychologistsDashboardBreakdownItem,
  supplyItems: PsychologistsDashboardBreakdownItem[],
) => {
  const demandId = normalizeComparisonLabel(demandItem.id);
  const demandLabel = normalizeComparisonLabel(demandItem.label);

  return (
    supplyItems.find((supplyItem) => {
      const supplyId = normalizeComparisonLabel(supplyItem.id);
      const supplyLabel = normalizeComparisonLabel(supplyItem.label);

      return supplyId === demandId || supplyLabel === demandLabel;
    }) ?? {
      count: 0,
      id: `empty-${demandItem.id}`,
      label: demandItem.label,
      percentage: 0,
    }
  );
};

type SupplyDemandDimensionConfig = {
  demand: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
  icon: LucideIcon;
  id: string;
  label: string;
  supply: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
};

type SupplyDemandComparisonRow = {
  id: string;
  label: string;
  psychologistsCount: number;
  psychologistsPercentage: number;
  searchesPerPsychologist: number | null;
  searchesCount: number;
  searchesPercentage: number;
};

const getSupplyDemandStatus = (row: SupplyDemandComparisonRow) => {
  if (row.searchesCount > 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-red-50 text-danger",
      label: "Sem oferta",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount > 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem demanda",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem sinal",
    };
  }

  const pressure = row.searchesPerPsychologist ?? 0;

  if (pressure >= 100) {
    return {
      className: "bg-red-50 text-danger",
      label: "Alta demanda",
    };
  }

  if (pressure >= 25) {
    return {
      className: "bg-amber-50 text-warning",
      label: "Atenção",
    };
  }

  if (pressure >= 5) {
    return {
      className: "bg-primary-soft text-primary",
      label: "Equilibrado",
    };
  }

  return {
    className: "bg-emerald-50 text-success",
    label: "Oferta confortável",
  };
};

const buildSupplyDemandRows = (config: SupplyDemandDimensionConfig) =>
  config.demand.items.map<SupplyDemandComparisonRow>((demandItem) => {
    const supplyItem = findSupplyItem(demandItem, config.supply.items);

    return {
      id: demandItem.id,
      label: demandItem.label,
      psychologistsCount: supplyItem.count,
      psychologistsPercentage: supplyItem.percentage,
      searchesPerPsychologist:
        supplyItem.count > 0 ? toOneDecimal(demandItem.count / supplyItem.count) : null,
      searchesCount: demandItem.count,
      searchesPercentage: demandItem.percentage,
    };
  });

const getSupplyDemandSortValue = (row: SupplyDemandComparisonRow, sortKey: SupplyDemandSortKey) => {
  if (sortKey === "psychologists") return row.psychologistsCount;
  if (sortKey === "searches_per_psychologist") {
    if (row.searchesPerPsychologist !== null) return row.searchesPerPsychologist;

    return row.searchesCount > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  return row.searchesCount;
};

const SupplyDemandHeaderCell = ({
  align = "left",
  label,
  total,
}: {
  align?: "center" | "left" | "right";
  label: string;
  total: number;
}) => (
  <span
    className={cn(
      "inline-flex items-baseline gap-1",
      align === "center" && "justify-center text-center",
      align === "right" && "justify-end text-right",
    )}
  >
    <span>{label}</span>
    <span className="text-[0.68rem] font-medium tracking-normal text-subtle">
      ({numberFormatter.format(total)})
    </span>
  </span>
);

const SupplyDemandCountCell = ({
  count,
  label,
  percentage,
}: {
  count: number;
  label: string;
  percentage: number;
}) => (
  <div>
    <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
      <span className="font-bold text-muted lg:hidden">{label}</span>
      <span className="inline-flex items-baseline gap-1 text-base font-semibold text-foreground lg:justify-center lg:text-center">
        <span>{numberFormatter.format(count)}</span>
        <span className="text-sm font-medium text-muted">
          ({formatPercentageValue(percentage)})
        </span>
      </span>
    </div>
  </div>
);

const SearchesPerPsychologistCell = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const value =
    row.searchesPerPsychologist === null
      ? "—"
      : formatComparisonNumber(row.searchesPerPsychologist);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
        <span className="font-bold text-muted lg:hidden">Buscas/psicólogo</span>
        <span className="text-base font-semibold text-foreground lg:text-center">{value}</span>
      </div>
    </div>
  );
};

const SupplyDemandListRow = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const status = getSupplyDemandStatus(row);

  return (
    <li className="grid gap-4 border-t border-border p-4 lg:grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] lg:items-center">
      <div>
        <p className="text-sm font-semibold text-foreground">{row.label}</p>
      </div>
      <SupplyDemandCountCell
        count={row.searchesCount}
        label="Buscas"
        percentage={row.searchesPercentage}
      />
      <SupplyDemandCountCell
        count={row.psychologistsCount}
        label="Psicólogos"
        percentage={row.psychologistsPercentage}
      />
      <SearchesPerPsychologistCell row={row} />
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <span
          className={cn("rounded-full px-2 py-1 text-[0.65rem] font-semibold", status.className)}
        >
          {status.label}
        </span>
      </div>
    </li>
  );
};

const MiniBar = ({
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

const getPiePoint = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const buildPieSlicePath = (
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const renderPiePercentageLabel = ({
  color,
  label,
  x,
  y,
}: {
  color: string;
  label: string;
  x: number;
  y: number;
}) => {
  const width = 39;
  const height = 16;

  return (
    <g>
      <rect
        fill={hexToRgba(color, 0.86)}
        height={height}
        rx={height / 2}
        width={width}
        x={x - width / 2}
        y={y - height / 2}
      />
      <text
        dominantBaseline="middle"
        fill="white"
        fontSize="8.5"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 0.25}
      >
        {label}
      </text>
    </g>
  );
};

const SignupMethodPieChart = ({
  signupMethod,
}: {
  signupMethod: AdminPsychologistsDashboard["signup_method"];
}) => {
  const center = 60;
  const radius = 48;
  const total = Math.max(0, signupMethod.total);
  const visibleItems = signupMethod.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: SignupMethodItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;

  if (total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Sem cadastros de psicólogos nas categorias Google ou E-mail e senha no período selecionado.
      </p>
    );
  }

  const ariaLabel = `Gráfico de pizza do modo de cadastro: ${signupMethod.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} cadastro(s), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <figure className="mt-5 grid gap-5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-center">
      <svg
        aria-label={ariaLabel}
        className="mx-auto aspect-square w-40 sm:w-44"
        role="img"
        viewBox="0 0 120 120"
      >
        <circle
          cx={center}
          cy={center}
          fill="var(--admin-surface-muted)"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="1"
        />
        {segments.map((segment) => {
          const color = SIGNUP_METHOD_CHART_COLORS[segment.item.id];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.id}>
                <circle
                  cx={center}
                  cy={center}
                  fill={color}
                  r={radius}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {renderPiePercentageLabel({
                  color,
                  label: percentageLabel,
                  x: center,
                  y: center,
                })}
              </g>
            );
          }

          return (
            <g key={segment.item.id}>
              <path
                d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                fill={color}
                stroke="var(--admin-surface)"
                strokeWidth="1.4"
              />
              {segment.share >= 0.08
                ? renderPiePercentageLabel({
                    color,
                    label: percentageLabel,
                    x: labelPoint.x,
                    y: labelPoint.y,
                  })
                : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="space-y-3">
        {signupMethod.items.map((item) => {
          const signupLabel = item.count === 1 ? "cadastro" : "cadastros";

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: SIGNUP_METHOD_CHART_COLORS[item.id] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-muted">
                {numberFormatter.format(item.count)} {signupLabel}
              </p>
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};
const ConversionAndUsageBlocks = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const conversion = summary.conversion;
  const [signupMethodPlanSegment, setSignupMethodPlanSegment] = useState<PlanSegmentFilter>("all");
  const [deviceUsagePlanSegment, setDeviceUsagePlanSegment] = useState<PlanSegmentFilter>("all");
  const [platformUsagePlanSegment, setPlatformUsagePlanSegment] =
    useState<PlanSegmentFilter>("all");
  const signupMethodSummary = getPlanSegmentSummary(summary, signupMethodPlanSegment);
  const deviceUsageSummary = getPlanSegmentSummary(summary, deviceUsagePlanSegment);
  const platformUsageSummary = getPlanSegmentSummary(summary, platformUsagePlanSegment);
  const platformUsage = platformUsageSummary.platform_usage;
  const selectedPeriodLabel = formatSelectedPeriod(summary.period);

  return (
    <section className="grid gap-5">
      <CardShell className="p-5">
        <PanelTitle
          description={selectedPeriodLabel}
          icon={TrendingDown}
          title="Conversão do cadastro até assinatura"
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Cadastros",
              value: numberFormatter.format(conversion.registered_count),
            },
            {
              label: "Assinaram",
              value: numberFormatter.format(conversion.converted_paid_count),
            },
            {
              label: "Taxa paga",
              value: formatNullablePercentage(conversion.conversion_rate),
            },
            { label: "Média", value: formatDaysMetric(conversion.average_days) },
            { label: "Mediana", value: formatDaysMetric(conversion.median_days) },
            {
              description: "75% assinam até esse prazo",
              label: "P75",
              value: formatDaysMetric(conversion.p75_days),
            },
            {
              description: "90% assinam até esse prazo",
              label: "P90",
              value: formatDaysMetric(conversion.p90_days),
            },
          ].map(({ description, label, value }) => (
            <div className="rounded-2xl bg-surface-muted p-3" key={label}>
              <p className="text-xs font-black text-muted">{label}</p>
              <p className="mt-1 text-xl font-black text-foreground">{value}</p>
              {description ? (
                <p className="mt-1 text-[0.68rem] font-bold leading-snug text-subtle">
                  {description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 p-4">
            <h3 className="text-sm font-black text-foreground">Distribuição por prazo</h3>
            <div className="mt-4 space-y-3">
              {conversion.buckets.map((bucket) => (
                <MiniBar
                  key={bucket.id}
                  label={bucket.label}
                  percentage={bucket.percentage}
                  value={`${numberFormatter.format(bucket.count)} · ${formatPercentageValue(
                    bucket.percentage,
                  )}`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 p-4">
            <h3 className="text-sm font-black text-foreground">Conversão por modo de cadastro</h3>
            <div className="mt-4 space-y-4">
              {summary.conversion_by_signup_method.map((item) => (
                <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-xs font-bold text-muted">
                        {numberFormatter.format(item.converted_paid_count)} de{" "}
                        {numberFormatter.format(item.registered_count)} assinaram
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary">
                      {formatNullablePercentage(item.conversion_rate)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-muted">
                    Mediana: {formatDaysMetric(item.median_days)} · Média:{" "}
                    {formatDaysMetric(item.average_days)}
                  </p>
                  {!item.sample_sufficient && item.unavailable_reason ? (
                    <p className="mt-2 text-xs font-bold text-subtle">{item.unavailable_reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardShell>

      <div className="grid gap-5 xl:grid-cols-2">
        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={UserPlus}
              title="Modo de cadastro"
            />
            <PlanSegmentSelect
              id="signup-method-plan-segment"
              onChange={setSignupMethodPlanSegment}
              value={signupMethodPlanSegment}
            />
          </div>
          <SignupMethodPieChart signupMethod={signupMethodSummary.signup_method} />
          {signupMethodSummary.signup_method.unknown_count > 0 ? (
            <p className="mt-4 text-xs font-bold text-subtle">
              {numberFormatter.format(signupMethodSummary.signup_method.unknown_count)} cadastro(s)
              legado(s) com via indisponível foram mantidos fora das duas categorias de produto.
            </p>
          ) : null}
        </CardShell>

        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Smartphone}
              title="Devices e sistemas"
            />
            <PlanSegmentSelect
              id="device-usage-plan-segment"
              onChange={setDeviceUsagePlanSegment}
              value={deviceUsagePlanSegment}
            />
          </div>
          <DeviceUsagePieChart deviceUsage={deviceUsageSummary.device_usage} />
        </CardShell>

        <CardShell className="p-5 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Activity}
              title="Uso da plataforma"
            />
            <PlanSegmentSelect
              id="platform-usage-plan-segment"
              onChange={setPlatformUsagePlanSegment}
              value={platformUsagePlanSegment}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Ativos", numberFormatter.format(platformUsage.active_psychologists_count)],
              ["Taxa ativa", formatNullablePercentage(platformUsage.active_psychologists_rate)],
              [
                "PWA instalado",
                formatNullablePercentage(platformUsage.pwa_installed_psychologists_rate),
              ],
              ["Dias médios", formatDaysMetric(platformUsage.average_access_days)],
              ["Sessões médias", formatDecimalMetric(platformUsage.average_sessions)],
              ["Tempo médio", formatSecondsMetric(platformUsage.average_duration_seconds)],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-surface-muted p-3" key={label}>
                <p className="text-xs font-black text-muted">{label}</p>
                <p className="mt-1 text-lg font-black text-foreground">{value}</p>
              </div>
            ))}
          </div>
          {platformUsage.duration_unavailable_reason ? (
            <p className="mt-3 text-xs font-bold text-subtle">
              {platformUsage.duration_unavailable_reason}
            </p>
          ) : null}
          {platformUsage.unavailable_reason ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
              {platformUsage.unavailable_reason}
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-black text-foreground">Páginas mais acessadas</h3>
              {platformUsage.top_pages.map((page) => (
                <MiniBar
                  key={page.label}
                  label={page.label}
                  percentage={page.percentage}
                  value={`${numberFormatter.format(page.count)} · ${formatPercentageValue(
                    page.percentage,
                  )}`}
                />
              ))}
            </div>
          )}
        </CardShell>
      </div>
    </section>
  );
};

const DEVICE_USAGE_CHART_COLORS = {
  desktop: "#13a85b",
  mobile: "#308ce8",
  tablet: "#8b5cf6",
  unknown: "#94a3b8",
} satisfies Record<DeviceUsageItem["device_type"], string>;

const DeviceUsagePieChart = ({
  deviceUsage,
}: {
  deviceUsage: AdminPsychologistsDashboard["device_usage"];
}) => {
  const center = 60;
  const radius = 48;
  const total = Math.max(0, deviceUsage.total_sessions);
  const visibleItems = deviceUsage.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: DeviceUsageItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;
  if (total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {deviceUsage.unavailable_reason ??
          "Sem sessões autenticadas de psicólogos no período selecionado."}
      </p>
    );
  }

  const ariaLabel = `Gráfico de pizza dos devices usados por psicólogos: ${deviceUsage.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} sessão(ões), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <figure className="mt-5 grid gap-5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-center">
      <svg
        aria-label={ariaLabel}
        className="mx-auto aspect-square w-40 sm:w-44"
        role="img"
        viewBox="0 0 120 120"
      >
        <circle
          cx={center}
          cy={center}
          fill="var(--admin-surface-muted)"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="1"
        />
        {segments.map((segment) => {
          const color = DEVICE_USAGE_CHART_COLORS[segment.item.device_type];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.device_type}>
                <circle
                  cx={center}
                  cy={center}
                  fill={color}
                  r={radius}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {renderPiePercentageLabel({
                  color,
                  label: percentageLabel,
                  x: center,
                  y: center,
                })}
              </g>
            );
          }

          return (
            <g key={segment.item.device_type}>
              <path
                d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                fill={color}
                stroke="var(--admin-surface)"
                strokeWidth="1.4"
              />
              {segment.share >= 0.08
                ? renderPiePercentageLabel({
                    color,
                    label: percentageLabel,
                    x: labelPoint.x,
                    y: labelPoint.y,
                  })
                : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="space-y-3">
        {deviceUsage.items.map((item) => {
          const operatingSystems =
            item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
          const operatingSystemSummary = operatingSystems
            .map(
              (operatingSystem) =>
                `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
            )
            .join(" · ");

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.device_type}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: DEVICE_USAGE_CHART_COLORS[item.device_type] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              {operatingSystemSummary ? (
                <p className="mt-2 text-xs font-medium leading-5 text-subtle">
                  {operatingSystemSummary}
                </p>
              ) : null}
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};

const StatsContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [activeDimensionId, setActiveDimensionId] = useState("specialties");
  const [optionQuery, setOptionQuery] = useState("");
  const [planSegment, setPlanSegment] = useState<PlanSegmentFilter>("all");
  const [sortKey, setSortKey] = useState<SupplyDemandSortKey>("searches");
  const filterSearches = summary.filters_searches.dimensions;
  const planSegmentSummary = getPlanSegmentSummary(summary, planSegment);
  const statistics = planSegmentSummary.statistics;

  const comparisonDimensions: SupplyDemandDimensionConfig[] = [
    {
      demand: filterSearches.specialties,
      icon: Award,
      id: "specialties",
      label: "Especialidades",
      supply: statistics.specialties,
    },
    {
      demand: filterSearches.services,
      icon: ShieldCheck,
      id: "services",
      label: "Servi\u00e7os",
      supply: statistics.services,
    },
    {
      demand: filterSearches.approaches,
      icon: MessageCircle,
      id: "approaches",
      label: "Abordagens",
      supply: statistics.approaches,
    },
    {
      demand: filterSearches.target_audiences,
      icon: UsersRound,
      id: "target-audience",
      label: "P\u00fablico atendido",
      supply: statistics.target_audience,
    },
    {
      demand: filterSearches.modalities,
      icon: Activity,
      id: "modalities",
      label: "Modalidades",
      supply: statistics.modalities,
    },
    {
      demand: filterSearches.states,
      icon: Search,
      id: "states",
      label: "Estado",
      supply: statistics.states,
    },
    {
      demand: filterSearches.cities,
      icon: Search,
      id: "cities",
      label: "Cidade",
      supply: statistics.cities,
    },
    {
      demand: filterSearches.genders,
      icon: UserCheck,
      id: "genders",
      label: "G\u00eanero",
      supply: statistics.gender,
    },
    {
      demand: filterSearches.race_colors,
      icon: UsersRound,
      id: "race-colors",
      label: "Ra\u00e7a",
      supply: statistics.race_colors,
    },
    {
      demand: filterSearches.religions,
      icon: ShieldCheck,
      id: "religions",
      label: "Religi\u00e3o",
      supply: statistics.religions,
    },
    {
      demand: filterSearches.features,
      icon: UserCheck,
      id: "features",
      label: "Selos e facilidades",
      supply: statistics.features,
    },
    {
      demand: filterSearches.languages,
      icon: Search,
      id: "languages",
      label: "Idiomas",
      supply: statistics.languages,
    },
  ];
  const selectedDimension =
    comparisonDimensions.find((dimension) => dimension.id === activeDimensionId) ??
    comparisonDimensions[0];
  const rows = buildSupplyDemandRows(selectedDimension);
  const normalizedQuery = normalizeComparisonLabel(optionQuery);
  const visibleRows = rows
    .filter((row) => normalizeComparisonLabel(row.label).includes(normalizedQuery))
    .toSorted((left, right) => {
      const sortDifference =
        getSupplyDemandSortValue(right, sortKey) - getSupplyDemandSortValue(left, sortKey);

      if (sortDifference !== 0) return sortDifference;

      return right.searchesCount - left.searchesCount;
    });
  const SelectedIcon = selectedDimension.icon;
  const periodLabel = formatSelectedPeriod(summary.period);
  const emptyRowsMessage =
    selectedDimension.id === "cities" && optionQuery.trim().length === 0
      ? `Nenhuma cidade com pelo menos ${numberFormatter.format(
          summary.filters_searches.minimum_city_searches,
        )} buscas ou psicólogo cadastrado no período selecionado.`
      : `Nenhuma opção encontrada para “${optionQuery}”.`;
  const handleDimensionChange = (dimensionId: string) => {
    setActiveDimensionId(dimensionId);
    setOptionQuery("");
  };

  return (
    <div className="space-y-4">
      <CardShell className="overflow-hidden">
        <div className="border-b border-border bg-surface-muted p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-primary">
                <SelectedIcon aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Comparativo de oferta e demanda
                  </h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{periodLabel}</p>
              </div>
            </div>
            <PlanSegmentSelect
              id="supply-demand-plan-segment"
              onChange={setPlanSegment}
              value={planSegment}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1.15fr)_minmax(220px,0.85fr)]">
            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-filter-type"
            >
              Tipo de filtro
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-filter-type"
                  onChange={(event) => handleDimensionChange(event.target.value)}
                  value={selectedDimension.id}
                >
                  {comparisonDimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-search"
            >
              Buscar opção
              <span className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm font-bold text-foreground shadow-control outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-search"
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder={`Buscar em ${selectedDimension.label.toLowerCase()}`}
                  type="search"
                  value={optionQuery}
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-sort"
            >
              Ordenar por
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-sort"
                  onChange={(event) => setSortKey(event.target.value as SupplyDemandSortKey)}
                  value={sortKey}
                >
                  {SUPPLY_DEMAND_SORT_OPTIONS.map((option) => (
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
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] gap-4 border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted lg:grid">
          <SupplyDemandHeaderCell label="Opções do filtro" total={rows.length} />
          <SupplyDemandHeaderCell
            align="center"
            label="Buscas"
            total={selectedDimension.demand.total}
          />
          <SupplyDemandHeaderCell
            align="center"
            label="Psicólogos"
            total={selectedDimension.supply.total}
          />
          <span className="text-center">Buscas/psicólogo</span>
          <span className="text-right">Leitura</span>
        </div>

        {visibleRows.length > 0 ? (
          <ul className="max-h-[680px] overflow-y-auto">
            {visibleRows.map((row) => (
              <SupplyDemandListRow key={row.id} row={row} />
            ))}
          </ul>
        ) : (
          <div className="p-6 text-sm font-bold text-muted">{emptyRowsMessage}</div>
        )}
      </CardShell>
    </div>
  );
};

const PsychologistsHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Psicólogos</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Dashboard de Psicólogos
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
        Análise global dos psicólogos da plataforma.
      </p>
    </div>
  </section>
);

const DashboardPeriodControls = ({
  displayRange,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: DashboardRange;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof DashboardRange, value: string) => void;
  onPeriodChange: (period: DashboardPeriodPreset) => void;
  period: DashboardPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="psychologists-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="psychologists-period"
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
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={displayRange.from}
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

const DashboardOverviewPanel = ({
  children,
  periodControls,
  periodDescription,
}: {
  children: ReactNode;
  periodControls: ReactNode;
  periodDescription: string;
}) => (
  <CardShell className="min-w-0 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);
const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPsychologistsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            totalPsychologists={cards.total_psychologists.value}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};

const TrafficSourceMetricValue = ({
  className,
  percentage,
  value,
}: {
  className?: string;
  percentage: number;
  value: ReactNode;
}) => (
  <span className={cn("inline-flex items-baseline gap-1 font-black text-foreground", className)}>
    <span>{value}</span>
    <span className="text-[0.78em] font-semibold text-muted">
      ({formatPercentageValue(percentage)})
    </span>
  </span>
);

const DashboardTrafficSourcesCard = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [trafficPlanSegment, setTrafficPlanSegment] = useState<PlanSegmentFilter>("all");
  const trafficSegmentSummary = getPlanSegmentSummary(summary, trafficPlanSegment);
  const traffic = trafficSegmentSummary.traffic_sources;
  const totalWhatsappClicks = traffic.sources.reduce(
    (total, source) => total + (source.whatsapp_clicks ?? 0),
    0,
  );
  const getWhatsappClicksPercentage = (value: number | null) =>
    totalWhatsappClicks > 0 ? toOneDecimal(((value ?? 0) / totalWhatsappClicks) * 100) : 0;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Origem do tráfego
          </p>
          <h3 className="mt-2 text-lg font-black text-foreground">
            Canais que levam pacientes até os perfis
          </h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {summary.period.label} · {formatDate(summary.period.from)} a{" "}
            {formatDate(summary.period.to)}
          </p>
        </div>
        <PlanSegmentSelect
          id="traffic-source-plan-segment"
          onChange={setTrafficPlanSegment}
          value={trafficPlanSegment}
        />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.35rem] border border-border/70 md:block">
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(110px,0.75fr)_minmax(92px,0.55fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">Perfil</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {traffic.sources.map((source) => (
            <div
              className="grid grid-cols-[minmax(0,1.25fr)_minmax(110px,0.75fr)_minmax(92px,0.55fr)] items-center gap-3 px-4 py-4"
              key={source.id}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-foreground">{source.label}</p>
                  {source.badge === "primary_source" ? (
                    <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                      Principal origem
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {source.description}
                </p>
              </div>
              <div className="flex justify-center text-center">
                <TrafficSourceMetricValue
                  className="text-lg"
                  percentage={source.percentage}
                  value={numberFormatter.format(source.profile_views)}
                />
              </div>
              <div className="flex justify-center text-center">
                <TrafficSourceMetricValue
                  className="text-lg"
                  percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                  value={formatNullableCount(source.whatsapp_clicks)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {traffic.sources.map((source) => (
          <article
            className="rounded-[1.35rem] border border-border/70 bg-surface-muted p-4"
            key={source.id}
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-foreground">{source.label}</h4>
                {source.badge === "primary_source" ? (
                  <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                    Principal origem
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{source.description}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                {
                  label: "Perfil",
                  percentage: source.percentage,
                  value: numberFormatter.format(source.profile_views),
                },
                {
                  label: "WhatsApp",
                  percentage: getWhatsappClicksPercentage(source.whatsapp_clicks),
                  value: formatNullableCount(source.whatsapp_clicks),
                },
              ].map((item) => (
                <div className="rounded-2xl bg-surface p-3" key={item.label}>
                  <p className="text-[0.68rem] font-black text-muted">{item.label}</p>
                  <p className="mt-1">
                    <TrafficSourceMetricValue
                      className="text-base"
                      percentage={item.percentage}
                      value={item.value}
                    />
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </CardShell>
  );
};

const DashboardContent = ({
  periodControls,
  summary,
}: {
  periodControls: ReactNode;
  summary: AdminPsychologistsDashboard;
}) => {
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<DashboardMetricKey[]>(() => [
    ...CARD_ORDER,
  ]);
  const activeMetricKeys = CARD_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: DashboardMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <div className="space-y-7">
      {!hasDashboardRecords(summary) ? <EmptyState period={summary.period} /> : null}

      <section className="space-y-4">
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={formatSelectedPeriod(summary.period)}
        >
          <CardsGrid
            activeMetricKeys={activeMetricKeys}
            onToggleMetric={toggleMetric}
            summary={summary}
          />
          <TimelineChart points={summary.timeline.points} visibleMetricKeys={activeMetricKeys} />
        </DashboardOverviewPanel>
        <DashboardTrafficSourcesCard summary={summary} />
      </section>

      <StatsContent summary={summary} />

      <ConversionAndUsageBlocks summary={summary} />
    </div>
  );
};

export const AdminPsychologistsClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPeriodValue>("all");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<DashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const [appliedRange, setAppliedRange] = useState<DashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const queryInput = useMemo(
    () => buildDashboardPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = isValidRange(appliedRange, appliedPeriod);
  const validDraftRange = isValidRange(draftRange, "custom");
  const query = useAdminPsychologistsDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;
  const handlePeriodChange = (nextPeriod: DashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setCustomRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleDateChange = (field: keyof DashboardRange, value: string) => {
    setCustomRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange({ ...displayRange, [field]: value });
  };
  const commitCustomRange = () => {
    if (selectedPeriod !== "custom") return;

    if (!validDraftRange) {
      setCustomRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setCustomRangeError(null);
    setSelectedPeriod("custom");
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
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
  const resetPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod("all");
    setCustomRangeError(null);
    setSelectedPeriod("all");
    setAppliedPeriod("all");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };
  const periodControls = (
    <DashboardPeriodControls
      displayRange={displayRange}
      onDateControlsBlur={handleDateControlsBlur}
      onDateChange={handleDateChange}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      rangeError={customRangeError}
    />
  );

  return (
    <div className="space-y-7">
      <PsychologistsHeader />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={formatDraftSelectedPeriod(selectedPeriod, displayRange)}
        >
          <LoadingGrid />
          <div className="mt-4 h-[20rem] animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-muted" />
        </DashboardOverviewPanel>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent periodControls={periodControls} summary={query.data} />
      ) : null}
    </div>
  );
};
