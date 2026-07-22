import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type FinanceGroupBy = "day" | "month" | "week";
export type FinancePeriodValue = "all" | "custom" | "month" | "today" | "week" | "year";

export type FinanceDashboardQuery = {
  from?: string;
  groupBy?: FinanceGroupBy;
  period?: FinancePeriodValue;
  to?: string;
};

export type FinanceMetric = {
  available: boolean;
  change_percent: number | null;
  description: string;
  id:
    | "active_subscriptions"
    | "cancellations"
    | "new_subscriptions"
    | "new_subscriptions_revenue"
    | "revenue_total";
  label: string;
  previous_value: number;
  rate_percent: number | null;
  source: string;
  trend: "down" | "flat" | "unavailable" | "up";
  unit: "count" | "currency_cents";
  unavailable_reason: string | null;
  value: number;
};

export type FinancePeriod = {
  days: number;
  from: string;
  group_by: FinanceGroupBy;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type FinanceSeriesPoint = {
  active_subscriptions: number;
  cancellations: number;
  confirmed_payments: number;
  end_date: string;
  new_subscriptions: number;
  new_subscriptions_revenue_cents: number;
  revenue_cents: number;
  start_date: string;
};

export type FinanceSubscriptionItem = {
  created_at: string;
  current_period_end: string | null;
  gateway: string | null;
  id: string;
  plan: {
    id: string;
    interval: string;
    name: string;
    price_cents: number;
    slug: string;
  };
  psychologist: {
    crp: string | null;
    email: string;
    id: string;
    name: string;
  };
  source: string;
  started_at: string;
  status: string;
  status_label: string;
};

export type AdminFinanceDashboard = {
  average_ltv: {
    available: boolean;
    description: string;
    linked_confirmed_payments: number;
    paid_psychologist_count: number;
    source: "payment_event_linked_to_paid_psychologists";
    unavailable_reason: string | null;
    value_cents: number;
  };
  cards: {
    active_subscriptions: FinanceMetric;
    cancellations: FinanceMetric;
    new_subscriptions: FinanceMetric;
    new_subscriptions_revenue: FinanceMetric;
    revenue_total: FinanceMetric;
  };
  coverage_notes: string[];
  export: {
    available: true;
    format: "csv";
  };
  mrr: {
    description: string;
    source: "active_paid_subscriptions";
    value_cents: number;
  };
  new_subscriptions: {
    items: FinanceSubscriptionItem[];
    source: "professional_subscription+subscription_plan+psychologist_profile+user";
    total: number;
  };
  period: FinancePeriod;
  series: {
    points: FinanceSeriesPoint[];
    source: "payment_event+professional_subscription";
  };
  unavailable: Array<{
    description: string;
    id: string;
    label: string;
    source: string;
  }>;
};

const cleanParams = (input: FinanceDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.groupBy ? { groupBy: input.groupBy } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const resolveFilename = (header?: string) => {
  if (!header) return null;

  const filenameMatch = header.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? null;
};

export const getAdminFinanceDashboard = async (input: FinanceDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminFinanceDashboard>>(
    "/api/admin/private/finance/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const exportAdminFinanceDashboard = async (input: FinanceDashboardQuery) => {
  const response = await adminApi.get<Blob>("/api/admin/private/finance/dashboard/export", {
    params: cleanParams(input),
    responseType: "blob",
  });
  const filename =
    resolveFilename(response.headers["content-disposition"]) ||
    `lectum-financeiro-${input.from || "default"}_${input.to || "default"}.csv`;

  return {
    blob: response.data,
    filename,
  };
};
