import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import type Stripe from "stripe";
import {
  isStripeTerminalSubscriptionStatus,
  stripeCancellationMutation,
} from "./stripe-cancellation";
import {
  getNewSubscriptionGatewayName,
  readStripeConfiguration,
  STRIPE_API_VERSION,
} from "./stripe-config";
import { StripeGatewayError, stripeFailure } from "./stripe-error";
import {
  invoicePeriod,
  parseStripePlan,
  projectStripeSetup,
  projectStripeSubscription,
  requireStripeId,
  stripeSubscriptionStatus,
} from "./stripe-projection";
import { isStripeCheckoutCapabilityReady } from "./stripe-readiness";
import { isStripeRuntimeAllowed } from "./stripe-runtime";
import { projectStripeWebhook } from "./stripe-webhook";

// Synthetic pure parser inputs only. These are not provider integration/payment evidence.
const identity = { accountId: "acct_unit", mode: "test" as const };
const env = {
  NODE_ENV: "test",
  BASE: "http://127.0.0.1:8000",
  DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum_test",
  STRIPE_ENV: "test",
  STRIPE_ACCOUNT_ID: identity.accountId,
  STRIPE_SECRET_KEY: "rk_test_unit",
  STRIPE_PUBLISHABLE_KEY: "pk_test_unit",
  STRIPE_WEBHOOK_SECRET: "whsec_unit",
};

test("Stripe runtime isolation rejects live keys outside canonical production", () => {
  const live = {
    ...env,
    STRIPE_ENV: "live",
    STRIPE_SECRET_KEY: "rk_live_unit",
    STRIPE_PUBLISHABLE_KEY: "pk_live_unit",
    NODE_ENV: "production",
    BASE: "https://api.lectum.com.br",
    DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-production",
  };
  assert.equal(readStripeConfiguration(live).mode, "live");
  for (const change of [
    { NODE_ENV: "test" },
    { BASE: "http://127.0.0.1:8000" },
    { BASE: "https://homolog-api.lectum.com.br" },
    { BASE: "https://api.lectum.com.br.attacker.invalid" },
    { BASE: "https://api.lectum.com.br/?forward=x" },
    { BASE: "https://private:secret@api.lectum.com.br" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum-production" },
    { DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-homolog" },
    { DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-test" },
  ])
    assert.throws(() => readStripeConfiguration({ ...live, ...change }), StripeGatewayError);
  assert.throws(
    () =>
      readStripeConfiguration({
        ...env,
        STRIPE_ENV: "live",
        STRIPE_SECRET_KEY: "rk_live_unit",
        STRIPE_PUBLISHABLE_KEY: "pk_live_unit",
      }),
    StripeGatewayError,
  );
});

test("test mode permits only explicit disposable loopback or canonical homolog", () => {
  assert.equal(isStripeRuntimeAllowed("test", env), true);
  const homolog = {
    ...env,
    NODE_ENV: "production",
    BASE: "https://homolog-api.lectum.com.br",
    DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-homolog",
  };
  assert.equal(readStripeConfiguration(homolog).mode, "test");
  assert.equal(isStripeRuntimeAllowed("test", { ...homolog, NODE_ENV: "homolog" }), true);
  for (const change of [
    { NODE_ENV: undefined },
    { BASE: "https://api.lectum.com.br" },
    { NODE_ENV: "test" },
    { DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-production" },
    { DATABASE_URL: "postgresql://unit:unit@database.internal:5432/lectum-unknown" },
  ])
    assert.equal(isStripeRuntimeAllowed("test", { ...homolog, ...change }), false);
  for (const change of [
    { NODE_ENV: undefined },
    { NODE_ENV: "production" },
    { BASE: "https://api.lectum.com.br" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum-production" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum-%70roduction" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum-unknown" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectumdev" },
    { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:5432/lectum-test-homolog" },
    { DATABASE_URL: "postgresql://unit:unit@remote.invalid:5432/lectum-test" },
    { DATABASE_URL: "" },
    { BASE: "" },
  ])
    assert.equal(isStripeRuntimeAllowed("test", { ...env, ...change }), false);
});

test("sandbox capability flags do not substitute an actual test transaction; live stays strict", () => {
  for (const account of [
    { charges_enabled: false, capabilities: { card_payments: "inactive" as const } },
    { charges_enabled: false, capabilities: {} },
    { charges_enabled: true, capabilities: { card_payments: "pending" as const } },
    { charges_enabled: false, capabilities: { card_payments: "active" as const } },
  ]) {
    assert.equal(isStripeCheckoutCapabilityReady("test", account), true);
    assert.equal(isStripeCheckoutCapabilityReady("live", account), false);
  }
  assert.equal(
    isStripeCheckoutCapabilityReady("live", {
      charges_enabled: true,
      capabilities: { card_payments: "active" },
    }),
    true,
  );
});

test("stopping future collection never depends on a paid invoice or charges a proration", () => {
  for (const status of ["active", "past_due", "unpaid", "paused"]) {
    assert.deepEqual(stripeCancellationMutation(status), {
      kind: "update",
      params: { cancel_at_period_end: true, proration_behavior: "none" },
    });
  }
  for (const status of ["incomplete", "trialing"]) {
    assert.deepEqual(stripeCancellationMutation(status), {
      kind: "cancel",
      params: { invoice_now: false, prorate: false },
    });
  }
  for (const status of ["canceled", "incomplete_expired"])
    assert.equal(stripeCancellationMutation(status).kind, "unchanged");
  assert.throws(() => stripeCancellationMutation("unknown"), StripeGatewayError);
});

test("cancellation accepts both terminal statuses but never an incomplete or billable result", () => {
  for (const status of ["canceled", "incomplete_expired"]) {
    assert.equal(isStripeTerminalSubscriptionStatus(status), true);
    assert.equal(stripeCancellationMutation(status).kind, "unchanged");
    assert.equal(stripeSubscriptionStatus(status, false, false), "cancelada");
  }
  for (const status of [
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "paused",
    "unknown",
  ])
    assert.equal(isStripeTerminalSubscriptionStatus(status), false);
});
const price = (overrides = {}) =>
  ({
    id: "price_unit",
    object: "price",
    product: "prod_unit",
    livemode: false,
    type: "recurring",
    currency: "brl",
    unit_amount: 2990,
    active: true,
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    billing_scheme: "per_unit",
    transform_quantity: null,
    ...overrides,
  }) as unknown as Stripe.Price;
const invoice = (overrides = {}) =>
  ({
    id: "in_unit",
    object: "invoice",
    customer: "cus_unit",
    livemode: false,
    status: "paid",
    amount_paid: 2990,
    currency: "brl",
    status_transitions: { paid_at: 1800000000 },
    parent: {
      subscription_details: {
        subscription: "sub_unit",
        metadata: { lectum_subscription_id: "local-subscription" },
      },
    },
    lines: {
      has_more: false,
      data: [
        {
          parent: { subscription_item_details: { subscription: "sub_unit", proration: false } },
          pricing: { price_details: { price: "price_unit" } },
          currency: "brl",
          quantity: 1,
          period: { start: 1800000000, end: 1802678400 },
        },
      ],
    },
    ...overrides,
  }) as unknown as Stripe.Invoice;
const subscription = (overrides = {}) =>
  ({
    id: "sub_unit",
    object: "subscription",
    customer: "cus_unit",
    livemode: false,
    metadata: { lectum_subscription_id: "local-subscription", lectum_attempt_id: "local-attempt" },
    items: {
      has_more: false,
      data: [
        {
          price: price(),
          quantity: 1,
          current_period_start: 1800000000,
          current_period_end: 1802678400,
        },
      ],
    },
    status: "active",
    cancel_at_period_end: false,
    trial_end: null,
    default_payment_method: "pm_unit",
    latest_invoice: invoice(),
    ...overrides,
  }) as unknown as Stripe.Subscription;
const verified = {
  verified: true,
  refundedCents: 0,
  disputed: false,
  paymentPaidAt: new Date(1800000001000),
};

test("Stripe configuration accepts matching restricted/secret modes and fails closed", () => {
  assert.equal(readStripeConfiguration(env).mode, "test");
  assert.equal(readStripeConfiguration({ ...env, STRIPE_SECRET_KEY: "sk_test_unit" }).mode, "test");
  assert.equal(getNewSubscriptionGatewayName({}), "disabled");
  assert.equal(getNewSubscriptionGatewayName({ BILLING_CHECKOUT_GATEWAY: "stripe" }), "stripe");
  assert.equal(
    getNewSubscriptionGatewayName({ BILLING_CHECKOUT_GATEWAY: "mercadopago" }),
    "mercadopago",
  );
  for (const patch of [
    { STRIPE_ENV: "sandbox" },
    { STRIPE_SECRET_KEY: "rk_live_unit" },
    { STRIPE_PUBLISHABLE_KEY: "pk_live_unit" },
    { STRIPE_ACCOUNT_ID: "../other" },
    { STRIPE_SECRET_KEY: "rk_test_unit\r\nX-Header: value" },
    { STRIPE_WEBHOOK_SECRET: "bad" },
  ])
    assert.throws(() => readStripeConfiguration({ ...env, ...patch }), StripeGatewayError);
  assert.throws(
    () => getNewSubscriptionGatewayName({ BILLING_CHECKOUT_GATEWAY: "typo" }),
    StripeGatewayError,
  );
});

test("pinned API matches installed SDK contract", () => {
  const source = readFileSync(join(dirname(require.resolve("stripe")), "apiVersion.js"), "utf8");
  assert.ok(source.includes(`'${STRIPE_API_VERSION}'`));
});

test("provider errors cannot retain message, headers, body, cause or unsafe status", () => {
  const error = stripeFailure({
    statusCode: 402,
    message: "private-email",
    raw: { secret: "private-secret" },
  });
  assert.equal(error.details.status, 402);
  assert.equal(error.kind, "provider_unavailable");
  assert.equal(JSON.stringify(error).includes("private"), false);
  assert.equal("cause" in error, false);
  assert.equal(stripeFailure({ statusCode: 999 }).details.status, undefined);
  assert.doesNotThrow(() =>
    stripeFailure({
      get statusCode() {
        throw new Error("private");
      },
    }),
  );
});

test("Stripe resources never accept Mercado Pago identifiers or URL fragments", () => {
  assert.equal(requireStripeId("sub_unit", "sub"), "sub_unit");
  for (const id of ["12345", "mp-123", "sub_x/path", "sub_x?other=1", "sub_x\n", "price_unit"]) {
    assert.throws(() => requireStripeId(id, "sub"), StripeGatewayError);
  }
});

test("catalog proves mode, positive integer BRL monthly licensed flat price", () => {
  assert.equal(parseStripePlan(price(), identity).amountCents, 2990);
  assert.equal(parseStripePlan(price({ active: false }), identity).active, false);
  for (const change of [
    { livemode: true },
    { currency: "usd" },
    { unit_amount: 29.9 },
    { unit_amount: 0 },
    { recurring: { interval: "year", interval_count: 1, usage_type: "licensed" } },
    { recurring: { interval: "month", interval_count: 2, usage_type: "licensed" } },
    { billing_scheme: "tiered" },
    { product: { id: "prod_unit", livemode: true, active: true } },
  ])
    assert.throws(() => parseStripePlan(price(change), identity), StripeGatewayError);
});

test("active status without verified funds cannot grant paid entitlement", () => {
  assert.equal(projectStripeSubscription(subscription(), identity).status, "inativa");
  const result = projectStripeSubscription(subscription(), identity, verified);
  assert.equal(result.status, "ativa");
  assert.equal(result.latestInvoicePaymentVerified, true);
  assert.deepEqual(result.latestInvoicePaymentPaidAt, verified.paymentPaidAt);
  assert.equal(result.localSubscriptionId, "local-subscription");
  assert.equal(result.latestInvoicePaymentIntentId, null);
  assert.equal(
    projectStripeSubscription(subscription(), identity, {
      ...verified,
      paymentIntentId: "pi_original",
    }).latestInvoicePaymentIntentId,
    "pi_original",
  );
  assert.equal(
    projectStripeSubscription(subscription(), identity, {
      ...verified,
      verified: false,
      paymentIntentId: "pi_unverified",
    }).latestInvoicePaymentIntentId,
    null,
  );
  for (const status of ["trialing", "incomplete", "paused"]) {
    assert.equal(
      projectStripeSubscription(subscription({ status }), identity, verified).status,
      "inativa",
    );
  }
  assert.throws(
    () => projectStripeSubscription(subscription({ status: "unknown" }), identity, verified),
    StripeGatewayError,
  );
});

test("canonical evidence requires both valid independent transition dates without imposing order", () => {
  for (const paymentPaidAt of [new Date(1800000001000), new Date(1799999999000)]) {
    const result = projectStripeSubscription(subscription(), identity, {
      ...verified,
      paymentPaidAt,
    });
    assert.equal(result.latestInvoicePaymentVerified, true);
    assert.equal(result.latestInvoicePaymentPaidAt, paymentPaidAt);
    assert.deepEqual(result.latestInvoicePaidAt, new Date(1800000000000));
  }
  for (const paymentPaidAt of [undefined, null, new Date(Number.NaN)]) {
    const result = projectStripeSubscription(subscription(), identity, {
      ...verified,
      paymentPaidAt,
    });
    assert.equal(result.latestInvoicePaymentVerified, false);
    assert.equal(result.latestInvoicePaymentPaidAt, null);
  }
  for (const paid_at of [null, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = projectStripeSubscription(
      subscription({ latest_invoice: invoice({ status_transitions: { paid_at } }) }),
      identity,
      verified,
    );
    assert.equal(result.latestInvoicePaymentVerified, false);
  }
});

test("zero, unpaid, refunded, disputed and wrong-amount invoices cannot grant benefits", () => {
  for (const value of [
    invoice({ amount_paid: 0 }),
    invoice({ status: "open" }),
    invoice({ amount_paid: 1 }),
  ])
    assert.equal(
      projectStripeSubscription(subscription({ latest_invoice: value }), identity, verified)
        .latestInvoicePaymentVerified,
      false,
    );
  for (const value of [
    { ...verified, refundedCents: 1 },
    { ...verified, disputed: true },
  ])
    assert.equal(projectStripeSubscription(subscription(), identity, value).status, "inativa");
});

test("invoice paid period remains distinct from newly advanced subscription period", () => {
  const value = subscription();
  value.items.data[0].current_period_start = 1802678400;
  value.items.data[0].current_period_end = 1805270400;
  const result = projectStripeSubscription(value, identity, verified);
  assert.equal(result.latestInvoicePeriodEnd?.getTime(), 1802678400000);
  assert.equal(result.currentPeriodEnd?.getTime(), 1805270400000);
  assert.notEqual(result.latestInvoicePeriodEnd?.getTime(), result.currentPeriodEnd?.getTime());
});

test("invoice, customer, price and single item mapping is fail closed", () => {
  assert.throws(
    () =>
      projectStripeSubscription(
        subscription({ latest_invoice: invoice({ customer: "cus_other" }) }),
        identity,
        verified,
      ),
    StripeGatewayError,
  );
  assert.throws(
    () => projectStripeSubscription(subscription({ livemode: true }), identity, verified),
    StripeGatewayError,
  );
  assert.equal(
    invoicePeriod(invoice({ lines: { has_more: true, data: [] } }), "sub_unit", "price_unit"),
    null,
  );
  assert.equal(invoicePeriod(invoice(), "sub_other", "price_unit"), null);
  assert.equal(invoicePeriod(invoice(), "sub_unit", "price_other"), null);
});

test("cancellation and overdue mappings preserve their distinct meanings", () => {
  assert.equal(stripeSubscriptionStatus("active", true, true), "cancelada");
  assert.equal(stripeSubscriptionStatus("incomplete_expired", false, false), "cancelada");
  assert.equal(stripeSubscriptionStatus("past_due", false, false), "inadimplente");
  assert.equal(stripeSubscriptionStatus("unpaid", false, false), "inadimplente");
});

test("SetupIntent projection only exposes transient secret in actionable states", () => {
  const setup = {
    id: "seti_unit",
    customer: "cus_unit",
    livemode: false,
    status: "requires_action",
    client_secret: "seti_unit_secret_private",
    payment_method: "pm_unit",
    metadata: {
      lectum_attempt_id: "local-attempt",
      lectum_subscription_id: "local-subscription",
      lectum_gateway_subscription_id: "sub_unit",
    },
  } as unknown as Stripe.SetupIntent;
  assert.equal(projectStripeSetup(setup, identity).clientSecret, setup.client_secret);
  assert.equal(
    projectStripeSetup({ ...setup, status: "succeeded" }, identity).clientSecret,
    undefined,
  );
  assert.equal(
    projectStripeSetup({ ...setup, status: "canceled" }, identity).clientSecret,
    undefined,
  );
  assert.throws(
    () => projectStripeSetup({ ...setup, livemode: true }, identity),
    StripeGatewayError,
  );
});

test("webhook projection returns only closed reference fields and checks API/account/mode", () => {
  const event = {
    id: "evt_unit",
    type: "customer.subscription.updated",
    livemode: false,
    created: 1800000000,
    api_version: STRIPE_API_VERSION,
    data: { object: subscription() },
  } as unknown as Stripe.Event;
  const result = projectStripeWebhook(event, identity)!;
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      "accountId",
      "mode",
      "eventId",
      "type",
      "apiVersion",
      "created",
      "resourceId",
      "subscriptionId",
      "requestKeyHash",
    ].sort(),
  );
  assert.equal(result.subscriptionId, "sub_unit");
  assert.equal(result.requestKeyHash, null);
  assert.equal(JSON.stringify(result).includes("customer"), true); // Only event type, never customer details.
  assert.equal("data" in result, false);
  assert.equal("raw" in result, false);
  for (const change of [
    { livemode: true },
    { account: "acct_other" },
    { api_version: "2020-01-01" },
  ]) {
    assert.throws(
      () => projectStripeWebhook({ ...event, ...change } as Stripe.Event, identity),
      StripeGatewayError,
    );
  }
  assert.equal(
    projectStripeWebhook({ ...event, type: "customer.created" } as Stripe.Event, identity),
    null,
  );
});
