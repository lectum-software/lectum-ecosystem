import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateMrrAt } from "@/modules/api/admin/private/dashboard/summary/use-cases/services/conversion-finance";
import { sanitizePublicResponseData } from "@/utils/public-response";
import {
  financeContract,
  financeHistory,
  financeNow,
  financePaidAt,
  financeReceipt,
  financeSnapshot,
} from "./stripe-ledger-fixtures";
import {
  projectFinanceStripeLedger,
  stripeCancellations,
  stripeEntitlementsAt,
  stripeFirstPayments,
  stripeSubscriptionInsight,
} from "./stripe-ledger-projection";
import { mapSubscription } from "./subscriptions";

test("local verified receipt binds immutable price version, not mutable catalog, and proves current MRR", () => {
  const ledger = projectFinanceStripeLedger(financeSnapshot());
  assert.equal(ledger.invalid, false);
  assert.equal(ledger.valid.length, 1);
  assert.equal(stripeEntitlementsAt(ledger, financeNow).mrrCents, 2990);
  assert.equal(stripeEntitlementsAt(ledger, financeNow).available, true);
  const general = estimateMrrAt([], financeNow, ledger);
  assert.equal(general.mrrCents, 2990);
  assert.equal(general.activeSubscriptions, 1);
  assert.equal(stripeFirstPayments(ledger)[0].row.paid_at, financePaidAt);
  assert.notEqual(financeContract.createdAt, financePaidAt);
});

test("scope, ownership, provider subscription, price, hash and duplicate mismatches fail closed", () => {
  for (const patch of [
    { account_id: "acct_other" },
    { mode: "live" },
    { psychologist_id: "other" },
    { subscription_id: "other" },
    { provider_subscription_id: "sub_other" },
    { price_version_id: "other" },
    { price_id: "price_other" },
    { amount_paid_cents: 3990 },
    { current_state: "failed" },
    { refunded_cents: 3991 },
  ]) {
    const ledger = projectFinanceStripeLedger(
      financeSnapshot({ receipts: [financeReceipt(patch)] }),
    );
    assert.equal(ledger.invalid, true, JSON.stringify(patch));
    assert.equal(ledger.valid.length, 0);
    assert.equal(stripeEntitlementsAt(ledger, financeNow).available, false);
  }
  const row = financeReceipt();
  row.immutable_hash = "tampered";
  assert.equal(projectFinanceStripeLedger(financeSnapshot({ receipts: [row] })).invalid, true);
  assert.equal(
    projectFinanceStripeLedger(
      financeSnapshot({ receipts: [financeReceipt(), financeReceipt({ id: "duplicate" })] }),
    ).invalid,
    true,
  );
  const state = financeSnapshot();
  state.prices[0].amount_cents = 9990;
  assert.equal(projectFinanceStripeLedger(state).invalid, true);
});

test("historical gaps and reservations never fabricate entitlement; paid interval expiry is unavailable active proof", () => {
  const ledger = projectFinanceStripeLedger(financeSnapshot());
  assert.deepEqual(stripeEntitlementsAt(ledger, new Date("2026-11-09T13:00:00Z")).active, []);
  assert.equal(stripeEntitlementsAt(ledger, new Date("2026-11-09T13:00:00Z")).available, false);
  assert.equal(
    stripeEntitlementsAt(projectFinanceStripeLedger(financeSnapshot({ history: [] })), financeNow)
      .available,
    false,
  );
  assert.equal(
    stripeEntitlementsAt(
      projectFinanceStripeLedger(financeSnapshot({ coverageStartedAt: null })),
      financeNow,
    ).available,
    false,
  );
  assert.equal(
    stripeEntitlementsAt(projectFinanceStripeLedger(financeSnapshot({ receipts: [] })), financeNow)
      .available,
    false,
  );
  const pending = projectFinanceStripeLedger(
    financeSnapshot({ history: [financeHistory({ status: "pendente" })], receipts: [] }),
  );
  assert.equal(stripeEntitlementsAt(pending, financeNow).available, true);
  assert.equal(stripeEntitlementsAt(pending, financeNow).mrrCents, 0);
});

test("refund state preserves gross original and does not invent economic adjustment date or approval rate", () => {
  const ledger = projectFinanceStripeLedger(
    financeSnapshot({
      receipts: [financeReceipt({ current_state: "refunded", refunded_cents: 2990 })],
      history: [financeHistory({ status: "cancelada" })],
    }),
  );
  assert.equal(ledger.invalid, false);
  assert.equal(ledger.valid[0].row.amount_paid_cents, 2990);
  assert.equal(stripeEntitlementsAt(ledger, financeNow).mrrCents, 0);
  const item = stripeSubscriptionInsight(mapSubscription(financeContract), ledger);
  assert.equal(item.payment_history.available, true);
  assert.equal(item.payment_history.items[0].status_label, "Estornado");
  assert.equal(item.payment_history.items[0].status, "processed");
  assert.equal(item.last_charge_at, financePaidAt.toISOString());
  assert.equal(item.payment_health.success_rate_percent, null);
  assert.equal(item.payment_health.total_events, 0);
  const safe = JSON.stringify(sanitizePublicResponseData(item.payment_history));
  for (const secret of [
    "sub_localfinance",
    "pi_localfinance",
    "ch_localfinance",
    "acct_localfinance",
  ])
    assert.equal(safe.includes(secret), false);
});

test("cancellations use observed transition instead of mutable updatedAt; baselines do not invent cancellation", () => {
  const range = { start: new Date("2026-11-01T03:00:00Z"), end: financeNow };
  const ledger = projectFinanceStripeLedger(
    financeSnapshot({
      history: [
        financeHistory(),
        financeHistory({ id: 2n, status: "cancelada", observed_at: financeNow }),
      ],
    }),
  );
  assert.equal(stripeCancellations(ledger, range).count, 1);
  assert.equal(
    stripeCancellations(ledger, range).available,
    false,
    "known transition alone does not prove the whole lifecycle",
  );
  const complete = projectFinanceStripeLedger(
    financeSnapshot({
      history: [
        financeHistory({
          id: 0n,
          observation: "insert_observed",
          observed_at: financeContract.createdAt,
          status: "pendente",
        }),
        ...ledger.history,
      ],
    }),
  );
  assert.equal(stripeCancellations(complete, range).available, true);
  assert.equal(
    stripeCancellations(
      projectFinanceStripeLedger(
        financeSnapshot({
          history: [financeHistory({ status: "cancelada", observation: "baseline_observed" })],
        }),
      ),
      range,
    ).count,
    0,
  );
});

test("future period and adjustment observations never project today's money into future dates", () => {
  const ledger = projectFinanceStripeLedger(financeSnapshot());
  assert.equal(stripeEntitlementsAt(ledger, new Date("2027-01-01T15:00:00Z")).available, false);
  assert.equal(stripeEntitlementsAt(ledger, new Date("2027-01-01T15:00:00Z")).active.length, 0);
  const future = financeReceipt({
    current_state: "refunded",
    refunded_cents: 2990,
    observed_at: new Date("2027-01-01T00:00:00Z"),
  });
  assert.equal(projectFinanceStripeLedger(financeSnapshot({ receipts: [future] })).invalid, true);
  const inconsistent = financeReceipt({ current_state: "paid", refunded_cents: 2990 });
  assert.equal(
    projectFinanceStripeLedger(financeSnapshot({ receipts: [inconsistent] })).invalid,
    true,
  );
});

test("subscription start and cancellation dates use observed facts, not reservation or unrelated updates", () => {
  const ledger = projectFinanceStripeLedger(
    financeSnapshot({
      history: [
        financeHistory(),
        financeHistory({ id: 2n, status: "cancelada", observed_at: financeNow }),
      ],
    }),
  );
  const item = stripeSubscriptionInsight(
    mapSubscription({
      ...financeContract,
      status: "cancelada",
      updatedAt: new Date("2026-12-01T00:00:00Z"),
    }),
    ledger,
  );
  assert.equal(item.started_at, financePaidAt.toISOString());
  assert.equal(item.started_at_available, true);
  assert.equal(item.cancelled_at, financeNow.toISOString());
  const missing = stripeSubscriptionInsight(
    mapSubscription({ ...financeContract, status: "cancelada" }),
    projectFinanceStripeLedger(financeSnapshot({ receipts: [], history: [] })),
  );
  assert.equal(missing.started_at_available, false);
  assert.equal(missing.cancelled_at, null);
});

test("unpaid reservations and cancellations before first payment never count as paid churn", () => {
  const history = [
    financeHistory(),
    financeHistory({ id: 2n, status: "cancelada", observed_at: financeNow }),
  ];
  const range = { start: new Date("2026-11-01T03:00:00Z"), end: financeNow };
  const withoutPayment = projectFinanceStripeLedger(financeSnapshot({ receipts: [], history }));
  assert.equal(stripeCancellations(withoutPayment, range).count, 0);
  assert.equal(stripeCancellations(withoutPayment, range).available, true);
  const beforePayment = projectFinanceStripeLedger(
    financeSnapshot({
      history: [
        financeHistory({ observed_at: financeContract.createdAt }),
        financeHistory({
          id: 2n,
          status: "cancelada",
          observed_at: new Date(financePaidAt.getTime() - 1),
        }),
      ],
    }),
  );
  assert.equal(stripeCancellations(beforePayment, range).count, 0);
});
