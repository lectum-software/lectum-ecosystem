import type {
  BalanceFactKind,
  BalanceStatus,
  FeeDiagnostic,
  FeeState,
} from "@/modules/billing/payment-gateway/stripe-balance-types";

export type {
  BalanceFactKind,
  BalanceStatus,
  FeeDiagnostic,
  FeeState,
} from "@/modules/billing/payment-gateway/stripe-balance-types";
export type FeeQuery = { from?: string; to?: string; page: number; limit: number };
export type AdminFeeItem = {
  receipt_id: string;
  paid_at: string;
  amount_paid_cents: number;
  financial_status: string;
  can_refresh: boolean;
  capture: {
    available: boolean;
    fee_cents: number | null;
    net_cents: number | null;
    observed_at: string;
    status: BalanceStatus;
  } | null;
  transactions: Array<{
    id_local: string;
    kind: BalanceFactKind;
    occurred_at: string;
    available_on: string;
    amount_cents: number | null;
    fee_cents: number | null;
    net_cents: number | null;
    status: BalanceStatus;
  }>;
  coverage: {
    state: FeeState;
    capture_verified: boolean;
    refunds_scanned: boolean;
    disputes_scanned: boolean;
    has_more: boolean;
    last_observed_at: string | null;
    cutoff_at: string | null;
    last_error_code: FeeDiagnostic | null;
  };
};
export type AdminStripeFees = {
  mode: "test" | "live" | null;
  items: AdminFeeItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  summary: {
    available: boolean;
    receipt_count: number;
    eligible_gross_cents: number | null;
    capture_verified_count: number;
    capture_missing_count: number;
    observed_capture_gross_cents: number | null;
    observed_capture_fee_cents: number | null;
    observed_capture_net_cents: number | null;
    observed_adjustment_fee_cents: number | null;
    transaction_count: number;
  };
  coverage: {
    complete: false;
    account_costs_complete: false;
    net_cash_flow_available: false;
    profit_available: false;
    note: string;
  };
};
export type FeeObservationResult = {
  receipt_id: string;
  state: FeeState;
  has_more: boolean;
  provider_actions: "read_only";
  financial_actions_executed: false;
};
