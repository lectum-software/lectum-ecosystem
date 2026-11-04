import { z } from "zod";
import type { GatewayInvoicePayment } from "./PaymentGateway";

const id = z
  .union([z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), z.number().int().positive()])
  .transform(String);
const money = z
  .union([z.number().finite(), z.string().regex(/^\d+(\.\d{1,2})?$/)])
  .transform(Number)
  .refine(
    (value) =>
      value >= 0 && value < 1_000_000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  )
  .transform((value) => Math.round(value * 100));
const authorizedSchema = z.object({
  id,
  preapproval_id: id,
  external_reference: z.union([z.string(), z.number()]).nullable().optional(),
  payment: z.object({ id }),
});
const paymentSchema = z.object({
  id,
  transaction_amount: money,
  transaction_amount_refunded: money,
  currency_id: z.string(),
  status: z.string(),
  live_mode: z.boolean(),
  date_approved: z.string().nullable(),
});

export function resolveAuthorizedPayment(raw: unknown, resourceType: string, resourceId: string) {
  const parsed =
    resourceType === "payment"
      ? z.object({ results: z.array(authorizedSchema) }).safeParse(raw)
      : authorizedSchema.safeParse(raw);
  if (!parsed.success) throw new Error("MERCADO_PAGO_INVOICE_CONTRACT_INVALID");
  const candidates = "results" in parsed.data ? parsed.data.results : [parsed.data];
  const matches = candidates.filter((row) =>
    resourceType === "payment" ? row.payment.id === resourceId : row.id === resourceId,
  );
  if (matches.length !== 1) throw new Error("MERCADO_PAGO_INVOICE_MAPPING_UNRESOLVED");
  return matches[0];
}

export function parseInvoicePayment(
  authorized: ReturnType<typeof resolveAuthorizedPayment>,
  raw: unknown,
): GatewayInvoicePayment {
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id !== authorized.payment.id)
    throw new Error("MERCADO_PAGO_PAYMENT_CONTRACT_INVALID");
  const payment = parsed.data;
  const paidAt = payment.date_approved ? new Date(payment.date_approved) : null;
  if (paidAt && !Number.isFinite(paidAt.getTime()))
    throw new Error("MERCADO_PAGO_PAYMENT_DATE_INVALID");
  return {
    paymentId: payment.id,
    subscriptionId: authorized.preapproval_id,
    externalReference:
      authorized.external_reference == null ? null : String(authorized.external_reference),
    amountCents: payment.transaction_amount,
    refundedCents: payment.transaction_amount_refunded,
    currency: payment.currency_id,
    status: payment.status,
    liveMode: payment.live_mode,
    paidAt,
  };
}
