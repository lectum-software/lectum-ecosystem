import { createHash } from "node:crypto";
import { z } from "zod";
import cpf from "@/packages/validator/schema/_internal/validations/functions/cpf";
import { invoiceBillingAddressSchema } from "./billing-address";
import { InvoiceError, type InvoiceMode } from "./config";

export const providerId = z
  .union([z.string().min(1).max(100), z.number().int().positive()])
  .transform(String)
  .pipe(z.string().regex(/^[A-Za-z0-9_-]+$/));

export const invoiceRequestSchema = z.object({
  company_id: providerId,
  reference: z.string().min(1).max(100),
  iss_rate: z.number().int().min(0).max(500).optional(),
  taker: z.object({
    document: z
      .string()
      .trim()
      .regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/)
      .transform((value) =>
        value.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4"),
      )
      .pipe(cpf({ key: "document" })),
    name: z.string().trim().min(3).max(150),
    email: z.email().max(254),
    // Optional for reading historical snapshots; new invoices require it in the worker.
    address: z
      .object({
        zip: z.string().regex(/^\d{8}$/),
        street: z.string().trim().min(1).max(250).optional(),
        number: z.string().trim().min(1).max(30).optional(),
        complement: z.string().trim().max(250).optional(),
        neighborhood: z.string().trim().min(1).max(150).optional(),
        ibge_city_code: z
          .string()
          .regex(/^\d{7}$/)
          .optional(),
      })
      .optional(),
  }),
  items: z
    .array(
      z.object({
        description: z.string().min(10).max(500),
        unit_amount: z.number().int().positive().max(100_000_000),
      }),
    )
    .length(1),
});
export type InvoiceRequest = z.infer<typeof invoiceRequestSchema>;
export const storedInvoiceSchema = invoiceRequestSchema.extend({
  billing_address: invoiceBillingAddressSchema.optional(),
  fiscal_service_code: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

export const documentSchema = z.object({
  id: providerId,
  object: z.literal("nfse"),
  mode: z.enum(["test", "live"]),
  reference: z.string(),
  total: z.number().int().nonnegative(),
  status: z.enum([
    "pending",
    "processing",
    "authorized",
    "rejected",
    "blocked",
    "failed",
    "cancel_requested",
    "cancelled",
  ]),
  nfse_number: z
    .union([z.string().max(100), z.number()])
    .nullable()
    .optional()
    .transform((v) => (v == null ? null : String(v))),
  company_id: providerId.optional(),
  authorized_at: z.string().nullable().optional(),
});
export type InvoiceDocument = z.infer<typeof documentSchema>;

export const invoiceReference = (
  companyId: string,
  paymentId: string,
  mode: InvoiceMode = "test",
) =>
  `lectum-${mode}-${createHash("sha256").update(`${companyId}:mercadopago:${paymentId}`).digest("hex").slice(0, 48)}`;

export function assertDocumentMatches(
  document: InvoiceDocument,
  request: InvoiceRequest,
  mode: InvoiceMode = "test",
) {
  if (
    document.mode !== mode ||
    document.reference !== request.reference ||
    document.total !== request.items[0].unit_amount ||
    (document.company_id && document.company_id !== request.company_id) ||
    (mode === "live" && document.company_id !== request.company_id)
  ) {
    throw new InvoiceError("document_mismatch");
  }
}

export function parseProvider<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new InvoiceError("provider_contract_invalid");
  return parsed.data;
}
