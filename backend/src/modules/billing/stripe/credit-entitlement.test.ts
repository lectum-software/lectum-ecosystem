import assert from "node:assert/strict";
import { test } from "node:test";
import type { StripeFinancialReceipt } from "../payment-gateway/stripe-financial-types";
import type { StripeCanonicalSubscription } from "../payment-gateway/stripe-types";
import {
  mayPreserveCreditEntitlement,
  projectPreservedCreditEntitlement,
} from "./credit-entitlement";

const now = new Date("2026-11-10T12:00:00Z");
const previous = {
  id: "local-credit-unit",
  status: "ativa",
  current_period_end: new Date("2026-12-01T00:00:00Z"),
  collection_policy: "manual_credit_v1",
};
const unpaid: StripeCanonicalSubscription = {
  accountId: "acct_unit",
  mode: "test",
  subscriptionId: "sub_unit",
  customerId: "cus_unit",
  localSubscriptionId: previous.id,
  attemptId: "attempt-unit",
  priceId: "price_unit",
  amountCents: 2990,
  currency: "BRL",
  interval: "month",
  status: "inativa",
  gatewayStatus: "active",
  currentPeriodStart: new Date("2026-12-01T00:00:00Z"),
  currentPeriodEnd: new Date("2027-01-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  trialEnd: null,
  defaultPaymentMethodId: "pm_unit",
  latestInvoiceId: "in_next",
  latestInvoicePaid: false,
  latestInvoiceAmountPaid: 0,
  latestInvoicePaidAt: null,
  latestInvoicePaymentPaidAt: null,
  latestInvoicePeriodStart: new Date("2026-12-01T00:00:00Z"),
  latestInvoicePeriodEnd: new Date("2027-01-01T00:00:00Z"),
  latestInvoicePaymentVerified: false,
  latestInvoiceRefundedCents: 0,
  latestInvoiceDisputed: false,
};
const receipt: StripeFinancialReceipt = {
  accountId: unpaid.accountId,
  mode: unpaid.mode,
  subscriptionId: unpaid.subscriptionId,
  localSubscriptionId: previous.id,
  customerId: unpaid.customerId,
  priceId: unpaid.priceId,
  amountCents: 2990,
  invoiceId: "in_paid",
  invoicePaymentId: "inpay_unit",
  paymentIntentId: "pi_unit",
  chargeId: "ch_unit",
  currency: "BRL",
  paidAt: new Date("2026-11-01T00:00:02Z"),
  invoicePaidAt: new Date("2026-11-01T00:00:01Z"),
  periodStart: new Date("2026-11-01T00:00:00Z"),
  periodEnd: previous.current_period_end,
  refundedCents: 0,
  currentState: "paid",
  disputeStatus: "none",
};

test("fresh prior receipt preserves only existing paid-through when latest is unpaid/future", () => {
  const before = structuredClone(unpaid);
  assert.equal(mayPreserveCreditEntitlement(previous, unpaid, now), true);
  assert.deepEqual(projectPreservedCreditEntitlement(previous, unpaid, receipt, now), {
    status: "ativa",
    currentPeriodEnd: previous.current_period_end,
    invoiceId: receipt.invoiceId,
  });
  assert.deepEqual(unpaid, before);
  assert.equal(unpaid.latestInvoicePaymentVerified, false);
  assert.equal(unpaid.latestInvoicePaid, false);
});

test("evidence never extends existing period and respects a shorter verified period", () => {
  const earlierEnd = new Date("2026-11-20T00:00:00Z");
  assert.deepEqual(
    projectPreservedCreditEntitlement(
      { ...previous, current_period_end: earlierEnd },
      unpaid,
      receipt,
      now,
    )?.currentPeriodEnd,
    earlierEnd,
  );
  assert.deepEqual(
    projectPreservedCreditEntitlement(previous, unpaid, { ...receipt, periodEnd: earlierEnd }, now)
      ?.currentPeriodEnd,
    earlierEnd,
  );
});

test("cancellation stays canceled and can never restore a removed paid period", () => {
  for (const [local, remote] of [
    [{ ...previous, status: "cancelada" }, unpaid],
    [previous, { ...unpaid, gatewayStatus: "canceled" }],
    [previous, { ...unpaid, cancelAtPeriodEnd: true }],
  ] as const) {
    const proof = projectPreservedCreditEntitlement(local, remote, receipt, now);
    assert.equal(proof?.status, "cancelada");
    assert.deepEqual(proof?.currentPeriodEnd, previous.current_period_end);
  }
  assert.equal(
    projectPreservedCreditEntitlement(
      { ...previous, status: "cancelada", current_period_end: null },
      unpaid,
      receipt,
      now,
    ),
    null,
  );
});

test("expired, absent, legacy and courtesy/incomplete periods never use preservation", () => {
  for (const change of [
    { current_period_end: null },
    { current_period_end: now },
    { current_period_end: new Date("2026-11-01T00:00:00Z") },
    { current_period_end: new Date(Number.NaN) },
    { collection_policy: null },
    { collection_policy: "unknown" },
  ])
    assert.equal(
      projectPreservedCreditEntitlement({ ...previous, ...change }, unpaid, receipt, now),
      null,
    );
  for (const gatewayStatus of ["trialing", "incomplete", "incomplete_expired", "unknown"])
    assert.equal(
      projectPreservedCreditEntitlement(previous, { ...unpaid, gatewayStatus }, receipt, now),
      null,
    );
  assert.equal(
    projectPreservedCreditEntitlement(previous, unpaid, receipt, new Date(Number.NaN)),
    null,
  );
});

test("a paid/latest refunded or disputed invoice never falls back to an older receipt", () => {
  for (const change of [
    { latestInvoicePaid: true },
    { latestInvoiceAmountPaid: 1 },
    { latestInvoicePaymentVerified: true },
    { latestInvoiceRefundedCents: 1 },
    { latestInvoiceDisputed: true },
  ])
    assert.equal(
      projectPreservedCreditEntitlement(previous, { ...unpaid, ...change }, receipt, now),
      null,
    );
  for (const change of [
    { refundedCents: 1 },
    { currentState: "partially_refunded" as const },
    { currentState: "refunded" as const },
    { currentState: "disputed" as const },
    { disputeStatus: "observed" as const },
  ])
    assert.equal(
      projectPreservedCreditEntitlement(previous, unpaid, { ...receipt, ...change }, now),
      null,
    );
});

test("receipt proof is isolated by merchant, mode, contract, customer and exact price", () => {
  for (const change of [
    { accountId: "acct_other" },
    { mode: "live" as const },
    { subscriptionId: "sub_other" },
    { localSubscriptionId: "local-other" },
    { customerId: "cus_other" },
    { priceId: "price_other" },
    { amountCents: 3990 },
    { amountCents: 0 },
    { amountCents: 29.9 },
  ])
    assert.equal(
      projectPreservedCreditEntitlement(previous, unpaid, { ...receipt, ...change }, now),
      null,
    );
  assert.equal(
    projectPreservedCreditEntitlement({ ...previous, id: "local-other" }, unpaid, receipt, now),
    null,
  );
});

test("current coverage needs both actual paid transitions and excludes future/ended receipt periods", () => {
  assert.equal(
    projectPreservedCreditEntitlement(
      { ...previous, collection_policy: "manual_credit_cancel_requested_v1" },
      { ...unpaid, cancelAtPeriodEnd: true },
      receipt,
      now,
    )?.status,
    "cancelada",
  );
  for (const change of [
    { paidAt: new Date(now.getTime() + 1) },
    { invoicePaidAt: new Date(now.getTime() + 1) },
    { paidAt: new Date(Number.NaN) },
    { invoicePaidAt: new Date(Number.NaN) },
    { periodStart: new Date(now.getTime() + 1) },
    { periodEnd: now },
    { periodStart: receipt.periodEnd },
    { periodEnd: new Date(Number.NaN) },
  ])
    assert.equal(
      projectPreservedCreditEntitlement(previous, unpaid, { ...receipt, ...change }, now),
      null,
    );
  assert.equal(
    projectPreservedCreditEntitlement(
      previous,
      unpaid,
      { ...receipt, paidAt: now, invoicePaidAt: now },
      now,
    )?.status,
    "ativa",
  );
  for (const gatewayStatus of ["past_due", "paused", "unpaid"])
    assert.equal(
      projectPreservedCreditEntitlement(previous, { ...unpaid, gatewayStatus }, receipt, now)
        ?.status,
      "ativa",
    );
});
