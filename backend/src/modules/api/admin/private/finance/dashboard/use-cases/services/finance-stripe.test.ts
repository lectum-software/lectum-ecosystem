import assert from "node:assert/strict";
import test from "node:test";
import { estimateMrrAt } from "@/modules/api/admin/private/dashboard/summary/use-cases/services/conversion-finance";
import {
  financialContractValue,
  monthlyContractValue,
  stripeFinancialCoverage,
  stripeFinancialScopeAvailable,
  sumFinancialValues,
} from "@/modules/billing/subscription-financial-values";
import { applyFinancialCoverage } from "./financial-coverage";
import { metric, summarizeAverageLtv } from "./period-revenue";
import {
  findSubscriptionForPayment,
  mapGatewaySummaryPaymentHistoryItem,
  mapSubscription,
  type PaymentReferenceSubscriptionRecord,
  paymentHistoryForSubscription,
} from "./subscriptions";

const now = new Date("2026-11-09T12:00:00Z");
const subscription: PaymentReferenceSubscriptionRecord = {
  createdAt: now,
  updatedAt: now,
  current_period_end: new Date("2026-12-09T12:00:00Z"),
  gateway: "stripe",
  source: "stripe",
  gateway_mode: "test",
  gateway_account_id: "acct_unit",
  gateway_subscription_id: "sub_unit",
  id: "unit-subscription",
  internal_id: 1,
  status: "ativa",
  contracted_amount_cents: 2990,
  contracted_currency: "BRL",
  contracted_interval: "month",
  contracted_interval_count: 1,
  plan: {
    id: "unit-plan",
    name: "Profissional",
    slug: "profissional",
    interval: "month",
    price_cents: 5990,
  },
  psychologist: {
    id: "unit-profile",
    crp: null,
    user: { id: "unit-user", name: "Unit", email: "unit@example.invalid", payment_methods: [] },
  },
};

test("Stripe contract price wins over mutable catalog; invalid snapshot never falls back", () => {
  assert.equal(financialContractValue(subscription).amountCents, 2990);
  assert.equal(monthlyContractValue(subscription), 2990);
  for (const invalid of [
    { contracted_amount_cents: null },
    { contracted_currency: "USD" },
    { contracted_interval_count: 2 },
    { contracted_interval: "year" },
    { gateway: "mercadopago" },
  ])
    assert.equal(financialContractValue({ ...subscription, ...invalid }).amountCents, null);
  assert.equal(sumFinancialValues([2990, null]), null);
  assert.equal(
    monthlyContractValue({
      gateway: "mercadopago",
      source: "mercadopago",
      plan: { price_cents: 12000, interval: "year" },
    }),
    1000,
  );
});

test("financial scope never mixes account or test/live and absent scope fails closed", () => {
  const env = { STRIPE_ENV: "test", STRIPE_ACCOUNT_ID: "acct_unit" };
  assert.equal(stripeFinancialScopeAvailable([subscription], env), true);
  assert.equal(stripeFinancialScopeAvailable([subscription], {}), false);
  assert.equal(
    stripeFinancialScopeAvailable([{ ...subscription, gateway_mode: "live" }], env),
    false,
  );
  assert.equal(
    stripeFinancialScopeAvailable([{ ...subscription, gateway_account_id: "acct_other" }], env),
    false,
  );
  assert.equal(stripeFinancialCoverage([subscription]), false);
  assert.equal(stripeFinancialCoverage([{ gateway: "mercadopago", source: "mercadopago" }]), true);
});

test("Stripe history cannot consume MP payloads or fabricate payments from a summary", () => {
  const event = {
    createdAt: now,
    external_id: "mp-payment",
    id: "mp-event",
    internal_id: 1,
    type: "payment.updated",
    payload: { external_reference: subscription.id, status: "approved", transaction_amount: 59.9 },
  };
  const summary = {
    gateway_subscription_id: "sub_unit",
    charged_amount_cents: 2990,
    charged_quantity: 1,
    last_charged_at: now.toISOString(),
    last_charged_amount_cents: 2990,
    raw: null,
  };
  assert.equal(findSubscriptionForPayment(event, [subscription]), null);
  assert.deepEqual(paymentHistoryForSubscription(subscription, [event], summary), []);
  assert.equal(mapGatewaySummaryPaymentHistoryItem(subscription, summary), null);
  const projected = mapSubscription(subscription, [event], new Map([[subscription.id, summary]]));
  assert.equal(projected.plan.price_cents, 2990);
  assert.equal(projected.last_charge_at, null);
  assert.equal(projected.payment_history.available, false);
  assert.match(projected.payment_history.reason!, /não conciliado/);
  assert.equal(
    summarizeAverageLtv([{ ...subscription, psychologist_id: "unit-profile" }], [], new Map())
      .available,
    false,
  );
});

test("Stripe card display requires exact subscription, account and mode", () => {
  const method = {
    brand: "visa",
    last4: "4242",
    exp_month: 12,
    exp_year: 2030,
    gateway: "stripe",
    gateway_mode: "test",
    gateway_account_id: "acct_unit",
    gateway_token: "sub_unit",
    updatedAt: now,
  };
  const withMethod = (value: typeof method) => ({
    ...subscription,
    psychologist: {
      ...subscription.psychologist,
      user: { ...subscription.psychologist.user, payment_methods: [value] },
    },
  });
  assert.equal(mapSubscription(withMethod(method)).payment_method?.matches_subscription, true);
  assert.equal(
    mapSubscription(withMethod({ ...method, gateway_mode: "live" })).payment_method,
    null,
  );
  assert.equal(
    mapSubscription(withMethod({ ...method, gateway_account_id: "acct_other" })).payment_method,
    null,
  );
  assert.equal(
    mapSubscription(withMethod({ ...method, gateway_token: "sub_other" })).payment_method,
    null,
  );
});

test("general dashboard does not borrow catalog when immutable Stripe value is missing", () => {
  const result = estimateMrrAt([{ ...subscription, contracted_amount_cents: null }], now);
  assert.equal(result.mrrCents, null);
});

test("historical MRR cannot treat a Stripe reservation as the first paid date; MP remains unchanged", () => {
  const reserved = { ...subscription, createdAt: new Date("2026-11-01T00:00:00Z") };
  const beforeFirstPayment = new Date("2026-11-05T00:00:00Z");
  assert.equal(estimateMrrAt([reserved], beforeFirstPayment).mrrCents, null);
  const legacy = { ...reserved, gateway: "mercadopago", source: "mercadopago" };
  assert.equal(estimateMrrAt([legacy], beforeFirstPayment).mrrCents, legacy.plan.price_cents);
  assert.equal(estimateMrrAt([], beforeFirstPayment).mrrCents, 0);
});

test("unknown Stripe payments disable money, historical KPIs and their series without zero claims", () => {
  const card = (
    id:
      | "revenue_total"
      | "active_subscriptions"
      | "new_subscriptions"
      | "new_subscriptions_revenue"
      | "cancellations",
  ) =>
    metric({
      id,
      current: 2990,
      previous: 0,
      description: "Unit",
      label: "Unit",
      source: "unit",
      unit: "currency_cents",
    });
  const data: Parameters<typeof applyFinancialCoverage>[0] = {
    cards: {
      revenue_total: card("revenue_total"),
      active_subscriptions: card("active_subscriptions"),
      new_subscriptions: card("new_subscriptions"),
      new_subscriptions_revenue: card("new_subscriptions_revenue"),
      cancellations: card("cancellations"),
    },
    average_ltv: {
      available: true,
      description: "Unit",
      linked_confirmed_payments: 0,
      paid_psychologist_count: 1,
      source: "payment_event+gateway_subscription_summary_linked_to_paid_psychologists",
      unavailable_reason: null,
      value_cents: 0,
    },
    average_subscription_lifetime: {
      available: true,
      cancelled_subscription_count: 1,
      description: "Unit",
      source: "cancelled_paid_subscriptions",
      unavailable_reason: null,
      value_days: 0,
      value_months: 0,
    },
    mrr: {
      available: true,
      description: "Unit",
      source: "active_paid_subscriptions",
      value_cents: 2990,
    },
    series: {
      points: [],
      source: "payment_event+gateway_subscription_summary+professional_subscription",
    },
    coverage_notes: [],
    unavailable: [],
  };
  const legacyData = structuredClone(data);
  applyFinancialCoverage(legacyData, {
    stripePaymentsCovered: true,
    contractValuesAvailable: true,
  });
  assert.equal(legacyData.cards.active_subscriptions.available, true);
  assert.equal(legacyData.mrr.available, true);
  assert.deepEqual(legacyData.series.unavailable_metrics, []);

  applyFinancialCoverage(data, { stripePaymentsCovered: false, contractValuesAvailable: true });
  assert.equal(data.cards.revenue_total.available, false);
  assert.equal(data.cards.new_subscriptions.available, false);
  assert.equal(data.average_ltv.available, false);
  assert.equal(data.average_subscription_lifetime.available, false);
  assert.equal(data.mrr.available, false);
  assert.equal(data.cards.active_subscriptions.available, false);
  assert.equal(data.cards.active_subscriptions.change_percent, null);
  assert.equal(data.cards.active_subscriptions.trend, "unavailable");
  assert.ok(data.series.unavailable_metrics?.includes("active_subscriptions"));
  assert.ok(data.series.unavailable_metrics?.includes("revenue_total"));
  applyFinancialCoverage(data, { stripePaymentsCovered: false, contractValuesAvailable: false });
  assert.equal(data.mrr.available, false);
});
