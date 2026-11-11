import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type FinancialHistoryStatus =
  | "paid"
  | "pending"
  | "failed"
  | "canceled"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "processed";

export type FinancialHistoryQuery = {
  user_id?: string;
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type FinancialHistoryInvoice = {
  id: string;
  status: string;
  number: string | null;
  mode: "test" | "live";
  downloadable: boolean;
};

export type FinancialHistoryItem = {
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
  financial_status: FinancialHistoryStatus;
  status_label: string;
  description: string;
  source: string;
  invoice: FinancialHistoryInvoice | null;
};

export type FinancialHistory = {
  items: FinancialHistoryItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  coverage: {
    source: string;
    remote_readiness: "not_checked";
    complete: false;
    reason: string;
  };
};

export const getAdminFinancialHistory = async (
  input: FinancialHistoryQuery,
  signal?: AbortSignal,
) => {
  const response = await adminApi.get<ApiResponse<FinancialHistory>>(
    "/api/admin/private/finance/history",
    {
      params: {
        user_id: input.user_id || undefined,
        page: input.page || 1,
        limit: input.limit || 20,
        status: input.status || undefined,
        q: input.q || undefined,
        from: input.from || undefined,
        to: input.to || undefined,
      },
      signal,
    },
  );
  return resolveApiData(response.data);
};
