"use client";

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Loader2,
  type LucideIcon,
  MapPin,
  RefreshCw,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type FocusEvent, useMemo, useState } from "react";
import { useAdminPatientsDashboard } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientsDashboard,
  PatientsDashboardBreakdownItem,
  PatientsDashboardDailyPoint,
  PatientsDashboardMetric,
  PatientsDashboardQuery,
} from "@/api/req/patients";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const CARD_ORDER = [
  "total_patients",
  "active_patients",
  "inactive_patients",
  "new_signups",
] as const;
type PatientsDashboardPeriodValue = NonNullable<PatientsDashboardQuery["period"]>;
type PatientsDashboardPeriodPreset = Exclude<PatientsDashboardPeriodValue, "custom">;
type PatientsDashboardRange = Pick<PatientsDashboardQuery, "from" | "to">;

const PATIENTS_DASHBOARD_PERIOD_OPTIONS: {
  id: PatientsDashboardPeriodPreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];
const CHART_COLORS = ["#308ce8", "#13a85b", "#64748b", "#f59f00"];
type DashboardMetricKey = (typeof CARD_ORDER)[number];

const DASHBOARD_METRIC_CONFIG: Record<DashboardMetricKey, { color: string; icon: LucideIcon }> = {
  active_patients: { color: CHART_COLORS[1], icon: UserCheck },
  inactive_patients: { color: CHART_COLORS[2], icon: UserRound },
  new_signups: { color: CHART_COLORS[3], icon: UserPlus },
  total_patients: { color: CHART_COLORS[0], icon: UsersRound },
};

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
  date.setDate(1);

  return date;
};

const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const getDashboardRangeForPeriod = (
  period: PatientsDashboardPeriodPreset,
): PatientsDashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildDashboardPeriodQuery = (
  period: PatientsDashboardPeriodValue,
  range: PatientsDashboardRange,
): PatientsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const isValidRange = (range: PatientsDashboardRange) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const CardShell = ({
  children,
  className,
  id,
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
    id={id}
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

const TrendBadge = ({ metric }: { metric: PatientsDashboardMetric }) => {
  if (metric.unavailable) {
    return (
      <span className="whitespace-nowrap text-[0.68rem] font-bold text-warning">Indisponível</span>
    );
  }

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
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PatientsDashboardMetric;
  onToggle: () => void;
}) => {
  const formattedValue = numberFormatter.format(metric.value);

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
          <span className="min-w-0 truncate">{formattedValue}</span>
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
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`patients-${key}`}
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
          <h2 className="text-lg font-black">Não foi possível carregar Pacientes</h2>
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

const EmptyState = ({ period }: { period: AdminPatientsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem cadastros de pacientes</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhum paciente novo foi encontrado entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Os cards de total continuam usando o snapshot real atual.
        </p>
      </div>
    </div>
  </CardShell>
);

const PatientsHeader = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: PatientsDashboardPeriodPreset) => void;
  displayRange: PatientsDashboardRange;
  period: PatientsDashboardPeriodValue;
  rangeError: string | null;
}) => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Pacientes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Dashboard de Pacientes
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
          Gerencie crescimento, status de conta e acompanhamento básico dos pacientes da plataforma.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="patients-period">
          Período
          <span className="relative">
            <select
              className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="patients-period"
              onChange={(event) =>
                onPeriodChange(event.target.value as PatientsDashboardPeriodPreset)
              }
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {PATIENTS_DASHBOARD_PERIOD_OPTIONS.map((option) => (
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
        {period === "custom" && rangeError ? (
          <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
        ) : null}
      </div>
    </div>
  </section>
);

const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPatientsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};

const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PatientsDashboardDailyPoint[];
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
      active_patients: "last",
      inactive_patients: "last",
      total_patients: "last",
    },
  });

  if (chartPoints.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para o período.
      </div>
    );
  }

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
          aria-label="Gráfico temporal dos contadores de pacientes"
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
              <g key={`patients-grid-${value}-${y}`}>
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

const DonutChart = ({
  items,
  total,
}: {
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PatientsDashboardBreakdownItem;
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
    <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
      <svg aria-label="Gráfico de distribuição" role="img" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="18"
        />
        {segments.map(({ dash, item, strokeDashoffset }, index) => (
          <circle
            cx="60"
            cy="60"
            fill="none"
            key={item.id}
            r={radius}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={strokeDashoffset}
            strokeWidth="18"
            transform="rotate(-90 60 60)"
          />
        ))}
        <text
          fill="var(--admin-foreground)"
          fontSize="15"
          fontWeight="900"
          textAnchor="middle"
          x="60"
          y="58"
        >
          {numberFormatter.format(total)}
        </text>
        <text
          fill="var(--admin-muted)"
          fontSize="8"
          fontWeight="700"
          textAnchor="middle"
          x="60"
          y="72"
        >
          total
        </text>
      </svg>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">Sem dados reais.</p>
        ) : (
          items.map((item, index) => (
            <div className="flex items-center justify-between gap-3" key={item.id}>
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {item.label}
              </span>
              <span className="text-sm font-black text-foreground">{item.percentage}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ProgressList = ({
  items,
  total,
}: {
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => (
  <div className="mt-5 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma localização agregada real foi capturada para pacientes.
      </p>
    ) : (
      items.map((item) => (
        <div key={item.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-foreground">{item.label}</span>
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
    <p className="text-xs text-muted">Total considerado: {numberFormatter.format(total)}.</p>
  </div>
);

const Statistics = ({ summary }: { summary: AdminPatientsDashboard }) => (
  <section>
    <h2 className="mb-4 text-xl font-black text-foreground">Estatísticas simples</h2>
    <div className="grid gap-4 xl:grid-cols-3">
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">Gênero</h3>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.demographics.gender.source}
          </span>
        </div>
        <DonutChart
          items={summary.demographics.gender.items}
          total={summary.demographics.gender.total}
        />
      </CardShell>
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin aria-hidden className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black text-foreground">Localização</h3>
          </div>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.locations.source}
          </span>
        </div>
        <ProgressList items={summary.locations.states} total={summary.locations.total} />
      </CardShell>
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">Forma de cadastro</h3>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.demographics.signup_sources.source}
          </span>
        </div>
        <DonutChart
          items={summary.demographics.signup_sources.items}
          total={summary.demographics.signup_sources.total}
        />
      </CardShell>
    </div>
  </section>
);

const DashboardContent = ({ summary }: { summary: AdminPatientsDashboard }) => {
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
      {summary.cards.new_signups.value === 0 ? <EmptyState period={summary.period} /> : null}

      <CardShell className="min-w-0 p-5">
        <div className="mb-5 min-w-0">
          <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {summary.period.label} · {formatDate(summary.period.from)} a{" "}
            {formatDate(summary.period.to)}
          </p>
        </div>
        <CardsGrid
          activeMetricKeys={activeMetricKeys}
          onToggleMetric={toggleMetric}
          summary={summary}
        />
        <TimelineChart points={summary.series.points} visibleMetricKeys={activeMetricKeys} />
      </CardShell>

      <Statistics summary={summary} />
    </div>
  );
};

export const AdminPatientsClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PatientsDashboardPeriodValue>("week");
  const [appliedPeriod, setAppliedPeriod] = useState<PatientsDashboardPeriodValue>("week");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<PatientsDashboardRange>(() =>
    getDashboardRangeForPeriod("week"),
  );
  const [appliedRange, setAppliedRange] = useState<PatientsDashboardRange>(() =>
    getDashboardRangeForPeriod("week"),
  );
  const queryInput = useMemo(
    () => buildDashboardPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = appliedPeriod !== "custom" || isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const query = useAdminPatientsDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;
  const handlePeriodChange = (nextPeriod: PatientsDashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setCustomRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleCustomDateChange = (field: "from" | "to", value: string) => {
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
    const defaultRange = getDashboardRangeForPeriod("week");
    setCustomRangeError(null);
    setSelectedPeriod("week");
    setAppliedPeriod("week");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };

  return (
    <div className="space-y-6">
      <PatientsHeader
        displayRange={displayRange}
        onDateChange={handleCustomDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handlePeriodChange}
        period={selectedPeriod}
        rangeError={customRangeError}
      />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent summary={query.data} /> : null}
    </div>
  );
};
