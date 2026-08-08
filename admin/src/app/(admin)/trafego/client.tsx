"use client";

import {
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  type LucideIcon,
  MapPinned,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { type FocusEvent, useEffect, useMemo, useState } from "react";
import { useAdminTrafficSummary } from "@/api/callers/traffic";
import { resolveApiError } from "@/api/handle";
import type {
  AdminTrafficSummary,
  TrafficBreakdownItem,
  TrafficConversionAction,
  TrafficConversionChart,
  TrafficDeviceItem,
  TrafficEntryPage,
  TrafficLocationItem,
  TrafficMetric,
  TrafficOnlineNow,
  TrafficRankingItem,
  TrafficSummaryQuery,
  TrafficTimelinePoint,
} from "@/api/req/traffic";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { BRAZIL_STATE_MAP_PATHS } from "@/lib/brazil-state-map";
import { buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import { WORLD_COUNTRY_MAP_PATHS } from "@/lib/world-country-map";

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

const TRAFFIC_OVERVIEW_CARD_ORDER = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

const TRAFFIC_OVERVIEW_CHART_ORDER = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

const TRAFFIC_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const;

type TrafficOverviewCardKey = (typeof TRAFFIC_OVERVIEW_CARD_ORDER)[number];
type TrafficOverviewMetricKey = (typeof TRAFFIC_OVERVIEW_CHART_ORDER)[number];
type TrafficPeriodPreset = (typeof TRAFFIC_PERIOD_OPTIONS)[number]["id"];
type TrafficPeriodValue = TrafficPeriodPreset | "custom";
type TrafficDateRange = Required<Pick<TrafficSummaryQuery, "from" | "to">>;
type TrafficDonutChartItem = TrafficBreakdownItem & {
  sublabel?: string | null;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

const formatPercentageValue = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;

const formatRankingSummary = (item: TrafficRankingItem) => {
  const sessionLabel = item.sessions === 1 ? "sessão" : "sessões";
  const pageviewLabel = item.count === 1 ? "pageview" : "pageviews";

  return `${numberFormatter.format(item.sessions)} ${sessionLabel} · ${numberFormatter.format(
    item.count,
  )} ${pageviewLabel}`;
};

const TRAFFIC_LOCATION_RANKING_LIMIT = 5;
type TrafficLocationMapScope = "countries" | "states";
const TRAFFIC_LOCATION_MAP_SCOPE_LABELS = {
  countries: "Países",
  states: "Estados",
} satisfies Record<TrafficLocationMapScope, string>;

const COUNTRY_WORLD_MAP_ID_BY_KEY: Record<string, string> = {
  alemanha: "276",
  angola: "024",
  argentina: "032",
  australia: "036",
  br: "076",
  bra: "076",
  brasil: "076",
  brazil: "076",
  ca: "124",
  canada: "124",
  chile: "152",
  china: "156",
  de: "276",
  "estados unidos": "840",
  espanha: "724",
  es: "724",
  franca: "250",
  france: "250",
  germany: "276",
  india: "356",
  it: "380",
  italia: "380",
  japao: "392",
  japan: "392",
  mexico: "484",
  mocambique: "508",
  mozambique: "508",
  portugal: "620",
  pt: "620",
  prt: "620",
  "reino unido": "826",
  uk: "826",
  "united kingdom": "826",
  "united states": "840",
  "united states of america": "840",
  us: "840",
  usa: "840",
};

const normalizeTextKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const normalizeLocationLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "7d") return getQuickRange(7);
  if (period === "90d") return getQuickRange(90);

  return getQuickRange(30);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getTrafficPeriodLabel = (period: TrafficPeriodValue) => {
  if (period === "custom") return "Período personalizado";

  return TRAFFIC_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Últimos 30 dias";
};

const formatPeriodDescription = (period: TrafficPeriodValue, range: TrafficDateRange) => {
  const label = getTrafficPeriodLabel(period);
  if (!range.from || !range.to) return label;

  return `${label} \u00b7 ${formatDate(range.from)} a ${formatDate(range.to)}`;
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

const findMetric = (summary: AdminTrafficSummary, metricId: string) =>
  summary.overview_cards.find((metric) => metric.id === metricId) ??
  summary.quality.items.find((metric) => metric.id === metricId) ??
  summary.conversions.items.find((metric) => metric.id === metricId) ??
  null;

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
    summary.top_posts.total > 0 ||
    summary.top_psychologists.total > 0 ||
    summary.conversion_groups.pre_signup.total_visitors > 0 ||
    summary.conversion_groups.post_signup.total_users > 0;

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
} satisfies Record<TrafficOverviewCardKey, { color: string; icon: LucideIcon }>;

const isTrafficOverviewMetricKey = (key: TrafficOverviewCardKey): key is TrafficOverviewMetricKey =>
  (TRAFFIC_OVERVIEW_CHART_ORDER as readonly string[]).includes(key);

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
  active?: boolean;
  color: string;
  icon: LucideIcon;
  metric: TrafficMetric;
  onToggle?: () => void;
  rate?: string | null;
}) => {
  const formattedValue = formatMetricValue(metric);
  const titleValue = rate ? `${formattedValue} (${rate})` : formattedValue;
  const isInteractive = Boolean(onToggle);
  const isActive = active ?? true;
  const statusLabel = isInteractive
    ? isActive
      ? "Visível no gráfico"
      : "Oculto no gráfico"
    : "Contador agregado do período";
  const className = cn(
    "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
    isActive
      ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
      : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
  );
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p className="min-h-8 text-xs font-semibold leading-4 text-foreground" title={metric.label}>
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
        <span className="sr-only">{statusLabel.toLowerCase()}</span>
      </div>
    </>
  );

  if (!isInteractive) {
    return (
      <div className={className} title={`${metric.label}: ${titleValue}. ${statusLabel}`}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-pressed={isActive}
      className={className}
      onClick={onToggle}
      title={`${metric.label}: ${titleValue}. ${statusLabel}`}
      type="button"
    >
      {content}
    </button>
  );
};

const LoadingGrid = () => (
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-[9.25rem] animate-pulse bg-surface-muted"
        key={`traffic-skeleton-${key}`}
      />
    ))}
  </div>
);

const OnlineNowSkeleton = () => (
  <CardShell className="h-[13rem] animate-pulse border-primary/15 bg-primary-soft/25" />
);

const OnlineNowStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-border/70 bg-surface/85 p-3">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className="mt-1 text-xl font-black text-foreground">{numberFormatter.format(value)}</p>
  </div>
);

const OnlineNowPanel = ({ onlineNow }: { onlineNow: TrafficOnlineNow }) => {
  const updatedAt = formatTime(onlineNow.window.to);
  const counters = [
    { label: "Sess\u00f5es ativas", value: onlineNow.active_sessions },
    { label: "Novos visitantes", value: onlineNow.new_visitors },
    { label: "Pacientes", value: onlineNow.patients },
    { label: "Psic\u00f3logos", value: onlineNow.psychologists },
    { label: "N\u00e3o autenticados", value: onlineNow.anonymous_visitors },
  ];

  return (
    <CardShell className="border-primary/20 bg-primary-soft/25 p-5 md:p-6">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-success">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            Tempo real
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            Usu&aacute;rios online agora
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
            Visitantes com sess&atilde;o atualizada nos &uacute;ltimos {onlineNow.window.minutes}{" "}
            minutos. Atualizado &agrave;s {updatedAt}.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-primary/25 bg-surface p-5 shadow-admin-soft xl:min-w-[14rem] xl:text-right">
          <p className="text-4xl font-black tracking-tight text-foreground">
            {numberFormatter.format(onlineNow.unique_visitors)}
          </p>
          <p className="mt-1 text-sm font-black text-muted">visitantes ativos</p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {counters.map((counter) => (
          <OnlineNowStat
            key={`online-now-counter-${counter.label}`}
            label={counter.label}
            value={counter.value}
          />
        ))}
      </div>
    </CardShell>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Tráfego"
  />
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
  items: TrafficDonutChartItem[];
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
              <div
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
                key={item.id}
              >
                <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-foreground">
                  <span
                    aria-hidden
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block whitespace-normal break-words",
                        item.id === "anonymous" && "break-normal",
                      )}
                    >
                      {item.id === "anonymous" && item.label === "Não autenticados" ? (
                        <>
                          <span className="sr-only">{item.label}</span>
                          <span aria-hidden>Não</span>
                          <br aria-hidden />
                          <span aria-hidden>autenticados</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                    {item.sublabel ? (
                      <span className="mt-1 block whitespace-nowrap text-xs font-semibold leading-5 text-subtle">
                        {item.sublabel}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                  {numberFormatter.format(item.count)}{" "}
                  <span className="text-xs font-medium text-muted">
                    ({formatPercentageValue(item.percentage)})
                  </span>
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
                  `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
                    item.percentage,
                  )})${item.sublabel ? `; ${item.sublabel}` : ""}`,
              )
              .join("; ")
          : "Sem dados disponíveis."}
      </figcaption>
    </figure>
  );
};

const buildDeviceDonutItems = (items: TrafficDeviceItem[]): TrafficDonutChartItem[] =>
  items.map((item) => {
    const operatingSystems = item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
    const operatingSystemSummary = operatingSystems
      .map(
        (operatingSystem) =>
          `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
      )
      .join(" · ");

    return {
      ...item,
      sublabel: operatingSystemSummary || null,
    };
  });

const PanelTitle = ({
  icon: Icon,
  periodDescription,
  source,
  title,
}: {
  icon: LucideIcon;
  periodDescription?: string;
  source?: string;
  title: string;
}) => (
  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="h-5 w-5 text-primary" />
        <h2 className="min-w-0 text-lg font-bold text-foreground">{title}</h2>
      </div>
      {periodDescription ? (
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      ) : null}
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
            <th className="py-3 text-right font-black">Sess&otilde;es</th>
            <th className="py-3 text-right font-black">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.path}>
              <td className="min-w-0 py-3 pr-3">
                <p className="font-black text-foreground">{item.label}</p>
              </td>
              <td className="py-3 pr-3 text-right font-bold text-foreground">
                {numberFormatter.format(item.count)}
              </td>
              <td className="py-3 pr-3 text-right font-bold text-muted">{item.percentage}%</td>
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

const NavigationMetricCard = ({
  description,
  metric,
  title,
  value,
}: {
  description: string;
  metric?: TrafficMetric | null;
  title: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
    <p className="text-xs font-semibold text-muted">{title}</p>
    <p className="mt-2 truncate text-2xl font-black tracking-tight text-foreground" title={value}>
      {value}
    </p>
    <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
      {metric ? <TrendBadge metric={metric} /> : null}
      <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
        {metric ? "vs. período anterior" : "base do período"}
      </span>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">{description}</p>
  </div>
);

const PageNavigationPanel = ({
  periodDescription,
  summary,
}: {
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const pageviewsMetric = findMetric(summary, "pageviews");
  const pagesPerSessionMetric = findMetric(summary, "pages_per_session");
  const averageTimeMetric = findMetric(summary, "average_time");
  const bounceRateMetric = findMetric(summary, "bounce_rate");
  const returnRateMetric = findMetric(summary, "return_rate");
  const importantActionSessionsMetric = findMetric(summary, "important_action_sessions");

  const cards = [
    {
      description: "Total real de páginas carregadas no período selecionado.",
      id: "pageviews",
      metric: pageviewsMetric,
      title: "Visualizações de páginas",
      value: pageviewsMetric ? formatMetricValue(pageviewsMetric) : "Indisponível",
    },
    {
      description: "Páginas vistas divididas por sessões com ao menos uma página carregada.",
      id: "pages_per_session",
      metric: pagesPerSessionMetric,
      title: "Média de páginas por sessão",
      value: pagesPerSessionMetric ? formatMetricValue(pagesPerSessionMetric) : "Indisponível",
    },
    {
      description: "Tempo médio por pageview com duração registrada por heartbeat/beacon.",
      id: "average_time",
      metric: averageTimeMetric,
      title: "Tempo médio na plataforma",
      value: averageTimeMetric ? formatMetricValue(averageTimeMetric) : "Indisponível",
    },
    {
      description: "Sessões com uma única pageview e sem ação importante registrada.",
      id: "bounce_rate",
      metric: bounceRateMetric,
      title: "Taxa de rejeição",
      value: bounceRateMetric ? formatMetricValue(bounceRateMetric) : "Indisponível",
    },
    {
      description: "Visitantes com sessão anterior ou mais de uma sessão no período.",
      id: "return_rate",
      metric: returnRateMetric,
      title: "Taxa de retorno",
      value: returnRateMetric ? formatMetricValue(returnRateMetric) : "Indisponível",
    },
    {
      description: "Sessões com pelo menos uma ação importante registrada.",
      id: "important_action_sessions",
      metric: importantActionSessionsMetric,
      title: "Sessões com ação importante",
      value: importantActionSessionsMetric
        ? formatMetricValue(importantActionSessionsMetric)
        : "Indisponível",
    },
  ];

  return (
    <CardShell className="min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <FileText aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="min-w-0 text-xl font-bold text-foreground">Uso da plataforma</h2>
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <NavigationMetricCard
              description={card.description}
              key={card.id}
              metric={card.metric}
              title={card.title}
              value={card.value}
            />
          ))}
        </div>

        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/70 p-4">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-black text-foreground">Principais páginas de entrada</h3>
            <p className="text-xs font-bold text-muted">
              Total: {numberFormatter.format(summary.entry_pages.total)} sessões
            </p>
          </div>
          <EntryPagesTable items={summary.entry_pages.items} />
        </div>
      </div>
    </CardShell>
  );
};

const formatActorLabel = (action: TrafficConversionAction) => {
  const label = action.actor_label || "usuários";

  return `${numberFormatter.format(action.actors)} ${label}`;
};

const formatRoleActorLabel = (count: number, singular: string, plural: string) =>
  `${numberFormatter.format(count)} ${count === 1 ? singular : plural}`;

const ConversionChartCard = ({ chart }: { chart: TrafficConversionChart }) => (
  <div className="min-w-0 rounded-[1.5rem] border border-border bg-surface p-4">
    <h3 className="text-base font-black text-foreground">{chart.label}</h3>
    {chart.id === "visitor_to_signup" ? (
      <p className="mt-1 text-xs leading-5 text-muted">
        Estes registros consideram apenas visitantes rastreados. Podem existir outros usuários
        cadastrados sem rastreamento associado.
      </p>
    ) : null}
    {chart.id === "post_signup_overall" ? (
      <p className="mt-1 text-xs leading-5 text-muted">
        Usuários que realizaram pelo menos uma ação após se cadastrarem.
      </p>
    ) : null}
    <DonutChart
      ariaLabel={chart.label}
      items={getConversionChartItems(chart)}
      total={chart.total}
    />
  </div>
);

const CONVERSION_CHART_ITEM_LABELS: Record<string, string> = {
  converted: "Se converteram após o cadastro",
  not_converted: "Não se converteram após o cadastro",
  not_signed_up: "Não se cadastraram",
  signed_up: "Se cadastraram",
};

const getConversionChartItems = (chart: TrafficConversionChart) =>
  chart.items.map((item) => ({
    ...item,
    label: CONVERSION_CHART_ITEM_LABELS[item.id] ?? item.label,
  }));

const ConversionActionTable = ({
  items,
  variant = "pre_signup",
}: {
  items: TrafficConversionAction[];
  variant?: "post_signup" | "pre_signup";
}) => (
  <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-border bg-surface">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma conversão real capturada no período.
      </p>
    ) : (
      <table className="w-full table-fixed text-left text-xs sm:text-sm">
        <thead className="bg-surface-muted text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted sm:text-xs">
          <tr>
            {variant === "post_signup" ? (
              <>
                <th className="w-[34%] px-2 py-3 sm:px-3">Conversão</th>
                <th className="w-[24%] px-2 py-3 text-right sm:px-3">Pacientes</th>
                <th className="w-[26%] px-2 py-3 text-right sm:px-3">Psicólogos</th>
                <th className="w-[16%] px-2 py-3 text-right sm:px-3">Taxa</th>
              </>
            ) : (
              <>
                <th className="w-[48%] px-2 py-3 sm:px-3">Conversão</th>
                <th className="w-[32%] px-2 py-3 text-right sm:px-3">Pessoas</th>
                <th className="w-[20%] px-2 py-3 text-right sm:px-3">Taxa</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="break-words px-2 py-3 font-semibold text-foreground sm:px-3">
                {item.label}
              </td>
              <td className="break-words px-2 py-3 text-right font-medium text-foreground sm:px-3">
                {variant === "post_signup"
                  ? formatRoleActorLabel(item.patient_actors ?? 0, "paciente", "pacientes")
                  : formatActorLabel(item)}
              </td>
              {variant === "post_signup" ? (
                <td className="break-words px-2 py-3 text-right font-medium text-foreground sm:px-3">
                  {formatRoleActorLabel(item.psychologist_actors ?? 0, "psicólogo", "psicólogos")}
                </td>
              ) : null}
              <td className="break-words px-2 py-3 text-right font-semibold text-primary sm:px-3">
                {item.actor_percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const ConversionColumn = ({
  children,
  summary,
  title,
}: {
  children: React.ReactNode;
  summary: string;
  title: string;
}) => (
  <div className="min-w-0 rounded-[1.75rem] border border-border/70 bg-surface-muted/60 p-4">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{summary}</p>
      <h3 className="mt-1 text-lg font-black text-foreground">{title}</h3>
    </div>
    <div className="mt-4 min-w-0 space-y-4">{children}</div>
  </div>
);

const ConversionsPanel = ({
  periodDescription,
  summary,
}: {
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const preSignup = summary.conversion_groups.pre_signup;
  const postSignup = summary.conversion_groups.post_signup;

  return (
    <CardShell className="p-5">
      <PanelTitle
        icon={MousePointerClick}
        periodDescription={periodDescription}
        title="Conversões geradas"
      />
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <ConversionColumn
          summary={`${numberFormatter.format(preSignup.total_visitors)} visitantes`}
          title="Conversões para cadastro"
        >
          <div className="grid min-w-0 gap-4">
            {preSignup.charts.map((chart) => (
              <ConversionChartCard chart={chart} key={chart.id} />
            ))}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground">Conversões antes do cadastro</h4>
            <ConversionActionTable items={preSignup.actions} />
          </div>
        </ConversionColumn>

        <ConversionColumn
          summary={`${numberFormatter.format(postSignup.total_users)} usuários cadastrados`}
          title="Conversões após cadastro"
        >
          <ConversionChartCard chart={postSignup.overall} />
          <div className="min-w-0">
            <h4 className="text-sm font-black text-foreground">Conversões após o cadastro</h4>
            <ConversionActionTable items={postSignup.items} variant="post_signup" />
          </div>
        </ConversionColumn>
      </div>
    </CardShell>
  );
};

const RankingList = ({
  destinationLabel,
  items,
}: {
  destinationLabel: string;
  items: TrafficRankingItem[];
}) => (
  <div className="mt-4 divide-y divide-border">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma visualização com target real no período.
      </p>
    ) : (
      items.map((item, index) => (
        <div className="flex min-w-0 items-start justify-between gap-3 py-3" key={item.id}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-6 text-foreground">
              #{index + 1} {item.label}
            </p>
            <p className="mt-1 text-xs font-bold text-muted">{formatRankingSummary(item)}</p>
          </div>
          {item.path ? (
            <Link
              aria-label={`Ir até ${destinationLabel} no Admin: ${item.label}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-primary shadow-control transition hover:border-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              href={item.path}
              title={`Ir até ${destinationLabel} no Admin`}
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <span
              aria-label={`URL indisponível para ${destinationLabel}: ${item.label}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface-muted text-muted opacity-60"
              role="img"
              title="URL indisponível"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
            </span>
          )}
        </div>
      ))
    )}
  </div>
);

const getLocationCountRange = (items: TrafficLocationItem[]) => {
  const counts = items.filter((item) => item.count > 0).map((item) => item.count);

  if (counts.length === 0) return { max: 0, min: 0 };

  return {
    max: Math.max(...counts),
    min: Math.min(...counts),
  };
};

const getLocationIntensity = (count: number, min: number, max: number) => {
  if (count <= 0) return 0;
  if (max <= min) return 1;

  return (count - min) / (max - min);
};

const formatLocationAccessCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "acesso" : "acessos"}`;

const sumLocationCounts = (items: TrafficLocationItem[]) =>
  items.reduce((total, item) => total + item.count, 0);

const LocationSummaryStats = ({
  locations,
}: {
  locations: Pick<AdminTrafficSummary["locations"], "cities" | "countries" | "states">;
}) => {
  const stats = [
    {
      count: locations.cities.length,
      id: "cities",
      label: "Cidades",
      total: sumLocationCounts(locations.cities),
    },
    {
      count: locations.states.length,
      id: "states",
      label: "Estados",
      total: sumLocationCounts(locations.states),
    },
    {
      count: locations.countries.length,
      id: "countries",
      label: "Países",
      total: sumLocationCounts(locations.countries),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((item) => (
        <div className="rounded-[1.25rem] bg-surface-muted p-4" key={item.id}>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">{item.label}</p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {numberFormatter.format(item.count)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            {formatLocationAccessCount(item.total)}
          </p>
        </div>
      ))}
    </div>
  );
};

const LocationMapLegend = ({ items }: { items: TrafficLocationItem[] }) => {
  const { max, min } = getLocationCountRange(items);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 text-[0.68rem] font-bold text-muted">
      <span className="whitespace-nowrap">{numberFormatter.format(min)}</span>
      <span
        aria-hidden
        className="h-2 min-w-24 flex-1 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(48, 140, 232, 0.18), rgba(48, 140, 232, 0.9))",
        }}
      />
      <span className="whitespace-nowrap">{numberFormatter.format(max)}</span>
    </div>
  );
};

const LocationBarRanking = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: TrafficLocationItem[];
  title: string;
}) => {
  const topItems = items.slice(0, TRAFFIC_LOCATION_RANKING_LIMIT);
  const maxCount = Math.max(1, ...topItems.map((item) => item.count));

  return (
    <div className="min-w-0">
      <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
      <div className="mt-5 space-y-4">
        {topItems.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
            {emptyMessage}
          </p>
        ) : (
          topItems.map((item) => (
            <div className="min-w-0" key={item.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
                </span>
                <span className="shrink-0 font-black text-foreground">
                  {numberFormatter.format(item.count)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
                <div
                  aria-hidden
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LocationRankingList = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: TrafficLocationItem[];
  title: string;
}) => (
  <div className="rounded-[1.35rem] border border-border/70 bg-surface p-4">
    <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
    <div className="mt-3 space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
          {emptyMessage}
        </p>
      ) : (
        items.slice(0, TRAFFIC_LOCATION_RANKING_LIMIT).map((item, index) => (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.68rem] font-black text-primary">
                  {index + 1}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="whitespace-nowrap text-xs font-black text-foreground">
                {formatLocationAccessCount(item.count)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                aria-hidden
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const BrazilStateChoroplethMap = ({ states }: { states: TrafficLocationItem[] }) => {
  const statesByCode = new Map<string, TrafficLocationItem>();

  for (const state of states) {
    const code = resolveBrazilStateCode(state);
    if (code) statesByCode.set(code, state);
  }

  const { max, min } = getLocationCountRange([...statesByCode.values()]);
  const highlightedStates = [...statesByCode.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, TRAFFIC_LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedStates
    ? `Mapa do Brasil por UF com destaque para ${highlightedStates}.`
    : "Mapa do Brasil sem estados brasileiros identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[20rem] w-full max-w-[22rem]"
        role="img"
        viewBox="0 0 360 380"
      >
        {BRAZIL_STATE_MAP_PATHS.map((statePath) => {
          const item = statesByCode.get(statePath.code);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("#308ce8", 0.28 + intensity * 0.62)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("#308ce8", 0.74) : "var(--admin-border)";

          return (
            <path
              d={statePath.d}
              fill={fill}
              key={statePath.code}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "1.2" : "0.9"}
            >
              <title>
                {item
                  ? `${statePath.name}: ${formatLocationAccessCount(item.count)}`
                  : `${statePath.name}: sem acesso`}
              </title>
            </path>
          );
        })}
      </svg>
      {statesByCode.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Sem estados brasileiros identificados. Locais fora do Brasil continuam nos rankings.
        </figcaption>
      ) : null}
    </figure>
  );
};

const resolveWorldCountryMapPath = (item: TrafficLocationItem) => {
  const idParts = item.id.split(":");
  const candidates = [item.id, idParts[idParts.length - 1], item.label];

  for (const candidate of candidates) {
    const normalized = normalizeLocationLookupKey(candidate);
    const mappedId = COUNTRY_WORLD_MAP_ID_BY_KEY[normalized];
    const mappedCountry = mappedId
      ? WORLD_COUNTRY_MAP_PATHS.find((country) => country.id === mappedId)
      : null;
    if (mappedCountry) return mappedCountry;

    const countryByName = WORLD_COUNTRY_MAP_PATHS.find(
      (country) => normalizeLocationLookupKey(country.name) === normalized,
    );
    if (countryByName) return countryByName;
  }

  return null;
};

const WorldCountryMap = ({ countries }: { countries: TrafficLocationItem[] }) => {
  const { max, min } = getLocationCountRange(countries);
  const countriesByMapId = new Map<string, TrafficLocationItem>();

  for (const item of countries) {
    const countryPath = resolveWorldCountryMapPath(item);
    if (countryPath) countriesByMapId.set(countryPath.id, item);
  }

  const highlightedCountries = countries
    .slice(0, TRAFFIC_LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedCountries
    ? `Mapa-múndi com destaque para ${highlightedCountries}.`
    : "Mapa-múndi sem países identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[18rem] w-full max-w-[30rem]"
        role="img"
        viewBox="0 0 520 270"
      >
        {WORLD_COUNTRY_MAP_PATHS.map((country) => {
          const item = countriesByMapId.get(country.id);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("#308ce8", 0.32 + intensity * 0.6)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("#308ce8", 0.78) : "var(--admin-border)";

          return (
            <path
              d={country.d}
              fill={fill}
              key={country.id}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "0.85" : "0.45"}
            >
              <title>
                {item
                  ? `${country.name}: ${formatLocationAccessCount(item.count)}`
                  : `${country.name}: sem acesso`}
              </title>
            </path>
          );
        })}
      </svg>
      {countries.length > 0 && countriesByMapId.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Países não encontrados na malha continuam no ranking agregado.
        </figcaption>
      ) : null}
    </figure>
  );
};

const LocationMapScopeToggle = ({
  hasCountries,
  hasStates,
  onScopeChange,
  scope,
}: {
  hasCountries: boolean;
  hasStates: boolean;
  onScopeChange: (scope: TrafficLocationMapScope) => void;
  scope: TrafficLocationMapScope;
}) => {
  const options: TrafficLocationMapScope[] = ["states", "countries"];

  return (
    <fieldset
      aria-label="Alternar mapa de localização"
      className="grid grid-cols-2 rounded-full bg-surface-muted p-1 text-xs font-black"
    >
      {options.map((option) => {
        const disabled = option === "states" ? !hasStates : !hasCountries;

        return (
          <button
            aria-pressed={scope === option}
            className={cn(
              "rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45",
              scope === option
                ? "bg-surface text-primary shadow-control"
                : "text-muted hover:text-foreground",
            )}
            disabled={disabled}
            key={option}
            onClick={() => onScopeChange(option)}
            type="button"
          >
            {TRAFFIC_LOCATION_MAP_SCOPE_LABELS[option]}
          </button>
        );
      })}
    </fieldset>
  );
};

const LocationMapPanel = ({
  countries,
  onScopeChange,
  scope,
  states,
}: {
  countries: TrafficLocationItem[];
  onScopeChange: (scope: TrafficLocationMapScope) => void;
  scope: TrafficLocationMapScope;
  states: TrafficLocationItem[];
}) => {
  const activeItems = scope === "states" ? states : countries;
  const title = scope === "states" ? "Acessos por Estado" : "Acessos por País";
  const rankingTitle = scope === "states" ? "Estados" : "Países";
  const emptyMessage =
    scope === "states" ? "Nenhum estado real capturado." : "Nenhum país real capturado.";

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-surface">
      <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-black text-foreground">{title}</h4>
        <LocationMapScopeToggle
          hasCountries={countries.length > 0}
          hasStates={states.length > 0}
          onScopeChange={onScopeChange}
          scope={scope}
        />
      </div>
      <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(12rem,0.9fr)] lg:items-center">
        <div className="min-h-[16rem] min-w-0">
          {scope === "states" ? (
            <BrazilStateChoroplethMap states={states} />
          ) : (
            <WorldCountryMap countries={countries} />
          )}
        </div>
        <LocationBarRanking emptyMessage={emptyMessage} items={activeItems} title={rankingTitle} />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <LocationMapLegend items={activeItems} />
        <span className="text-[0.68rem] font-bold text-subtle">intensidade por acessos</span>
      </div>
    </div>
  );
};

const LocationOverview = ({
  locations,
}: {
  locations: Pick<AdminTrafficSummary["locations"], "cities" | "countries" | "states" | "total">;
}) => {
  const [preferredScope, setPreferredScope] = useState<TrafficLocationMapScope>("states");
  const hasCountries = locations.countries.length > 0;
  const hasStates = locations.states.length > 0;
  const scope =
    preferredScope === "states" && !hasStates && hasCountries ? "countries" : preferredScope;
  const secondaryItems = scope === "states" ? locations.countries : locations.states;
  const secondaryTitle = scope === "states" ? "Países" : "Top estados";
  const secondaryEmptyMessage =
    scope === "states" ? "Nenhum país real capturado." : "Nenhum estado real capturado.";

  return (
    <div className="mt-5 space-y-4">
      <LocationSummaryStats locations={locations} />
      {locations.total === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhum acesso com localização agregada real foi capturado no período selecionado.
        </p>
      ) : (
        <>
          <LocationMapPanel
            countries={locations.countries}
            onScopeChange={setPreferredScope}
            scope={scope}
            states={locations.states}
          />
          <div className="grid gap-3 2xl:grid-cols-2">
            <LocationRankingList
              emptyMessage="Nenhuma cidade real capturada."
              items={locations.cities}
              title="Top cidades"
            />
            <LocationRankingList
              emptyMessage={secondaryEmptyMessage}
              items={secondaryItems}
              title={secondaryTitle}
            />
          </div>
          <p className="text-xs font-bold leading-5 text-muted">
            Total considerado: {formatLocationAccessCount(locations.total)} de visitor_location.
            Cidades com frequência muito baixa podem aparecer agrupadas para reduzir exposição.
          </p>
        </>
      )}
    </div>
  );
};

const LocationPanel = ({
  locations,
  periodDescription,
}: {
  locations: AdminTrafficSummary["locations"];
  periodDescription: string;
}) => {
  return (
    <CardShell className="p-5 md:p-6">
      <PanelTitle
        icon={MapPinned}
        periodDescription={periodDescription}
        source={locations.source}
        title="Acessos por localização"
      />
      <LocationOverview locations={locations} />
    </CardShell>
  );
};

const TRAFFIC_OVERVIEW_CARD_LABELS: Record<TrafficOverviewCardKey, string> = {
  new_visitors: "Novos visitantes",
  recurring_visitors: "Visitantes recorrentes",
  sessions: "Sessões",
  unique_visitors: "Visitantes únicos",
};

const getTrafficOverviewMetricLabel = (key: TrafficOverviewMetricKey) =>
  TRAFFIC_OVERVIEW_CARD_LABELS[key];

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
      <legend className="sr-only">Contadores da visão geral de Tráfego</legend>
      {TRAFFIC_OVERVIEW_CARD_ORDER.map((key) => {
        const metric = cards.get(key);
        if (!metric) return null;
        const cardMetric = { ...metric, label: TRAFFIC_OVERVIEW_CARD_LABELS[key] };
        const isChartMetric = isTrafficOverviewMetricKey(key);
        const rate =
          key === "new_visitors" || key === "recurring_visitors"
            ? formatMetricRate(metric.value, uniqueVisitors)
            : null;

        return (
          <MetricCard
            active={isChartMetric ? activeMetricKeys.includes(key) : undefined}
            key={key}
            metric={cardMetric}
            onToggle={isChartMetric ? () => onToggleMetric(key) : undefined}
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
    ...TRAFFIC_OVERVIEW_CHART_ORDER,
  ]);
  const activeMetricKeys = TRAFFIC_OVERVIEW_CHART_ORDER.filter((key) =>
    visibleMetricKeys.includes(key),
  );
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

      <OnlineNowPanel onlineNow={summary.online_now} />

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
            periodDescription={periodDescription}
            title="Origem do tráfego"
          />
          <DonutChart
            ariaLabel="Distribuição de sessões por origem de tráfego"
            items={summary.traffic_sources.items}
            total={summary.traffic_sources.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            icon={Smartphone}
            periodDescription={periodDescription}
            title="Dispositivos e sistemas"
          />
          <DonutChart
            ariaLabel="Distribuição de sessões por dispositivo"
            items={buildDeviceDonutItems(summary.devices.items)}
            total={summary.devices.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Users} periodDescription={periodDescription} title="Tipo de usuário" />
          <DonutChart
            ariaLabel="Distribuição de sessões por tipo de usuário"
            items={summary.user_types.items}
            total={summary.user_types.total}
          />
        </CardShell>
      </div>

      <ConversionsPanel periodDescription={periodDescription} summary={summary} />

      <PageNavigationPanel periodDescription={periodDescription} summary={summary} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle icon={Activity} title="Tráfego por comunidade" />
          <RankingList destinationLabel="a comunidade" items={summary.top_communities.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={FileText} title="Tráfego por post" />
          <RankingList destinationLabel="o post" items={summary.top_posts.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Users} title="Tráfego por psicólogo" />
          <RankingList
            destinationLabel="o perfil do psicólogo"
            items={summary.top_psychologists.items}
          />
        </CardShell>
      </div>

      <LocationPanel locations={summary.locations} periodDescription={periodDescription} />
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
  const appliedQuery = useMemo<TrafficSummaryQuery>(
    () =>
      appliedPeriod === "custom"
        ? { from: appliedRange.from, period: "custom", to: appliedRange.to }
        : { period: appliedPeriod },
    [appliedPeriod, appliedRange.from, appliedRange.to],
  );
  const query = useAdminTrafficSummary(appliedQuery, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
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
        <>
          <OnlineNowSkeleton />
          <TrafficOverviewPanel
            periodControls={periodControls}
            periodDescription={formatPeriodDescription(selectedPeriod, draftRange)}
          >
            <LoadingGrid />
            <div className="mt-4 h-[20rem] animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-muted" />
          </TrafficOverviewPanel>
        </>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <TrafficContent
          periodControls={periodControls}
          periodDescription={formatPeriodDescription(appliedPeriod, {
            from: query.data.period.from,
            to: query.data.period.to,
          })}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
