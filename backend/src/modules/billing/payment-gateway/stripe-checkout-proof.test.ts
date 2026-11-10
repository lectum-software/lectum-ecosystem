import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { initialPaidCheckoutIntent, initialUnpaidCheckoutIntent } from "./stripe-checkout-proof";

test("paid initial invoice recovers its proven PI without a client secret or a new payment", () => {
  const invoice: Pick<Stripe.Invoice, "id" | "billing_reason" | "status"> = {
    id: "in_initial",
    billing_reason: "subscription_create",
    status: "paid",
  };
  const canonical = {
    latestInvoiceId: invoice.id,
    latestInvoicePaid: true,
    latestInvoicePaymentVerified: true,
    latestInvoicePaymentIntentId: "pi_original",
  };
  assert.deepEqual(initialPaidCheckoutIntent(invoice, canonical), {
    intentKind: "payment",
    intentId: "pi_original",
  });
  assert.equal("clientSecret" in initialPaidCheckoutIntent(invoice, canonical)!, false);
  for (const billing_reason of ["subscription_cycle", "manual", "subscription_update"] as const)
    assert.equal(initialPaidCheckoutIntent({ ...invoice, billing_reason }, canonical), null);
  for (const change of [
    { latestInvoiceId: "in_other" },
    { latestInvoicePaid: false },
    { latestInvoicePaymentVerified: false },
    { latestInvoicePaymentIntentId: "seti_setup" },
    { latestInvoicePaymentIntentId: undefined },
  ])
    assert.equal(initialPaidCheckoutIntent(invoice, { ...canonical, ...change }), null);
  assert.equal(initialPaidCheckoutIntent({ ...invoice, status: "open" }, canonical), null);
  assert.equal(initialPaidCheckoutIntent(null, canonical), null);
});

test("unpaid initial PI requires exact invoice, subscription and customer; renewal never replaces a lost original pin", () => {
  const invoice = {
    id: "in_initial",
    billing_reason: "subscription_create",
    status: "open",
    amount_paid: 0,
    customer: "cus_owner",
    parent: { subscription_details: { subscription: "sub_original" } },
    confirmation_secret: { client_secret: "pi_original_secret_confirmation" },
  } as unknown as Stripe.Invoice;
  const canonical = {
    subscriptionId: "sub_original",
    customerId: "cus_owner",
    latestInvoiceId: "in_initial",
    latestInvoicePaid: false,
  };
  assert.deepEqual(initialUnpaidCheckoutIntent(invoice, canonical), {
    intentKind: "payment",
    intentId: "pi_original",
    clientSecret: "pi_original_secret_confirmation",
  });
  for (const billing_reason of ["subscription_cycle", "subscription_update", "manual"] as const) {
    assert.equal(initialUnpaidCheckoutIntent({ ...invoice, billing_reason }, canonical), null);
  }
  for (const change of [
    { latestInvoiceId: "in_other" },
    { subscriptionId: "sub_other" },
    { customerId: "cus_other" },
    { latestInvoicePaid: true },
  ])
    assert.equal(initialUnpaidCheckoutIntent(invoice, { ...canonical, ...change }), null);
  for (const status of ["paid", "void", "uncollectible", "draft"] as const)
    assert.equal(initialUnpaidCheckoutIntent({ ...invoice, status }, canonical), null);
  assert.equal(initialUnpaidCheckoutIntent({ ...invoice, amount_paid: 1 }, canonical), null);
  assert.equal(
    initialUnpaidCheckoutIntent({ ...invoice, confirmation_secret: null }, canonical),
    null,
  );
  assert.equal(
    initialUnpaidCheckoutIntent(
      {
        ...invoice,
        confirmation_secret: {
          type: "payment_intent",
          client_secret: "seti_other_secret_confirmation",
        },
      },
      canonical,
    ),
    null,
  );
  assert.equal(initialUnpaidCheckoutIntent(null, canonical), null);
});
