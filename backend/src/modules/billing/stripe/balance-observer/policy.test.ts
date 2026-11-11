import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { projectStripeFees } from "@/modules/api/admin/private/finance/fees/use-cases/projection";
import {
  assertBalanceCharge,
  projectBalanceFact,
} from "../../payment-gateway/stripe-balance-projection";
import { StripeGatewayError } from "../../payment-gateway/stripe-error";
import {
  feeNow,
  feesSnapshot,
  feeTarget,
  remoteFact,
  storedFact,
  storedObservation,
} from "./fixtures.test-support";
import {
  assertBalancePage,
  balanceFactHash,
  feeDiagnostic,
  safeFeeNumber,
  storedBalanceFactHash,
} from "./policy";

const tx = {
  id: "txn_localfinance",
  object: "balance_transaction",
  source: "ch_localfinance",
  type: "charge",
  currency: "brl",
  amount: 2990,
  fee: 158,
  net: 2832,
  created: Math.floor(feeNow.getTime() / 1000) - 100,
  available_on: Math.floor(feeNow.getTime() / 1000) + 86400,
  status: "pending",
} as Stripe.BalanceTransaction;
const expected = {
  id: tx.id,
  kind: "capture" as const,
  sourceId: feeTarget.chargeId,
  expectedAmount: 2990,
};
test("canonical BT retains signed exact cents, independent pending availability and immutable money hash", () => {
  const fact = projectBalanceFact(tx, feeTarget, expected, feeNow);
  assert.equal(fact.feeCents, 158n);
  assert.equal(fact.netCents, 2832n);
  const hash = balanceFactHash(feeTarget, fact);
  assert.equal(
    hash,
    balanceFactHash(feeTarget, { ...fact, status: "available", availableOn: feeNow }),
  );
  assert.notEqual(hash, balanceFactHash(feeTarget, { ...fact, feeCents: -158n, netCents: 3148n }));
  assert.equal(safeFeeNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n), null);
});
test("BT identity, source, currency, number safety, arithmetic, signs and dates fail closed", () => {
  for (const patch of [
    { id: "txn_other" },
    { source: "ch_other" },
    { currency: "usd" },
    { fee: 1.2 },
    { net: 2831 },
    { amount: 0 },
    { created: Math.floor(feeNow.getTime() / 1000) + 1 },
    { amount: Number.MAX_SAFE_INTEGER + 1 },
  ])
    assert.throws(
      () =>
        projectBalanceFact(
          { ...tx, ...patch } as Stripe.BalanceTransaction,
          feeTarget,
          expected,
          feeNow,
        ),
      StripeGatewayError,
    );
  const refund = {
    ...tx,
    id: "txn_refund",
    source: "re_local",
    type: "refund",
    amount: -2990,
    fee: 0,
    net: -2990,
  } as Stripe.BalanceTransaction;
  assert.equal(
    projectBalanceFact(
      refund,
      feeTarget,
      { id: refund.id, kind: "refund", sourceId: "re_local", expectedAmount: -2990 },
      feeNow,
    ).netCents,
    -2990n,
  );
  const reversal = {
    ...refund,
    id: "txn_reversal",
    type: "refund_failure",
    amount: 2990,
    fee: -158,
    net: 3148,
  } as Stripe.BalanceTransaction;
  assert.equal(
    projectBalanceFact(
      reversal,
      feeTarget,
      { id: reversal.id, kind: "refund_reversal", sourceId: "re_local", expectedAmount: 2990 },
      feeNow,
    ).feeCents,
    -158n,
  );
  const dispute = {
    ...tx,
    id: "txn_dispute",
    type: "adjustment",
    source: "dp_local",
    amount: 0,
    fee: 1500,
    net: -1500,
  } as Stripe.BalanceTransaction;
  assert.equal(
    projectBalanceFact(
      dispute,
      feeTarget,
      { id: dispute.id, kind: "dispute", sourceId: "dp_local" },
      feeNow,
    ).amountCents,
    0n,
  );
});
test("charge proves account/mode, PI/customer, paid captured card and exact amount", () => {
  const charge = {
    id: feeTarget.chargeId,
    livemode: false,
    payment_intent: feeTarget.paymentIntentId,
    customer: feeTarget.customerId,
    currency: "brl",
    status: "succeeded",
    paid: true,
    captured: true,
    amount_captured: 2990,
    payment_method_details: { type: "card" },
  } as Stripe.Charge;
  assert.doesNotThrow(() => assertBalanceCharge(charge, feeTarget, feeTarget));
  for (const patch of [
    { livemode: true },
    { amount_captured: 3990 },
    { customer: "cus_other" },
    { payment_intent: "pi_other" },
    { captured: false },
    { paid: false },
  ])
    assert.throws(
      () => assertBalanceCharge({ ...charge, ...patch }, feeTarget, feeTarget),
      StripeGatewayError,
    );
  assert.throws(
    () => assertBalanceCharge(charge, { ...feeTarget, accountId: "acct_other" }, feeTarget),
    StripeGatewayError,
  );
  assert.equal(
    feeDiagnostic(new StripeGatewayError("provider_unavailable", 403)),
    "read_access_denied",
  );
});
test("missing fees remain unknown, refunded receipts retain original capture fee, and totals never become full account costs", () => {
  const missing = projectStripeFees(feesSnapshot(), { page: 1, limit: 20 });
  assert.equal(missing.items[0].capture, null);
  assert.equal(missing.summary.observed_capture_fee_cents, null);
  assert.equal(missing.summary.capture_missing_count, 1);
  const snapshot = feesSnapshot({
    facts: [
      storedFact(),
      storedFact({
        id: "fact-refund",
        provider_transaction_id: "txn_refund",
        kind: "refund",
        source_id: "re_local",
        amount_cents: -2990n,
        fee_cents: 0n,
        net_cents: -2990n,
      }),
    ],
    observations: [storedObservation()],
  });
  snapshot.receipts[0].row.current_state = "refunded";
  snapshot.receipts[0].row.refunded_cents = 2990;
  const view = projectStripeFees(snapshot, { page: 9999, limit: 20 });
  assert.equal(view.pagination.page, 1);
  assert.equal(view.items[0].capture?.fee_cents, 158);
  assert.equal(view.summary.observed_capture_net_cents, 2832);
  assert.equal(view.summary.observed_adjustment_fee_cents, 0);
  assert.equal(view.coverage.complete, false);
  assert.equal(view.coverage.account_costs_complete, false);
  assert.equal(view.items[0].coverage.cutoff_at, feeNow.toISOString());
  for (const secret of [
    "txn_localfinance",
    "ch_localfinance",
    "acct_localfinance",
    "pi_localfinance",
  ])
    assert.equal(JSON.stringify(view).includes(secret), false);
});
test("local hashes/scope/conflicts/unsafe facts never confirm old current fees or aggregate them", () => {
  const tampered = storedFact();
  tampered.fee_cents = 1n;
  tampered.net_cents = 2989n;
  for (const facts of [
    [tampered],
    [storedFact({ mode: "live" })],
    [storedFact({ fee_cents: 9007199254740992n, net_cents: 2990n - 9007199254740992n })],
  ]) {
    const view = projectStripeFees(feesSnapshot({ facts }), { page: 1, limit: 20 });
    assert.equal(view.items[0].capture?.available ?? false, false);
    assert.equal(view.summary.available, false);
    assert.equal(view.summary.observed_capture_fee_cents, null);
  }
  const historical = storedFact();
  assert.equal(storedBalanceFactHash(historical), historical.immutable_hash);
  const view = projectStripeFees(
    feesSnapshot({
      facts: [historical],
      observations: [storedObservation({ state: "conflict", last_error_code: "fact_conflict" })],
    }),
    { page: 1, limit: 20 },
  );
  assert.equal(view.items[0].capture?.available, false);
  assert.equal(view.items[0].capture?.fee_cents, null);
  assert.equal(view.items[0].can_refresh, false);
  assert.equal(view.summary.capture_missing_count, 1);
});

test("page validation rejects role leaks, duplicate transactions and financial stage claims without reads", () => {
  const fact = remoteFact();
  const page = { facts: [fact], nextCursor: null, hasMore: false, gap: false, requests: 2 };
  assert.doesNotThrow(() => assertBalancePage(feeTarget, "capture", page));
  for (const invalid of [
    { ...page, requests: 0 },
    { ...page, facts: [fact, fact] },
    { ...page, facts: [{ ...fact, chargeId: "ch_other" }] },
    { ...page, nextCursor: "re_other", hasMore: false },
  ])
    assert.throws(() => assertBalancePage(feeTarget, "capture", invalid));
  assert.throws(() => assertBalancePage(feeTarget, "refunds", page));
});

test("live runtime cannot be borrowed by a localhost or test database, without touching the provider", async () => {
  const { isStripeRuntimeAllowed } = await import("../../payment-gateway/stripe-runtime");
  const env = {
    NODE_ENV: "production",
    BASE: "https://api.lectum.com.br",
    DATABASE_URL: "postgresql://db.example.invalid/lectum_production",
  };
  assert.equal(isStripeRuntimeAllowed("live", env), true);
  assert.equal(
    isStripeRuntimeAllowed("live", {
      ...env,
      DATABASE_URL: "postgresql://127.0.0.1/lectum_stripe_test",
    }),
    false,
  );
  assert.equal(isStripeRuntimeAllowed("live", { ...env, BASE: "http://localhost:3001" }), false);
});
