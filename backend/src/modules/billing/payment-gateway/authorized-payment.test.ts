import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorizedPaymentId, projectAuthorizedPayment } from "./authorized-payment";

test("authorized payment projection distinguishes invoice status and strips all other fields", () => {
  assert.deepEqual(
    projectAuthorizedPayment({
      preapproval_id: "subscription-local-test",
      external_reference: "attempt-local-test",
      status: "scheduled",
      payer_email: "not-returned@example.invalid",
      payment: {
        id: 123,
        status: "rejected",
        status_detail: "cc_rejected_high_risk",
        card: { last_four_digits: "not-returned" },
      },
    }),
    {
      gateway_subscription_id: "subscription-local-test",
      gateway_payment_id: "123",
      external_reference: "attempt-local-test",
      status: "rejected",
      status_detail: "cc_rejected_high_risk",
    },
  );
});

test("missing payment does not become invoice scheduled status or an approval", () => {
  const empty = {
    gateway_subscription_id: null,
    gateway_payment_id: null,
    external_reference: null,
    status: null,
    status_detail: null,
  };
  for (const input of [null, undefined, {}, [], { status: "scheduled" }, { payment: [] }]) {
    assert.deepEqual(projectAuthorizedPayment(input), empty);
  }
  assert.deepEqual(
    projectAuthorizedPayment({
      preapproval_id: "unsafe\n",
      external_reference: "https://example.invalid",
      payment: { id: Number.MAX_SAFE_INTEGER + 1, status: "approved\n", status_detail: {} },
    }),
    empty,
  );
});

test("authorized payment identifiers cannot alter fixed API path or carry control characters", () => {
  for (const input of ["123", "abc-def_123", "x".repeat(128)]) {
    assert.equal(isAuthorizedPaymentId(input), true);
  }
  for (const input of ["", "x".repeat(129), "../users/me", "abc?x=1", "abc\n", "á", 123]) {
    assert.equal(isAuthorizedPaymentId(input), false);
  }
});
