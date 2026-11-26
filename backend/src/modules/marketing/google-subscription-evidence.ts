import { z } from "zod";
import prisma from "@/infra/database/prisma";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";

const evidenceSchema = z.object({
  version: z.literal(1),
  event_name: z.literal("Subscribe"),
  event_id: z.string().min(16),
  mode: z.literal("live"),
  account_id: z.string(),
  subscription_id: z.string(),
  invoice_payment_id: z.string(),
  invoice_id: z.string(),
  payment_intent_id: z.string(),
  source_event_id: z.string(),
  paid_at: z.iso.datetime(),
  amount_paid_cents: z.number().int().positive(),
  currency: z.literal("BRL"),
});
// Read-only, owner-scoped proof. The existing recorder verified complete payment history.
// No Meta consent is treated as permission to send anything to Google.
export async function googleSubscriptionEvidence(userId: string, operationId: string) {
  const operation = await prisma.billing_operation.findFirst({
    where: {
      id: operationId,
      user_id: userId,
      gateway: "stripe",
      mode: "live",
      kind: "checkout",
      intent: "subscription",
      intent_kind: "payment",
    },
  });
  if (!operation?.subscription_id) return null;
  const event = await prisma.payment_event.findUnique({
    where: {
      gateway_external_id: {
        gateway: "marketing_stripe_subscribe",
        external_id: operation.psychologist_id,
      },
    },
  });
  const parsed = evidenceSchema.safeParse(event?.payload);
  if (event?.type !== "Subscribe.verified" || !parsed.success) return null;
  const proof = parsed.data;
  if (
    proof.account_id !== operation.account_id ||
    proof.subscription_id !== operation.provider_subscription_id ||
    proof.payment_intent_id !== operation.provider_intent_id
  )
    return null;
  const receipt = await prisma.billing_financial_receipt.findFirst({
    where: {
      gateway: "stripe",
      mode: "live",
      account_id: operation.account_id,
      psychologist_id: operation.psychologist_id,
      subscription_id: operation.subscription_id,
      invoice_payment_id: proof.invoice_payment_id,
    },
  });
  if (
    receipt?.current_state !== "paid" ||
    receipt.refunded_cents !== 0 ||
    receipt.dispute_status !== "none" ||
    receipt.amount_paid_cents !== proof.amount_paid_cents ||
    receipt.currency !== proof.currency ||
    receipt.invoice_id !== proof.invoice_id ||
    receipt.payment_intent_id !== proof.payment_intent_id ||
    receipt.provider_subscription_id !== proof.subscription_id ||
    receipt.paid_at.toISOString() !== proof.paid_at ||
    storedFinancialReceiptHash(receipt) !== receipt.immutable_hash
  )
    return null;
  const webhook = await prisma.billing_gateway_event.findFirst({
    where: {
      gateway: "stripe",
      mode: "live",
      account_id: operation.account_id,
      external_id: proof.source_event_id,
      resource_id: proof.invoice_id,
      type: "invoice.paid",
      state: "complete",
    },
  });
  return webhook ? { event_id: proof.event_id, paid_at: proof.paid_at } : null;
}
