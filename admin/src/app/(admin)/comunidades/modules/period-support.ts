import type { AdminCommunitiesDashboard, CommunitiesDashboardQuery } from "@/api/req/communities";

import {
  COMMUNITY_DASHBOARD_PERIOD_OPTIONS,
  type CommunityDashboardPeriodPreset,
  type CommunityDashboardPeriodValue,
} from "./statistics-config";

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
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
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const startOfLastSixMonths = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() - 6);

  return date;
};

export const getCommunityDashboardRangeForPeriod = (
  period: CommunityDashboardPeriodPreset,
): CommunitiesDashboardQuery => {
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

export const getCommunityDashboardLastSixMonthsRange = (): CommunitiesDashboardQuery => ({
  from: toInputDate(startOfLastSixMonths()),
  period: "custom",
  to: toInputDate(new Date()),
});

export const buildCommunityDashboardPeriodQuery = (
  period: CommunityDashboardPeriodValue,
  range: CommunitiesDashboardQuery,
): CommunitiesDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

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

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatShortRange = (from: string, to: string) => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${formatter.format(dateFromInput(from))} - ${formatter.format(dateFromInput(to))}`;
};

export const formatSelectedPeriod = (
  period: Pick<AdminCommunitiesDashboard["period"], "from" | "to">,
  label: string,
) => `${label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;

export const getCommunityDashboardPeriodLabel = (period: CommunityDashboardPeriodValue) =>
  period === "custom"
    ? "Personalizado"
    : (COMMUNITY_DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ??
      "Período selecionado");
