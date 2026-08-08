import { BadgeDollarSign, type LucideIcon, UserPlus, UsersRound, XCircle } from "lucide-react";
import type {
  AdminFinanceDashboard,
  FinanceDashboardQuery,
  FinanceSubscriptionItem,
} from "@/api/req/finance";

export type FinancePeriodValue = NonNullable<FinanceDashboardQuery["period"]>;

export type FinancePeriodPreset = Exclude<FinancePeriodValue, "custom">;

export type FinanceDashboardRange = Pick<FinanceDashboardQuery, "from" | "to">;

export const FINANCE_PERIOD_OPTIONS: {
  id: FinancePeriodPreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

export const DEFAULT_FINANCE_PERIOD: FinancePeriodPreset = "all";

export const CARD_ORDER = [
  "revenue_total",
  "active_subscriptions",
  "new_subscriptions_revenue",
  "new_subscriptions",
  "cancellations",
] as const;

export type FinanceMetricKey = (typeof CARD_ORDER)[number];

export const FINANCE_METRIC_CONFIG = {
  active_subscriptions: { color: "var(--admin-primary)", icon: UsersRound },
  cancellations: { color: "var(--admin-danger)", icon: XCircle },
  new_subscriptions: { color: "var(--admin-success)", icon: UserPlus },
  new_subscriptions_revenue: { color: "var(--admin-chart-accent)", icon: BadgeDollarSign },
  revenue_total: { color: "var(--admin-primary)", icon: BadgeDollarSign },
} satisfies Record<FinanceMetricKey, { color: string; icon: LucideIcon }>;

export const CURRENCY_METRIC_KEYS = [
  "revenue_total",
  "new_subscriptions_revenue",
] as const satisfies readonly FinanceMetricKey[];

export const COUNT_METRIC_KEYS = [
  "active_subscriptions",
  "new_subscriptions",
  "cancellations",
] as const satisfies readonly FinanceMetricKey[];

export const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const pad = (value: number) => String(value).padStart(2, "0");

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseFinanceDate = (value?: string | null) => {
  if (!value) return null;

  if (!DATE_ONLY_PATTERN.test(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
};

export const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

export const startOfCurrentMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const startOfCurrentYear = () => {
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1);
};

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const getDashboardRangeForPeriod = (period: FinancePeriodPreset): FinanceDashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toInputDate(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toInputDate(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toInputDate(startOfLastDays(90)), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

export const buildFinanceDashboardQuery = (
  period: FinancePeriodValue,
  range: FinanceDashboardRange,
): FinanceDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

export const formatDate = (value: string) => {
  const date = parseFinanceDate(value);

  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

export const formatDateTime = (value: string) => {
  const date = parseFinanceDate(value);

  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);

export const formatMaybeMoney = (cents: number | null) =>
  cents === null ? "Indisponível" : formatMoney(cents);

export const formatNullableDate = (value: string | null) => (value ? formatDate(value) : "—");

export const isCancelledSubscription = (item: FinanceSubscriptionItem) =>
  item.status === "cancelada";

export const formatNextChargeDate = (item: FinanceSubscriptionItem) =>
  isCancelledSubscription(item) ? "—" : formatNullableDate(item.next_charge_at);

export const detailsHref = (
  base: "/financeiro/assinaturas" | "/financeiro/cobrancas",
  dashboard: AdminFinanceDashboard,
) => {
  const params = new URLSearchParams({
    from: dashboard.period.from,
    period: "custom",
    to: dashboard.period.to,
  });

  return `${base}?${params.toString()}`;
};

export const formatPercent = (value: number | null) =>
  value === null ? "sem base" : `${percentFormatter.format(value)}%`;

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base confiável";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const isValidRange = (range: FinanceDashboardQuery) => {
  if (!range.from || !range.to) return false;

  const from = parseFinanceDate(range.from);
  const to = parseFinanceDate(range.to);

  if (!from || !to) return false;

  return from <= to;
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
