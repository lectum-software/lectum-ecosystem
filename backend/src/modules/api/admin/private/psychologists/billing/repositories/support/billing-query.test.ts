import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isConfirmedPaymentStatus,
  toAmountCents,
  toPaymentMethodBrandLabel,
  valueContainsReference,
} from "./billing-query";

test("admin payment matching requires an exact, named subscription reference", () => {
  assert.equal(valueContainsReference({ preapproval_id: "sub-1234" }, ["sub-123"]), false);
  assert.equal(valueContainsReference({ note: "sub-123" }, ["sub-123"]), false);
  assert.equal(valueContainsReference({ preapproval_id: "sub-123" }, ["sub-123"]), true);
});

test("admin does not count unpaid or unauthorized statuses as paid", () => {
  for (const status of [
    "unpaid",
    "unauthorized",
    "not_approved",
    "refunded",
    "pending",
    "rejected",
  ]) {
    assert.equal(isConfirmedPaymentStatus({ status }), false);
  }
  assert.equal(isConfirmedPaymentStatus({ action: "payment.updated", status: "approved" }), true);
});

test("admin amount parsing rejects malformed values instead of stripping characters", () => {
  for (const value of ["USD29.90", "1e3", "29.9.0", "", "Infinity", -1]) {
    assert.equal(toAmountCents(value), null);
  }
  assert.equal(toAmountCents("29.90"), 2990);
  assert.equal(toAmountCents("29,90"), 2990);
});

test("admin card brand display does not expose arbitrary provider strings or inherited values", () => {
  for (const value of ["constructor", "__proto__", "provider internal diagnostic"]) {
    assert.equal(toPaymentMethodBrandLabel(value), null);
  }
  assert.equal(toPaymentMethodBrandLabel("visa"), "Visa");
});
