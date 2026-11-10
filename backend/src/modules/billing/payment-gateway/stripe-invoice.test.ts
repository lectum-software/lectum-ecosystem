import assert from "node:assert/strict";
import test from "node:test";
import { StripeGatewayError } from "./stripe-error";
import { stripePaidInvoiceSettlement } from "./stripe-invoice";

// Pure projection inputs only; actual invoice/PI/Charge evidence is validated in the sandbox.
const input = {
  invoicePaidAt: 1793693713,
  allocatedPaidAt: 1793703198,
  refunded: false,
  refundedCents: 0,
  disputed: false,
};

test("Stripe settlement preserves both transition facts without ordering or replacing receipt time", () => {
  for (const [invoicePaidAt, allocatedPaidAt] of [
    [input.invoicePaidAt, input.allocatedPaidAt],
    [input.allocatedPaidAt, input.invoicePaidAt],
    [input.invoicePaidAt, input.invoicePaidAt],
  ]) {
    const result = stripePaidInvoiceSettlement({ ...input, invoicePaidAt, allocatedPaidAt });
    assert.deepEqual(result, {
      paidAt: new Date(allocatedPaidAt * 1000),
      invoicePaidAt: new Date(invoicePaidAt * 1000),
      status: "approved",
    });
  }
});

test("Stripe settlement requires both finite provider timestamps and leaves cutoff to consumers", () => {
  for (const missing of [null, undefined, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => stripePaidInvoiceSettlement({ ...input, invoicePaidAt: missing }),
      StripeGatewayError,
    );
    assert.throws(
      () => stripePaidInvoiceSettlement({ ...input, allocatedPaidAt: missing }),
      StripeGatewayError,
    );
  }
  const future = 32472144000;
  assert.deepEqual(
    stripePaidInvoiceSettlement({ ...input, allocatedPaidAt: future }).paidAt,
    new Date(future * 1000),
  );
});

test("refunded flag or any refunded cents prevents an approved fiscal payment; dispute takes precedence", () => {
  for (const refund of [
    { refunded: true, refundedCents: 0 },
    { refunded: false, refundedCents: 1 },
    { refunded: true, refundedCents: 2990 },
  ]) {
    assert.equal(stripePaidInvoiceSettlement({ ...input, ...refund }).status, "refunded");
    assert.equal(
      stripePaidInvoiceSettlement({ ...input, ...refund, disputed: true }).status,
      "disputed",
    );
  }
});
