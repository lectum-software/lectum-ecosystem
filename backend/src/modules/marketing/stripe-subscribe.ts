import { randomBytes } from "node:crypto";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { MARKETING_CONSENT_POLICY } from "./consent-policy";
import { consentedAcquisition } from "./consent-repository";
import { enqueueMetaDeliveryInTransaction } from "./delivery-jobs";
import { firstPaidSubscriptionCandidate } from "./first-paid-subscription";
import { subscriptionCheckoutConsent } from "./subscription-consent";
import { SUBSCRIBE_ACTIVATION_TIME } from "./subscription-policy";

// Internal evidence only. This namespace is not consumed by either payment gateway.
export const SUBSCRIBE_RECORD_GATEWAY = "marketing_stripe_subscribe";

export async function recordStripeSubscribe(
  subscriptionId: string,
  identity: StripeIdentity,
  sourceEventId?: string,
  acquisitionPolicy = MARKETING_CONSENT_POLICY,
) {
  if (identity.mode !== "live") return "excluded";
  return withSerializableTransaction(async (tx) => {
    const subscription = await tx.professional_subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (
      subscription?.source !== "stripe" ||
      subscription.gateway !== "stripe" ||
      subscription.gateway_mode !== identity.mode ||
      subscription.gateway_account_id !== identity.accountId ||
      subscription.granted_by ||
      subscription.grant_reason ||
      !subscription.gateway_subscription_id
    )
      return "excluded";
    const key = { gateway: SUBSCRIBE_RECORD_GATEWAY, external_id: subscription.psychologist_id };
    if (await tx.payment_event.findUnique({ where: { gateway_external_id: key } }))
      return "duplicate";

    // Include cancelled/deleted contracts. Missing or legacy history is not proof of acquisition.
    const history = await tx.professional_subscription.findMany({
      where: { psychologist_id: subscription.psychologist_id },
      include: { plan: true },
    });
    for (const contract of history) {
      // A canonical free signup has no financial history to reconcile. Unknown/legacy contracts still block.
      if (
        contract.source === "free_signup" &&
        contract.plan.slug === "gratuito" &&
        contract.plan.price_cents === 0 &&
        !contract.contracted_amount_cents &&
        !contract.gateway &&
        !contract.gateway_subscription_id &&
        !contract.gateway_mode &&
        !contract.gateway_account_id &&
        !contract.granted_by &&
        !contract.grant_reason &&
        !(await tx.billing_financial_receipt.count({ where: { subscription_id: contract.id } }))
      )
        continue;
      if (
        contract.source !== "stripe" ||
        contract.gateway !== "stripe" ||
        contract.gateway_mode !== identity.mode ||
        contract.gateway_account_id !== identity.accountId ||
        !contract.gateway_subscription_id
      )
        return "history_unverified";
      const coverage = await tx.billing_financial_reconciliation.findUnique({
        where: {
          gateway_mode_account_id_subscription_id: {
            gateway: "stripe",
            mode: identity.mode,
            account_id: identity.accountId,
            subscription_id: contract.id,
          },
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
        return "history_unverified";
    }
    const scope = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
    const sourceEvent = sourceEventId
      ? await tx.billing_gateway_event.findFirst({
          where: { ...scope, id: sourceEventId, type: "invoice.paid", state: "complete" },
        })
      : null;
    if (sourceEventId && !sourceEvent) return "awaiting_verified_event";
    const receipt = await tx.billing_financial_receipt.findFirst({
      where: {
        ...scope,
        psychologist_id: subscription.psychologist_id,
        amount_paid_cents: { gt: 0 },
      },
      orderBy: [{ paid_at: "asc" }, { invoice_payment_id: "asc" }],
    });
    if (
      !receipt ||
      receipt.subscription_id !== subscription.id ||
      receipt.provider_subscription_id !== subscription.gateway_subscription_id ||
      receipt.current_state !== "paid" ||
      receipt.dispute_status !== "none" ||
      storedFinancialReceiptHash(receipt) !== receipt.immutable_hash
    )
      return "excluded";
    if (sourceEvent && sourceEvent.resource_id !== receipt.invoice_id) return "excluded";
    // The original checkout PI is pinned by the existing subscription_create proof.
    const operation = await tx.billing_operation.findFirst({
      where: {
        ...scope,
        subscription_id: subscription.id,
        psychologist_id: subscription.psychologist_id,
        kind: "checkout",
        intent: "subscription",
        intent_kind: "payment",
        provider_subscription_id: receipt.provider_subscription_id,
        provider_intent_id: receipt.payment_intent_id,
      },
    });
    if (!operation) return "awaiting_verified_event";
    const event = await tx.billing_gateway_event.findFirst({
      where: {
        ...scope,
        type: "invoice.paid",
        resource_id: receipt.invoice_id,
        state: "complete",
        ...(sourceEventId ? { id: sourceEventId } : {}),
      },
      orderBy: [{ gateway_created_at: "asc" }, { external_id: "asc" }],
    });
    if (!event) return "awaiting_verified_event";
    const candidate = firstPaidSubscriptionCandidate({
      webhookSignatureVerified: true,
      eventType: event.type,
      completeHistoryVerified: true,
      alreadyRecorded: false,
      firstEverPaidPaymentId: receipt.invoice_payment_id,
      localSubscription: {
        id: subscription.id,
        gateway: "stripe",
        gatewaySubscriptionId: receipt.provider_subscription_id,
        complimentary: false,
        free: !subscription.contracted_amount_cents || subscription.contracted_amount_cents <= 0,
      },
      payment: {
        paymentId: receipt.invoice_payment_id,
        subscriptionId: receipt.provider_subscription_id,
        externalReference: receipt.subscription_id,
        amountCents: receipt.amount_paid_cents,
        refundedCents: receipt.refunded_cents,
        currency: receipt.currency,
        status: receipt.current_state,
        liveMode: true,
        paidAt: receipt.paid_at,
      },
    });
    if (!candidate) return "excluded";
    const checkoutConsent = await subscriptionCheckoutConsent(
      tx,
      operation.user_id,
      operation.id,
      candidate.paidAt,
    );
    const acquisition =
      checkoutConsent ??
      (await consentedAcquisition(
        tx,
        operation.user_id,
        candidate.paidAt,
        new Date(),
        acquisitionPolicy,
      ));
    // Historical receipts remain internal; only new verified payments can be delivered.
    const approvedPayment = candidate.paidAt >= SUBSCRIBE_ACTIVATION_TIME;
    const eventId = randomBytes(32).toString("hex");
    const stored = await tx.payment_event.upsert({
      where: { gateway_external_id: key },
      update: {},
      create: {
        ...key,
        type: approvedPayment ? "Subscribe.verified" : "Subscribe.blocked",
        payload: {
          version: 1,
          event_name: candidate.eventName,
          event_id: eventId,
          source_event_id: event.external_id,
          account_id: identity.accountId,
          mode: identity.mode,
          subscription_id: receipt.provider_subscription_id,
          invoice_id: receipt.invoice_id,
          invoice_payment_id: receipt.invoice_payment_id,
          payment_intent_id: receipt.payment_intent_id,
          amount_paid_cents: candidate.amountCents,
          currency: candidate.currency,
          paid_at: candidate.paidAt.toISOString(),
          transmission: approvedPayment ? "consent_required" : "blocked_compliance",
          // No raw campaign snapshot: revocation must invalidate future resolution.
          ...(acquisition
            ? { acquisition_user_id: operation.user_id, consent_revision: acquisition.revision }
            : {}),
          attribution_status: acquisition ? "consented_reference" : "not_eligible",
        },
      },
    });
    if (acquisition && approvedPayment)
      await enqueueMetaDeliveryInTransaction(tx, {
        conversion: "professional_subscription",
        eventId,
        sourceRef: stored.id,
        occurredAt: candidate.paidAt,
        userId: operation.user_id,
        consentRevision: acquisition.revision,
      });
    return approvedPayment ? "recorded" : "recorded_blocked";
  });
}
