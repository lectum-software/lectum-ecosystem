import assert from "node:assert/strict";
import test from "node:test";
import type { StripeCanonicalSubscription } from "../payment-gateway/stripe-types";
import {
  isCurrentOriginalCheckoutPaymentComplete,
  isOriginalCheckoutCaptureComplete,
  type OriginalCheckoutReceipt,
  unresolvedTerminalCheckoutUpdate,
} from "./checkout-completion";
import { resolveStripeEntitlement } from "./policy";
import { TERMINAL_OPERATION_STATES } from "./recovery-policy";

const now = new Date("2026-11-09T12:00:00Z");
const operation = {
  kind: "checkout",
  intent: "subscription",
  intent_kind: "payment",
  provider_intent_id: "pi_original",
};
const proof: NonNullable<OriginalCheckoutReceipt> = {
  receiptId: "receipt-unit",
  invoiceId: "in_original",
  invoicePaymentId: "inpay_original",
  paymentIntentId: "pi_original",
  amountCents: 2990,
  paidAt: new Date("2026-10-01T12:00:00Z"),
  invoicePaidAt: new Date("2026-10-01T12:00:00Z"),
};
const expired: StripeCanonicalSubscription = {
  accountId: "acct_unit",
  mode: "test",
  subscriptionId: "sub_unit",
  customerId: "cus_unit",
  localSubscriptionId: "local-unit",
  attemptId: "operation-unit",
  priceId: "price_unit",
  amountCents: 2990,
  currency: "BRL",
  interval: "month",
  status: "inativa",
  gatewayStatus: "active",
  currentPeriodStart: new Date("2026-10-01T12:00:00Z"),
  currentPeriodEnd: new Date("2026-11-01T12:00:00Z"),
  cancelAtPeriodEnd: false,
  trialEnd: null,
  defaultPaymentMethodId: "pm_unit",
  latestInvoiceId: "in_original",
  latestInvoicePaid: true,
  latestInvoiceAmountPaid: 2990,
  latestInvoicePaidAt: proof.paidAt,
  latestInvoicePaymentPaidAt: proof.paidAt,
  latestInvoicePeriodStart: new Date("2026-10-01T12:00:00Z"),
  latestInvoicePeriodEnd: new Date("2026-11-01T12:00:00Z"),
  latestInvoicePaymentVerified: true,
  latestInvoiceRefundedCents: 0,
  latestInvoiceDisputed: false,
};

test("verified original capture closes expired checkout without reviving paid access", () => {
  assert.equal(isOriginalCheckoutCaptureComplete(operation, proof, 2990, now), true);
  assert.deepEqual(
    resolveStripeEntitlement(expired, { status: "inativa", current_period_end: null }, now),
    { status: "inativa", currentPeriodEnd: null },
  );
});

for (const [label, adjustment] of [
  ["partial refund", { latestInvoiceRefundedCents: 500 }],
  ["full refund", { latestInvoiceRefundedCents: 2990 }],
  ["dispute", { latestInvoiceDisputed: true }],
] as const)
  test(`${label} does not erase validated original gross capture or grant access`, () => {
    assert.equal(isOriginalCheckoutCaptureComplete(operation, proof, 2990, now), true);
    const remote = {
      ...expired,
      latestInvoicePeriodEnd: new Date("2026-12-01T12:00:00Z"),
      ...adjustment,
    };
    assert.deepEqual(
      resolveStripeEntitlement(remote, { status: "inativa", current_period_end: null }, now),
      { status: "inativa", currentPeriodEnd: null },
    );
  });

test("renewal PI, mismatched amount, missing proof and invalid receipt identity cannot close original checkout", () => {
  assert.equal(isOriginalCheckoutCaptureComplete(operation, null, 2990, now), false);
  assert.equal(
    isOriginalCheckoutCaptureComplete(
      operation,
      { ...proof, paymentIntentId: "pi_renewal" },
      2990,
      now,
    ),
    false,
  );
  assert.equal(isOriginalCheckoutCaptureComplete(operation, proof, 3990, now), false);
  assert.equal(
    isOriginalCheckoutCaptureComplete(operation, { ...proof, amountCents: 0 }, 0, now),
    false,
  );
  assert.equal(
    isOriginalCheckoutCaptureComplete(
      operation,
      { ...proof, invoicePaymentId: "unverified" },
      2990,
      now,
    ),
    false,
  );
  for (const change of [
    { kind: "payment_method" },
    { intent: "courtesy_renewal" },
    { intent_kind: "setup" },
    { provider_intent_id: null },
  ])
    assert.equal(
      isOriginalCheckoutCaptureComplete({ ...operation, ...change }, proof, 2990, now),
      false,
    );
});

test("each future or invalid capture timestamp fails closed independently", () => {
  for (const change of [
    { paidAt: new Date("2027-01-01T00:00:00Z") },
    { invoicePaidAt: new Date("2027-01-01T00:00:00Z") },
    { paidAt: new Date(Number.NaN) },
    { invoicePaidAt: new Date(Number.NaN) },
  ])
    assert.equal(
      isOriginalCheckoutCaptureComplete(operation, { ...proof, ...change }, 2990, now),
      false,
    );
});

test("original capture preserves allocation after invoice transition without changing either timestamp", () => {
  const independentlyTimed = {
    ...proof,
    paidAt: new Date("2026-11-03T10:53:18.000Z"),
    invoicePaidAt: new Date("2026-11-03T08:15:13.000Z"),
  };
  const before = { ...independentlyTimed };
  assert.equal(isOriginalCheckoutCaptureComplete(operation, independentlyTimed, 2990, now), true);
  assert.deepEqual(independentlyTimed, before);
  assert.equal(
    isOriginalCheckoutCaptureComplete(operation, independentlyTimed, 2990, new Date(Number.NaN)),
    false,
  );
});

test("historical operation completion cannot reactivate a canceled subscription", () => {
  assert.equal(isOriginalCheckoutCaptureComplete(operation, proof, 2990, now), true);
  assert.deepEqual(
    resolveStripeEntitlement(expired, { status: "cancelada", current_period_end: null }, now),
    { status: "cancelada", currentPeriodEnd: null },
  );
});

test("current paid renewal cannot complete a different original payment intent", () => {
  const current = {
    ...expired,
    latestInvoicePaidAt: new Date("2026-11-01T12:00:00Z"),
    latestInvoicePeriodStart: new Date("2026-11-01T12:00:00Z"),
    latestInvoicePeriodEnd: new Date("2026-12-01T12:00:00Z"),
    latestInvoicePaymentIntentId: "pi_original",
  };
  assert.equal(isCurrentOriginalCheckoutPaymentComplete(operation, current, "ativa", now), true);
  for (const latestInvoicePaymentIntentId of [null, undefined, "pi_renewal"])
    assert.equal(
      isCurrentOriginalCheckoutPaymentComplete(
        operation,
        { ...current, latestInvoicePaymentIntentId },
        "ativa",
        now,
      ),
      false,
    );
  assert.equal(
    isCurrentOriginalCheckoutPaymentComplete(
      operation,
      { ...current, latestInvoicePaymentVerified: false },
      "ativa",
      now,
    ),
    false,
  );
  assert.equal(
    isCurrentOriginalCheckoutPaymentComplete(operation, current, "cancelada", now),
    true,
  );
  assert.equal(
    isCurrentOriginalCheckoutPaymentComplete(
      { ...operation, intent_kind: "setup" },
      current,
      "ativa",
      now,
    ),
    false,
  );
});

test("original paid capture completes a canceled checkout without restoring sticky canceled access", () => {
  const current = {
    ...expired,
    cancelAtPeriodEnd: true,
    latestInvoicePeriodEnd: new Date("2026-12-01T12:00:00Z"),
    latestInvoicePaymentIntentId: operation.provider_intent_id,
  };
  for (const gatewayStatus of ["active", "canceled"] as const) {
    const remote = { ...current, gatewayStatus };
    const state = resolveStripeEntitlement(
      remote,
      { status: "cancelada", current_period_end: null },
      now,
    );
    assert.deepEqual(state, { status: "cancelada", currentPeriodEnd: null });
    assert.equal(
      isCurrentOriginalCheckoutPaymentComplete(operation, remote, state.status, now),
      true,
    );
  }
  for (const change of [
    { latestInvoicePaymentIntentId: "pi_renewal" },
    { latestInvoicePaymentIntentId: null },
    { latestInvoicePaymentVerified: false },
    { latestInvoicePaidAt: new Date("2026-12-01T12:00:00Z") },
    { latestInvoicePaymentPaidAt: new Date("2026-12-01T12:00:00Z") },
    { latestInvoicePaymentPaidAt: undefined },
    { latestInvoicePeriodEnd: new Date("2026-11-01T12:00:00Z") },
    { latestInvoiceRefundedCents: 500 },
    { latestInvoiceDisputed: true },
  ])
    assert.equal(
      isCurrentOriginalCheckoutPaymentComplete(
        operation,
        { ...current, ...change },
        "cancelada",
        now,
      ),
      false,
    );
});

test("terminal subscription without original capture proof remains recoverable until ledger reconciliation", () => {
  for (const state of ["creating", "processing", "requires_confirmation", "review_required"]) {
    const pending = { ...operation, state };
    assert.deepEqual(unresolvedTerminalCheckoutUpdate(pending, now), {
      state: "review_required",
      completed_at: null,
      last_error_code: "original_payment_unresolved",
    });
    assert.equal(TERMINAL_OPERATION_STATES.includes("review_required"), false);
    assert.equal(isOriginalCheckoutCaptureComplete(pending, null, 2990, now), false);
    // A later exact original receipt can complete the same open operation, not grant access.
    assert.equal(isOriginalCheckoutCaptureComplete(pending, proof, 2990, now), true);
  }
});

test("terminal observation preserves courtesy failure semantics and never reopens old terminal operations", () => {
  assert.deepEqual(
    unresolvedTerminalCheckoutUpdate(
      { ...operation, intent: "courtesy_renewal", state: "processing" },
      now,
    ),
    { state: "failed", completed_at: now, last_error_code: null },
  );
  for (const state of ["complete", "failed"])
    assert.equal(unresolvedTerminalCheckoutUpdate({ ...operation, state }, now), null);
});
