import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { STRIPE_API_VERSION } from "./stripe-config";
import { projectStripeFinancialReceipt } from "./stripe-financial";
import type { StripePaidInvoice } from "./stripe-invoice";
import { requireStripeDisputeId } from "./stripe-projection";
import { projectStripeWebhook } from "./stripe-webhook";

// Pure canonical-contract tests; not evidence of a provider payment.
const identity = { accountId: "acct_unit", mode: "test" as const };
const target = {
  subscriptionId: "sub_unit",
  localSubscriptionId: "local-unit",
  customerId: "cus_unit",
  priceId: "price_unit",
  amountCents: 2990,
};
const paidAt = new Date("2026-10-01T00:00:00Z");
const invoice = {
  id: "in_unit",
  livemode: false,
  customer: "cus_unit",
  currency: "brl",
  parent: {
    subscription_details: {
      subscription: "sub_unit",
      metadata: { lectum_subscription_id: "local-unit" },
    },
  },
  lines: {
    has_more: false,
    data: [
      {
        amount: 2990,
        currency: "brl",
        quantity: 1,
        parent: { subscription_item_details: { subscription: "sub_unit", proration: false } },
        pricing: { price_details: { price: "price_unit" } },
        period: { start: paidAt.getTime() / 1000, end: paidAt.getTime() / 1000 + 86400 * 30 },
      },
    ],
  },
} as unknown as Stripe.Invoice;
const paid: StripePaidInvoice = {
  verified: true,
  refundedCents: 0,
  disputed: false,
  payment: {
    paymentId: "in_unit",
    subscriptionId: "sub_unit",
    externalReference: "local-unit",
    amountCents: 2990,
    refundedCents: 0,
    currency: "BRL",
    status: "approved",
    liveMode: false,
    paidAt,
  },
  financialFacts: {
    invoicePaymentId: "inpay_unit",
    paymentIntentId: "pi_unit",
    chargeId: "ch_unit",
    allocatedPaidAt: paidAt,
    invoicePaidAt: new Date(paidAt.getTime() + 1000),
    refunded: false,
  },
};
const cutoff = new Date("2026-11-01T00:00:00Z");

test("financial receipt uses the allocation paid time, preserves invoice transition and original paid interval", () => {
  const result = projectStripeFinancialReceipt(invoice, paid, identity, target, cutoff);
  assert.equal(result.kind, "receipt");
  if (result.kind !== "receipt") return;
  assert.deepEqual(result.receipt.paidAt, paidAt);
  assert.deepEqual(result.receipt.invoicePaidAt, paid.financialFacts.invoicePaidAt);
  assert.equal(result.receipt.amountCents, 2990);
  assert.equal(result.receipt.invoicePaymentId, "inpay_unit");
  assert.equal(
    result.receipt.periodEnd < cutoff,
    true,
    "expired paid periods remain financial facts",
  );
  for (const financialFacts of [
    { ...paid.financialFacts, allocatedPaidAt: null },
    { ...paid.financialFacts, invoicePaymentId: null },
    { ...paid.financialFacts, allocatedPaidAt: new Date(Number.NaN) },
    { ...paid.financialFacts, invoicePaidAt: new Date(Number.NaN) },
  ])
    assert.throws(() =>
      projectStripeFinancialReceipt(invoice, { ...paid, financialFacts }, identity, target, cutoff),
    );
  assert.throws(() =>
    projectStripeFinancialReceipt(
      invoice,
      paid,
      identity,
      { ...target, customerId: "cus_other" },
      cutoff,
    ),
  );
  assert.throws(() =>
    projectStripeFinancialReceipt(
      invoice,
      paid,
      identity,
      { ...target, priceId: "price_other" },
      cutoff,
    ),
  );
  assert.throws(() =>
    projectStripeFinancialReceipt(
      invoice,
      paid,
      identity,
      { ...target, amountCents: 3000 },
      cutoff,
    ),
  );
});

test("independently observed payment timestamps are preserved even when allocation follows invoice payment", () => {
  const financialFacts = {
    ...paid.financialFacts,
    allocatedPaidAt: new Date("2026-11-03T10:53:18.000Z"),
    invoicePaidAt: new Date("2026-11-03T08:15:13.000Z"),
  };
  const result = projectStripeFinancialReceipt(
    invoice,
    { ...paid, financialFacts },
    identity,
    target,
    new Date("2026-11-10T13:19:56.492Z"),
  );
  assert.equal(result.kind, "receipt");
  if (result.kind !== "receipt") return;
  assert.equal(result.receipt.paidAt, financialFacts.allocatedPaidAt);
  assert.equal(result.receipt.invoicePaidAt, financialFacts.invoicePaidAt);
  assert.equal(result.receipt.amountCents, 2990);
});

test("either payment transition after cutoff is excluded independently and invalid cutoff fails closed", () => {
  const future = new Date(cutoff.getTime() + 1_000);
  for (const financialFacts of [
    { ...paid.financialFacts, allocatedPaidAt: future },
    { ...paid.financialFacts, invoicePaidAt: future },
  ])
    assert.deepEqual(
      projectStripeFinancialReceipt(invoice, { ...paid, financialFacts }, identity, target, cutoff),
      { kind: "excluded", reason: "paid_after_cutoff" },
    );
  for (const financialFacts of [
    { ...paid.financialFacts, allocatedPaidAt: cutoff },
    { ...paid.financialFacts, invoicePaidAt: cutoff },
  ])
    assert.equal(
      projectStripeFinancialReceipt(invoice, { ...paid, financialFacts }, identity, target, cutoff)
        .kind,
      "receipt",
    );
  assert.throws(() =>
    projectStripeFinancialReceipt(invoice, paid, identity, target, new Date(Number.NaN)),
  );
});

test("refund and dispute are current observations, never a rewrite of gross capture or an invented adjustment date", () => {
  for (const observation of [
    { refundedCents: 100, disputed: false, state: "partially_refunded" },
    { refundedCents: 2990, disputed: false, state: "refunded" },
    { refundedCents: 0, disputed: true, state: "disputed" },
  ]) {
    const result = projectStripeFinancialReceipt(
      invoice,
      { ...paid, ...observation },
      identity,
      target,
      cutoff,
    );
    assert.equal(result.kind, "receipt");
    if (result.kind === "receipt") {
      assert.equal(result.receipt.currentState, observation.state);
      assert.equal(result.receipt.amountCents, 2990);
      assert.deepEqual(result.receipt.paidAt, paidAt);
      assert.equal("refundOccurredAt" in result.receipt, false);
    }
  }
  assert.deepEqual(
    projectStripeFinancialReceipt(
      invoice,
      paid,
      identity,
      target,
      new Date(paidAt.getTime() - 1000),
    ),
    { kind: "excluded", reason: "paid_after_cutoff" },
  );
});

test("dispute references accept documented du and existing dp without opening arbitrary resource prefixes", () => {
  for (const id of ["du_unit", "dp_unit"]) {
    assert.equal(requireStripeDisputeId(id), id);
    const event = {
      id: "evt_unit",
      type: "charge.dispute.created",
      api_version: STRIPE_API_VERSION,
      livemode: false,
      created: 1790812800,
      data: { object: { id, object: "dispute", evidence: { secret: "never persisted" } } },
    } as unknown as Stripe.Event;
    const reference = projectStripeWebhook(event, identity);
    assert.equal(reference?.resourceId, id);
    assert.equal(JSON.stringify(reference).includes("secret"), false);
  }
  for (const id of ["ch_unit", "du_x/path", "du_x?y", "du_unit\n", "du_"])
    assert.throws(() => requireStripeDisputeId(id));
});
