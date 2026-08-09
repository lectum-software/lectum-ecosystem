import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import type {
  AdminDashboardSummary,
  DashboardMetric,
  DashboardPeriodPreset,
  DashboardSummaryQuery,
} from "@/api/req/dashboard";

export const DASHBOARD_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const;

export const SKELETON_KEYS = [
  "sessions",
  "revenue",
  "patients",
  "psychologists",
  "reports",
] as const;

export type DashboardPeriodValue = DashboardPeriodPreset | "custom";

export type DashboardDateRange = Required<Pick<DashboardSummaryQuery, "from" | "to">>;

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

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

export const getQuickRange = (days: number): DashboardDateRange => {
  const today = new Date();

  return {
    from: toInputDate(startOfLastDays(days)),
    to: toInputDate(today),
  };
};

export const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardDateRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toInputDate(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "30d") return getQuickRange(30);
  if (period === "90d") return getQuickRange(90);

  return getQuickRange(7);
};

export const getDashboardPeriodLabel = (period: DashboardPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Últimos 7 dias";
};

export const formatPeriodDescription = (
  period: DashboardPeriodValue,
  range: DashboardSummaryQuery,
) => {
  const label = getDashboardPeriodLabel(period);
  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}`;
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export const formatMetricValue = (metric: DashboardMetric) => {
  if (metric.unit === "currency_cents") return currencyFormatter.format(metric.value / 100);

  return numberFormatter.format(metric.value);
};

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatPercent = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })}%`;

export const formatGini = (value: number | null) => {
  if (value === null) return "—";

  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 2,
  });
};

export const isValidRange = (range: DashboardSummaryQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

export const hasPeriodRecords = (summary: AdminDashboardSummary) => {
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
