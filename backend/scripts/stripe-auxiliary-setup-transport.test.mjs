import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import {
  projectStripeAuxiliarySetupProof,
  readStripeAuxiliarySetupProof,
} from "../src/modules/billing/payment-gateway/stripe-auxiliary-setup.ts";

// Actual SDK GET encoding with declared unit fixtures, not external E2E evidence.
const identity = { accountId: "acct_auxiliary", mode: "test" };
const scope = {
  setupIntentId: "seti_auxiliary",
  customerId: "cus_auxiliary",
  paymentMethodId: "pm_auxiliary",
  subscriptionId: "sub_auxiliary",
  localSubscriptionId: "local-auxiliary",
  attemptId: "operation-auxiliary",
};
const setup = {
  id: scope.setupIntentId,
  object: "setup_intent",
  status: "succeeded",
  usage: "off_session",
  livemode: false,
  customer: scope.customerId,
  payment_method: scope.paymentMethodId,
  metadata: {},
};
const subscription = {
  id: scope.subscriptionId,
  object: "subscription",
  livemode: false,
  customer: scope.customerId,
  status: "canceled",
  default_payment_method: "pm_replacement",
  metadata: {
    lectum_subscription_id: scope.localSubscriptionId,
    lectum_attempt_id: scope.attemptId,
    lectum_collection_policy: "manual_credit_v1",
  },
};

test("canonical auxiliary proof performs only two GETs, no expansion or payment/current-card projection", async () => {
  const calls = [];
  const client = new Stripe("sk_test_declared_transport_fixture", {
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(async (url, init) => {
      assert.equal(init.method, "GET");
      const target = new URL(url);
      assert.equal(target.search, "");
      calls.push(target.pathname);
      assert.ok(
        [
          `/v1/setup_intents/${scope.setupIntentId}`,
          `/v1/subscriptions/${scope.subscriptionId}`,
        ].includes(target.pathname),
      );
      return new Response(
        JSON.stringify(target.pathname.includes("setup_intents") ? setup : subscription),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }),
  });
  const proof = await readStripeAuxiliarySetupProof(client, identity, scope);
  assert.equal(proof.metadataAbsent, true);
  assert.equal(proof.status, "succeeded");
  assert.equal(proof.paymentMethodId, scope.paymentMethodId);
  assert.deepEqual(calls, [
    `/v1/setup_intents/${scope.setupIntentId}`,
    `/v1/subscriptions/${scope.subscriptionId}`,
  ]);
});

test("invalid/unknown raw metadata must never be treated as absent", () => {
  for (const metadata of [
    undefined,
    null,
    [],
    "",
    { lectum_attempt_id: "bad value!" },
    { arbitrary: "x" },
  ])
    assert.throws(() =>
      projectStripeAuxiliarySetupProof({ ...setup, metadata }, subscription, identity, scope),
    );
  for (const change of [
    { livemode: true },
    { status: "processing" },
    { usage: "on_session" },
    { customer: "cus_other" },
    { payment_method: "pm_other" },
    { id: "seti_other" },
  ])
    assert.throws(() =>
      projectStripeAuxiliarySetupProof({ ...setup, ...change }, subscription, identity, scope),
    );
  for (const change of [
    { livemode: true },
    { customer: "cus_other" },
    { id: "sub_other" },
    { metadata: { ...subscription.metadata, lectum_attempt_id: "another" } },
    { metadata: { ...subscription.metadata, lectum_collection_policy: "automatic" } },
  ])
    assert.throws(() =>
      projectStripeAuxiliarySetupProof(setup, { ...subscription, ...change }, identity, scope),
    );
});
