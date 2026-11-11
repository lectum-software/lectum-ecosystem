export const expenseCategories = [
  "infrastructure",
  "software",
  "accounting",
  "marketing",
  "people",
  "taxes",
  "other",
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];
export type ExpensePayload = {
  amount_cents: number;
  category: ExpenseCategory;
  description: string;
  competence_date: string;
  paid_date: string | null;
};
export type ExpenseQuery = {
  competence_from?: string;
  competence_to?: string;
  category?: ExpenseCategory;
  status: "active" | "voided" | "all";
  search?: string;
  page: number;
  limit: number;
};
export type ExpenseItem = ExpensePayload & {
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
export type ExpenseList = {
  items: ExpenseItem[];
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
  categories: Array<{ id: ExpenseCategory; label: string }>;
};
