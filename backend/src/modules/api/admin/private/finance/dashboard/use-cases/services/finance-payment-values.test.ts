import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPaymentAmountCents,
  type LifetimeSubscriptionRecord,
  type PaymentEventRecord,
  summarizeAverageLtv,
  summarizeRevenue,
} from "./period-revenue";
import {
  buildPaymentInsights,
  findLatestConfirmedPaymentForSubscription,
  mapPaymentHistoryItem,
  type PaymentReferenceSubscriptionRecord,
  paymentHistoryForSubscription,
} from "./subscriptions";

const occurredAt = new Date("2026-09-01T12:00:00.000Z");

const eventWith = (payload: PaymentEventRecord["payload"], type = "payment.updated") =>
  ({
    createdAt: occurredAt,
    external_id: "payment-unit",
    id: "event-unit",
    internal_id: 1,
    payload,
    type,
  }) satisfies PaymentEventRecord;

const subscriptionWith = (id: string, gatewayId: string): PaymentReferenceSubscriptionRecord => ({
  createdAt: occurredAt,
  current_period_end: null,
  gateway: "mercadopago",
  gateway_subscription_id: gatewayId,
  id,
  internal_id: 1,
  plan: {
    id: "plan-unit",
    interval: "month",
    name: "Plano Profissional",
    price_cents: 2990,
    slug: "profissional",
  },
  psychologist: {
    crp: null,
    id: `psychologist-${id}`,
    user: {
      email: `${id}@example.test`,
      id: `user-${id}`,
      name: "Teste unitário",
      payment_methods: [],
    },
  },
  source: "mercadopago",
  status: "ativa",
  updatedAt: occurredAt,
});

const subscriptionA = subscriptionWith("sub-123", "gateway-A");
const subscriptionB = subscriptionWith("sub-1234", "gateway-B");
const lifetimeSubscriptions: LifetimeSubscriptionRecord[] = [subscriptionA, subscriptionB].map(
  (subscription) => ({
    gateway: subscription.gateway,
    gateway_subscription_id: subscription.gateway_subscription_id,
    id: subscription.id,
    psychologist_id: subscription.psychologist.id,
    source: subscription.source,
  }),
);

const noRevenue = { confirmed_count: 0, missing_amount_count: 0, revenue_cents: 0 };

test("V1: unpaid não confirma receita nem sucesso no histórico", () => {
  const event = eventWith({ status: "unpaid", transaction_amount: 29.9 });
  assert.deepEqual(summarizeRevenue([event]), noRevenue);
  assert.equal(mapPaymentHistoryItem(event).status, "processed");
});

test("V2: not_approved não confirma receita", () => {
  assert.deepEqual(
    summarizeRevenue([eventWith({ status: "not_approved", transaction_amount: 29.9 })]),
    noRevenue,
  );
});

test("V2: status tem prioridade independente da ordem das propriedades", () => {
  for (const payload of [
    { action: "payment.updated", status: "approved", transaction_amount: 29.9 },
    { status: "approved", action: "payment.updated", transaction_amount: 29.9 },
  ]) {
    assert.deepEqual(summarizeRevenue([eventWith(payload)]), {
      confirmed_count: 1,
      missing_amount_count: 0,
      revenue_cents: 2990,
    });
  }
});

test("V3: payment rejeitado prevalece sobre status externo aprovado", () => {
  const event = eventWith({
    external_reference: subscriptionA.id,
    payment: { status: "rejected", transaction_amount: 29.9 },
    status: "approved",
  });
  assert.deepEqual(summarizeRevenue([event]), noRevenue);
  const { health, history } = buildPaymentInsights(subscriptionA, [event]);
  assert.equal(health.successful_payments, 0);
  assert.equal(health.failed_payments, 1);
  assert.equal(history.items[0].status, "failed");
  assert.equal(findLatestConfirmedPaymentForSubscription(subscriptionA, [event]), null);
});

test("V3: nome do evento não transforma status rejeitado em sucesso", () => {
  const event = eventWith({ status: "rejected", transaction_amount: 29.9 }, "payment.approved");
  assert.equal(mapPaymentHistoryItem(event).status, "failed");
});

for (const [label, amount] of [
  ["expoente textual", "1e3"],
  ["texto intercalado", "29oops90"],
  ["overflow", 1e308],
] as const) {
  test(`V4: ${label} não vira quantia disponível`, () => {
    const event = eventWith({ status: "approved", transaction_amount: amount });
    assert.deepEqual(summarizeRevenue([event]), {
      confirmed_count: 1,
      missing_amount_count: 1,
      revenue_cents: 0,
    });
    const item = mapPaymentHistoryItem(event);
    assert.equal(item.amount_available, false);
    assert.equal(item.amount_cents, null);
  });
}

test("V5: prefixo de referência não vincula histórico a outra assinatura", () => {
  const event = eventWith({
    external_reference: subscriptionB.id,
    status: "approved",
    transaction_amount: 29.9,
  });
  assert.equal(paymentHistoryForSubscription(subscriptionA, [event]).length, 0);
  assert.equal(paymentHistoryForSubscription(subscriptionB, [event]).length, 1);
  assert.equal(findLatestConfirmedPaymentForSubscription(subscriptionA, [event]), null);
});

test("V5: texto livre não vincula histórico nem LTV", () => {
  const event = eventWith({
    description: `Cobrança ${subscriptionA.id}`,
    status: "approved",
    transaction_amount: 29.9,
  });
  assert.equal(paymentHistoryForSubscription(subscriptionA, [event]).length, 0);
  assert.equal(summarizeAverageLtv(lifetimeSubscriptions, [event]).linkedConfirmedPayments, 0);
});

test("V6: referências conflitantes não vinculam histórico a nenhuma das contas", () => {
  const event = eventWith({
    external_reference: subscriptionA.id,
    preapproval_id: subscriptionB.gateway_subscription_id,
    status: "approved",
    transaction_amount: 29.9,
  });
  for (const subscription of [subscriptionA, subscriptionB]) {
    assert.equal(paymentHistoryForSubscription(subscription, [event]).length, 0);
    assert.equal(findLatestConfirmedPaymentForSubscription(subscription, [event]), null);
  }
});

test("V6: LTV não aceita conflito pelo conjunto agregado de referências", () => {
  const event = eventWith({
    external_reference: subscriptionA.id,
    preapproval_id: subscriptionB.gateway_subscription_id,
    status: "approved",
    transaction_amount: 29.9,
  });
  const ltv = summarizeAverageLtv(lifetimeSubscriptions, [event]);
  assert.equal(ltv.linkedConfirmedPayments, 0);
  assert.equal(ltv.valueCents, 0);
  assert.equal(ltv.paidPsychologistCount, 2);
});

test("F7: DTO preserva status_detail nulo e rótulo seguro", () => {
  const item = mapPaymentHistoryItem(
    eventWith({ status_detail: "cc_rejected_other_reason", status: "rejected" }),
  );
  assert.equal(Object.hasOwn(item, "status_detail"), true);
  assert.equal(item.status_detail, null);
  assert.equal(item.status_label, "Recusada");
  assert.equal(JSON.stringify(item).includes("cc_rejected_other_reason"), false);
});

test("C1: status confirmados exatos e pagamento sem vínculo continuam na receita", () => {
  for (const status of ["approved", "accredited", "paid"]) {
    const event = eventWith({ status, transaction_amount: 29.9 });
    assert.deepEqual(summarizeRevenue([event]), {
      confirmed_count: 1,
      missing_amount_count: 0,
      revenue_cents: 2990,
    });
    assert.equal(mapPaymentHistoryItem(event).status, "successful");
    assert.equal(summarizeAverageLtv(lifetimeSubscriptions, [event]).linkedConfirmedPayments, 0);
  }
});

test("C2: referências coerentes preservam histórico e denominador do LTV", () => {
  const event = eventWith({
    external_reference: subscriptionA.id,
    preapproval_id: subscriptionA.gateway_subscription_id,
    status: "approved",
    transaction_amount: 29.9,
  });
  assert.equal(paymentHistoryForSubscription(subscriptionA, [event]).length, 1);
  assert.equal(findLatestConfirmedPaymentForSubscription(subscriptionA, [event]), event);
  const ltv = summarizeAverageLtv(lifetimeSubscriptions, [event]);
  assert.equal(ltv.linkedConfirmedPayments, 1);
  assert.equal(ltv.paidPsychologistCount, 2);
  assert.equal(ltv.valueCents, 1495);
});

test("C3: valores decimais e wrapper value mantêm contrato monetário", () => {
  assert.equal(extractPaymentAmountCents({ transaction_amount: "29,90" }), 2990);
  assert.equal(extractPaymentAmountCents({ amount: { value: "29.90" } }), 2990);
  assert.equal(extractPaymentAmountCents({ id: 2990 }), null);
});
