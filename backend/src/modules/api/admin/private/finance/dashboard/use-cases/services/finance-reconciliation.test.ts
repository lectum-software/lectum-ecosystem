import assert from "node:assert/strict";
import test from "node:test";
import type { GatewaySubscriptionPaymentSummary } from "@/modules/billing/payment-gateway";
import type { LifetimeSubscriptionRecord, PaymentEventRecord } from "./period-revenue";
import type { PaymentReferenceSubscriptionRecord } from "./subscriptions";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "finance-reconciliation-test-secret";

const services = Promise.all([import("./charges-lists"), import("./period-revenue")]);

const occurredAt = new Date("2026-08-13T13:43:00.000Z");

const makeSubscription = (): PaymentReferenceSubscriptionRecord =>
  ({
    createdAt: new Date("2026-08-13T12:00:00.000Z"),
    current_period_end: new Date("2026-09-13T12:00:00.000Z"),
    gateway: "mercadopago",
    gateway_subscription_id: "preapproval_austin",
    id: "sub_austin",
    internal_id: 25,
    plan: {
      id: "plan_professional",
      interval: "month",
      name: "Plano Profissional",
      price_cents: 2990,
      slug: "profissional",
    },
    psychologist: {
      crp: "06/16190",
      id: "psychologist_austin",
      user: {
        email: "austin@example.test",
        id: "user_austin",
        name: "Austin",
        payment_methods: [],
      },
    },
    source: "mercadopago",
    status: "ativa",
    updatedAt: new Date("2026-08-13T13:45:00.000Z"),
  }) as PaymentReferenceSubscriptionRecord;

const makeGatewaySummary = (): GatewaySubscriptionPaymentSummary => ({
  charged_amount_cents: 2990,
  charged_quantity: 1,
  gateway_subscription_id: "preapproval_austin",
  last_charged_amount_cents: 2990,
  last_charged_at: occurredAt.toISOString(),
  raw: null,
});

const makePaymentEvent = (subscription: PaymentReferenceSubscriptionRecord): PaymentEventRecord =>
  ({
    createdAt: occurredAt,
    external_id: "payment_austin",
    id: "payment_event_austin",
    internal_id: 42,
    payload: {
      external_reference: subscription.id,
      preapproval_id: subscription.gateway_subscription_id,
      status: "approved",
      transaction_amount: 29.9,
      type: "payment",
    },
    type: "payment.updated",
  }) as PaymentEventRecord;

test("extração financeira ignora IDs genéricos como valor monetário", async () => {
  const [, { extractPaymentAmountCents }] = await services;

  assert.equal(
    extractPaymentAmountCents({
      data: { id: "136307197356" },
      status: "approved",
      type: "payment",
    }),
    null,
  );
  assert.equal(extractPaymentAmountCents({ status: "approved", transaction_amount: 29.9 }), 2990);
  assert.equal(extractPaymentAmountCents({ amount: { value: "29.90" } }), 2990);
});

test("lista de cobranças inclui resumo aprovado do gateway quando webhook local está ausente", async () => {
  const [{ buildChargeItems }] = await services;
  const subscription = makeSubscription();
  const summaries = new Map([[subscription.id, makeGatewaySummary()]]);

  const charges = buildChargeItems([], [subscription], {
    gatewaySummaries: summaries,
    range: {
      end: new Date("2026-08-13T23:59:59.999Z"),
      start: new Date("2026-08-13T00:00:00.000Z"),
    },
  });

  assert.equal(charges.length, 1);
  assert.equal(charges[0].source, "gateway_subscription_summary");
  assert.equal(charges[0].status_label, "Confirmada");
  assert.equal(charges[0].amount_cents, 2990);
  assert.equal(charges[0].internal_id_available, false);
  assert.equal(charges[0].subscription?.psychologist.name, "Austin");
  assert.equal(
    charges[0].subscription?.payment_history.items[0].source,
    "gateway_subscription_summary",
  );
});

test("LTV médio usa resumo financeiro do gateway quando não há evento local", async () => {
  const [, { summarizeAverageLtv }] = await services;
  const subscription = makeSubscription();
  const lifetimeSubscription = {
    gateway: subscription.gateway,
    gateway_subscription_id: subscription.gateway_subscription_id,
    id: subscription.id,
    psychologist_id: subscription.psychologist.id,
    source: subscription.source,
  } as LifetimeSubscriptionRecord;

  const ltv = summarizeAverageLtv(
    [lifetimeSubscription],
    [],
    new Map([[subscription.id, makeGatewaySummary()]]),
  );

  assert.equal(ltv.available, true);
  assert.equal(ltv.linkedConfirmedPayments, 1);
  assert.equal(ltv.valueCents, 2990);
});

test("LTV medio usa historico local quando o resumo do gateway vem sem cobrancas", async () => {
  const [, { summarizeAverageLtv }] = await services;
  const subscription = makeSubscription();
  const lifetimeSubscription = {
    gateway: subscription.gateway,
    gateway_subscription_id: subscription.gateway_subscription_id,
    id: subscription.id,
    psychologist_id: subscription.psychologist.id,
    source: subscription.source,
  } as LifetimeSubscriptionRecord;
  const emptyGatewaySummary = {
    ...makeGatewaySummary(),
    charged_amount_cents: null,
    charged_quantity: 0,
    last_charged_amount_cents: null,
    last_charged_at: null,
  };

  const ltv = summarizeAverageLtv(
    [lifetimeSubscription],
    [makePaymentEvent(subscription)],
    new Map([[subscription.id, emptyGatewaySummary]]),
  );

  assert.equal(ltv.available, true);
  assert.equal(ltv.linkedConfirmedPayments, 1);
  assert.equal(ltv.valueCents, 2990);
});

test("conciliação de cobranças remove duplicidade e preserva o evento local", async () => {
  const [{ buildChargeItems }] = await services;
  const subscription = makeSubscription();
  const summaries = new Map([[subscription.id, makeGatewaySummary()]]);

  const charges = buildChargeItems([makePaymentEvent(subscription)], [subscription], {
    gatewaySummaries: summaries,
    range: {
      end: new Date("2026-08-13T23:59:59.999Z"),
      start: new Date("2026-08-13T00:00:00.000Z"),
    },
  });

  assert.equal(charges.length, 1);
  assert.equal(charges[0].event_id, "payment_event_austin");
  assert.equal(charges[0].source, "payment_event");
  assert.equal(charges[0].internal_id, 42);
  assert.equal(charges[0].internal_id_available, true);
});
