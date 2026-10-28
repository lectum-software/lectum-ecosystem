import assert from "node:assert/strict";
import { test } from "node:test";
import {
  observeAuthorizedPayment,
  shouldObserveAuthorizedPayment,
} from "./observe-authorized-payment";
import { AuthorizedPaymentReadError } from "./payment-gateway/authorized-payment";
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
  assert.equal(Number.isSafeInteger(log.elapsed_ms), true);
  assert.ok(log.elapsed_ms >= 0);
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
  assert.equal(warn.mock.calls[0].arguments[1].stage, "provider_get");
  assert.equal(warn.mock.calls[0].arguments[1].failure_kind, "unexpected");
  assert.doesNotMatch(JSON.stringify(warn.mock.calls[0].arguments), /private-provider-token/);
});

test("observer preserves safe read categories and distinguishes local lookup failure", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const now = t.mock.method(performance, "now", () => 10);
  const failures = [
    new AuthorizedPaymentReadError("resource_validation", "invalid_resource"),
    new AuthorizedPaymentReadError("provider_get", "timeout"),
    new AuthorizedPaymentReadError("provider_get", "network"),
    new AuthorizedPaymentReadError("provider_get", "http", 429),
    new AuthorizedPaymentReadError("provider_get", "invalid_json", 200),
  ];
  for (const failure of failures) {
    await observeAuthorizedPayment({
      resourceId: "private-invoice-id",
      gateway: {
        getAuthorizedPayment: async () => {
          throw failure;
        },
      },
      repository: {
        findSubscriptionByGatewayReference: async () => {
          assert.fail("lookup must not run after GET failure");
        },
      },
    });
    const fields = warn.mock.calls.at(-1)!.arguments[1];
    assert.equal(fields.stage, failure.stage);
    assert.equal(fields.failure_kind, failure.failureKind);
    assert.equal(fields.http_status, failure.httpStatus);
    assert.equal(fields.elapsed_ms, 0);
  }
  now.mock.mockImplementation(() => 10);
  await observeAuthorizedPayment({
    resourceId: "private-invoice-id",
    gateway: { getAuthorizedPayment: async () => payment },
    repository: {
      findSubscriptionByGatewayReference: async () => {
        now.mock.mockImplementation(() => 25.4);
        throw new Error("SQL SELECT credential user@example.invalid");
      },
    },
  });
  const fields = warn.mock.calls.at(-1)!.arguments[1];
  assert.equal(fields.stage, "local_lookup");
  assert.equal(fields.failure_kind, "lookup_failed");
  assert.equal(fields.elapsed_ms, 15);
  assert.equal(fields.http_status, undefined);
  assert.equal(fields.result, "unavailable");
  assert.doesNotMatch(JSON.stringify(warn.mock.calls), /SQL|credential|example|private-invoice-id/);
});
