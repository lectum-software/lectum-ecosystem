import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import type {
  AdminTrafficSummary,
  TrafficBreakdownItem,
  TrafficMetric,
  TrafficRankingItem,
  TrafficSummaryQuery,
} from "@/api/req/traffic";
import { BRAZIL_STATE_MAP_PATHS } from "@/lib/brazil-state-map";

export const CHART_COLORS = [
  "var(--admin-primary)",
  "var(--admin-success)",
  "var(--admin-warning)",
  "var(--admin-danger)",
  "var(--admin-muted)",
  "var(--admin-subtle)",
];

export const SKELETON_KEYS = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

export const TRAFFIC_OVERVIEW_CARD_ORDER = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

export const TRAFFIC_OVERVIEW_CHART_ORDER = [
  "sessions",
  "unique_visitors",
  "new_visitors",
  "recurring_visitors",
] as const;

export const TRAFFIC_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const;

export type TrafficOverviewCardKey = (typeof TRAFFIC_OVERVIEW_CARD_ORDER)[number];

export type TrafficOverviewMetricKey = (typeof TRAFFIC_OVERVIEW_CHART_ORDER)[number];

export type TrafficPeriodPreset = (typeof TRAFFIC_PERIOD_OPTIONS)[number]["id"];

export type TrafficPeriodValue = TrafficPeriodPreset | "custom";

export type TrafficDateRange = Required<Pick<TrafficSummaryQuery, "from" | "to">>;

export type TrafficDonutChartItem = TrafficBreakdownItem & {
  sublabel?: string | null;
};

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const formatPercentageValue = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;

export const formatRankingSummary = (item: TrafficRankingItem) => {
  const sessionLabel = item.sessions === 1 ? "sessão" : "sessões";
  const pageviewLabel = item.count === 1 ? "visualização" : "visualizações";

  return `${numberFormatter.format(item.sessions)} ${sessionLabel} · ${numberFormatter.format(
    item.count,
  )} ${pageviewLabel}`;
};

export const TRAFFIC_LOCATION_RANKING_LIMIT = 5;

export type TrafficLocationMapScope = "countries" | "states";

export const TRAFFIC_LOCATION_MAP_SCOPE_LABELS = {
  countries: "Países",
  states: "Estados",
} satisfies Record<TrafficLocationMapScope, string>;

export const COUNTRY_WORLD_MAP_ID_BY_KEY: Record<string, string> = {
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

export const normalizeTextKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

export const normalizeLocationLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const BRAZIL_STATE_CODES = new Set<string>(
  BRAZIL_STATE_MAP_PATHS.map((state) => state.code),
);

export const BRAZIL_STATE_CODE_BY_NAME = new Map(
  BRAZIL_STATE_MAP_PATHS.map((state) => [normalizeTextKey(state.name), state.code]),
);

export const resolveBrazilStateCode = (item: TrafficBreakdownItem) => {
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

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => {
  const date = new Date();
  date.setMonth(0, 1);

  return date;
};

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const getQuickRange = (days: number): TrafficDateRange => {
  const today = new Date();

  return {
    from: toInputDate(startOfLastDays(days)),
    to: toInputDate(today),
  };
};

export const getTrafficRangeForPeriod = (period: TrafficPeriodPreset): TrafficDateRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toInputDate(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "7d") return getQuickRange(7);
  if (period === "90d") return getQuickRange(90);

  return getQuickRange(30);
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

export const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getTrafficPeriodLabel = (period: TrafficPeriodValue) => {
  if (period === "custom") return "Período personalizado";

  return TRAFFIC_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Últimos 30 dias";
};

export const formatPeriodDescription = (period: TrafficPeriodValue, range: TrafficDateRange) => {
  const label = getTrafficPeriodLabel(period);
  if (!range.from || !range.to) return label;

  return `${label} \u00b7 ${formatDate(range.from)} a ${formatDate(range.to)}`;
};

export const isValidRange = (range: TrafficDateRange) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

export const formatMetricValue = (metric: TrafficMetric) => {
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

export const findMetric = (summary: AdminTrafficSummary, metricId: string) =>
  summary.overview_cards.find((metric) => metric.id === metricId) ??
  summary.quality.items.find((metric) => metric.id === metricId) ??
  summary.conversions.items.find((metric) => metric.id === metricId) ??
  null;

export const formatMetricRate = (value: number, total: number) => {
  const rate = total > 0 ? (value / total) * 100 : 0;

  return `${rate.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const hasPeriodRecords = (summary: AdminTrafficSummary) => {
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
