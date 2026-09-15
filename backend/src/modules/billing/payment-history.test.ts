import assert from "node:assert/strict";
import { test } from "node:test";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import { buildPaymentHistoryItemsForSubscription } from "./payment-history";

const subscription: professional_subscription = {
  id: "local-123",
  gateway_subscription_id: "preapproval-123",
  plan: { name: "Plano Profissional", price_cents: 2990 },
};

const event = (payload: Record<string, unknown>, type = "payment"): payment_event => ({
  id: "event-1",
  type,
  gateway: "mercadopago",
  createdAt: new Date("2026-09-11T12:00:00Z"),
  payload: { status: "approved", transaction_amount: 29.9, ...payload },
});

test("payment history does not associate another subscription by prefix or free text", () => {
  for (const payload of [
    { preapproval_id: "preapproval-1234" },
    { description: "preapproval-123" },
    { metadata: { note: "local-123" } },
  ]) {
    assert.deepEqual(buildPaymentHistoryItemsForSubscription([event(payload)], subscription), []);
  }
});

test("payment history accepts exact subscription reference fields", () => {
  for (const payload of [
    { preapproval_id: "preapproval-123" },
    { external_reference: "local-123" },
    { payment: { preapproval_id: "preapproval-123", status: "approved" } },
  ]) {
    assert.equal(buildPaymentHistoryItemsForSubscription([event(payload)], subscription).length, 1);
  }
});

test("authorized payment topic does not confirm rejected, pending or absent payment status", () => {
  for (const status of [
    "rejected",
    "pending",
    "cancelled",
    "refunded",
    "unauthorized",
    "unpaid",
    "authorized",
    undefined,
  ]) {
    assert.deepEqual(
      buildPaymentHistoryItemsForSubscription(
        [event({ preapproval_id: "preapproval-123", status }, "subscription_authorized_payment")],
        subscription,
      ),
      [],
    );
  }
});

test("notification action does not hide the explicit payment status", () => {
  const item: payment_event = {
    ...event({}),
    payload: {
      action: "payment.updated",
      status: "approved",
      preapproval_id: "preapproval-123",
      transaction_amount: 29.9,
    },
  };
  assert.equal(buildPaymentHistoryItemsForSubscription([item], subscription).length, 1);
});

test("conflicting ownership references cannot expose the same event to two subscriptions", () => {
  const other = { ...subscription, id: "local-other", gateway_subscription_id: "gateway-other" };
  const conflicting = event({
    external_reference: subscription.id,
    payment: { preapproval_id: other.gateway_subscription_id },
  });
  for (const owner of [subscription, other]) {
    assert.deepEqual(buildPaymentHistoryItemsForSubscription([conflicting], owner), []);
  }
});

test("authorized installment lifecycle never overrides the nested payment status", () => {
  for (const status of ["scheduled", "processed", "recycling", "approved"]) {
    for (const paymentStatus of ["approved", "rejected", "pending", null]) {
      const items = buildPaymentHistoryItemsForSubscription(
        [
          event(
            {
              preapproval_id: subscription.gateway_subscription_id,
              status,
              payment: { status: paymentStatus },
            },
            "subscription_authorized_payment",
          ),
        ],
        subscription,
      );
      assert.equal(items.length, paymentStatus === "approved" ? 1 : 0);
    }
  }
});
