import type { Request } from "express";

export const financialStatuses = [
  "paid",
  "pending",
  "failed",
  "canceled",
  "refunded",
  "partially_refunded",
  "disputed",
  "processed",
] as const;
export type FinancialStatus = (typeof financialStatuses)[number];
export type AdminFinanceHistoryQuery = {
  user_id?: string;
  page?: number;
  limit?: number;
  status?: FinancialStatus;
  q?: string;
  from?: string;
  to?: string;
};
export type IAdminFinanceHistoryDTO = Request & { q: AdminFinanceHistoryQuery };
export type AdminFinanceHistoryItem = {
  id: string;
  gateway: "stripe" | "mercadopago";
  mode: "test" | "live" | null;
  user_id: string;
  psychologist_id: string;
  display_name: string | null;
  subscription_id: string;
  occurred_at: string;
  amount_cents: number | null;
  currency: string | null;
  financial_status: FinancialStatus;
  status_label: string;
  description: string;
  source: "stripe_receipt" | "mercadopago_event" | "fiscal_payment_record";
  invoice: {
    id: string;
    status: string;
    number: string | null;
    mode: "test" | "live";
    downloadable: boolean;
  } | null;
};
export type AdminFinanceHistory = {
  items: AdminFinanceHistoryItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  coverage: {
    source: "local_records";
    remote_readiness: "not_checked";
    complete: false;
    reason: string;
  };
};
