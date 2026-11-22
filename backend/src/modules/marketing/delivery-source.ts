import { z } from "zod";
import type { Prisma } from "@/external/generated/prisma/client";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import type { DeliveryJob } from "./delivery-jobs";
import { resolveGuestContactSource } from "./guest-contact";
import { isUserConversion, resolveUserActionSource } from "./user-events";

const subscriptionEvidence = z.object({
  version: z.literal(1),
  event_name: z.literal("Subscribe"),
  event_id: z.string(),
  acquisition_user_id: z.string(),
  consent_revision: z.number().int().positive(),
  account_id: z.string(),
  mode: z.literal("live"),
  source_event_id: z.string(),
  subscription_id: z.string(),
  invoice_id: z.string(),
  invoice_payment_id: z.string(),
  payment_intent_id: z.string(),
  amount_paid_cents: z.number().int().positive(),
  currency: z.literal("BRL"),
  paid_at: z.string().datetime(),
  attribution_status: z.literal("consented_reference"),
});

// Re-read canonical business facts. Never infer a payment from a redirect or the job itself.
export async function resolveDeliverySource(
  tx: Prisma.TransactionClient,
  job: Pick<
    DeliveryJob,
    "user_id" | "consent_revision" | "conversion" | "source_ref" | "event_id" | "occurred_at"
  > & { guest_token_hash?: string | null },
): Promise<{
  occurredAt: Date;
  amountCents?: number;
  operationId?: string;
  accountId?: string;
} | null> {
  if (job.guest_token_hash) return resolveGuestContactSource(tx, job);
  if (!job.user_id || !job.consent_revision) return null;
  if (isUserConversion(job.conversion)) {
    const source = await resolveUserActionSource(tx, job.conversion, job.source_ref, job.user_id);
    return source?.occurredAt.getTime() === job.occurred_at.getTime() ? source : null;
  }
  const user = await tx.user.findFirst({
    where: { id: job.user_id, role: "psicologo", active: true, deleted: false },
    select: { id: true, createdAt: true },
  });
  if (!user) return null;
  if (job.conversion === "professional_registration") {
    return job.source_ref === user.id && job.occurred_at.getTime() === user.createdAt.getTime()
      ? { occurredAt: user.createdAt }
      : null;
  }
  if (job.conversion === "professional_checkout") {
    const operation = await tx.billing_operation.findFirst({
      where: {
        id: job.source_ref,
        user_id: user.id,
        gateway: "stripe",
        mode: "live",
        kind: "checkout",
        intent: "subscription",
        state: { in: ["requires_confirmation", "processing", "complete"] },
        OR: [{ provider_intent_id: { not: null } }, { provider_setup_intent_id: { not: null } }],
      },
    });
    return operation && operation.created_at.getTime() === job.occurred_at.getTime()
      ? { occurredAt: operation.created_at }
      : null;
  }
  if (job.conversion !== "professional_subscription") return null;
  const event = await tx.payment_event.findFirst({
    where: { id: job.source_ref, gateway: "marketing_stripe_subscribe", type: "Subscribe.blocked" },
  });
  const parsed = subscriptionEvidence.safeParse(event?.payload);
  if (!event || !parsed.success) return null;
  const source = parsed.data;
  if (
    source.event_id !== job.event_id ||
    source.acquisition_user_id !== user.id ||
    source.consent_revision !== job.consent_revision ||
    new Date(source.paid_at).getTime() !== job.occurred_at.getTime()
  )
    return null;
  const scope = { gateway: "stripe", mode: "live", account_id: source.account_id };
  const receipt = await tx.billing_financial_receipt.findFirst({
    where: { ...scope, invoice_payment_id: source.invoice_payment_id },
  });
  if (
    !receipt ||
    receipt.psychologist_id !== event.external_id ||
    receipt.provider_subscription_id !== source.subscription_id ||
    receipt.invoice_id !== source.invoice_id ||
    receipt.payment_intent_id !== source.payment_intent_id ||
    receipt.amount_paid_cents !== source.amount_paid_cents ||
    receipt.currency !== "BRL" ||
    receipt.paid_at.getTime() !== job.occurred_at.getTime() ||
    receipt.current_state !== "paid" ||
    receipt.refunded_cents !== 0 ||
    receipt.dispute_status !== "none" ||
    storedFinancialReceiptHash(receipt) !== receipt.immutable_hash
  )
    return null;
  const operation = await tx.billing_operation.findFirst({
    where: {
      ...scope,
      user_id: user.id,
      psychologist_id: receipt.psychologist_id,
      subscription_id: receipt.subscription_id,
      kind: "checkout",
      intent: "subscription",
      intent_kind: "payment",
      provider_intent_id: receipt.payment_intent_id,
      provider_subscription_id: receipt.provider_subscription_id,
    },
  });
  const webhook = await tx.billing_gateway_event.findFirst({
    where: {
      ...scope,
      external_id: source.source_event_id,
      resource_id: receipt.invoice_id,
      type: "invoice.paid",
      state: "complete",
    },
  });
  if (!operation || !webhook) return null;
  return {
    occurredAt: receipt.paid_at,
    amountCents: receipt.amount_paid_cents,
    operationId: operation.id,
    accountId: source.account_id,
  };
}
