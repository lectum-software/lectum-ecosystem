import { z } from "zod";
import { validator } from "@/utils/validator";
import { expenseCategories } from "../DTOs/IAdminOperatingExpenseDTO";
import {
  expenseCivilDate,
  expenseLocalId,
  expensePayloadSchema,
  expenseReason,
  expenseRevision,
} from "../use-cases/policy";

const fields = expensePayloadSchema.shape;
const body = [
  { key: "amount_cents", custom: fields.amount_cents },
  { key: "category", custom: fields.category },
  { key: "description", custom: fields.description },
  { key: "competence_date", custom: fields.competence_date },
];
const params = [{ key: "id", custom: expenseLocalId }];
export const listValidator = validator({
  query: [
    { key: "competence_from", custom: expenseCivilDate.optional() },
    { key: "competence_to", custom: expenseCivilDate.optional() },
    { key: "category", custom: z.enum(expenseCategories).optional() },
    { key: "status", custom: z.enum(["active", "voided", "all"]).optional() },
    { key: "search", custom: z.string().trim().max(120).optional() },
    { key: "page", custom: z.coerce.number().int().min(1).max(100000).optional() },
    { key: "limit", custom: z.coerce.number().int().min(1).max(100).optional() },
  ],
});
export const createValidator = validator({
  body: [
    ...body,
    { key: "paid_date", custom: fields.paid_date.optional() },
    { key: "request_key", custom: z.uuid({ version: "v4" }) },
  ],
});
export const correctValidator = validator({
  params,
  body: [
    ...body,
    { key: "paid_date", custom: fields.paid_date },
    { key: "expected_revision", custom: expenseRevision },
    { key: "reason", custom: expenseReason },
  ],
});
export const voidValidator = validator({
  params,
  body: [
    { key: "expected_revision", custom: expenseRevision },
    { key: "reason", custom: expenseReason },
  ],
});
