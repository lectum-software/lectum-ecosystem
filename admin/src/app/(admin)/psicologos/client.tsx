"use client";

import {
  Activity,
  AlertTriangle,
  Award,
  ChevronDown,
  CircleDollarSign,
  Heart,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Star,
  TrendingDown,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistsDashboard } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardBooleanBreakdown,
  PsychologistsDashboardBreakdownItem,
  PsychologistsDashboardDailyPoint,
  PsychologistsDashboardMetric,
  PsychologistsDashboardQuery,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#3b16f3", "#1788ff", "#19b96f", "#ff7a1a", "#f8288f"];
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

const DASHBOARD_PERIOD_OPTIONS: { id: DashboardPeriodPreset; label: string }[] = [
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

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

const formatMetricValue = (metric: PsychologistsDashboardMetric) => {
  if (metric.id === "churn" && typeof metric.value_count === "number") {
    return `${numberFormatter.format(metric.value_count)} (${formatPercentageValue(metric.value)})`;
  }

  if (metric.unit === "currency_cents") return currencyFormatter.format(metric.value / 100);
  if (metric.unit === "percentage") return formatPercentageValue(metric.value);

  return numberFormatter.format(metric.value);
};

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
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
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
  new_signups: { color: "#ff7a1a", icon: UserPlus },
  subscriber_psychologists: { color: "#1788ff", icon: UserCheck },
  total_psychologists: { color: "#3b16f3", icon: UsersRound },
} satisfies Record<DashboardMetricKey, { color: string; icon: LucideIcon }>;

const TrendBadge = ({ metric }: { metric: PsychologistsDashboardMetric }) => {
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
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PsychologistsDashboardMetric;
  onToggle: () => void;
}) => (
  <button
    aria-pressed={active}
    className={cn(
      "min-h-44 rounded-card border bg-surface p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      active
        ? "border-primary/40 shadow-none"
        : "border-border opacity-70 shadow-admin-soft hover:border-primary/30 hover:opacity-100",
    )}
    onClick={onToggle}
    title={`${metric.label}: ${formatMetricValue(metric)}. ${
      active ? "Visível no gráfico" : "Oculto no gráfico"
    }`}
    type="button"
  >
    <div className="flex items-start justify-between gap-3">
      <div
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ backgroundColor: hexToRgba(color, 0.1), color }}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </div>
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
      <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
    </div>
  </button>
);

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    {CARD_ORDER.map((key) => (
      <CardShell className="h-44 animate-pulse bg-surface-muted" key={`psych-skeleton-${key}`} />
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
          <h2 className="text-lg font-black">Não foi possível carregar Psicólogos</h2>
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

const EmptyState = ({ period }: { period: AdminPsychologistsDashboard["period"] }) => (
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

const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PsychologistsDashboardDailyPoint[];
  visibleMetricKeys: DashboardMetricKey[];
}) => {
  const width = 760;
  const height = 300;
  const padding = { bottom: 44, left: 50, right: 20, top: 24 };
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
    chartPoints.length <= 1
      ? width / 2
      : padding.left + (index * chartWidth) / (chartPoints.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));

  return (
    <figure className="mt-5 overflow-hidden">
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico temporal dos contadores de psicólogos"
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`psych-grid-${value}-${y}`}>
                <line
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const path = chartPoints
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${getX(index)},${getY(point[item.key])}`,
              )
              .join(" ");

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {chartPoints.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point[item.key])}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${point.date}`}
                    r="4"
                    stroke={item.color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {chartPoints.map((point, index) =>
            index % labelStep === 0 || index === chartPoints.length - 1 ? (
              <text
                fill="var(--admin-foreground)"
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
    </figure>
  );
};

const PanelTitle = ({
  icon: Icon,
  source,
  title,
}: {
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-black text-foreground">{title}</h2>
    </div>
    {source ? (
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {source}
      </span>
    ) : null}
  </div>
);

const ProgressList = ({
  emptyCopy = "Sem dados reais para este agrupamento.",
  items,
  total,
}: {
  emptyCopy?: string;
  items: PsychologistsDashboardBreakdownItem[];
  total: number;
}) => (
  <div className="mt-4 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyCopy}</p>
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

const DonutChart = ({
  items,
  total,
}: {
  items: PsychologistsDashboardBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PsychologistsDashboardBreakdownItem;
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
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#eef2fb" strokeWidth="18" />
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

const BooleanDonut = ({ metric }: { metric: PsychologistsDashboardBooleanBreakdown }) => (
  <DonutChart
    items={[
      {
        count: metric.true_count,
        id: "true",
        label: metric.true_label,
        percentage: metric.true_percentage,
      },
      {
        count: metric.false_count,
        id: "false",
        label: metric.false_label,
        percentage: Math.max(0, 100 - metric.true_percentage),
      },
    ]}
    total={metric.true_count + metric.false_count}
  />
);

const SearchUnavailableCard = ({ summary }: { summary: AdminPsychologistsDashboard }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <SearchX aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black text-foreground">Filtros de busca indisponíveis</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {summary.filters_searches.description}
        </p>
        <p className="mt-2 text-xs font-bold text-muted">
          Fonte: {summary.filters_searches.source}
        </p>
      </div>
    </div>
  </CardShell>
);

const StatsContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => (
  <div className="grid gap-4 xl:grid-cols-3">
    <CardShell className="p-5">
      <PanelTitle icon={Award} title="Especialidades" />
      <ProgressList
        items={summary.statistics.specialties.items}
        total={summary.statistics.specialties.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={ShieldCheck} title="Serviços" />
      <ProgressList
        items={summary.statistics.services.items}
        total={summary.statistics.services.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={MessageCircle} title="Abordagens" />
      <ProgressList
        items={summary.statistics.approaches.items}
        total={summary.statistics.approaches.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={UsersRound} title="Público atendido" />
      <ProgressList
        items={summary.statistics.target_audience.items}
        total={summary.statistics.target_audience.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={Activity} title="Modalidades" />
      <ProgressList
        items={summary.statistics.modalities.items}
        total={summary.statistics.modalities.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={UsersRound} title="Gênero" />
      <DonutChart items={summary.statistics.gender.items} total={summary.statistics.gender.total} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={Award} title="Distribuição por estado" />
      <ProgressList
        items={summary.statistics.states.items}
        total={summary.statistics.states.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={Star} title="Mais de 10 anos" />
      <BooleanDonut metric={summary.statistics.experience_over_10_years} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={ShieldCheck} title="Aceita convênios" />
      <BooleanDonut metric={summary.statistics.accepts_insurance} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={Heart} title="Desconto 1ª sessão" />
      <BooleanDonut metric={summary.statistics.discount_first_session} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={CircleDollarSign} title="Valor social" />
      <BooleanDonut metric={summary.statistics.social_value} />
    </CardShell>
  </div>
);

const PsychologistsHeader = ({
  displayRange,
  onDateChange,
  onPeriodChange,
  period,
}: {
  displayRange: DashboardRange;
  onDateChange: (field: keyof DashboardRange, value: string) => void;
  onPeriodChange: (period: DashboardPeriodPreset) => void;
  period: DashboardPeriodValue;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
        Dashboard de Psicólogos
      </h1>
      <p className="mt-2 text-sm font-medium text-muted">Gerencie os psicólogos da plataforma.</p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-black text-muted" htmlFor="psychologists-period">
        Período
        <span className="relative">
          <select
            className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-black text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-black text-muted">
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
  </div>
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
    <section>
      <h2 className="mb-4 text-xl font-black text-foreground">Visão geral</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
      </div>
    </section>
  );
};

const DashboardContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
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
    <div className="space-y-6">
      {!hasDashboardRecords(summary) ? <EmptyState period={summary.period} /> : null}

      <CardsGrid
        activeMetricKeys={activeMetricKeys}
        onToggleMetric={toggleMetric}
        summary={summary}
      />

      <CardShell className="p-5">
        <PanelTitle icon={Activity} title="Evolução no período" />
        <TimelineChart points={summary.timeline.points} visibleMetricKeys={activeMetricKeys} />
      </CardShell>

      <section>
        <h2 className="mb-4 text-xl font-black text-foreground">Estatísticas</h2>
        <StatsContent summary={summary} />
      </section>

      <SearchUnavailableCard summary={summary} />

      {summary.unavailable.length > 0 ? (
        <CardShell className="bg-primary-soft/70 p-5">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-black text-foreground">Limitações exibidas honestamente</h2>
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

export const AdminPsychologistsClient = () => {
  const [period, setPeriod] = useState<DashboardPeriodValue>("week");
  const [range, setRange] = useState<DashboardRange>(() => getDashboardRangeForPeriod("week"));
  const queryInput = useMemo(() => buildDashboardPeriodQuery(period, range), [period, range]);
  const validRange = isValidRange(range, period);
  const query = useAdminPsychologistsDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    period !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : range;
  const handlePeriodChange = (nextPeriod: DashboardPeriodPreset) => {
    setPeriod(nextPeriod);
    setRange(getDashboardRangeForPeriod(nextPeriod));
  };
  const handleDateChange = (field: keyof DashboardRange, value: string) => {
    setPeriod("custom");
    setRange({ ...displayRange, [field]: value });
  };
  const resetPeriod = () => {
    setPeriod("week");
    setRange(getDashboardRangeForPeriod("week"));
  };

  return (
    <div className="space-y-6">
      <PsychologistsHeader
        displayRange={displayRange}
        onDateChange={handleDateChange}
        onPeriodChange={handlePeriodChange}
        period={period}
      />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
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
