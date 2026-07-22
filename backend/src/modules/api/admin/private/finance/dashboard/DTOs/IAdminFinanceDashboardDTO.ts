import type { Request } from "express";

export type AdminFinanceGroupBy = "day" | "month" | "week";
export type AdminFinancePeriodPreset = "all" | "month" | "today" | "week" | "year";
export type AdminFinancePeriodValue = AdminFinancePeriodPreset | "custom";

export type AdminFinanceQuery = {
  from?: string;
  groupBy?: AdminFinanceGroupBy;
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
  id: "active_subscriptions" | "cancellations" | "new_subscriptions" | "revenue_total";
  label: string;
  previous_value: number;
  source: string;
  trend: "down" | "flat" | "unavailable" | "up";
  unit: "count" | "currency_cents";
  unavailable_reason: string | null;
  value: number;
};

export type AdminFinanceSeriesPoint = {
  confirmed_payments: number;
  end_date: string;
  new_subscriptions: number;
  revenue_cents: number;
  start_date: string;
};

export type AdminFinanceSubscriptionItem = {
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

export type AdminFinanceUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminFinanceDashboard = {
  average_ticket: {
    description: string;
    source: "mrr_divided_by_active_paid_subscriptions";
    value_cents: number;
  };
  cards: {
    active_subscriptions: AdminFinanceMetric;
    cancellations: AdminFinanceMetric;
    new_subscriptions: AdminFinanceMetric;
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
  unavailable: AdminFinanceUnavailableMetric[];
};

export type IAdminFinanceDashboardDTO = Request & {
  q: AdminFinanceQuery;
};
