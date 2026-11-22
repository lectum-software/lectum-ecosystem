import assert from "node:assert/strict";
import { test } from "node:test";
import { CHECKOUT_SOURCE_URL, reviewedCheckoutPolicy } from "./checkout-policy";
import { metaTransmissionDecision } from "./meta-policy";

const production = {
  NODE_ENV: "production",
  BASE: "https://api.lectum.com.br",
  DATABASE_URL: "postgresql://local:local@db.example.invalid/lectum",
  BILLING_CHECKOUT_GATEWAY: "stripe",
  STRIPE_ENV: "live",
  STRIPE_ACCOUNT_ID: "acct_reviewed123",
};
test("checkout configuration uses only the production payment identity and canonical billing URL", () => {
  const policy = reviewedCheckoutPolicy(production);
  assert.equal(policy.enabled, true);
  assert.equal(policy.accountId, production.STRIPE_ACCOUNT_ID);
  assert.equal(policy.sourceUrl, CHECKOUT_SOURCE_URL);
  assert.ok(policy.documentVersion);
  for (const change of [
    { NODE_ENV: "test" },
    { BASE: "https://homolog-api.lectum.com.br" },
    { DATABASE_URL: "postgresql://local:local@127.0.0.1/lectum_test" },
    { BILLING_CHECKOUT_GATEWAY: "mercadopago" },
    { STRIPE_ENV: "test" },
    { STRIPE_ACCOUNT_ID: "" },
    { STRIPE_ACCOUNT_ID: "../other" },
  ]) {
    const disabled = reviewedCheckoutPolicy({ ...production, ...change });
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.accountId, null);
    assert.equal(disabled.sourceUrl, null);
  }
  assert.equal(reviewedCheckoutPolicy({}).enabled, false);
  assert.equal(metaTransmissionDecision("professional_checkout").allowed, true);
  assert.equal(metaTransmissionDecision("professional_subscription").allowed, false);
});
