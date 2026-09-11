import assert from "node:assert/strict";
import test from "node:test";
import * as billingValues from "@/modules/billing/payment-event-values";
import {
  extractPaymentAmountCents,
  findPayloadValue,
  isConfirmedPaymentStatus,
  type PaymentEventRecord,
  payloadContainsAnyReference,
  summarizeAverageLtv,
  summarizeRevenue,
  toAmountCents,
} from "./period-revenue";
import {
  findSubscriptionForPayment,
  mapCharge,
  mapPaymentHistoryItem,
  monthlyPriceCents,
  type PaymentReferenceSubscriptionRecord,
  paymentHistoryForSubscription,
} from "./subscriptions";

const occurredAt = new Date("2026-09-01T12:00:00.000Z");
const subscription: PaymentReferenceSubscriptionRecord = {
  createdAt: occurredAt,
  current_period_end: null,
  gateway: "mercadopago",
  gateway_subscription_id: "gateway-unit",
  id: "subscription-unit",
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
    id: "psychologist-unit",
    user: {
      email: "finance@example.test",
      id: "user-unit",
      name: "Teste unitário",
      payment_methods: [],
    },
  },
  source: "mercadopago",
  status: "ativa",
  updatedAt: occurredAt,
};

const eventWith = (payload: PaymentEventRecord["payload"]): PaymentEventRecord => ({
  createdAt: occurredAt,
  external_id: "payment-unit",
  id: "event-unit",
  internal_id: 1,
  payload,
  type: "payment.updated",
});

test("Financeiro reutiliza as mesmas funções billing, não outro parser", () => {
  assert.equal(findPayloadValue, billingValues.findPayloadValue);
  assert.equal(isConfirmedPaymentStatus, billingValues.isConfirmedPaymentStatus);
  assert.equal(toAmountCents, billingValues.toAmountCents);
  assert.equal(payloadContainsAnyReference, billingValues.valueContainsReference);
});

test("zero é quantia disponível de zero centavos, conforme billing", () => {
  for (const amount of [0, "0", "0.00", { value: "0,00" }]) {
    const event = eventWith({ status: "approved", transaction_amount: amount });
    assert.equal(extractPaymentAmountCents(event.payload), 0);
    assert.deepEqual(summarizeRevenue([event]), {
      confirmed_count: 1,
      missing_amount_count: 0,
      revenue_cents: 0,
    });
    const charge = mapCharge(event, []);
    assert.equal(charge?.amount_available, true);
    assert.equal(charge?.amount_cents, 0);
    assert.equal(charge?.unavailable_reason, null);
    assert.equal(mapPaymentHistoryItem(event).amount_available, true);
  }
});

test("quantia inválida não é mascarada como zero nem como outro campo", () => {
  for (const amount of [
    -1,
    "-1",
    "",
    "1.234",
    "R$ 29,90",
    true,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    const event = eventWith({ amount: 29.9, status: "approved", transaction_amount: amount });
    const charge = mapCharge(event, []);
    assert.equal(charge?.amount_available, false);
    assert.equal(charge?.amount_cents, null);
    assert.equal(charge?.status, "confirmed");
    assert.equal(charge?.subscription, null);
  }
});

test("arredondamento numérico segue billing e prioridade monetária não depende da ordem", () => {
  assert.equal(extractPaymentAmountCents({ transaction_amount: 1.234 }), 123);
  assert.equal(extractPaymentAmountCents({ paid_amount: 1, transaction_amount: "29.90" }), 2990);
  assert.equal(extractPaymentAmountCents({ transaction_amount: "29.90", paid_amount: 1 }), 2990);
  assert.equal(extractPaymentAmountCents({ transaction_amount: Number.MAX_SAFE_INTEGER }), null);
});

test("mapCharge real recusa estados não confirmados e privilegia payment aninhado", () => {
  for (const payload of [
    { status: "unpaid" },
    { status: "not_approved" },
    { status: "approved", payment: { status: "rejected" } },
    { status: "approved", payment: null },
    { action: "payment.approved" },
  ]) {
    assert.equal(mapCharge(eventWith(payload), [subscription]), null);
  }
  const charge = mapCharge(
    eventWith({ status: "processed", payment: { status: " APPROVED ", transaction_amount: 29.9 } }),
    [],
  );
  assert.equal(charge?.status, "confirmed");
  assert.equal(charge?.amount_cents, 2990);
});

test("estados de histórico são exatos, com rótulos locais e sem inferência por substring", () => {
  for (const [status, expected] of [
    ["rejected", "failed"],
    ["refused", "failed"],
    ["charged_back", "failed"],
    ["chargeback", "failed"],
    ["cancelled", "failed"],
    ["canceled", "failed"],
    ["pending", "pending"],
    ["in_process", "pending"],
    ["authorized", "pending"],
    ["in_mediation", "pending"],
    ["not_rejected", "processed"],
    ["not_pending", "processed"],
    ["not_cancelled", "processed"],
  ]) {
    const item = mapPaymentHistoryItem(eventWith({ payment_status: status }));
    assert.equal(item.status, expected);
    assert.equal(item.status_detail, null);
  }
});

test("somente allowlist com valor exato vincula cobrança e detalhe da conta", () => {
  for (const key of [
    "external_reference",
    "preapproval_id",
    "subscription_id",
    "gateway_subscription_id",
  ]) {
    const event = eventWith({
      data: [{ [key.toUpperCase()]: ` ${subscription.id} ` }],
      status: "approved",
      transaction_amount: 29.9,
    });
    assert.equal(findSubscriptionForPayment(event, [subscription]), subscription);
    assert.equal(mapCharge(event, [subscription])?.subscription?.id, subscription.id);
  }
  for (const payload of [
    { id: subscription.id },
    { payment_id: subscription.id },
    { description: subscription.id },
    { external_reference: `${subscription.id}-suffix` },
    { external_reference: subscription.id.toUpperCase() },
  ]) {
    const charge = mapCharge(
      eventWith({ ...payload, status: "approved", transaction_amount: 29.9 }),
      [subscription],
    );
    assert.equal(charge?.amount_cents, 2990);
    assert.equal(charge?.subscription, null);
    assert.equal(charge?.detail_url, null);
  }
});

test("conflitos aninhados ou referência explícita inválida não atribuem conta", () => {
  for (const conflict of ["another-subscription", 123, { id: subscription.id }]) {
    const event = eventWith({
      external_reference: subscription.id,
      data: [{ preapproval_id: conflict }],
      status: "approved",
      transaction_amount: 29.9,
    });
    assert.equal(findSubscriptionForPayment(event, [subscription]), null);
    assert.equal(mapCharge(event, [subscription])?.subscription, null);
    assert.equal(paymentHistoryForSubscription(subscription, [event]).length, 0);
  }
});

test("candidatas ambíguas não são escolhidas pela ordem da lista", () => {
  const other = { ...subscription, id: "another-subscription" };
  const event = eventWith({
    preapproval_id: subscription.gateway_subscription_id,
    status: "approved",
    transaction_amount: 29.9,
  });
  for (const candidates of [
    [subscription, other],
    [other, subscription],
  ]) {
    assert.equal(findSubscriptionForPayment(event, candidates), null);
    assert.equal(mapCharge(event, candidates)?.subscription, null);
    assert.equal(mapCharge(event, candidates)?.amount_cents, 2990);
    const lifetime = candidates.map((item) => ({ ...item, psychologist_id: item.id }));
    assert.equal(summarizeAverageLtv(lifetime, [event]).linkedConfirmedPayments, 0);
  }
});

test("LTV preserva preferência de resumo e denominador sem atribuir referência ambígua", () => {
  const lifetime = [{ ...subscription, psychologist_id: subscription.psychologist.id }];
  const event = eventWith({
    external_reference: subscription.id,
    status: "approved",
    transaction_amount: 29.9,
  });
  const summary = {
    charged_amount_cents: 9000,
    charged_quantity: 3,
    gateway_subscription_id: subscription.gateway_subscription_id ?? "",
    last_charged_amount_cents: 3000,
    last_charged_at: occurredAt.toISOString(),
    raw: null,
  };
  const ltv = summarizeAverageLtv(lifetime, [event], new Map([[subscription.id, summary]]));
  assert.equal(ltv.valueCents, 9000);
  assert.equal(ltv.linkedConfirmedPayments, 3);
  assert.equal(ltv.paidPsychologistCount, 1);
  const ambiguousEvent = eventWith({
    preapproval_id: subscription.gateway_subscription_id,
    status: "approved",
    transaction_amount: 29.9,
  });
  const ambiguousLifetime = [
    ...lifetime,
    { ...lifetime[0], id: "another-subscription", psychologist_id: "another-psychologist" },
  ];
  const ambiguousLtv = summarizeAverageLtv(
    ambiguousLifetime,
    [ambiguousEvent],
    new Map([[subscription.id, summary]]),
  );
  assert.equal(ambiguousLtv.linkedConfirmedPayments, 3);
  assert.equal(ambiguousLtv.valueCents, 4500);
  assert.equal(ambiguousLtv.paidPsychologistCount, 2);
  const zeroSummary = { ...summary, charged_amount_cents: 0, charged_quantity: 0 };
  assert.equal(
    summarizeAverageLtv(lifetime, [event], new Map([[subscription.id, zeroSummary]])).valueCents,
    2990,
  );
});

test("dedupe de histórico no dia do resumo e preço mensal permanecem legados", () => {
  const event = eventWith({ external_reference: subscription.id, status: "rejected" });
  const history = paymentHistoryForSubscription(subscription, [event], {
    charged_amount_cents: 2990,
    charged_quantity: 1,
    gateway_subscription_id: subscription.gateway_subscription_id ?? "",
    last_charged_amount_cents: 2990,
    last_charged_at: occurredAt.toISOString(),
    raw: null,
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].source, "gateway_subscription_summary");
  assert.equal(monthlyPriceCents(subscription), 2990);
  assert.equal(
    monthlyPriceCents({ plan: { ...subscription.plan, interval: "year", price_cents: 12000 } }),
    1000,
  );
});

test("referência sem vínculo permanece cobrança sem dados arbitrários de psicólogo", () => {
  const charge = mapCharge(eventWith({ status: "approved", transaction_amount: 29.9 }), [
    subscription,
  ]);
  assert.equal(charge?.amount_cents, 2990);
  assert.equal(charge?.reference, null);
  assert.equal(charge?.subscription, null);
  assert.equal(charge?.detail_url, null);
});
