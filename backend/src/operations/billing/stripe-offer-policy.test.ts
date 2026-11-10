import assert from "node:assert/strict";
import { test } from "node:test";
import type { billing_offer, billing_price_version } from "@/external/generated/prisma/client";
import type { StripePlan } from "@/modules/billing/payment-gateway/stripe-types";
import {
  assertImmutableStripePrice,
  assertStripeOfferActivationReady,
  assertStripeOfferPrice,
  parseStripeOfferArguments,
  planStripeOfferChange,
  type StripeOfferArguments,
  StripeOfferError,
} from "./stripe-offer-policy";

// Pure policy fixtures only; never written to a provider or database.
const argv = [
  "--account",
  "acct_unit",
  "--mode",
  "test",
  "--price",
  "price_unit",
  "--expected-revision",
  "0",
  "--actor-admin-id",
  "admin-unit",
  "--reason",
  "initial_catalog",
];
const args = (): StripeOfferArguments => parseStripeOfferArguments(argv)!;
const price: StripePlan = {
  accountId: "acct_unit",
  mode: "test",
  priceId: "price_unit",
  productId: "prod_unit",
  active: true,
  amountCents: 2990,
  currency: "BRL",
  interval: "month",
  intervalCount: 1,
};
const current = (change = {}) =>
  ({
    id: "offer-unit",
    plan_id: "plan-unit",
    gateway: "stripe",
    mode: "test",
    account_id: "acct_unit",
    price_version_id: "version-unit",
    checkout_enabled: true,
    revision: 2,
    ...change,
  }) as billing_offer;

test("offer command defaults to read-only and requires explicit destination, revision and actor", () => {
  assert.equal(args().apply, false);
  assert.equal(args().sales, "preserve");
  assert.equal(parseStripeOfferArguments(["--help"]), null);
  assert.equal(parseStripeOfferArguments([...argv, "--apply", "--enable-sales"])?.apply, true);
  for (const invalid of [
    [],
    [...argv, "--apply", "--apply"],
    [...argv, "--price", "price_other"],
    [...argv, "--enable-sales", "--disable-sales"],
    [...argv, "--secret", "do-not-accept"],
    argv.slice(0, -2),
    argv.map((value) => (value === "initial_catalog" ? "uncontrolled free text" : value)),
    argv.map((value) => (value === "test" ? "production" : value)),
    argv.map((value) => (value === "0" ? "-1" : value)),
    argv.map((value) => (value === "0" ? "01" : value)),
  ])
    assert.throws(() => parseStripeOfferArguments(invalid), StripeOfferError);
});

test("enabling sales requires webhook configuration and a running reconciler flag", () => {
  assert.doesNotThrow(() => assertStripeOfferActivationReady(args(), {}));
  assert.doesNotThrow(() => assertStripeOfferActivationReady({ ...args(), sales: "disable" }, {}));
  const enable = { ...args(), sales: "enable" as const };
  for (const env of [
    {},
    { STRIPE_WEBHOOK_SECRET: "whsec_unit" },
    { BILLING_STRIPE_RECONCILIATION_ENABLED: "true" },
    { STRIPE_WEBHOOK_SECRET: "invalid", BILLING_STRIPE_RECONCILIATION_ENABLED: "true" },
    { STRIPE_WEBHOOK_SECRET: "whsec_unit", BILLING_STRIPE_RECONCILIATION_ENABLED: "false" },
  ])
    assert.throws(() => assertStripeOfferActivationReady(enable, env), StripeOfferError);
  assert.doesNotThrow(() =>
    assertStripeOfferActivationReady(enable, {
      STRIPE_WEBHOOK_SECRET: "whsec_unit",
      BILLING_STRIPE_RECONCILIATION_ENABLED: "true",
    }),
  );
});

test("only matching active authorized BRL monthly price may enter this bootstrap", () => {
  assert.doesNotThrow(() => assertStripeOfferPrice(args(), price, price));
  for (const changed of [
    { accountId: "acct_other" },
    { mode: "live" },
    { priceId: "price_other" },
    { active: false },
    { amountCents: 1 },
    { currency: "USD" },
    { interval: "year" },
    { intervalCount: 2 },
  ])
    assert.throws(
      () => assertStripeOfferPrice(args(), price, { ...price, ...changed } as StripePlan),
      StripeOfferError,
    );
  assert.throws(
    () => assertStripeOfferPrice(args(), { ...price, accountId: "acct_other" }, price),
    StripeOfferError,
  );
});

test("new/replaced offers default disabled; changing price never implicitly starts sales", () => {
  assert.deepEqual(planStripeOfferChange(args(), null, false), {
    enabled: false,
    changed: true,
    revision: 1,
  });
  const existing = { ...args(), expectedRevision: 2 };
  assert.deepEqual(planStripeOfferChange(existing, current(), true), {
    enabled: true,
    changed: false,
    revision: 2,
  });
  assert.deepEqual(planStripeOfferChange(existing, current(), false), {
    enabled: false,
    changed: true,
    revision: 3,
  });
  assert.equal(
    planStripeOfferChange({ ...existing, sales: "enable" }, current(), false).enabled,
    true,
  );
  assert.equal(
    planStripeOfferChange({ ...existing, sales: "disable" }, current(), true).enabled,
    false,
  );
  assert.throws(() => planStripeOfferChange(args(), current(), true), StripeOfferError);
  for (const changed of [
    { account_id: "acct_other" },
    { mode: "live" },
    { gateway: "mercadopago" },
  ])
    assert.throws(() => planStripeOfferChange(existing, current(changed), true), StripeOfferError);
});

test("an existing price version cannot be mutated or reassigned to another plan or account", () => {
  const stored = {
    plan_id: "plan-unit",
    gateway: "stripe",
    mode: price.mode,
    account_id: price.accountId,
    external_product_id: price.productId,
    external_price_id: price.priceId,
    amount_cents: price.amountCents,
    currency: price.currency,
    interval: price.interval,
    interval_count: 1,
  } as billing_price_version;
  assert.doesNotThrow(() => assertImmutableStripePrice(stored, "plan-unit", price));
  for (const changed of [
    { plan_id: "plan-other" },
    { gateway: "mercadopago" },
    { mode: "live" },
    { account_id: "acct_other" },
    { external_price_id: "price_other" },
    { external_product_id: "prod_other" },
    { amount_cents: 1 },
    { currency: "USD" },
    { interval: "year" },
    { interval_count: 2 },
  ])
    assert.throws(
      () => assertImmutableStripePrice({ ...stored, ...changed }, "plan-unit", price),
      StripeOfferError,
    );
});
