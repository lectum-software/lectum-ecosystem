import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import { hasAdvertisingConsent } from "./acquisition-policy";

type SandboxSourceRequest = {
  userId: string;
  accountId: string;
  invoiceId: string;
  consentRevision: number;
  documentVersion: string;
};

// Read-only test primitive. Caller must use the isolated local DB and pin the owner
// test account. Never imported by production delivery or accepted from an HTTP body.
export async function resolveSandboxSubscribeSource(
  tx: Prisma.TransactionClient,
  request: SandboxSourceRequest,
  now: Date,
) {
  if (!request.documentVersion || !Number.isFinite(now.getTime())) return null;
  const user = await tx.user.findFirst({
    where: { id: request.userId, role: "psicologo", active: true, deleted: false },
    select: { id: true },
  });
  if (!user) return null;
  const profile = await tx.psychologist_profile.findUnique({ where: { user_id: user.id } });
  if (!profile) return null;
  const scope = { gateway: "stripe", mode: "test", account_id: request.accountId };
  const contracts = await tx.professional_subscription.findMany({
    where: { psychologist_id: profile.id },
  });
  if (!contracts.length) return null;
  for (const contract of contracts) {
    if (
      contract.source !== "stripe" ||
      contract.gateway !== "stripe" ||
      contract.gateway_mode !== "test" ||
      contract.gateway_account_id !== request.accountId ||
      !contract.gateway_subscription_id
    )
      return null;
    const coverage = await tx.billing_financial_reconciliation.findUnique({
      where: {
        gateway_mode_account_id_subscription_id: { ...scope, subscription_id: contract.id },
      },
    });
    if (
      coverage?.state !== "complete" ||
      !coverage.receipts_complete ||
      coverage.requested_revision !== coverage.processed_revision ||
      !coverage.covered_from ||
      !coverage.covered_through ||
      coverage.provider_subscription_id !== contract.gateway_subscription_id
    )
      return null;
  }
  const receipt = await tx.billing_financial_receipt.findFirst({
    where: { ...scope, psychologist_id: profile.id, amount_paid_cents: { gt: 0 } },
    orderBy: [{ paid_at: "asc" }, { invoice_payment_id: "asc" }],
  });
  if (
    !receipt ||
    receipt.invoice_id !== request.invoiceId ||
    receipt.current_state !== "paid" ||
    receipt.currency !== "BRL" ||
    receipt.refunded_cents !== 0 ||
    receipt.dispute_status !== "none" ||
    receipt.paid_at > now ||
    now.getTime() - receipt.paid_at.getTime() > 7 * 86400000 ||
    storedFinancialReceiptHash(receipt) !== receipt.immutable_hash
  )
    return null;
  const contract = contracts.find((item) => item.id === receipt.subscription_id);
  if (
    !contract ||
    contract.granted_by ||
    contract.grant_reason ||
    !contract.contracted_amount_cents ||
    contract.contracted_amount_cents <= 0 ||
    contract.gateway_subscription_id !== receipt.provider_subscription_id
  )
    return null;
  const operation = await tx.billing_operation.findFirst({
    where: {
      ...scope,
      user_id: user.id,
      psychologist_id: profile.id,
      subscription_id: contract.id,
      kind: "checkout",
      intent: "subscription",
      intent_kind: "payment",
      provider_intent_id: receipt.payment_intent_id,
      provider_subscription_id: receipt.provider_subscription_id,
    },
  });
  const event = await tx.billing_gateway_event.findFirst({
    where: { ...scope, type: "invoice.paid", state: "complete", resource_id: receipt.invoice_id },
  });
  if (!operation || !event) return null;
  const stored = await tx.marketing_consent.findUnique({ where: { user_id: user.id } });
  if (
    !stored?.granted_at ||
    !stored.expires_at ||
    stored.revoked_at ||
    stored.revision !== request.consentRevision ||
    stored.document_version !== request.documentVersion
  )
    return null;
  const consent = {
    purpose: "meta_ads_measurement" as const,
    documentVersion: request.documentVersion,
    grantedAt: stored.granted_at.getTime(),
    expiresAt: stored.expires_at.getTime(),
    revokedAt: null,
  };
  if (
    !hasAdvertisingConsent(consent, receipt.paid_at.getTime()) ||
    !hasAdvertisingConsent(consent, now.getTime())
  )
    return null;
  // Stable test-only identity. No raw Stripe/account identifiers enter the payload.
  const eventId = createHash("sha256")
    .update(
      JSON.stringify([
        "lectum-owner-sandbox-subscribe-v1",
        request.accountId,
        receipt.invoice_payment_id,
      ]),
    )
    .digest("hex");
  return {
    operationId: operation.id,
    eventId,
    occurredAtMs: receipt.paid_at.getTime(),
    amountCents: receipt.amount_paid_cents,
    consent,
  };
}
