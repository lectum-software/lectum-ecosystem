import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type ExpenseCategory =
  | "infrastructure"
  | "software"
  | "accounting"
  | "marketing"
  | "people"
  | "taxes"
  | "other";
export type ExpenseInput = {
  amount_cents: number;
  competence_date: string;
  paid_date: string | null;
  category: ExpenseCategory;
  description: string;
};
export type AdminExpense = ExpenseInput & {
  id: string;
  revision: number;
  currency: "BRL";
  status: "active" | "voided";
  created_at: string;
  updated_at: string;
  correction_reason: string | null;
  void_reason: string | null;
  voided_at: string | null;
};
export type ExpenseQuery = {
  competence_from?: string;
  competence_to?: string;
  category?: ExpenseCategory;
  status?: "active" | "voided" | "all";
  search?: string;
  page?: number;
  limit?: number;
};
export type ExpenseList = {
  items: AdminExpense[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  totals: {
    available: boolean;
    recorded_cents: number | null;
    paid_cents: number | null;
    pending_cents: number | null;
    voided_cents: number | null;
    active_count: number;
    paid_count: number;
    pending_count: number;
    voided_count: number;
  };
  coverage: {
    source: "manual_local_records";
    complete: false;
    fees_available: false;
    profit_available: false;
    note: string;
  };
  categories: { id: ExpenseCategory; label: string }[];
};
export type ExpenseCreation = ExpenseInput & { request_key: string };
const base = "/api/admin/private/finance/expenses";
export const getAdminExpenses = async (input: ExpenseQuery) => {
  const response = await adminApi.get<ApiResponse<ExpenseList>>(base, { params: input });
  return resolveApiData(response.data);
};
export const createAdminExpense = async (input: ExpenseCreation) => {
  const response = await adminApi.post<ApiResponse<{ item: AdminExpense; replayed: boolean }>>(
    base,
    input,
  );
  return resolveApiData(response.data);
};
export const correctAdminExpense = async ({
  id,
  input,
}: {
  id: string;
  input: ExpenseInput & { expected_revision: number; reason: string };
}) => {
  const response = await adminApi.put<ApiResponse<{ item: AdminExpense }>>(
    `${base}/${encodeURIComponent(id)}`,
    input,
  );
  return resolveApiData(response.data);
};
export const voidAdminExpense = async ({
  id,
  input,
}: {
  id: string;
  input: { expected_revision: number; reason: string };
}) => {
  const response = await adminApi.post<ApiResponse<{ item: AdminExpense }>>(
    `${base}/${encodeURIComponent(id)}/void`,
    input,
  );
  return resolveApiData(response.data);
};
