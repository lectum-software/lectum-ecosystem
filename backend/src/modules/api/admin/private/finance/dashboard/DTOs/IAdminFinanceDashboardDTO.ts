import type { Request } from "express";

export type AdminFinanceGroupBy = "day" | "month" | "week";
export type AdminFinancePeriodPreset =
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "month"
  | "today"
  | "week"
  | "year";
export type AdminFinancePeriodValue = AdminFinancePeriodPreset | "custom";

export type AdminFinanceQuery = {
  from?: string;
  groupBy?: AdminFinanceGroupBy;
  limit?: number;
  page?: number;
  paymentHealth?: AdminFinancePaymentHealthStatus;
  period?: AdminFinancePeriodValue;
  q?: string;
  status?: string;
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
  timezone: "America/Sao_Paulo";
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
  previous_available?: boolean;
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

export type AdminFinancePaymentHealthStatus =
  | "attention"
  | "critical"
  | "healthy"
  | "insufficient_history"
  | "risk";

export type AdminFinancePaymentHistoryStatus = "failed" | "pending" | "processed" | "successful";

export type AdminFinancePaymentHistoryItem = {
  amount_available: boolean;
  amount_cents: number | null;
  event_id: string;
  event_type: string;
  external_id: string;
  gateway: "mercadopago" | "stripe";
  internal_id: number;
  internal_id_available: boolean;
  occurred_at: string;
  reference: string | null;
  source: "gateway_subscription_summary" | "payment_event" | "stripe_receipt";
  status: AdminFinancePaymentHistoryStatus;
  status_detail: string | null;
  status_label: string;
  title: string;
  financial_status?: string;
  refunded_cents?: number;
  unavailable_reason: string | null;
};

export type AdminFinancePaymentHistory = {
  available: boolean;
  items: AdminFinancePaymentHistoryItem[];
  reason: string | null;
  source:
    | "payment_event.filtered_by_subscription_reference"
    | "payment_event+gateway_subscription_summary"
    | "stripe_receipt";
  total: number;
};

export type AdminFinancePaymentHealth = {
  consecutive_failures: number;
  days_overdue: number | null;
  failed_payments: number;
  final_attempts: number;
  label: string;
  last_failure_at: string | null;
  last_success_at: string | null;
  notes: string[];
  pending_payments: number;
  source: "payment_event+gateway_subscription_summary+professional_subscription";
  status: AdminFinancePaymentHealthStatus;
  successful_payments: number;
  success_rate_percent: number | null;
  summary: string;
  total_events: number;
};

export type AdminFinancePaymentMethod = {
  brand: string | null;
  exp_month: number | null;
  exp_year: number | null;
  gateway: string;
  last4: string | null;
  matches_subscription: boolean;
  saved_at: string | null;
};

export type AdminFinanceSubscriptionItem = {
  cancelled_at: string | null;
  created_at: string;
  current_period_end: string | null;
  detail_url: string;
  gateway: string | null;
  gateway_subscription_id: string | null;
  id: string;
  internal_id: number;
  plan: {
    id: string;
    interval: string | null;
    name: string;
    price_cents: number | null;
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
  last_charge_at: string | null;
  next_charge_at: string | null;
  payment_health: AdminFinancePaymentHealth;
  payment_history: AdminFinancePaymentHistory;
  payment_method: AdminFinancePaymentMethod | null;
  source: string;
  started_at: string;
  started_at_available?: boolean;
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
  gateway: "mercadopago" | "stripe";
  internal_id: number;
  internal_id_available: boolean;
  occurred_at: string;
  reference: string | null;
  source: "gateway_subscription_summary" | "payment_event" | "stripe_receipt";
  status: "confirmed";
  status_label: string;
  financial_status?: string;
  refunded_cents?: number;
  subscription: AdminFinanceSubscriptionItem | null;
  unavailable_reason: string | null;
};

export type AdminFinanceListResponse<TItem, TSource extends string> = {
  coverage_complete?: boolean;
  coverage_note?: string;
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
  financial_basis?: {
    kind: "local_gross_receipts";
    available: boolean;
    observed_at: string;
    provider_coverage: "not_checked";
    gross_receipts_cents: number;
    refund_snapshot_cents: number;
    refund_snapshot_scope: "stripe_receipts";
    fees_available: false;
    net_cash_flow_available: false;
    note: string;
  };
  average_ltv: {
    available: boolean;
    description: string;
    linked_confirmed_payments: number;
    paid_psychologist_count: number;
    source:
      | "payment_event+gateway_subscription_summary_linked_to_paid_psychologists"
      | "local_verified_gross_receipts";
    unavailable_reason: string | null;
    value_cents: number;
  };
  average_subscription_lifetime: {
    available: boolean;
    cancelled_subscription_count: number;
    description: string;
    source: "cancelled_paid_subscriptions" | "observed_paid_receipts+subscription_history";
    unavailable_reason: string | null;
    value_days: number;
    value_months: number;
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
    available?: boolean;
    description: string;
    source: "active_paid_subscriptions" | "local_observed_paid_periods";
    value_cents: number;
  };
  latest_charges: {
    coverage_complete?: boolean;
    items: AdminFinanceChargeItem[];
    source: "payment_event+gateway_subscription_summary+professional_subscription";
    total: number;
  };
  new_subscriptions: {
    items: AdminFinanceSubscriptionItem[];
    source: "professional_subscription+subscription_plan+psychologist_profile+user";
    total: number;
  };
  period: AdminFinancePeriod;
  series: {
    unavailable_metrics?: string[];
    points: AdminFinanceSeriesPoint[];
    source: "payment_event+gateway_subscription_summary+professional_subscription";
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
