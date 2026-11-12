import type Stripe from "stripe";
import { STRIPE_CREDIT_COLLECTION_POLICY } from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  requireLocalReference,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export type StripeAuxiliarySetupScope = {
  setupIntentId: string;
  customerId: string;
  paymentMethodId: string;
  subscriptionId: string;
  localSubscriptionId: string;
  attemptId: string;
};
export type StripeAuxiliarySetupProof = StripeAuxiliarySetupScope &
  StripeIdentity & {
    metadataAbsent: true;
    status: "succeeded";
  };

/** Raw canonical metadata must be an empty object, never a failed metadata projection. */
export function projectStripeAuxiliarySetupProof(
  setup: Stripe.SetupIntent,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeAuxiliarySetupScope,
): StripeAuxiliarySetupProof {
  assertStripeMode(setup.livemode, identity);
  assertStripeMode(subscription.livemode, identity);
  if (
    setup.id !== requireStripeId(input.setupIntentId, "seti") ||
    setup.status !== "succeeded" ||
    setup.usage !== "off_session" ||
    stripeId(setup.customer, "cus") !== requireStripeId(input.customerId, "cus") ||
    stripeId(setup.payment_method, "pm") !== requireStripeId(input.paymentMethodId, "pm") ||
    !setup.metadata ||
    typeof setup.metadata !== "object" ||
    Array.isArray(setup.metadata) ||
    Object.keys(setup.metadata).length !== 0 ||
    subscription.id !== requireStripeId(input.subscriptionId, "sub") ||
    stripeId(subscription.customer, "cus") !== input.customerId ||
    subscription.metadata?.lectum_subscription_id !==
      requireLocalReference(input.localSubscriptionId) ||
    subscription.metadata?.lectum_attempt_id !== requireLocalReference(input.attemptId) ||
    subscription.metadata?.lectum_collection_policy !== STRIPE_CREDIT_COLLECTION_POLICY
  )
    throw new StripeGatewayError("resource_mismatch");
  // Historical closure must not require today's card/default, active period, or collection hold.
  return { ...identity, ...input, metadataAbsent: true, status: "succeeded" };
}

/** Exactly two resource GETs; no expansion, assignment, confirmation or financial projection. */
export async function readStripeAuxiliarySetupProof(
  client: Stripe,
  identity: StripeIdentity,
  input: StripeAuxiliarySetupScope,
) {
  const setup = await client.setupIntents.retrieve(requireStripeId(input.setupIntentId, "seti"));
  const subscription = await client.subscriptions.retrieve(
    requireStripeId(input.subscriptionId, "sub"),
  );
  return projectStripeAuxiliarySetupProof(setup, subscription, identity, input);
}
