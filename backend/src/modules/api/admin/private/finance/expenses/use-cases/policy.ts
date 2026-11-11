import { createHash } from "node:crypto";
import { z } from "zod";
import type { admin_operating_expense } from "@/external/generated/prisma/client";
import { toFinanceDateKey } from "../../dashboard/use-cases/services/finance-calendar";
import {
  type ExpenseItem,
  type ExpensePayload,
  expenseCategories,
} from "../DTOs/IAdminOperatingExpenseDTO";

export type ExpenseErrorCode =
  | "expense_invalid_input"
  | "expense_conflict"
  | "expense_replay_conflict"
  | "expense_not_found"
  | "expense_actor_invalid"
  | "expense_voided";
export class ExpenseError extends Error {
  constructor(readonly code: ExpenseErrorCode) {
    super("OPERATING_EXPENSE_BLOCKED");
    this.name = "ExpenseError";
  }
}
export const expenseCivilDate = z.iso
  .date()
  .refine((value) => value >= "2000-01-01" && value <= "2100-12-31");
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .max(max * 2)
    .refine(
      (value) =>
        [...value].length >= min &&
        [...value].length <= max &&
        [...value].every((character) => {
          const code = character.codePointAt(0)!;
          return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;
        }),
    );
export const expenseReason = text(8, 240);
export const expenseRevision = z.number().int().min(1).max(2147483646);
export const expenseLocalId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const expensePayloadSchema = z.object({
  amount_cents: z.number().int().min(1).max(99999999),
  category: z.enum(expenseCategories),
  description: text(3, 140),
  competence_date: expenseCivilDate,
  paid_date: expenseCivilDate.nullable(),
});
export const expenseCreateSchema = expensePayloadSchema.extend({
  paid_date: expenseCivilDate.nullable().optional().default(null),
  request_key: z.uuid({ version: "v4" }).transform((value) => value.toLowerCase()),
});
export const expenseUpdateSchema = expensePayloadSchema.extend({
  expected_revision: expenseRevision,
  reason: expenseReason,
});
export const expenseVoidSchema = z.object({
  expected_revision: expenseRevision,
  reason: expenseReason,
});
export const expenseQuerySchema = z
  .object({
    competence_from: expenseCivilDate.optional(),
    competence_to: expenseCivilDate.optional(),
    category: z.enum(expenseCategories).optional(),
    status: z.enum(["active", "voided", "all"]).default("active"),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (query) =>
      !query.competence_from ||
      !query.competence_to ||
      query.competence_from <= query.competence_to,
  );
export function parseExpense<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ExpenseError("expense_invalid_input");
  return result.data;
}
export function validateExpenseDates(payload: ExpensePayload, now = new Date()) {
  if (payload.paid_date && payload.paid_date > toFinanceDateKey(now))
    throw new ExpenseError("expense_invalid_input");
  return payload;
}
/** SQL DATE is a civil key, not a BRT midnight instant. Never apply a timezone to persisted DATE values. */
export const toExpenseSqlDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const expenseDateKey = (value: Date) => value.toISOString().slice(0, 10);
export const textHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const expenseCreationFingerprint = (actorId: string, payload: ExpensePayload) =>
  textHash(
    JSON.stringify([
      "lectum.operating-expense.v1",
      actorId,
      payload.amount_cents,
      "BRL",
      payload.category,
      payload.description,
      payload.competence_date,
      payload.paid_date,
    ]),
  );
export const expenseData = (payload: ExpensePayload) => ({
  amount_cents: payload.amount_cents,
  category: payload.category,
  description: payload.description,
  competence_date: toExpenseSqlDate(payload.competence_date),
  paid_date: payload.paid_date ? toExpenseSqlDate(payload.paid_date) : null,
});
export const expenseItem = (row: admin_operating_expense): ExpenseItem => ({
  id: row.id,
  revision: row.revision,
  currency: "BRL",
  amount_cents: row.amount_cents,
  category: row.category as ExpenseItem["category"],
  description: row.description,
  competence_date: expenseDateKey(row.competence_date),
  paid_date: row.paid_date ? expenseDateKey(row.paid_date) : null,
  status: row.status as ExpenseItem["status"],
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
  correction_reason: row.correction_reason,
  void_reason: row.void_reason,
  voided_at: row.voided_at?.toISOString() ?? null,
});
export const expenseAuditSnapshot = (row: admin_operating_expense) => ({
  revision: row.revision,
  status: row.status,
  currency: row.currency,
  amount_cents: row.amount_cents,
  category: row.category,
  competence_date: expenseDateKey(row.competence_date),
  paid_date: row.paid_date ? expenseDateKey(row.paid_date) : null,
  description_hash: textHash(row.description),
  correction_reason_hash: row.correction_reason ? textHash(row.correction_reason) : null,
  void_reason_hash: row.void_reason ? textHash(row.void_reason) : null,
});
export const expenseCategoryOptions = [
  { id: "infrastructure", label: "Infraestrutura" },
  { id: "software", label: "Software" },
  { id: "accounting", label: "Contabilidade" },
  { id: "marketing", label: "Marketing" },
  { id: "people", label: "Pessoas" },
  { id: "taxes", label: "Tributos registrados" },
  { id: "other", label: "Outros" },
] satisfies Array<{ id: ExpenseItem["category"]; label: string }>;
