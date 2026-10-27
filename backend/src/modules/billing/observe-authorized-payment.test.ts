import assert from "node:assert/strict";
import { test } from "node:test";
import {
  observeAuthorizedPayment,
  shouldObserveAuthorizedPayment,
} from "./observe-authorized-payment";
import { billingReference } from "./payment-gateway/observability";

// Pure orchestration tests, not proof of provider approval or live webhook delivery.
test("diagnostics only read new authorized-payment events, never duplicate delivery", () => {
  assert.equal(shouldObserveAuthorizedPayment("subscription_authorized_payment", true), true);
  assert.equal(shouldObserveAuthorizedPayment("subscription_authorized_payment", false), false);
  assert.equal(shouldObserveAuthorizedPayment("subscription_preapproval", true), false);
  assert.equal(shouldObserveAuthorizedPayment("payment", true), false);
});

const payment = {
  gateway_subscription_id: "remote-subscription",
  external_reference: "local-subscription",
  gateway_payment_id: "remote-payment",
  status: "rejected",
  status_detail: "cc_rejected_high_risk",
};

test("authenticated invoice projection correlates a failed create without stored remote id", async (t) => {
  const info = t.mock.method(console, "info", () => {});
  let reads = 0;
  await observeAuthorizedPayment({
    resourceId: "invoice-id",
    gateway: {
      getAuthorizedPayment: async () => {
        reads++;
        return payment;
      },
    },
    repository: {
      findSubscriptionByGatewayReference: async () => ({
        id: "local-subscription",
        gateway: "mercadopago",
        gateway_subscription_id: null,
      }),
    },
  });
  assert.equal(reads, 1);
  const log = info.mock.calls[0].arguments[1];
  assert.equal(log.result, "risk_rejected");
  assert.equal(log.correlation, "matched");
  assert.equal(log.attempt_ref, billingReference("attempt", "local-subscription"));
  assert.equal(log.payment_ref, billingReference("payment", "remote-payment"));
  assert.doesNotMatch(
    JSON.stringify(log),
    /local-subscription|remote-payment|remote-subscription|invoice-id/,
  );
});

test("ambiguous OR lookup cannot associate another local attempt", async (t) => {
  const info = t.mock.method(console, "info", () => {});
  for (const local of [
    { id: "different", gateway: "mercadopago", gateway_subscription_id: "remote-subscription" },
    { id: "local-subscription", gateway: "mercadopago", gateway_subscription_id: "different" },
    { id: "local-subscription", gateway: "other", gateway_subscription_id: null },
    null,
  ]) {
    await observeAuthorizedPayment({
      resourceId: "invoice-id",
      gateway: { getAuthorizedPayment: async () => payment },
      repository: { findSubscriptionByGatewayReference: async () => local },
    });
  }
  for (const call of info.mock.calls) {
    assert.equal(call.arguments[1].correlation, "unresolved");
    assert.equal(call.arguments[1].attempt_ref, undefined);
  }
});

test("missing references skip database lookup; unavailable reads do not throw or expose details", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  t.mock.method(console, "info", () => {});
  const repository = {
    findSubscriptionByGatewayReference: async () => {
      throw new Error("lookup must not run");
    },
  };
  await observeAuthorizedPayment({
    resourceId: "invoice-id",
    repository,
    gateway: {
      getAuthorizedPayment: async () => ({ ...payment, external_reference: null }),
    },
  });
  assert.equal(warn.mock.callCount(), 0);
  await observeAuthorizedPayment({
    resourceId: "invoice-id",
    repository,
    gateway: {
      getAuthorizedPayment: async () => {
        throw new Error("private-provider-token");
      },
    },
  });
  assert.equal(warn.mock.callCount(), 1);
  assert.equal(warn.mock.calls[0].arguments[1].result, "unavailable");
  assert.doesNotMatch(JSON.stringify(warn.mock.calls[0].arguments), /private-provider-token/);
});
