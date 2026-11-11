import { isAxiosError } from "axios";
import { z } from "zod";
import type {
  AdminExpense,
  ExpenseCategory,
  ExpenseCreation,
  ExpenseInput,
  ExpenseQuery,
} from "@/api/req/finance/expenses";

export const expenseCategories = [
  "infrastructure",
  "software",
  "accounting",
  "marketing",
  "people",
  "taxes",
  "other",
] as const;
export const categoryLabel: Record<ExpenseCategory, string> = {
  infrastructure: "Infraestrutura",
  software: "Software",
  accounting: "Contabilidade",
  marketing: "Marketing",
  people: "Pessoas",
  taxes: "Tributos",
  other: "Outros",
};
export const parseExpenseAmount = (value: string) => {
  if (!/^\d{1,6}(?:[,.]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(/[,.]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 1 && cents <= 99_999_999 ? cents : null;
};
export const isExpenseCivilDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
export const expenseToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
export const formatExpenseDate = (value: string | null) => {
  if (!value) return "Não informado";
  if (!isExpenseCivilDate(value)) return "Data indisponível";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};
const expenseText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .max(max * 2, `Use de ${min} a ${max} caracteres.`)
    .refine((value) => {
      const characters = [...value];
      return (
        characters.length >= min &&
        characters.length <= max &&
        characters.every((character) => {
          const code = character.codePointAt(0) ?? -1;
          return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;
        })
      );
    }, `Use de ${min} a ${max} caracteres.`);
export const expenseReasonSchema = expenseText(8, 240);
export const expenseDescriptionSchema = expenseText(3, 140);
export const expenseFormSchema = (correcting: boolean) =>
  z.object({
    amount: z
      .string()
      .refine((value) => parseExpenseAmount(value) !== null, "Use de 0,01 a 999999,99."),
    competence_date: z.string().refine(isExpenseCivilDate, "Informe uma data válida."),
    paid_date: z
      .string()
      .refine((value) => !value || isExpenseCivilDate(value), "Informe uma data válida.")
      .refine((value) => !value || value <= expenseToday(), "Pagamento não pode ser futuro."),
    category: z.enum(expenseCategories, { error: "Selecione uma categoria." }),
    description: expenseDescriptionSchema,
    reason: correcting ? expenseReasonSchema : z.string(),
  });
export type ExpenseFormValues = z.infer<ReturnType<typeof expenseFormSchema>>;
export const expenseFormDefaults = (item?: AdminExpense): ExpenseFormValues => ({
  amount: item
    ? `${Math.floor(item.amount_cents / 100)},${String(item.amount_cents % 100).padStart(2, "0")}`
    : "",
  competence_date: item?.competence_date ?? "",
  paid_date: item?.paid_date ?? "",
  category: item?.category ?? "infrastructure",
  description: item?.description ?? "",
  reason: "",
});
export const expenseFormInput = (values: ExpenseFormValues): ExpenseInput => {
  const cents = parseExpenseAmount(values.amount);
  if (cents === null) throw new Error("EXPENSE_FORM_INVALID");
  return {
    amount_cents: cents,
    competence_date: values.competence_date,
    paid_date: values.paid_date || null,
    category: values.category,
    description: values.description.trim(),
  };
};
const creationSchema = z.object({
  request_key: z.uuid({ version: "v4" }),
  amount_cents: z.number().int().min(1).max(99_999_999),
  competence_date: z.string().refine(isExpenseCivilDate),
  paid_date: z.string().refine(isExpenseCivilDate).nullable(),
  category: z.enum(expenseCategories),
  description: expenseDescriptionSchema,
});
export const readExpenseCreation = (
  raw: string | null,
): { ready: boolean; request: ExpenseCreation | null } => {
  if (raw === null) return { ready: true, request: null };
  try {
    const parsed = creationSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ready: true, request: parsed.data } : { ready: false, request: null };
  } catch {
    return { ready: false, request: null };
  }
};
export const expenseStorageKey = (actorId: string | null | undefined) =>
  actorId && /^[A-Za-z0-9_-]{1,128}$/.test(actorId)
    ? `lectum:admin-expense-request:${actorId}`
    : null;
/** Expense POST 400 with this envelope is contractually rejected before any write. */
export const expenseCreationWasRejected = (cause: unknown) =>
  Boolean(
    isAxiosError(cause) &&
      cause.response?.status === 400 &&
      cause.response.data &&
      typeof cause.response.data === "object" &&
      cause.response.data.success === false,
  );
export const resolveExpenseQuery = (params: URLSearchParams) => {
  const schema = z.object({
    competence_from: z.string().refine(isExpenseCivilDate).optional(),
    competence_to: z.string().refine(isExpenseCivilDate).optional(),
    category: z.enum(expenseCategories).optional(),
    status: z.enum(["active", "voided", "all"]).default("active"),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });
  const raw = Object.fromEntries(
    [...params.entries()].filter(([key]) =>
      [
        "competence_from",
        "competence_to",
        "category",
        "status",
        "search",
        "page",
        "limit",
      ].includes(key),
    ),
  );
  const parsed = schema.safeParse(raw);
  const query: ExpenseQuery = parsed.success ? parsed.data : {};
  const valid =
    parsed.success &&
    !(query.competence_from && query.competence_to && query.competence_from > query.competence_to);
  return { query, valid };
};
