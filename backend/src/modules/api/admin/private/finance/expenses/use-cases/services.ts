import type { ExpenseList } from "../DTOs/IAdminOperatingExpenseDTO";
import { AdminOperatingExpenseRepository } from "../repositories/AdminOperatingExpenseRepository";
import {
  expenseCategoryOptions,
  expenseCreateSchema,
  expenseItem,
  expenseLocalId,
  expenseQuerySchema,
  expenseUpdateSchema,
  expenseVoidSchema,
  parseExpense,
  validateExpenseDates,
} from "./policy";
import { expenseTotals } from "./totals";
export async function createExpense(actorId: string, input: unknown) {
  const { request_key, ...payload } = parseExpense(expenseCreateSchema, input);
  validateExpenseDates(payload);
  const result = await new AdminOperatingExpenseRepository().create(actorId, payload, request_key);
  return { item: expenseItem(result.row), replayed: result.replayed };
}
export async function correctExpense(actorId: string, id: string, input: unknown) {
  parseExpense(expenseLocalId, id);
  const { expected_revision, reason, ...payload } = parseExpense(expenseUpdateSchema, input);
  validateExpenseDates(payload);
  return {
    item: expenseItem(
      await new AdminOperatingExpenseRepository().correct(
        actorId,
        id,
        expected_revision,
        payload,
        reason,
      ),
    ),
  };
}
export async function voidExpense(actorId: string, id: string, input: unknown) {
  parseExpense(expenseLocalId, id);
  const { expected_revision, reason } = parseExpense(expenseVoidSchema, input);
  return {
    item: expenseItem(
      await new AdminOperatingExpenseRepository().void(actorId, id, expected_revision, reason),
    ),
  };
}
export async function listExpenses(actorId: string, input: unknown): Promise<ExpenseList> {
  const query = parseExpense(expenseQuerySchema, input);
  const snapshot = await new AdminOperatingExpenseRepository().read(actorId, query);
  return {
    items: snapshot.rows.map(expenseItem),
    pagination: {
      page: snapshot.page,
      limit: query.limit,
      total: snapshot.total,
      total_pages: Math.ceil(snapshot.total / query.limit),
    },
    totals: expenseTotals(snapshot),
    coverage: {
      source: "manual_local_records",
      complete: false,
      fees_available: false,
      profit_available: false,
      note: "Lançamentos manuais filtrados pela competência, não custos completos. Pago indica marcação manual, não desembolso no período ou conciliação bancária. Anulados ficam separados; tarifas, tributos devidos e lucro líquido não são inferidos.",
    },
    categories: expenseCategoryOptions,
  };
}
