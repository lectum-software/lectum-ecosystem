import assert from "node:assert/strict";
import { test } from "node:test";
import { StripeGatewayError } from "../payment-gateway/stripe-error";
import type { StripeCanonicalSubscription } from "../payment-gateway/stripe-types";
import {
  hasPaidCurrentPeriod,
  isCourtesySetupVerified,
  preserveStripeCardPolicyRejection,
  resolveStripeEntitlement,
  stripeCardPolicyPublicError,
} from "./policy";

const now = new Date("2026-11-09T12:00:00.000Z");
const paid: StripeCanonicalSubscription = {
  accountId: "acct_unit",
  mode: "test",
  subscriptionId: "sub_unit",
  customerId: "cus_unit",
  localSubscriptionId: "local-unit",
  attemptId: "attempt-unit",
  priceId: "price_unit",
  amountCents: 2990,
  currency: "BRL",
  interval: "month",
  status: "ativa",
  gatewayStatus: "active",
  currentPeriodStart: new Date("2026-11-01T00:00:00Z"),
  currentPeriodEnd: new Date("2026-12-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  trialEnd: null,
  defaultPaymentMethodId: "pm_unit",
  latestInvoiceId: "in_unit",
  latestInvoicePaid: true,
  latestInvoiceAmountPaid: 2990,
  latestInvoicePaidAt: new Date("2026-11-01T00:00:01Z"),
  latestInvoicePaymentPaidAt: new Date("2026-11-01T00:00:02Z"),
  latestInvoicePeriodStart: new Date("2026-11-01T00:00:00Z"),
  latestInvoicePeriodEnd: new Date("2026-12-01T00:00:00Z"),
  latestInvoicePaymentVerified: true,
  latestInvoiceRefundedCents: 0,
  latestInvoiceDisputed: false,
};
const inactive = { status: "inativa", current_period_end: null };

test("entitlement uses a verified positive paid invoice period, never subscription future period", () => {
  assert.equal(hasPaidCurrentPeriod(paid, now), true);
  assert.deepEqual(
    resolveStripeEntitlement(
      { ...paid, currentPeriodEnd: new Date("2027-01-01T00:00:00Z") },
      inactive,
      now,
    ),
    { status: "ativa", currentPeriodEnd: paid.latestInvoicePeriodEnd },
  );
  for (const change of [
    { latestInvoicePaymentVerified: false },
    { latestInvoicePaid: false },
    { latestInvoiceAmountPaid: 0 },
    { latestInvoiceRefundedCents: 1 },
    { latestInvoiceDisputed: true },
    { latestInvoicePeriodEnd: new Date("2026-11-01T00:00:00Z") },
    { latestInvoicePeriodStart: new Date("2026-12-01T00:00:00Z") },
    { latestInvoicePaidAt: new Date("2027-01-01T00:00:00Z") },
    { latestInvoicePaidAt: null },
    { latestInvoicePaidAt: new Date(Number.NaN) },
    { latestInvoicePaymentPaidAt: new Date("2027-01-01T00:00:00Z") },
    { latestInvoicePaymentPaidAt: undefined },
    { latestInvoicePaymentPaidAt: null },
    { latestInvoicePaymentPaidAt: new Date(Number.NaN) },
  ]) {
    assert.equal(hasPaidCurrentPeriod({ ...paid, ...change }, now), false);
    assert.deepEqual(resolveStripeEntitlement({ ...paid, ...change }, inactive, now), {
      status: "inativa",
      currentPeriodEnd: null,
    });
  }
});

test("entitlement preserves independent paid transitions in either order and denies either future fact", () => {
  for (const [invoiceAt, paymentAt] of [
    ["2026-11-03T08:15:13Z", "2026-11-03T10:53:18Z"],
    ["2026-11-03T10:53:18Z", "2026-11-03T08:15:13Z"],
  ]) {
    const remote = {
      ...paid,
      latestInvoicePaidAt: new Date(invoiceAt),
      latestInvoicePaymentPaidAt: new Date(paymentAt),
    };
    const before = { ...remote };
    assert.equal(hasPaidCurrentPeriod(remote, now), true);
    assert.equal(hasPaidCurrentPeriod(remote, new Date("2026-11-03T09:00:00Z")), false);
    assert.deepEqual(remote, before);
  }
  assert.equal(
    hasPaidCurrentPeriod(
      { ...paid, latestInvoicePaidAt: now, latestInvoicePaymentPaidAt: now },
      now,
    ),
    true,
  );
  assert.equal(hasPaidCurrentPeriod(paid, new Date(Number.NaN)), false);
});

test("trial, incomplete and setup success do not grant a paid entitlement", () => {
  for (const gatewayStatus of ["trialing", "incomplete"]) {
    assert.deepEqual(resolveStripeEntitlement({ ...paid, gatewayStatus }, inactive, now), {
      status: "inativa",
      currentPeriodEnd: null,
    });
  }
});

test("late canonical responses never reopen cancellation or extend its existing paid period", () => {
  const end = new Date("2026-11-20T00:00:00Z");
  assert.deepEqual(
    resolveStripeEntitlement(paid, { status: "cancelada", current_period_end: end }, now),
    { status: "cancelada", currentPeriodEnd: end },
  );
  assert.deepEqual(
    resolveStripeEntitlement(paid, { status: "cancelada", current_period_end: null }, now),
    { status: "cancelada", currentPeriodEnd: null },
  );
  assert.deepEqual(resolveStripeEntitlement({ ...paid, cancelAtPeriodEnd: true }, inactive, now), {
    status: "cancelada",
    currentPeriodEnd: paid.latestInvoicePeriodEnd,
  });
});

test("courtesy completion requires its pinned successful setup and assigned matching default method", () => {
  const start = new Date("2026-12-01T00:00:00Z");
  const remote = { ...paid, gatewayStatus: "trialing", trialEnd: start };
  const setup = {
    setupIntentId: "seti_pinned",
    customerId: paid.customerId,
    attemptId: null,
    subscriptionId: null,
    localSubscriptionId: null,
    status: "succeeded",
    paymentMethodId: paid.defaultPaymentMethodId,
    accountId: paid.accountId,
    mode: paid.mode,
  };
  const input = {
    intent: "courtesy_renewal",
    intentKind: "setup",
    pinnedIntentId: "seti_pinned",
    verifiedCreditSetupId: "seti_pinned",
    scheduledStart: start,
    previousStatus: "inativa",
    remote,
    setup,
  };
  assert.equal(isCourtesySetupVerified(input), true);
  assert.equal(isCourtesySetupVerified({ ...input, verifiedCreditSetupId: undefined }), false);
  assert.equal(isCourtesySetupVerified({ ...input, verifiedCreditSetupId: "seti_other" }), false);
  assert.equal(isCourtesySetupVerified({ ...input, setup: null }), false);
  assert.equal(isCourtesySetupVerified({ ...input, pinnedIntentId: "seti_other" }), false);
  assert.equal(
    isCourtesySetupVerified({ ...input, setup: { ...setup, status: "processing" } }),
    false,
  );
  assert.equal(
    isCourtesySetupVerified({ ...input, setup: { ...setup, customerId: "cus_other" } }),
    false,
  );
  assert.equal(isCourtesySetupVerified({ ...input, setup: { ...setup, mode: "live" } }), false);
  assert.equal(
    isCourtesySetupVerified({
      ...input,
      remote: { ...remote, defaultPaymentMethodId: "pm_other" },
    }),
    false,
  );
  assert.equal(isCourtesySetupVerified({ ...input, previousStatus: "cancelada" }), false);
  assert.equal(
    isCourtesySetupVerified({ ...input, scheduledStart: new Date("2026-12-02T00:00:00Z") }),
    false,
  );
});

test("only the closed card funding failure becomes a friendly credit-only error", () => {
  const error = stripeCardPolicyPublicError(new StripeGatewayError("card_credit_required", 400));
  assert.equal(error?.code, "billing_payment_method_credit_card_only");
  assert.equal(error?.status, 400);
  assert.equal(
    stripeCardPolicyPublicError(new StripeGatewayError("provider_unavailable", 400)),
    null,
  );
  assert.equal(
    stripeCardPolicyPublicError({ kind: "card_credit_required", raw: "not exposed" }),
    null,
  );
});

test("read-only reconciliation and generic failures preserve the known card policy rejection", () => {
  for (const nextCode of [null, "setup_resume_unresolved", "checkout_resume_unresolved"] as const) {
    assert.equal(
      preserveStripeCardPolicyRejection("card_credit_required", nextCode),
      "card_credit_required",
    );
    assert.equal(preserveStripeCardPolicyRejection(null, nextCode), nextCode);
    assert.equal(preserveStripeCardPolicyRejection("unknown", nextCode), nextCode);
  }
  assert.equal(
    preserveStripeCardPolicyRejection(null, "card_credit_required"),
    "card_credit_required",
  );
});
