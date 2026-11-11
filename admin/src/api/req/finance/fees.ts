import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type FeeState =
  | "not_observed"
  | "processing"
  | "partial"
  | "observed"
  | "unavailable"
  | "conflict";
export type FeeDiagnostic =
  | "read_access_denied"
  | "provider_unavailable"
  | "scope_mismatch"
  | "invalid_receipt"
  | "balance_missing"
  | "unsupported_balance"
  | "fact_conflict"
  | "lease_unavailable"
  | "live_not_authorized";
export type BalanceFactKind = "capture" | "refund" | "refund_reversal" | "dispute";
export type BalanceStatus = "pending" | "available";
export type FeeQuery = { from?: string; to?: string; page?: number; limit?: number };
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
  transactions: {
    id_local: string;
    kind: BalanceFactKind;
    occurred_at: string;
    available_on: string;
    amount_cents: number | null;
    fee_cents: number | null;
    net_cents: number | null;
    status: BalanceStatus;
  }[];
  coverage: {
    state: FeeState;
    capture_verified: boolean;
    refunds_scanned: boolean;
    disputes_scanned: boolean;
    has_more: boolean;
    cutoff_at?: string | null;
    last_observed_at: string | null;
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
const base = "/api/admin/private/finance/fees";
export const getAdminStripeFees = async (query: FeeQuery) => {
  const response = await adminApi.get<ApiResponse<AdminStripeFees>>(base, { params: query });
  return resolveApiData(response.data);
};
export const observeAdminStripeFee = async (receiptId: string) => {
  const response = await adminApi.post<ApiResponse<FeeObservationResult>>(
    `${base}/${encodeURIComponent(receiptId)}/observe`,
    {},
  );
  return resolveApiData(response.data);
};
