import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { STRIPE_API_VERSION } from "./stripe-config";
import { StripeGatewayError } from "./stripe-error";
import { stripeCreditCardRequestHash, stripeIdempotencyKey } from "./stripe-idempotency";
import { projectStripeWebhook } from "./stripe-webhook";

// Pure verified-event projection fixtures, not signature/provider or payment E2E evidence.
const identity = { accountId: "acct_webhookproof", mode: "test" as const };
const requestKey = stripeIdempotencyKey(identity, "credit-card", "sub_origin:pm_origin");
const event = (request: unknown) =>
  ({
    id: "evt_proof",
    object: "event",
    type: "setup_intent.succeeded",
    api_version: STRIPE_API_VERSION,
    created: 1794434400,
    livemode: false,
    request,
    data: { object: { object: "setup_intent", id: "seti_proof", metadata: {} } },
  }) as Stripe.Event;

test("verified event projects only a strict assignment digest, never request key, ID or payload", () => {
  const result = projectStripeWebhook(
    event({ id: "req_origin", idempotency_key: requestKey }),
    identity,
  );
  assert.equal(
    result?.requestKeyHash,
    stripeCreditCardRequestHash(identity, "sub_origin", "pm_origin"),
  );
  assert.equal(result?.subscriptionId, null);
  assert.equal(JSON.stringify(result).includes(requestKey), false);
  assert.equal(JSON.stringify(result).includes("req_origin"), false);
  assert.equal(Object.hasOwn(result!, "request"), false);
  assert.equal(Object.hasOwn(result!, "data"), false);
});

test("absent, automatic and unrelated request keys cannot invent auxiliary proof", () => {
  for (const request of [
    null,
    undefined,
    { id: null, idempotency_key: null },
    { id: "req_other", idempotency_key: "ordinary-provider-key" },
    {
      id: "req_setup",
      idempotency_key: stripeIdempotencyKey(identity, "credit-setup", "operation"),
    },
  ])
    assert.equal(projectStripeWebhook(event(request), identity)?.requestKeyHash, null);
});

test("account, mode and API mismatch are rejected before request proof can be projected", () => {
  const original = event({ id: "req_origin", idempotency_key: requestKey });
  for (const change of [{ account: "acct_other" }, { livemode: true }, { api_version: "other" }])
    assert.throws(
      () => projectStripeWebhook({ ...original, ...change } as Stripe.Event, identity),
      StripeGatewayError,
    );
  assert.equal(
    projectStripeWebhook({ ...original, type: "product.updated" } as Stripe.Event, identity),
    null,
  );
});
