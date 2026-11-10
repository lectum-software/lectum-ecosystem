import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeSubscriptionPeriodWhere,
} from "@/utils/subscription-entitlement";
import { buildBillingDunningUpdate } from "./dunning";
import { cancelledProfessionalGatewaySubscriptionWhere } from "./free-subscription";
import {
  assertStripeSubscriptionIdentity,
  subscriptionGatewayName,
  withContractedPlan,
} from "./subscription-provider";

test("servicing selects persisted provider and rejects ambiguous or conflicting ownership", () => {
  assert.equal(subscriptionGatewayName({ source: "mercadopago" }), "mercadopago");
  assert.equal(
    subscriptionGatewayName({ gateway: "mercadopago", source: "legacy" }),
    "mercadopago",
  );
  assert.equal(subscriptionGatewayName({ gateway: "stripe", source: "stripe" }), "stripe");
  for (const record of [
    { source: "legacy" },
    { gateway: "unknown" },
    { gateway: "stripe", source: "mercadopago" },
    { gateway: "mercadopago", source: "stripe" },
    { gateway: "stripe", source: "admin_grant" },
    { source: "free_signup" },
  ])
    assert.equal(subscriptionGatewayName(record), null);
});

test("Stripe servicing requires the persisted account and mode, not only a subscription id", () => {
  const identity = { accountId: "acct_isolated", mode: "test" as const };
  const record = {
    gateway: "stripe",
    source: "stripe",
    gateway_account_id: identity.accountId,
    gateway_mode: "test",
  };
  assert.doesNotThrow(() => assertStripeSubscriptionIdentity(record, identity));
  for (const change of [
    { gateway_mode: "live" },
    { gateway_account_id: "acct_other" },
    { gateway_mode: null },
  ]) {
    assert.throws(() => assertStripeSubscriptionIdentity({ ...record, ...change }, identity));
  }
});

test("contract projection never substitutes a new offer price for the Stripe contract", () => {
  const record = {
    source: "stripe",
    gateway: "stripe",
    plan: { price_cents: 4990, interval: "year" },
    contracted_amount_cents: 2990,
    contracted_currency: "BRL",
    contracted_interval: "month",
    contracted_interval_count: 1,
  };
  assert.deepEqual(withContractedPlan(record).plan, { price_cents: 2990, interval: "month" });
  assert.equal(record.plan.price_cents, 4990);
  const incomplete = { ...record, contracted_amount_cents: null };
  assert.equal(withContractedPlan(incomplete).plan.price_cents, null);
  const legacy = { source: "mercadopago", gateway: "mercadopago", plan: { price_cents: 2990 } };
  assert.equal(withContractedPlan(legacy), legacy);
});

test("paid period after cancellation covers both providers without creating Stripe grace", () => {
  const where = activeSubscriptionPeriodWhere();
  const cancelled = (where.OR as Array<{ source?: unknown }>).find((row) => row.source);
  assert.deepEqual(cancelled?.source, { in: ["mercadopago", "stripe"] });
  assert.deepEqual(cancelledProfessionalGatewaySubscriptionWhere().gateway, {
    in: ["mercadopago", "stripe"],
  });
  const update = buildBillingDunningUpdate({
    previous: { source: "stripe", status: "ativa", current_period_end: new Date() },
    status: "inadimplente",
  });
  assert.equal(update.billing_grace_ends_at, undefined);
});

test("Stripe delinquency remains manageable without granting a paid entitlement", () => {
  assert.deepEqual(actionableProfessionalGatewaySubscriptionWhere().OR, [
    { status: "inativa" },
    { status: "inadimplente", gateway: "stripe" },
  ]);
  assert.equal(
    JSON.stringify(activeSubscriptionPeriodWhere()).includes('"status":"inadimplente"'),
    true,
  );
  assert.ok(JSON.stringify(activeSubscriptionPeriodWhere()).includes("billing_grace_ends_at"));
});
