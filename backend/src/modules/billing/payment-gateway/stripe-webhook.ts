import type Stripe from "stripe";
import { STRIPE_API_VERSION } from "./stripe-config";
import { StripeGatewayError } from "./stripe-error";
import { projectStripeCreditCardRequestHash } from "./stripe-idempotency";
import {
  assertStripeMode,
  requireStripeDisputeId,
  requireStripeId,
  stripeDate,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity, StripeWebhookReference } from "./stripe-types";

const resourcePrefixes: Record<string, string> = {
  "customer.subscription.created": "sub",
  "customer.subscription.updated": "sub",
  "customer.subscription.deleted": "sub",
  "invoice.paid": "in",
  "invoice.payment_succeeded": "in",
  "invoice.payment_failed": "in",
  "invoice.payment_action_required": "in",
  "invoice.voided": "in",
  "invoice.marked_uncollectible": "in",
  "setup_intent.succeeded": "seti",
  "setup_intent.setup_failed": "seti",
  "setup_intent.canceled": "seti",
  "charge.refunded": "ch",
  "charge.dispute.created": "dp",
  "charge.dispute.updated": "dp",
  "charge.dispute.closed": "dp",
};

export const projectStripeWebhook = (
  event: Stripe.Event,
  identity: StripeIdentity,
): StripeWebhookReference | null => {
  assertStripeMode(event.livemode, identity);
  if (
    event.api_version !== STRIPE_API_VERSION ||
    (event.account && event.account !== identity.accountId)
  ) {
    throw new StripeGatewayError("resource_mismatch");
  }
  const prefix = Object.hasOwn(resourcePrefixes, event.type) ? resourcePrefixes[event.type] : null;
  if (!prefix) return null;
  const created = stripeDate(event.created);
  if (!created) throw new StripeGatewayError("contract_invalid");
  const object = event.data.object;
  if (prefix === "dp" && object.object !== "dispute")
    throw new StripeGatewayError("resource_mismatch");
  const resourceId =
    prefix === "dp"
      ? requireStripeDisputeId("id" in object ? object.id : undefined)
      : requireStripeId("id" in object ? object.id : undefined, prefix);
  let subscriptionId: string | null = prefix === "sub" ? resourceId : null;
  if (object.object === "invoice")
    subscriptionId = stripeId(object.parent?.subscription_details?.subscription, "sub");
  if (object.object === "setup_intent")
    subscriptionId = stripeId(object.metadata?.lectum_gateway_subscription_id, "sub");
  return {
    ...identity,
    eventId: requireStripeId(event.id, "evt"),
    type: event.type,
    apiVersion: STRIPE_API_VERSION,
    created,
    resourceId,
    subscriptionId,
    requestKeyHash: projectStripeCreditCardRequestHash(event.request?.idempotency_key),
  };
};
