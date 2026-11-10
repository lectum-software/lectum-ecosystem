import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import {
  assertStripeCreditFunding,
  assertStripeSubscriptionCardScope,
  assertStripeSubscriptionSetup,
} from "./stripe-card";
import { StripeGatewayError } from "./stripe-error";
import { selectStripeCardSetup } from "./stripe-recovery";

// Pure validation fixtures, not evidence of a real Stripe payment or setup.
const identity = { accountId: "acct_unit", mode: "test" as const };
const input = {
  subscriptionId: "sub_unit",
  localSubscriptionId: "local-unit",
  customerId: "cus_unit",
  attemptId: "attempt-unit",
  setupIntentId: "seti_unit",
};
const subscription = (change = {}) =>
  ({
    id: input.subscriptionId,
    customer: input.customerId,
    livemode: false,
    status: "trialing",
    cancel_at_period_end: false,
    default_payment_method: null,
    pending_setup_intent: null,
    metadata: {
      lectum_subscription_id: input.localSubscriptionId,
      lectum_attempt_id: input.attemptId,
    },
    ...change,
  }) as unknown as Stripe.Subscription;
const setup = (change = {}) =>
  ({
    id: input.setupIntentId,
    customer: input.customerId,
    livemode: false,
    status: "succeeded",
    usage: "off_session",
    payment_method: "pm_unit",
    metadata: {},
    ...change,
  }) as unknown as Stripe.SetupIntent;

test("default card assignment accepts only exact verified credit funding", () => {
  assert.doesNotThrow(() => assertStripeCreditFunding("credit"));
  for (const funding of ["debit", "prepaid", "unknown", undefined, null, "", "Credit", {}, true]) {
    assert.throws(
      () => assertStripeCreditFunding(funding),
      (error) => {
        assert.ok(error instanceof StripeGatewayError);
        assert.equal(error.kind, "card_credit_required");
        assert.equal(error.details.status, 400);
        assert.equal("funding" in error, false);
        return true;
      },
    );
  }
});

test("courtesy setup accepts only a pinned successful off-session setup with matching scope", () => {
  assert.equal(assertStripeSubscriptionSetup(subscription(), setup(), identity, input), "pm_unit");
  assert.equal(
    assertStripeSubscriptionSetup(
      subscription({ default_payment_method: "pm_unit", pending_setup_intent: "seti_unit" }),
      setup(),
      identity,
      input,
    ),
    "pm_unit",
  );
  for (const change of [
    { id: "sub_other" },
    { customer: "cus_other" },
    { livemode: true },
    { status: "active" },
    { status: "canceled" },
    { cancel_at_period_end: true },
    { default_payment_method: "pm_other" },
    { pending_setup_intent: "seti_other" },
    { metadata: { lectum_subscription_id: "local-other", lectum_attempt_id: input.attemptId } },
    { metadata: { lectum_subscription_id: input.localSubscriptionId, lectum_attempt_id: "other" } },
  ])
    assert.throws(
      () => assertStripeSubscriptionSetup(subscription(change), setup(), identity, input),
      StripeGatewayError,
    );
  for (const change of [
    { id: "seti_other" },
    { customer: "cus_other" },
    { livemode: true },
    { status: "requires_action" },
    { usage: "on_session" },
    { payment_method: null },
  ])
    assert.throws(
      () => assertStripeSubscriptionSetup(subscription(), setup(change), identity, input),
      StripeGatewayError,
    );
});

test("reading subscription card always verifies local, remote, customer and mode scope", () => {
  assert.doesNotThrow(() => assertStripeSubscriptionCardScope(subscription(), identity, input));
  for (const change of [
    { localSubscriptionId: "local-other" },
    { subscriptionId: "sub_other" },
    { customerId: "cus_other" },
  ])
    assert.throws(
      () => assertStripeSubscriptionCardScope(subscription(), identity, { ...input, ...change }),
      StripeGatewayError,
    );
});

test("setup recovery fails closed on incomplete pages, duplicates, mode and ownership mismatch", () => {
  const metadata = {
    lectum_attempt_id: input.attemptId,
    lectum_gateway_subscription_id: input.subscriptionId,
    lectum_subscription_id: input.localSubscriptionId,
  };
  const value = setup({ metadata });
  const page = { data: [value], has_more: false };
  assert.equal(selectStripeCardSetup(page, identity, input)?.setupIntentId, input.setupIntentId);
  assert.equal(selectStripeCardSetup({ data: [], has_more: false }, identity, input), null);
  assert.equal(
    selectStripeCardSetup({ data: [setup({ metadata: null })], has_more: false }, identity, input),
    null,
  );
  for (const result of [
    { ...page, has_more: true },
    { ...page, data: [value, value] },
    { ...page, data: [setup({ metadata, customer: "cus_other" })] },
    { ...page, data: [setup({ metadata, livemode: true })] },
    {
      ...page,
      data: [setup({ metadata: { ...metadata, lectum_gateway_subscription_id: "sub_other" } })],
    },
  ])
    assert.throws(() => selectStripeCardSetup(result, identity, input), StripeGatewayError);
});
