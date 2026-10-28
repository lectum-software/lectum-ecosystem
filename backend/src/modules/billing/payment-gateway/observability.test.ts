import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePaymentGatewayError } from "./error-log";
import {
  billingReference,
  classifyBillingPayment,
  logBillingAttempt,
  logBillingFailure,
  logBillingResult,
} from "./observability";

test("billing correlation is stable, namespaced and never contains the source", () => {
  const reference = billingReference("attempt", "private-subscription-id");
  assert.match(reference, /^[a-f0-9]{24}$/);
  assert.equal(reference, billingReference("attempt", "private-subscription-id"));
  assert.notEqual(reference, billingReference("invoice", "private-subscription-id"));
});

test("payment classification distinguishes credential failures from risk without copying text", () => {
  assert.equal(classifyBillingPayment("rejected", "invalid_credentials"), "credential_rejected");
  assert.equal(classifyBillingPayment("rejected", "cc_rejected_high_risk"), "risk_rejected");
  assert.equal(
    classifyBillingPayment("rejected", "cc_rejected_max_attempts"),
    "attempt_limit_rejected",
  );
  assert.equal(classifyBillingPayment("approved", "accredited"), "approved");
  assert.equal(classifyBillingPayment("rejected", "private-text"), "rejected_other");
  assert.equal(classifyBillingPayment("private-text", "private-text"), "unclassified");
});

test("error codes use a closed allowlist, not merely an alphanumeric format", () => {
  const log = sanitizePaymentGatewayError({
    status: 400,
    status_detail: "private_customer_name",
    cause: [{ code: "private_card_token" }, { code: "cc_rejected_high_risk" }],
    message: "private-email@example.invalid",
  });
  assert.deepEqual(log, {
    name: "PaymentGatewayError",
    status: 400,
    cause_codes: ["cc_rejected_high_risk"],
  });
});

test("operation logs only contain explicit context, time and sanitized failure", (t) => {
  const info = t.mock.method(console, "info", () => {});
  const warn = t.mock.method(console, "warn", () => {});
  const context = {
    operation: "create_subscription" as const,
    subscriptionId: "private-subscription-id",
    deviceSessionPresent: true,
    token: "private-token",
  };
  logBillingAttempt(context);
  logBillingResult(context);
  logBillingFailure(context, { status: 400, message: "private-email@example.invalid" });
  for (const call of [...info.mock.calls, ...warn.mock.calls]) {
    const data = call.arguments[1];
    assert.doesNotMatch(JSON.stringify(data), /private-|@example/);
    assert.equal(data.attempt_ref, billingReference("attempt", context.subscriptionId));
    assert.equal(data.device_session_present, true);
    assert.match(data.observed_at, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test("local failure after provider response is not reported as a gateway rejection", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  logBillingFailure(
    { operation: "create_subscription", subscriptionId: "local", deviceSessionPresent: false },
    { message: "private-database-error", status: 400, status_detail: "cc_rejected_high_risk" },
    "local_after_gateway",
  );
  const log = warn.mock.calls[0].arguments[1];
  assert.equal(log.stage, "local_after_gateway");
  assert.equal(log.name, "BillingLocalPersistenceError");
  assert.equal(log.status_detail, undefined);
  assert.equal(log.status, undefined);
  assert.doesNotMatch(JSON.stringify(log), /private-database/);
});
