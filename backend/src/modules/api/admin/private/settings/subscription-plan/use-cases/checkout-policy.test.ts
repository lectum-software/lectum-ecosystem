import assert from "node:assert/strict";
import { test } from "node:test";
import type { AdminSettingsSubscriptionRecords } from "../repositories/interfaces/IAdminSettingsSubscriptionPlanRepository";
import { projectAdminCheckout, readAdminCheckoutContext } from "./checkout-policy";

const date = new Date("2026-11-11T12:00:00.000Z");
const env = {
  NODE_ENV: "test",
  BASE: "http://127.0.0.1:3121",
  DATABASE_URL: "postgresql://localhost/lectum_stripe_test",
  BILLING_CHECKOUT_GATEWAY: "stripe",
  BILLING_STRIPE_COLLECTION_ENABLED: "true",
  BILLING_STRIPE_RECONCILIATION_ENABLED: "true",
  STRIPE_ENV: "test",
  STRIPE_ACCOUNT_ID: "acct_policy",
  STRIPE_SECRET_KEY: "rk_test_policy",
  STRIPE_PUBLISHABLE_KEY: "pk_test_policy",
  STRIPE_WEBHOOK_SECRET: "whsec_policy",
};
const records: AdminSettingsSubscriptionRecords = {
  plan: {
    id: "plan",
    slug: "profissional",
    name: "Profissional",
    active: true,
    price_cents: 9990,
    interval: "year",
    gateway_plan_id: "legacy",
    createdAt: date,
    updatedAt: date,
  },
  offer: { revision: 2, checkout_enabled: true, updated_at: date },
  price: {
    amount_cents: 2990,
    currency: "BRL",
    interval: "month",
    interval_count: 1,
    created_at: date,
  },
};
const project = (configuration = env, data = records) =>
  projectAdminCheckout(readAdminCheckoutContext(configuration), data);

test("Stripe projects only the scoped immutable price, never mutable legacy catalog or remote readiness", () => {
  const result = project();
  assert.equal(result.status, "configured");
  assert.equal(result.source, "local_configuration");
  assert.equal(result.remote_readiness, "not_checked");
  assert.equal(result.gateway, "stripe");
  assert.equal(result.mode, "test");
  assert.equal(result.price?.source, "billing_price_version");
  assert.equal(result.price?.amount_cents, 2990);
  assert.equal(result.price?.interval, "month");
  assert.equal(result.offer?.revision, 2);
  assert.deepEqual(records.plan?.price_cents, 9990);
});

test("paused offer, inactive business plan and either stopped worker remain distinct observable gates", () => {
  for (const [configuration, data] of [
    [env, { ...records, offer: { ...records.offer!, checkout_enabled: false } }],
    [env, { ...records, plan: { ...records.plan!, active: false } }],
    [{ ...env, BILLING_STRIPE_COLLECTION_ENABLED: "false" }, records],
    [{ ...env, BILLING_STRIPE_RECONCILIATION_ENABLED: "false" }, records],
    [{ ...env, BILLING_STRIPE_COLLECTION_ENABLED: "TRUE" }, records],
  ] as const) {
    const result = project(configuration, data);
    assert.equal(result.status, "paused");
    assert.equal(result.price?.amount_cents, 2990);
    assert.ok(result.offer);
  }
});

test("missing offer never borrows legacy amount; missing or unsupported immutable price is invalid", () => {
  assert.equal(project(env, { ...records, offer: null, price: null }).status, "not_configured");
  assert.equal(project(env, { ...records, offer: null, price: null }).price, null);
  for (const price of [
    null,
    { ...records.price!, amount_cents: 9990 },
    { ...records.price!, currency: "USD" },
    { ...records.price!, interval: "year" },
    { ...records.price!, interval_count: 2 },
  ]) {
    const result = project(env, { ...records, price });
    assert.equal(result.status, "invalid_offer");
    assert.equal(result.price, null);
  }
});

test("missing webhook preserves catalog observation without claiming locally complete setup", () => {
  const result = project({ ...env, STRIPE_WEBHOOK_SECRET: "" });
  assert.equal(result.status, "not_configured");
  assert.equal(result.price?.amount_cents, 2990);
  assert.equal(result.offer?.revision, 2);
  assert.equal(result.remote_readiness, "not_checked");
});

test("disabled gateway does not infer a catalog or require Stripe configuration", () => {
  for (const gateway of ["", "disabled"]) {
    const context = readAdminCheckoutContext({ BILLING_CHECKOUT_GATEWAY: gateway });
    assert.equal(context.identity, null);
    assert.deepEqual(projectAdminCheckout(context, records), {
      source: "local_configuration",
      gateway: "disabled",
      mode: null,
      status: "paused",
      remote_readiness: "not_checked",
      collection_enabled: false,
      reconciliation_enabled: false,
      offer: null,
      price: null,
    });
  }
});

test("bad configuration degrades only new projection and fails closed across runtime/key scopes", () => {
  for (const configuration of [
    { ...env, BILLING_CHECKOUT_GATEWAY: "typo" },
    { ...env, STRIPE_ENV: "live" },
    { ...env, STRIPE_SECRET_KEY: "" },
    { ...env, STRIPE_ACCOUNT_ID: "" },
    { ...env, BASE: "https://api.lectum.com.br" },
    { ...env, DATABASE_URL: "postgresql://localhost/lectum-production" },
  ]) {
    const context = readAdminCheckoutContext(configuration);
    const result = projectAdminCheckout(context, records);
    assert.equal(result.status, "invalid_configuration");
    assert.equal(result.offer, null);
    assert.equal(result.price, null);
    assert.equal(context.identity, null);
    assert.equal(records.plan?.price_cents, 9990);
  }
});

test("Mercado Pago remains explicitly legacy and independent from Stripe worker flags", () => {
  const result = project({
    ...env,
    BILLING_CHECKOUT_GATEWAY: "mercadopago",
    BILLING_STRIPE_COLLECTION_ENABLED: "false",
  });
  assert.equal(result.gateway, "mercadopago");
  assert.equal(result.mode, null);
  assert.equal(result.offer, null);
  assert.equal(result.status, "configured");
  assert.equal(result.price?.source, "subscription_plan");
  assert.equal(result.price?.amount_cents, 9990);
  assert.equal(result.price?.interval, "year");
  assert.equal(
    project(
      { ...env, BILLING_CHECKOUT_GATEWAY: "mercadopago" },
      { ...records, plan: { ...records.plan!, active: false } },
    ).status,
    "paused",
  );
});

test("public projection allowlists fields; secrets and operational identifiers cannot escape extra stored data", () => {
  const result = project(env, {
    ...records,
    price: { ...records.price!, account_id: "acct_private", external_price_id: "price_private" },
  } as AdminSettingsSubscriptionRecords);
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "rk_test",
    "pk_test",
    "whsec",
    "acct_",
    "price_private",
    "gateway_plan_id",
    "DATABASE_URL",
  ])
    assert.equal(serialized.includes(forbidden), false);
  assert.equal(Object.hasOwn(result, "webhookConfigured"), false);
});
