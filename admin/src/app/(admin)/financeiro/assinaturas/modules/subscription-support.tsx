import type { ReactNode } from "react";
import type {
  FinanceListQuery,
  FinancePaymentHealthStatus,
  FinancePaymentMethod,
  FinancePeriodValue,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { cn } from "@/lib/utils";

export type DateFilterDraft = {
  from: string;
  to: string;
};

export type DateFilterFieldName = keyof DateFilterDraft;

export type DateFilterDraftUpdate =
  | DateFilterDraft
  | ((current: DateFilterDraft) => DateFilterDraft);

export const LIST_LIMIT_OPTIONS = [10, 20, 50];

export const SEARCH_DEBOUNCE_MS = 350;

export const FINANCE_FILTER_MIN_YEAR = 1900;

export const FINANCE_FILTER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const validPeriods = new Set<FinancePeriodValue>([
  "all",
  "custom",
  "month",
  "today",
  "week",
  "year",
  "7d",
  "30d",
  "90d",
]);

export const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const statusFilterOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Ativas", value: "ativa" },
  { label: "Inadimplentes", value: "inadimplente" },
  { label: "Canceladas", value: "cancelada" },
] as const;

export const paymentHealthFilterOptions = [
  { label: "Todas as confiabilidades", value: "all" },
  { label: "Confiável", value: "healthy" },
  { label: "Atenção", value: "attention" },
  { label: "Risco", value: "risk" },
  { label: "Crítica", value: "critical" },
  { label: "Histórico insuficiente", value: "insufficient_history" },
] as const;

export const validSubscriptionStatuses = new Set<string>(
  statusFilterOptions.map((option) => option.value),
);

export const validPaymentHealthStatuses = new Set<string>(
  paymentHealthFilterOptions.map((option) => option.value),
);

export const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

export const isCompleteFinanceFilterDate = (value?: string | null): value is string => {
  if (!value || !FINANCE_FILTER_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (year < FINANCE_FILTER_MIN_YEAR) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const parseQuery = (params: URLSearchParams): FinanceListQuery => {
  const period = params.get("period") as FinancePeriodValue | null;
  const paymentHealth = params.get("paymentHealth");
  const q = params.get("q");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  const validFrom = isCompleteFinanceFilterDate(from) ? from : undefined;
  const validTo = isCompleteFinanceFilterDate(to) ? to : undefined;
  const hasValidRange = Boolean(validFrom && validTo);
  const validPeriod = period && validPeriods.has(period) ? period : "all";

  return {
    from: hasValidRange ? validFrom : undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 20)),
    page: parsePositiveNumber(params.get("page"), 1),
    paymentHealth:
      paymentHealth && validPaymentHealthStatuses.has(paymentHealth) && paymentHealth !== "all"
        ? (paymentHealth as FinancePaymentHealthStatus)
        : undefined,
    period: validPeriod === "custom" && !hasValidRange ? "all" : validPeriod,
    q: q || undefined,
    status:
      status && validSubscriptionStatuses.has(status) && status !== "all" ? status : undefined,
    to: hasValidRange ? validTo : undefined,
  };
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export const formatNullableDate = (value: string | null) => (value ? formatDate(value) : "—");

export const isCancelledSubscription = (item: FinanceSubscriptionItem) =>
  item.status === "cancelada" || item.status_label.toLocaleLowerCase("pt-BR").includes("cancelad");

export const shouldShowCancellationMetric = (item: FinanceSubscriptionItem) =>
  isCancelledSubscription(item) || Boolean(item.cancelled_at);

export const formatNextChargeDate = (item: FinanceSubscriptionItem) =>
  isCancelledSubscription(item) ? "—" : formatNullableDate(item.next_charge_at);

export const formatCancellationDate = (item: FinanceSubscriptionItem) =>
  formatNullableDate(item.cancelled_at ?? item.updated_at);

export const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);

export const formatNullableMoney = (cents: number | null) =>
  typeof cents === "number" ? formatMoney(cents) : "Valor indisponível";

export const formatPercent = (value: number | null) =>
  typeof value === "number" ? `${numberFormatter.format(value)}%` : "—";

export const formatCardBrand = (brand: string | null) =>
  brand?.trim() ? brand.trim().replaceAll("_", " ").toUpperCase() : "Cartão";

export const formatCardLabel = (method: FinancePaymentMethod) => {
  const last4 = method.last4?.trim() ? `final ${method.last4}` : "final não informado";

  return `${formatCardBrand(method.brand)} ${last4}`;
};

export const formatCardExpiration = (method: FinancePaymentMethod) => {
  if (!method.exp_month || !method.exp_year) return "Validade não informada";

  return `Validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`;
};

export const CardShell = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);
