import type Stripe from "stripe";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  projectStripeSetup,
  requireLocalReference,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeCardSetupInput, StripeIdentity } from "./stripe-types";

export type StripeCustomerRecoveryInput = { userId: string; customerReferenceId: string };
export type StripeSubscriptionRecoveryInput = {
  attemptId: string;
  subscriptionId: string;
  customerId: string;
  priceId: string;
};

/** Search is eventually consistent. A null result never permits using a new creation key. */
export const findStripeCustomer = async (
  client: Stripe,
  identity: StripeIdentity,
  input: StripeCustomerRecoveryInput,
) => {
  const userId = requireLocalReference(input.userId);
  const reference = requireLocalReference(input.customerReferenceId);
  const result = await client.customers.search({
    query: `metadata['lectum_customer_id']:'${reference}'`,
    limit: 2,
  });
  if (result.has_more || result.data.length > 1) throw new StripeGatewayError("resource_mismatch");
  const customer = result.data[0];
  if (!customer) return null;
  assertStripeMode(customer.livemode, identity);
  if (
    customer.metadata.lectum_customer_id !== reference ||
    customer.metadata.lectum_user_id !== userId
  )
    throw new StripeGatewayError("resource_mismatch");
  return { customerId: requireStripeId(customer.id, "cus") };
};

export const findStripeSubscription = async (
  client: Stripe,
  identity: StripeIdentity,
  input: StripeSubscriptionRecoveryInput,
) => {
  const attemptId = requireLocalReference(input.attemptId);
  const localId = requireLocalReference(input.subscriptionId);
  const customerId = requireStripeId(input.customerId, "cus");
  const priceId = requireStripeId(input.priceId, "price");
  const result = await client.subscriptions.search({
    query: `metadata['lectum_attempt_id']:'${attemptId}'`,
    limit: 2,
  });
  if (result.has_more || result.data.length > 1) throw new StripeGatewayError("resource_mismatch");
  const subscription = result.data[0];
  if (!subscription) return null;
  assertStripeMode(subscription.livemode, identity);
  if (
    subscription.metadata.lectum_attempt_id !== attemptId ||
    subscription.metadata.lectum_subscription_id !== localId ||
    stripeId(subscription.customer, "cus") !== customerId ||
    subscription.items.has_more ||
    subscription.items.data.length !== 1 ||
    subscription.items.data[0].price.id !== priceId
  )
    throw new StripeGatewayError("resource_mismatch");
  return requireStripeId(subscription.id, "sub");
};

export const selectStripeCardSetup = (
  result: Pick<Stripe.ApiList<Stripe.SetupIntent>, "data" | "has_more">,
  identity: StripeIdentity,
  input: StripeCardSetupInput,
) => {
  const attemptId = requireLocalReference(input.attemptId);
  const customerId = requireStripeId(input.customerId, "cus");
  const subscriptionId = requireStripeId(input.subscriptionId, "sub");
  if (result.has_more) throw new StripeGatewayError("resource_mismatch");
  const matching = result.data.filter((setup) => setup.metadata?.lectum_attempt_id === attemptId);
  if (matching.length > 1) throw new StripeGatewayError("resource_mismatch");
  const setup = matching[0];
  if (!setup) return null;
  const projected = projectStripeSetup(setup, identity);
  if (projected.customerId !== customerId || projected.subscriptionId !== subscriptionId)
    throw new StripeGatewayError("resource_mismatch");
  return projected;
};

export const findStripeCardSetup = async (
  client: Stripe,
  identity: StripeIdentity,
  input: StripeCardSetupInput,
) =>
  selectStripeCardSetup(
    await client.setupIntents.list({
      customer: requireStripeId(input.customerId, "cus"),
      limit: 100,
    }),
    identity,
    input,
  );
