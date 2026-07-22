import type { Request } from "express";

export type AdminFinanceGroupBy = "day" | "month" | "week";
export type AdminFinancePeriodPreset = "all" | "month" | "today" | "week" | "year";
export type AdminFinancePeriodValue = AdminFinancePeriodPreset | "custom";

export type AdminFinanceQuery = {
  from?: string;
  groupBy?: AdminFinanceGroupBy;
  limit?: number;
  page?: number;
  period?: AdminFinancePeriodValue;
  to?: string;
};

export type AdminFinanceDateRange = {
  end: Date;
  start: Date;
};

export type AdminFinancePeriod = {
  days: number;
  from: string;
  group_by: AdminFinanceGroupBy;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminFinanceMetric = {
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

export type AdminFinanceSeriesPoint = {
  active_subscriptions: number;
  cancellations: number;
  confirmed_payments: number;
  end_date: string;
  new_subscriptions: number;
  new_subscriptions_revenue_cents: number;
  revenue_cents: number;
  start_date: string;
};

export type AdminFinanceSubscriptionItem = {
  created_at: string;
  current_period_end: string | null;
  detail_url: string;
  gateway: string | null;
  gateway_subscription_id: string | null;
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
    profile_id: string;
    user_id: string;
  };
  source: string;
  started_at: string;
  status: string;
  status_label: string;
  updated_at: string;
};

export type AdminFinanceChargeItem = {
  amount_available: boolean;
  amount_cents: number | null;
  detail_url: string | null;
  event_id: string;
  event_type: string;
  external_id: string;
  gateway: "mercadopago";
  occurred_at: string;
  reference: string | null;
  status: "confirmed";
  status_label: "Confirmada";
  subscription: AdminFinanceSubscriptionItem | null;
  unavailable_reason: string | null;
};

export type AdminFinanceListResponse<TItem, TSource extends string> = {
  count: number;
  data: TItem[];
  page: number;
  pages: number;
  per_page: number;
  period: AdminFinancePeriod;
  source: TSource;
};

export type AdminFinanceUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
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
    active_subscriptions: AdminFinanceMetric;
    cancellations: AdminFinanceMetric;
    new_subscriptions: AdminFinanceMetric;
    new_subscriptions_revenue: AdminFinanceMetric;
    revenue_total: AdminFinanceMetric;
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
  latest_charges: {
    items: AdminFinanceChargeItem[];
    source: "payment_event+professional_subscription";
    total: number;
  };
  new_subscriptions: {
    items: AdminFinanceSubscriptionItem[];
    source: "professional_subscription+subscription_plan+psychologist_profile+user";
    total: number;
  };
  period: AdminFinancePeriod;
  series: {
    points: AdminFinanceSeriesPoint[];
    source: "payment_event+professional_subscription";
  };
  subscription_relation: {
    items: AdminFinanceSubscriptionItem[];
    source: "professional_subscription+subscription_plan+psychologist_profile+user";
    total: number;
  };
  unavailable: AdminFinanceUnavailableMetric[];
};

export type IAdminFinanceDashboardDTO = Request & {
  q: AdminFinanceQuery;
};
