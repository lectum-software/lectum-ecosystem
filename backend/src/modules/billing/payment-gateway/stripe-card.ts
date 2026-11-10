import type Stripe from "stripe";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  projectStripeSetup,
  requireLocalReference,
  requireStripeClientSecret,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeCardDisplay, StripeCardSetupInput, StripeIdentity } from "./stripe-types";

export type StripeSubscriptionCardInput = {
  subscriptionId: string;
  localSubscriptionId: string;
  customerId: string;
};
export type StripeSubscriptionSetupInput = StripeSubscriptionCardInput & {
  attemptId: string;
  /** Persisted from the subscription's pending_setup_intent, never supplied by the browser. */
  setupIntentId: string;
};

/** Assignment policy only. This does not prevent a charge confirmed through another path. */
export const assertStripeCreditFunding = (funding: unknown) => {
  if (funding !== "credit") throw new StripeGatewayError("card_credit_required", 400);
};

export const assertStripeSubscriptionCardScope = (
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeSubscriptionCardInput,
) => {
  assertStripeMode(subscription.livemode, identity);
  if (
    subscription.id !== requireStripeId(input.subscriptionId, "sub") ||
    stripeId(subscription.customer, "cus") !== requireStripeId(input.customerId, "cus") ||
    subscription.metadata.lectum_subscription_id !==
      requireLocalReference(input.localSubscriptionId)
  )
    throw new StripeGatewayError("resource_mismatch");
};

export const readStripeCard = async (
  client: Stripe,
  identity: StripeIdentity,
  paymentMethodId: string,
  customerId: string,
  options: { requireCredit?: boolean } = {},
): Promise<StripeCardDisplay> => {
  const expected = requireStripeId(paymentMethodId, "pm");
  const method = await client.paymentMethods.retrieve(expected);
  assertStripeMode(method.livemode, identity);
  if (
    method.id !== expected ||
    method.type !== "card" ||
    !method.card ||
    stripeId(method.customer, "cus") !== requireStripeId(customerId, "cus")
  )
    throw new StripeGatewayError("resource_mismatch");
  if (options.requireCredit) assertStripeCreditFunding(method.card.funding);
  return {
    paymentMethodId: method.id,
    brand: method.card.brand,
    last4: method.card.last4,
    expMonth: method.card.exp_month,
    expYear: method.card.exp_year,
  };
};

export const createStripeCardSetup = async (
  client: Stripe,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeCardSetupInput,
  idempotencyKey: string,
) => {
  const attemptId = requireLocalReference(input.attemptId);
  const customerId = requireStripeId(input.customerId, "cus");
  assertStripeMode(subscription.livemode, identity);
  if (
    subscription.id !== requireStripeId(input.subscriptionId, "sub") ||
    stripeId(subscription.customer, "cus") !== customerId ||
    ["canceled", "incomplete_expired"].includes(subscription.status)
  )
    throw new StripeGatewayError("resource_mismatch");
  const setup = await client.setupIntents.create(
    {
      customer: customerId,
      usage: "off_session",
      allowed_payment_method_types: ["card"],
      metadata: {
        lectum_attempt_id: attemptId,
        lectum_gateway_subscription_id: subscription.id,
        lectum_subscription_id: requireLocalReference(subscription.metadata.lectum_subscription_id),
      },
    },
    { idempotencyKey },
  );
  assertStripeMode(setup.livemode, identity);
  if (!setup.client_secret || stripeId(setup.customer, "cus") !== customerId)
    throw new StripeGatewayError("contract_invalid");
  const setupIntentId = requireStripeId(setup.id, "seti");
  return {
    setupIntentId,
    clientSecret: requireStripeClientSecret(setup.client_secret, setupIntentId),
  };
};

const setSubscriptionDefault = async (
  client: Stripe,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  card: StripeCardDisplay,
  idempotencyKey: string,
) => {
  const updated = await client.subscriptions.update(
    subscription.id,
    { default_payment_method: card.paymentMethodId },
    { idempotencyKey },
  );
  assertStripeMode(updated.livemode, identity);
  if (
    updated.id !== subscription.id ||
    stripeId(updated.customer, "cus") !== stripeId(subscription.customer, "cus") ||
    stripeId(updated.default_payment_method, "pm") !== card.paymentMethodId
  )
    throw new StripeGatewayError("resource_mismatch");
  return card;
};

export const confirmStripeCard = async (
  client: Stripe,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeCardSetupInput & { setupIntentId: string },
  idempotencyKey: string,
) => {
  const setup = projectStripeSetup(
    await client.setupIntents.retrieve(requireStripeId(input.setupIntentId, "seti")),
    identity,
  );
  if (setup.status !== "succeeded") throw new StripeGatewayError("setup_not_completed");
  if (
    setup.setupIntentId !== input.setupIntentId ||
    setup.attemptId !== requireLocalReference(input.attemptId) ||
    setup.customerId !== input.customerId ||
    setup.subscriptionId !== input.subscriptionId ||
    !setup.localSubscriptionId ||
    ["canceled", "incomplete_expired"].includes(subscription.status)
  )
    throw new StripeGatewayError("resource_mismatch");
  assertStripeSubscriptionCardScope(subscription, identity, {
    ...input,
    localSubscriptionId: setup.localSubscriptionId,
  });
  const card = await readStripeCard(
    client,
    identity,
    requireStripeId(setup.paymentMethodId, "pm"),
    setup.customerId,
    { requireCredit: true },
  );
  return setSubscriptionDefault(client, subscription, identity, card, idempotencyKey);
};

export const assertStripeSubscriptionSetup = (
  subscription: Stripe.Subscription,
  setup: Stripe.SetupIntent,
  identity: StripeIdentity,
  input: StripeSubscriptionSetupInput,
) => {
  assertStripeSubscriptionCardScope(subscription, identity, input);
  assertStripeMode(setup.livemode, identity);
  if (setup.status !== "succeeded") throw new StripeGatewayError("setup_not_completed");
  if (
    subscription.status !== "trialing" ||
    subscription.cancel_at_period_end ||
    subscription.metadata.lectum_attempt_id !== requireLocalReference(input.attemptId) ||
    setup.id !== requireStripeId(input.setupIntentId, "seti") ||
    stripeId(setup.customer, "cus") !== input.customerId ||
    setup.usage !== "off_session" ||
    (subscription.pending_setup_intent !== null &&
      stripeId(subscription.pending_setup_intent, "seti") !== setup.id) ||
    (subscription.default_payment_method !== null &&
      stripeId(subscription.default_payment_method, "pm") !== stripeId(setup.payment_method, "pm"))
  )
    throw new StripeGatewayError("resource_mismatch");
  return requireStripeId(setup.payment_method, "pm");
};

export const applyStripeSubscriptionSetup = async (
  client: Stripe,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeSubscriptionSetupInput,
  idempotencyKey: string,
) => {
  const setup = await client.setupIntents.retrieve(requireStripeId(input.setupIntentId, "seti"));
  const methodId = assertStripeSubscriptionSetup(subscription, setup, identity, input);
  const card = await readStripeCard(client, identity, methodId, input.customerId, {
    requireCredit: true,
  });
  if (stripeId(subscription.default_payment_method, "pm") === card.paymentMethodId) return card;
  return setSubscriptionDefault(client, subscription, identity, card, idempotencyKey);
};

export const readStripeSubscriptionCard = async (
  client: Stripe,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: StripeSubscriptionCardInput,
) => {
  assertStripeSubscriptionCardScope(subscription, identity, input);
  const methodId = stripeId(subscription.default_payment_method, "pm");
  return methodId ? readStripeCard(client, identity, methodId, input.customerId) : null;
};
