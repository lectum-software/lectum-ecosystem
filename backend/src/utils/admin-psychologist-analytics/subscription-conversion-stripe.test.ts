import assert from "node:assert/strict";
import test from "node:test";
import {
  stripePaidPeriodAt,
  withFinancialContractPlan,
} from "@/modules/billing/subscription-financial-values";
import {
  type AdminPsychologistAnalyticsSubscription,
  firstPaidProfessionalSubscription,
  isPaidProfessionalSubscription,
  summarizeConversionCohort,
  timeToFirstPaidSubscription,
} from "./subscription-conversion";

const createdAt = new Date("2026-11-01T00:00:00Z");
const paidEnd = new Date("2026-12-01T00:00:00Z");
const stripe: AdminPsychologistAnalyticsSubscription = {
  createdAt,
  source: "stripe",
  gateway: "stripe",
  gateway_subscription_id: "sub_contract",
  status: "ativa",
  current_period_end: paidEnd,
  contracted_amount_cents: 2990,
  contracted_currency: "BRL",
  contracted_interval: "month",
  contracted_interval_count: 1,
  plan: { price_cents: 9900, slug: "profissional" },
};

test("Stripe ID alone never proves paid conversion, including expired incomplete checkout", () => {
  assert.equal(
    isPaidProfessionalSubscription({ ...stripe, status: "inativa", current_period_end: null }),
    false,
  );
  assert.equal(
    isPaidProfessionalSubscription({ ...stripe, status: "cancelada", current_period_end: null }),
    false,
  );
  assert.equal(
    isPaidProfessionalSubscription({ ...stripe, status: "ativa", current_period_end: null }),
    false,
  );
  assert.equal(isPaidProfessionalSubscription({ ...stripe, contracted_amount_cents: null }), false);
  assert.equal(
    isPaidProfessionalSubscription({
      ...stripe,
      gateway: "STRIPE",
      source: "STRIPE",
      current_period_end: null,
    }),
    false,
  );
  assert.equal(isPaidProfessionalSubscription(stripe), true);
  assert.equal(
    isPaidProfessionalSubscription({ ...stripe, plan: { ...stripe.plan, price_cents: 0 } }),
    true,
  );
});

test("Stripe contracted snapshot is used by list projections without changing MP catalog behavior", () => {
  assert.equal(withFinancialContractPlan(stripe).plan.price_cents, 2990);
  assert.equal(
    withFinancialContractPlan({ ...stripe, contracted_currency: null }).plan.price_cents,
    null,
  );
  const mp = { ...stripe, gateway: "mercadopago", source: "mercadopago" };
  assert.equal(withFinancialContractPlan(mp), mp);
  assert.equal(isPaidProfessionalSubscription(mp), true);
  assert.equal(firstPaidProfessionalSubscription([mp]), mp);
});

test("Stripe time-to-paid is unknown, never the reservation date or a courtesy setup date", () => {
  assert.equal(firstPaidProfessionalSubscription([stripe]), null);
  assert.equal(
    timeToFirstPaidSubscription({
      registeredAt: createdAt,
      subscriptions: [stripe],
      currentSubscription: stripe,
    }).status,
    "unavailable",
  );
  const summary = summarizeConversionCohort([
    { user: { id: "unit", createdAt }, subscriptions: [stripe] },
  ]);
  assert.equal(summary.available, false);
  assert.equal(summary.unknown_count, 1);
  assert.equal(summary.conversion_rate, null);
  assert.equal(summary.median_days, null);
  assert.deepEqual(summary.buckets, []);
  assert.match(summary.unavailable_reason!, /primeiro pagamento/);
});

test("MP-only cohort preserves prior conversion calculation and availability", () => {
  const mp = { ...stripe, source: "mercadopago", gateway: "mercadopago" };
  const summary = summarizeConversionCohort([
    { user: { id: "unit", createdAt }, subscriptions: [mp] },
  ]);
  assert.equal(summary.available, true);
  assert.equal(summary.converted_paid_count, 1);
  assert.equal(summary.conversion_rate, 100);
  assert.equal(summary.average_days, 0);
});

test("paid Stripe cancellation remains visible only until persisted paid period ends", () => {
  assert.equal(stripePaidPeriodAt({ ...stripe, status: "cancelada" }, createdAt), true);
  assert.equal(stripePaidPeriodAt({ ...stripe, status: "cancelada" }, paidEnd), false);
  assert.equal(stripePaidPeriodAt({ ...stripe, current_period_end: null }, createdAt), false);
  assert.equal(stripePaidPeriodAt({ ...stripe, status: "inadimplente" }, createdAt), false);
});
