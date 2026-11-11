import assert from "node:assert/strict";
import { test } from "node:test";
import type { billing_offer, billing_price_version } from "@/external/generated/prisma/client";
import { withContractedPlan } from "@/modules/billing/subscription-provider";
import {
  type PlanAdmissionContext,
  projectPlanAdmissionOffer,
  readPlanAdmissionContext,
} from "./admission-offer";

// Pure projection fixtures. No SDK, provider requests or persistent financial objects.
const plan = {
  id: "plan-local",
  slug: "profissional",
  active: true,
  price_cents: 2990,
  interval: "month",
};
const scope = { gateway: "stripe", mode: "test", account_id: "acct_local", plan_id: plan.id };
const price: billing_price_version = {
  ...scope,
  id: "version-local",
  external_product_id: "prod_local",
  external_price_id: "price_local",
  amount_cents: 3990,
  currency: "BRL",
  interval: "month",
  interval_count: 1,
  created_at: new Date(0),
};
const offer: billing_offer = {
  ...scope,
  id: "offer-local",
  price_version_id: price.id,
  checkout_enabled: true,
  revision: 3,
  created_at: new Date(0),
  updated_at: new Date(0),
};
const context: PlanAdmissionContext = {
  gateway: "stripe",
  identity: { accountId: scope.account_id, mode: "test" },
  enabled: true,
};

test("new admissions advertise the immutable current offer, never the legacy reference price", () => {
  const before = JSON.stringify({ plan, offer, price });
  assert.deepEqual(projectPlanAdmissionOffer(plan, context, { offer, price }), {
    status: "available",
    source: "versioned_offer",
    amount_cents: 3990,
    currency: "BRL",
    interval: "month",
    revision: "offer-local:3",
  });
  assert.equal(JSON.stringify({ plan, offer, price }), before);
  const response = JSON.stringify(projectPlanAdmissionOffer(plan, context, { offer, price }));
  for (const privateValue of [scope.account_id, price.external_price_id, price.external_product_id])
    assert.ok(!response.includes(privateValue));
});

test("paused, absent and malformed offers never borrow a paid legacy price", () => {
  for (const catalog of [
    { offer: null, price: null },
    { offer, price: null },
    { offer: { ...offer, account_id: "acct_another" }, price },
    { offer: { ...offer, price_version_id: "another-version" }, price },
    { offer: { ...offer, mode: "live" }, price },
    { offer: { ...offer, gateway: "mercadopago" }, price },
    { offer: { ...offer, plan_id: "another-plan" }, price },
    { offer: { ...offer, revision: 0 }, price },
    ...[
      { account_id: "acct_another" },
      { mode: "live" },
      { gateway: "mercadopago" },
      { plan_id: "another-plan" },
      { amount_cents: 49 },
      { amount_cents: 100_000_000 },
      { amount_cents: NaN },
      { currency: "USD" },
      { interval_count: 2 },
      { interval: "year" },
    ].map((change) => ({ offer, price: { ...price, ...change } })),
  ]) {
    const result = projectPlanAdmissionOffer(plan, context, catalog);
    assert.equal(result.status, "unavailable");
    assert.equal(result.amount_cents, null);
    assert.equal(result.revision, null);
  }
  for (const result of [
    projectPlanAdmissionOffer(plan, context, {
      offer: { ...offer, checkout_enabled: false },
      price,
    }),
    projectPlanAdmissionOffer(plan, { ...context, enabled: false }, { offer, price }),
    projectPlanAdmissionOffer(
      plan,
      { gateway: "disabled", identity: null, enabled: false },
      { offer, price },
    ),
  ]) {
    assert.equal(result.status, "paused");
    assert.equal(result.amount_cents, null);
  }
});

test("legacy MP catalog stays separate and existing Stripe snapshots are not repriced", () => {
  assert.equal(
    projectPlanAdmissionOffer(
      plan,
      {
        gateway: "mercadopago",
        identity: null,
        enabled: true,
      },
      { offer, price },
    ).amount_cents,
    2990,
  );
  const subscription = {
    source: "stripe",
    gateway: "stripe",
    contracted_amount_cents: 1990,
    contracted_currency: "BRL",
    contracted_interval: "month",
    contracted_interval_count: 1,
    plan,
  };
  assert.equal(withContractedPlan(subscription).plan.price_cents, 1990);
  assert.equal(projectPlanAdmissionOffer(plan, context, { offer, price }).amount_cents, 3990);
  assert.equal(plan.price_cents, 2990);
});

test("admission context reads local syntax/gates only and refuses a live key in QA", () => {
  const env = {
    NODE_ENV: "test",
    BASE: "http://127.0.0.1:3201",
    DATABASE_URL: "postgresql://local:local@127.0.0.1:32768/lectum_stripe_test",
    BILLING_CHECKOUT_GATEWAY: "stripe",
    STRIPE_ENV: "test",
    STRIPE_ACCOUNT_ID: "acct_local",
    STRIPE_SECRET_KEY: "rk_test_unit",
    STRIPE_PUBLISHABLE_KEY: "pk_test_unit",
    STRIPE_WEBHOOK_SECRET: "whsec_unit",
    BILLING_STRIPE_COLLECTION_ENABLED: "true",
    BILLING_STRIPE_RECONCILIATION_ENABLED: "true",
  };
  assert.deepEqual(readPlanAdmissionContext(env), context);
  for (const key of [
    "BILLING_STRIPE_COLLECTION_ENABLED",
    "BILLING_STRIPE_RECONCILIATION_ENABLED",
    "STRIPE_WEBHOOK_SECRET",
  ])
    assert.equal(readPlanAdmissionContext({ ...env, [key]: "" }).enabled, false);
  for (const change of [
    { STRIPE_SECRET_KEY: "rk_live_unit" },
    { STRIPE_ENV: "live" },
    { STRIPE_ACCOUNT_ID: "invalid" },
    { BILLING_CHECKOUT_GATEWAY: "unknown" },
  ])
    assert.equal(readPlanAdmissionContext({ ...env, ...change }).identity, null);
  assert.deepEqual(readPlanAdmissionContext({ BILLING_CHECKOUT_GATEWAY: "disabled" }), {
    gateway: "disabled",
    identity: null,
    enabled: false,
  });
});
