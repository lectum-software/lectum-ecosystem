"use client";

import type { FinanceListQuery, FinancePeriodValue } from "@/api/req/finance";

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

export const statusFilterOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Confirmadas", value: "confirmed" },
] as const;

export const validChargeStatuses = new Set<string>(
  statusFilterOptions.map((option) => option.value),
);

export const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR");

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
    period: validPeriod === "custom" && !hasValidRange ? "all" : validPeriod,
    q: q || undefined,
    status: status && validChargeStatuses.has(status) && status !== "all" ? status : undefined,
    to: hasValidRange ? validTo : undefined,
  };
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export const formatMoney = (cents: number | null) =>
  cents === null ? "Indisponível" : moneyFormatter.format(cents / 100);
