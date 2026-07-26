"use client";

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  DoorOpen,
  Globe2,
  type LucideIcon,
  MapPinned,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { type FocusEvent, useMemo, useState } from "react";
import { useAdminTrafficSummary } from "@/api/callers/traffic";
import { resolveApiError } from "@/api/handle";
import type {
  AdminTrafficSummary,
  TrafficBreakdownItem,
  TrafficEntryPage,
  TrafficMetric,
  TrafficRankingItem,
  TrafficSummaryQuery,
  TrafficTimelinePoint,
} from "@/api/req/traffic";
import { BRAZIL_STATE_MAP_PATHS } from "@/lib/brazil-state-map";
import { buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--admin-primary)",
  "var(--admin-success)",
  "var(--admin-warning)",
  "var(--admin-danger)",
  "var(--admin-muted)",
  "var(--admin-subtle)",
];
const SKELETON_KEYS = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

const TRAFFIC_OVERVIEW_ORDER = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

const TRAFFIC_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
] as const;

type TrafficOverviewMetricKey = (typeof TRAFFIC_OVERVIEW_ORDER)[number];
type TrafficPeriodPreset = (typeof TRAFFIC_PERIOD_OPTIONS)[number]["id"];
type TrafficPeriodValue = TrafficPeriodPreset | "custom";
type TrafficDateRange = Required<Pick<TrafficSummaryQuery, "from" | "to">>;

const numberFormatter = new Intl.NumberFormat("pt-BR");

const normalizeTextKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const BRAZIL_STATE_CODES = new Set<string>(BRAZIL_STATE_MAP_PATHS.map((state) => state.code));
const BRAZIL_STATE_CODE_BY_NAME = new Map(
  BRAZIL_STATE_MAP_PATHS.map((state) => [normalizeTextKey(state.name), state.code]),
);

const resolveBrazilStateCode = (item: TrafficBreakdownItem) => {
  const candidates = [item.id.split(":")[0], item.label.split(",")[0], item.label].map((value) =>
    normalizeTextKey(value),
  );

  for (const candidate of candidates) {
    if (BRAZIL_STATE_CODES.has(candidate)) return candidate;

    const codeByName = BRAZIL_STATE_CODE_BY_NAME.get(candidate);
    if (codeByName) return codeByName;
  }

  return null;
};

const stateMapFill = (count: number, maxCount: number) => {
  const intensity = maxCount > 0 ? 0.16 + (count / maxCount) * 0.72 : 0.16;

  return `rgb(48 140 232 / ${intensity.toFixed(2)})`;
};

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

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): TrafficDateRange => {
  const today = new Date();

  return {
    from: toInputDate(startOfLastDays(days)),
    to: toInputDate(today),
  };
};

const getTrafficRangeForPeriod = (period: TrafficPeriodPreset): TrafficDateRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toInputDate(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "7d") return getQuickRange(7);
  if (period === "90d") return getQuickRange(90);
  if (period === "180d") return getQuickRange(180);

  return getQuickRange(30);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const getTrafficPeriodLabel = (period: TrafficPeriodValue) => {
  if (period === "custom") return "Período personalizado";

  return TRAFFIC_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Últimos 30 dias";
};

const getRangeDays = (range: TrafficDateRange) => {
  if (!range.from || !range.to) return null;

  const days =
    Math.floor(
      (dateFromInput(range.to).getTime() - dateFromInput(range.from).getTime()) / 86_400_000,
    ) + 1;

  return Number.isFinite(days) && days > 0 ? days : null;
};

const formatPeriodDescription = (
  period: TrafficPeriodValue,
  range: TrafficDateRange,
  days = getRangeDays(range),
) => {
  const label = getTrafficPeriodLabel(period);
  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}${
    days ? ` (${numberFormatter.format(days)} dias)` : ""
  }`;
};

const isValidRange = (range: TrafficDateRange) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const formatMetricValue = (metric: TrafficMetric) => {
  if (metric.unavailable) return "Indisponível";
  if (metric.unit === "percentage") {
    return `${numberFormatter.format(metric.value)}%`;
  }
  if (metric.unit === "seconds") return formatDuration(metric.value);
  if (metric.unit === "decimal") {
    return metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: metric.value % 1 === 0 ? 0 : 1,
    });
  }

  return numberFormatter.format(metric.value);
};

const formatMetricRate = (value: number, total: number) => {
  const rate = total > 0 ? (value / total) * 100 : 0;

  return `${rate.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const hasPeriodRecords = (summary: AdminTrafficSummary) => {
  const overviewValues = summary.overview_cards.some((card) => card.value > 0);
  const breakdownValues =
    summary.traffic_sources.total > 0 ||
    summary.devices.total > 0 ||
    summary.user_types.total > 0 ||
    summary.locations.total > 0 ||
    summary.entry_pages.total > 0 ||
    summary.top_communities.total > 0 ||
    summary.top_psychologists.total > 0;

  return overviewValues || breakdownValues;
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

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const TRAFFIC_OVERVIEW_METRIC_CONFIG = {
  new_visitors: { color: "#8b5cf6", icon: Users },
  recurring_visitors: { color: "#f59f00", icon: RefreshCw },
  sessions: { color: "#308ce8", icon: Globe2 },
  unique_visitors: { color: "#13a85b", icon: Users },
} satisfies Record<TrafficOverviewMetricKey, { color: string; icon: LucideIcon }>;

const TrendBadge = ({ metric }: { metric: TrafficMetric }) => {
  if (metric.unavailable)
    return <span className="text-[0.68rem] font-semibold text-warning">Indisponível</span>;

  const lowerIsBetter = metric.id === "bounce_rate";
  const trendClass = cn(
    "text-[0.68rem] font-semibold",
    metric.trend === "flat" && "text-muted",
    metric.trend === "unavailable" && "text-muted",
    metric.trend === "up" && (lowerIsBetter ? "text-danger" : "text-success"),
    metric.trend === "down" && (lowerIsBetter ? "text-success" : "text-danger"),
  );

  return <span className={trendClass}>{formatChange(metric.change_percent)}</span>;
};

const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
  rate,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: TrafficMetric;
  onToggle: () => void;
  rate?: string | null;
}) => {
  const formattedValue = formatMetricValue(metric);
  const titleValue = rate ? `${formattedValue} (${rate})` : formattedValue;

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
      title={`${metric.label}: ${titleValue}. ${
        active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p className="truncate text-xs font-semibold text-foreground" title={metric.label}>
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-2 truncate whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.7rem]">
          <span className="truncate">{formattedValue}</span>
          {rate ? (
            <span className="shrink-0 text-base font-medium tracking-normal text-muted xl:text-sm">
              ({rate})
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
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-[9.25rem] animate-pulse bg-surface-muted"
        key={`traffic-skeleton-${key}`}
      />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-muted text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar Tráfego</h2>
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

const EmptyState = ({ period }: { period: AdminTrafficSummary["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem tráfego capturado</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma sessão, pageview ou evento real foi encontrado entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período ou aguarde a captura do tracking público.
        </p>
      </div>
    </div>
  </CardShell>
);

const DonutChart = ({
  ariaLabel,
  items,
  total,
}: {
  ariaLabel: string;
  items: TrafficBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: TrafficBreakdownItem;
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
    <figure className="mt-5">
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[170px_minmax(0,1fr)] 2xl:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-full max-w-[12rem] min-w-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
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

        <div className="min-w-0 space-y-3">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhum dado real capturado no período.
            </p>
          ) : (
            items.map((item, index) => (
              <div className="flex min-w-0 items-center justify-between gap-3" key={item.id}>
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                  {numberFormatter.format(item.count)}{" "}
                  <span className="text-xs font-medium text-muted">({item.percentage}%)</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <figcaption className="sr-only">
        {items.length > 0
          ? items
              .map(
                (item) =>
                  `${item.label}: ${numberFormatter.format(item.count)} (${item.percentage}%)`,
              )
              .join("; ")
          : "Sem dados disponíveis."}
      </figcaption>
    </figure>
  );
};

const BarList = ({
  items,
  total,
}: {
  items: Array<{ count: number; id: string; label: string; percentage: number }>;
  total: number;
}) => (
  <div className="mt-5 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhum dado real capturado no período.
      </p>
    ) : (
      items.map((item) => (
        <div key={item.id}>
          <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="min-w-0 break-words font-black text-foreground">{item.label}</span>
            <span className="shrink-0 text-right font-bold text-muted">
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

const PanelTitle = ({
  icon: Icon,
  source,
  title,
}: {
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      <h2 className="min-w-0 text-lg font-bold text-foreground">{title}</h2>
    </div>
    {source ? (
      <span className="max-w-full self-start break-all rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-semibold text-muted sm:max-w-[58%] sm:text-right">
        {source}
      </span>
    ) : null}
  </div>
);

const EntryPagesTable = ({ items }: { items: TrafficEntryPage[] }) => (
  <>
    <div className="mt-5 space-y-3 md:hidden">
      {items.map((item) => (
        <div className="rounded-2xl border border-border bg-surface p-3" key={item.path}>
          <p className="font-black text-foreground">{item.label}</p>
          <p className="mt-1 break-all text-xs text-muted">{item.path}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-muted p-2">
              <span className="block font-semibold text-muted">Sess&otilde;es</span>
              <strong className="text-foreground">{numberFormatter.format(item.count)}</strong>
            </div>
            <div className="rounded-xl bg-surface-muted p-2">
              <span className="block font-semibold text-muted">Participa&ccedil;&atilde;o</span>
              <strong className="text-foreground">{item.percentage}%</strong>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma pageview de entrada real no per&iacute;odo.
        </p>
      ) : null}
    </div>

    <div className="mt-5 hidden overflow-x-auto md:block">
      <table className="w-full min-w-full text-left text-sm">
        <caption className="sr-only">P&aacute;ginas de entrada por sess&otilde;es</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-3 font-black">P&aacute;gina de entrada</th>
            <th className="py-3 font-black">Sess&otilde;es</th>
            <th className="py-3 font-black">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.path}>
              <td className="min-w-0 py-3 pr-3">
                <p className="font-black text-foreground">{item.label}</p>
                <p className="break-all text-xs text-muted">{item.path}</p>
              </td>
              <td className="py-3 pr-3 font-bold text-foreground">
                {numberFormatter.format(item.count)}
              </td>
              <td className="py-3 font-bold text-muted">{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma pageview de entrada real no per&iacute;odo.
        </p>
      ) : null}
    </div>
  </>
);

const MetricList = ({ items }: { items: TrafficMetric[] }) => (
  <div className="mt-4 divide-y divide-border">
    {items.map((item) => (
      <div
        className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
        key={item.id}
      >
        <div className="min-w-0">
          <p className="font-black text-foreground">{item.label}</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-muted">{item.description}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="font-black text-foreground">{formatMetricValue(item)}</p>
          <TrendBadge metric={item} />
        </div>
      </div>
    ))}
  </div>
);

const RankingList = ({ items }: { items: TrafficRankingItem[] }) => (
  <div className="mt-4 divide-y divide-border">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma visualização com target real no período.
      </p>
    ) : (
      items.map((item, index) => (
        <div
          className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
          key={item.id}
        >
          <div className="min-w-0">
            <p className="truncate font-black text-foreground">
              #{index + 1} {item.label}
            </p>
            <p className="break-all text-xs text-muted">{item.path}</p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="font-black text-foreground">
              {numberFormatter.format(item.sessions)} sessões
            </p>
            <p className="text-xs font-bold text-muted">
              {numberFormatter.format(item.count)} pageviews
            </p>
          </div>
        </div>
      ))
    )}
  </div>
);

const BrazilAccessMap = ({ states }: { states: TrafficBreakdownItem[] }) => {
  const stateItems = states.flatMap((item) => {
    const code = resolveBrazilStateCode(item);

    return code ? [{ ...item, code }] : [];
  });
  const byCode = new Map(stateItems.map((item) => [item.code, item]));
  const maxCount = Math.max(1, ...stateItems.map((item) => item.count));
  const hasStateData = stateItems.length > 0;

  return (
    <figure className="mt-4">
      <svg
        aria-label={
          hasStateData
            ? `Mapa de acessos por estado: ${stateItems
                .map((item) => `${item.label}: ${numberFormatter.format(item.count)}`)
                .join("; ")}.`
            : "Mapa base do Brasil sem acessos por estado capturados no período."
        }
        className="mx-auto h-[18rem] w-full max-w-[22rem]"
        role="img"
        viewBox="0 0 360 380"
      >
        {BRAZIL_STATE_MAP_PATHS.map((state) => {
          const metric = byCode.get(state.code);

          return (
            <path
              d={state.d}
              fill={metric ? stateMapFill(metric.count, maxCount) : "var(--admin-surface-muted)"}
              key={state.code}
              opacity={metric || hasStateData ? 1 : 0.72}
              stroke="var(--admin-surface)"
              strokeLinejoin="round"
              strokeWidth="1.1"
            >
              <title>
                {state.name}: {metric ? numberFormatter.format(metric.count) : "sem acesso"}
              </title>
            </path>
          );
        })}
      </svg>
      {hasStateData ? (
        <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[0.68rem] font-semibold text-muted">
          <span>Menos acessos</span>
          <span
            aria-hidden
            className="inline-flex overflow-hidden rounded-full border border-border"
          >
            {[0.16, 0.3, 0.44, 0.58, 0.72, 0.88].map((opacity) => (
              <span
                className="h-3 w-5"
                key={opacity}
                style={{ backgroundColor: `rgb(48 140 232 / ${opacity})` }}
              />
            ))}
          </span>
          <span>Mais acessos</span>
        </figcaption>
      ) : (
        <figcaption className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-3 text-center text-[0.72rem] font-medium leading-5 text-muted">
          Nenhum estado brasileiro real foi capturado neste período; o mapa base é exibido sem
          simular volume estadual.
        </figcaption>
      )}
    </figure>
  );
};

const LocationPanel = ({ locations }: { locations: AdminTrafficSummary["locations"] }) => (
  <CardShell className="p-5">
    <PanelTitle icon={MapPinned} source={locations.source} title="Acessos por localização" />
    <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-foreground">Top estados</h3>
        <BarList items={locations.states} total={locations.total} />
      </div>
      <div className="min-w-0 rounded-card bg-surface-muted p-4">
        <h3 className="text-sm font-black text-foreground">Mapa de acessos</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Desenho SVG local sem pacote novo, alimentado somente por `visitor_location` real.
        </p>
        <BrazilAccessMap states={locations.states} />
        <div className="mt-4 space-y-3">
          {locations.countries.slice(0, 5).map((item, index) => (
            <div className="flex min-w-0 items-center justify-between gap-3" key={item.id}>
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
              <span className="shrink-0 text-sm font-black text-foreground">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </CardShell>
);

const getTrafficOverviewMetricLabel = (key: TrafficOverviewMetricKey) => {
  const labels: Record<TrafficOverviewMetricKey, string> = {
    new_visitors: "Novos visitantes",
    recurring_visitors: "Visitantes recorrentes",
    sessions: "Sessões",
    unique_visitors: "Visitantes únicos",
  };

  return labels[key];
};

const getTimelineValue = (point: TrafficTimelinePoint, key: TrafficOverviewMetricKey) =>
  point[key] ?? 0;

const TrafficTimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: TrafficTimelinePoint[];
  visibleMetricKeys: TrafficOverviewMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = visibleMetricKeys.map((key) => ({
    color: TRAFFIC_OVERVIEW_METRIC_CONFIG[key].color,
    key,
    label: getTrafficOverviewMetricLabel(key),
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

  const chartPoints = points;
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => getTimelineValue(point, item.key))),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))),
  ];
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: formatDate(point.date) }]
      : [],
  );
  const latestPoint = chartPoints.at(-1);

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Gráfico temporal dos contadores da visão geral de tráfego"
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
              <g key={`traffic-grid-${value}-${y}`}>
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
              y: getY(getTimelineValue(point, item.key)),
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
      <figcaption className="sr-only">
        {latestPoint
          ? series
              .map(
                (item) =>
                  `${item.label}: ${numberFormatter.format(getTimelineValue(latestPoint, item.key))} em ${formatDate(latestPoint.date)}`,
              )
              .join("; ")
          : "Sem dados disponíveis."}
      </figcaption>
    </figure>
  );
};

const TrafficPeriodControls = ({
  displayRange,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: TrafficDateRange;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof TrafficDateRange, value: string) => void;
  onPeriodChange: (period: TrafficPeriodPreset) => void;
  period: TrafficPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="traffic-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="traffic-period"
            onChange={(event) => onPeriodChange(event.target.value as TrafficPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {TRAFFIC_PERIOD_OPTIONS.map((option) => (
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
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

const TrafficOverviewPanel = ({
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
        <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);

const TrafficOverviewCardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: TrafficOverviewMetricKey[];
  onToggleMetric: (key: TrafficOverviewMetricKey) => void;
  summary: AdminTrafficSummary;
}) => {
  const cards = new Map(summary.overview_cards.map((metric) => [metric.id, metric]));
  const uniqueVisitors = cards.get("unique_visitors")?.value ?? 0;

  return (
    <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {TRAFFIC_OVERVIEW_ORDER.map((key) => {
        const metric = cards.get(key);
        if (!metric) return null;
        const rate =
          key === "new_visitors" || key === "recurring_visitors"
            ? formatMetricRate(metric.value, uniqueVisitors)
            : null;

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={metric}
            onToggle={() => onToggleMetric(key)}
            rate={rate}
            {...TRAFFIC_OVERVIEW_METRIC_CONFIG[key]}
          />
        );
      })}
    </fieldset>
  );
};
const TrafficHeader = () => (
  <CardShell className="border-border/70 bg-surface/90 p-5 md:p-6">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Analytics first-party
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Tráfego
      </h1>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
        Acompanhe o comportamento de acesso, os principais canais, dispositivos, páginas e
        conversões reais da plataforma.
      </p>
    </div>
  </CardShell>
);

const TrafficContent = ({
  periodControls,
  periodDescription,
  summary,
}: {
  periodControls: React.ReactNode;
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<TrafficOverviewMetricKey[]>(() => [
    ...TRAFFIC_OVERVIEW_ORDER,
  ]);
  const activeMetricKeys = TRAFFIC_OVERVIEW_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: TrafficOverviewMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      {!hasPeriodRecords(summary) ? <EmptyState period={summary.period} /> : null}

      <TrafficOverviewPanel periodControls={periodControls} periodDescription={periodDescription}>
        <TrafficOverviewCardsGrid
          activeMetricKeys={activeMetricKeys}
          onToggleMetric={toggleMetric}
          summary={summary}
        />
        <TrafficTimelineChart
          points={summary.timeline.points}
          visibleMetricKeys={activeMetricKeys}
        />
      </TrafficOverviewPanel>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle
            icon={PieChart}
            source={summary.traffic_sources.source}
            title="Origem do tráfego"
          />
          <DonutChart
            ariaLabel="Distribuição de sessões por origem de tráfego"
            items={summary.traffic_sources.items}
            total={summary.traffic_sources.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Smartphone} source={summary.devices.source} title="Dispositivos" />
          <DonutChart
            ariaLabel="Distribuição de sessões por dispositivo"
            items={summary.devices.items}
            total={summary.devices.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Users} source={summary.user_types.source} title="Tipo de usuário" />
          <DonutChart
            ariaLabel="Distribuição de sessões por tipo de usuário"
            items={summary.user_types.items}
            total={summary.user_types.total}
          />
        </CardShell>
      </div>

      <LocationPanel locations={summary.locations} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle
            icon={DoorOpen}
            source={summary.entry_pages.source}
            title="Páginas de entrada"
          />
          <EntryPagesTable items={summary.entry_pages.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            icon={MousePointerClick}
            source={summary.conversions.source}
            title="Conversões geradas"
          />
          <MetricList items={summary.conversions.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            icon={TrendingUp}
            source={summary.quality.source}
            title="Qualidade do tráfego"
          />
          <MetricList items={summary.quality.items} />
        </CardShell>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <CardShell className="p-5">
          <PanelTitle
            icon={Activity}
            source={summary.top_communities.source}
            title="Tráfego por comunidade"
          />
          <RankingList items={summary.top_communities.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            icon={Users}
            source={summary.top_psychologists.source}
            title="Tráfego por psicólogo"
          />
          <RankingList items={summary.top_psychologists.items} />
        </CardShell>
      </div>

      {summary.unavailable.length > 0 ? (
        <CardShell className="bg-primary-soft/70 p-5">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-black text-foreground">Limitações exibidas honestamente</h2>
              <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-sm text-muted">
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

export const AdminTrafficClient = () => {
  const initialRange = useMemo(() => getTrafficRangeForPeriod("30d"), []);
  const [selectedPeriod, setSelectedPeriod] = useState<TrafficPeriodValue>("30d");
  const [appliedPeriod, setAppliedPeriod] = useState<TrafficPeriodValue>("30d");
  const [draftRange, setDraftRange] = useState<TrafficDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<TrafficDateRange>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validRange = isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const query = useAdminTrafficSummary(appliedRange, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const handlePeriodChange = (nextPeriod: TrafficPeriodPreset) => {
    const nextRange = getTrafficRangeForPeriod(nextPeriod);

    setRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleDateChange = (field: keyof TrafficDateRange, value: string) => {
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
    const defaultRange = getTrafficRangeForPeriod("30d");

    setRangeError(null);
    setSelectedPeriod("30d");
    setAppliedPeriod("30d");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };
  const periodControls = (
    <TrafficPeriodControls
      displayRange={draftRange}
      onDateControlsBlur={handleDateControlsBlur}
      onDateChange={handleDateChange}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      rangeError={rangeError}
    />
  );

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      <TrafficHeader />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <TrafficOverviewPanel
          periodControls={periodControls}
          periodDescription={formatPeriodDescription(selectedPeriod, draftRange)}
        >
          <LoadingGrid />
          <div className="mt-4 h-[20rem] animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-muted" />
        </TrafficOverviewPanel>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <TrafficContent
          periodControls={periodControls}
          periodDescription={formatPeriodDescription(
            appliedPeriod,
            { from: query.data.period.from, to: query.data.period.to },
            query.data.period.days,
          )}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
