import type Stripe from "stripe";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  invoiceSubscriptionId,
  requireStripeDisputeId,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity, StripeWebhookReference } from "./stripe-types";

export const resolveStripeWebhookSubscription = async (
  client: Stripe,
  identity: StripeIdentity,
  reference: StripeWebhookReference,
): Promise<string | null> => {
  if (reference.accountId !== identity.accountId || reference.mode !== identity.mode)
    throw new StripeGatewayError("resource_mismatch");
  if (reference.subscriptionId) return requireStripeId(reference.subscriptionId, "sub");
  if (!reference.type.startsWith("charge.")) return null;
  let chargeId: string;
  if (reference.type.startsWith("charge.dispute.")) {
    const expected = requireStripeDisputeId(reference.resourceId);
    const dispute = await client.disputes.retrieve(expected);
    assertStripeMode(dispute.livemode, identity);
    if (dispute.id !== expected) throw new StripeGatewayError("resource_mismatch");
    chargeId = requireStripeId(dispute.charge, "ch");
  } else {
    if (reference.type !== "charge.refunded") throw new StripeGatewayError("operation_unsupported");
    chargeId = requireStripeId(reference.resourceId, "ch");
  }
  const charge = await client.charges.retrieve(chargeId);
  assertStripeMode(charge.livemode, identity);
  if (charge.id !== chargeId) throw new StripeGatewayError("resource_mismatch");
  const intentId = requireStripeId(charge.payment_intent, "pi");
  const payments = await client.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: intentId },
    status: "paid",
    limit: 2,
  });
  if (payments.has_more || payments.data.length !== 1)
    throw new StripeGatewayError("resource_mismatch");
  const allocated = payments.data[0];
  assertStripeMode(allocated.livemode, identity);
  if (stripeId(allocated.payment.payment_intent, "pi") !== intentId)
    throw new StripeGatewayError("resource_mismatch");
  const invoiceId = requireStripeId(allocated.invoice, "in");
  const invoice = await client.invoices.retrieve(invoiceId);
  assertStripeMode(invoice.livemode, identity);
  if (
    invoice.id !== invoiceId ||
    requireStripeId(invoice.customer, "cus") !== requireStripeId(charge.customer, "cus")
  )
    throw new StripeGatewayError("resource_mismatch");
  return invoiceSubscriptionId(invoice);
};
