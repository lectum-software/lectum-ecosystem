import type Stripe from "stripe";
import { assertStripeSubscriptionCardScope, readStripeCard } from "./stripe-card";
import {
  type CreditCheckoutSetupInput,
  type CreditSubscriptionScope,
  STRIPE_CREDIT_COLLECTION_POLICY,
} from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  parseStripePlan,
  projectStripeSetup,
  requireLocalReference,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeEmbeddedInput, StripeIdentity } from "./stripe-types";

export const assertCreditCheckoutSetup = (
  setup: Stripe.SetupIntent,
  identity: StripeIdentity,
  input: CreditCheckoutSetupInput,
) => {
  const projected = projectStripeSetup(setup, identity);
  if (
    projected.customerId !== requireStripeId(input.customerId, "cus") ||
    projected.attemptId !== requireLocalReference(input.attemptId) ||
    projected.localSubscriptionId !== requireLocalReference(input.localSubscriptionId) ||
    projected.subscriptionId !== null ||
    setup.usage !== "off_session" ||
    setup.metadata?.lectum_collection_policy !== STRIPE_CREDIT_COLLECTION_POLICY ||
    setup.metadata?.lectum_intent_kind !== "checkout_setup"
  )
    throw new StripeGatewayError("resource_mismatch");
  return projected;
};

export const createCreditCheckoutSetup = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditCheckoutSetupInput,
  idempotencyKey: string,
) => {
  const setup = await client.setupIntents.create(
    {
      customer: requireStripeId(input.customerId, "cus"),
      usage: "off_session",
      allowed_payment_method_types: ["card"],
      metadata: {
        lectum_attempt_id: requireLocalReference(input.attemptId),
        lectum_subscription_id: requireLocalReference(input.localSubscriptionId),
        lectum_intent_kind: "checkout_setup",
        lectum_collection_policy: STRIPE_CREDIT_COLLECTION_POLICY,
      },
    },
    { idempotencyKey },
  );
  return assertCreditCheckoutSetup(setup, identity, input);
};

export const findCreditCheckoutSetup = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditCheckoutSetupInput,
) => {
  const list = await client.setupIntents.list({
    customer: requireStripeId(input.customerId, "cus"),
    limit: 100,
  });
  if (list.has_more) throw new StripeGatewayError("resource_mismatch");
  const found = list.data.filter(
    (setup) => setup.metadata?.lectum_attempt_id === requireLocalReference(input.attemptId),
  );
  if (found.length > 1) throw new StripeGatewayError("resource_mismatch");
  return found[0] ? assertCreditCheckoutSetup(found[0], identity, input) : null;
};

export const readCreditCheckoutSetup = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditCheckoutSetupInput & { setupIntentId: string },
) => {
  const expected = requireStripeId(input.setupIntentId, "seti");
  const setup = await client.setupIntents.retrieve(expected);
  if (setup.id !== expected) throw new StripeGatewayError("resource_mismatch");
  const projected = assertCreditCheckoutSetup(setup, identity, input);
  if (setup.status !== "succeeded") throw new StripeGatewayError("setup_not_completed");
  return readStripeCard(
    client,
    identity,
    requireStripeId(projected.paymentMethodId, "pm"),
    input.customerId,
    { requireCredit: true },
  );
};

export const assertCreditSubscription = (
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: CreditSubscriptionScope,
  requireHold = true,
) => {
  assertStripeSubscriptionCardScope(subscription, identity, input);
  if (
    subscription.metadata.lectum_collection_policy !== STRIPE_CREDIT_COLLECTION_POLICY ||
    subscription.collection_method !== "charge_automatically" ||
    ["canceled", "incomplete_expired", "paused", "unpaid"].includes(subscription.status) ||
    subscription.cancel_at_period_end ||
    subscription.cancel_at !== null ||
    (requireHold &&
      (subscription.pause_collection?.behavior !== "keep_as_draft" ||
        subscription.pause_collection.resumes_at !== null))
  )
    throw new StripeGatewayError("operation_unsupported");
};

export const createCreditSubscription = async (
  client: Stripe,
  identity: StripeIdentity,
  input: StripeEmbeddedInput,
  idempotencyKey: string,
) => {
  const customer = await client.customers.retrieve(requireStripeId(input.customerId, "cus"));
  if (
    customer.deleted ||
    customer.id !== input.customerId ||
    customer.email !== input.payerEmail.trim() ||
    customer.invoice_settings.default_payment_method !== null ||
    customer.default_source !== null
  )
    throw new StripeGatewayError("resource_mismatch");
  assertStripeMode(customer.livemode, identity);
  const price = await client.prices.retrieve(requireStripeId(input.priceId, "price"), {
    expand: ["product"],
  });
  const plan = parseStripePlan(price, identity);
  if (!plan.active || plan.priceId !== input.priceId)
    throw new StripeGatewayError("contract_invalid");
  const start = input.startDate ? new Date(input.startDate) : null;
  if (start && (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()))
    throw new StripeGatewayError("resource_invalid");
  const subscription = await client.subscriptions.create(
    {
      customer: customer.id,
      items: [{ price: price.id, quantity: 1 }],
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      payment_settings: { payment_method_types: ["card"], save_default_payment_method: "off" },
      metadata: {
        lectum_attempt_id: requireLocalReference(input.attemptId),
        lectum_subscription_id: requireLocalReference(input.subscriptionId),
        lectum_collection_policy: STRIPE_CREDIT_COLLECTION_POLICY,
      },
      ...(start
        ? {
            trial_end: Math.floor(start.getTime() / 1000),
            trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
          }
        : {}),
      expand: ["latest_invoice"],
    },
    { idempotencyKey },
  );
  assertCreditSubscription(
    subscription,
    identity,
    {
      subscriptionId: subscription.id,
      customerId: customer.id,
      localSubscriptionId: input.subscriptionId,
    },
    false,
  );
  if (
    subscription.default_payment_method !== null ||
    !["incomplete", "trialing"].includes(subscription.status)
  )
    throw new StripeGatewayError("contract_invalid");
  return subscription;
};

export const ensureCreditCollectionHold = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditSubscriptionScope,
  idempotencyKey: string,
) => {
  const current = await client.subscriptions.retrieve(requireStripeId(input.subscriptionId, "sub"));
  assertCreditSubscription(current, identity, input, false);
  if (!current.pause_collection) {
    // Fail closed if an unexpected default was assigned before the collection fence.
    if (current.default_payment_method !== null) throw new StripeGatewayError("contract_invalid");
    await client.subscriptions.update(
      current.id,
      { pause_collection: { behavior: "keep_as_draft" } },
      { idempotencyKey },
    );
  }
  const held = await client.subscriptions.retrieve(current.id, { expand: ["latest_invoice"] });
  assertCreditSubscription(held, identity, input);
  const invoice = typeof held.latest_invoice === "object" ? held.latest_invoice : null;
  if (invoice && invoice.status !== "paid" && invoice.auto_advance !== false)
    throw new StripeGatewayError("contract_invalid");
  return held;
};

export const assignCreditSubscriptionCard = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditSubscriptionScope & { paymentMethodId: string },
  idempotencyKey: string,
) => {
  const current = await client.subscriptions.retrieve(requireStripeId(input.subscriptionId, "sub"));
  assertCreditSubscription(current, identity, input);
  const card = await readStripeCard(client, identity, input.paymentMethodId, input.customerId, {
    requireCredit: true,
  });
  const updated = await client.subscriptions.update(
    current.id,
    { default_payment_method: card.paymentMethodId },
    { idempotencyKey },
  );
  assertCreditSubscription(updated, identity, input);
  if (stripeId(updated.default_payment_method, "pm") !== card.paymentMethodId)
    throw new StripeGatewayError("resource_mismatch");
  return card;
};
