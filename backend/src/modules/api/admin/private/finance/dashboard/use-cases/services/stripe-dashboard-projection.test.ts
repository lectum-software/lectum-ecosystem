import assert from "node:assert/strict";
import { test } from "node:test";
import type { AdminFinanceDashboard } from "../../DTOs/IAdminFinanceDashboardDTO";
import { buildCsv, isFinanceExportComplete } from "./csv-export";
import {
  metric,
  summarizeAverageLtv,
  summarizeAverageSubscriptionLifetime,
} from "./period-revenue";
import { applyStripeFinanceDashboard } from "./stripe-dashboard-projection";
import {
  financeContract,
  financeHistory,
  financeNow,
  financePaidAt,
  financeReceipt,
  financeSnapshot,
} from "./stripe-ledger-fixtures";
import { projectFinanceStripeLedger } from "./stripe-ledger-projection";
import { mapSubscription } from "./subscriptions";

function dashboard(): AdminFinanceDashboard {
  const card = (
    id: keyof AdminFinanceDashboard["cards"],
    unit: "count" | "currency_cents" = "count",
  ) => metric({ id, label: id, current: 0, previous: 0, description: "", source: "local", unit });
  return {
    cards: {
      revenue_total: card("revenue_total", "currency_cents"),
      active_subscriptions: card("active_subscriptions"),
      new_subscriptions: card("new_subscriptions"),
      new_subscriptions_revenue: card("new_subscriptions_revenue", "currency_cents"),
      cancellations: card("cancellations"),
    },
    average_ltv: {
      available: false,
      description: "",
      linked_confirmed_payments: 0,
      paid_psychologist_count: 0,
      source: "local_verified_gross_receipts",
      unavailable_reason: null,
      value_cents: 0,
    },
    average_subscription_lifetime: {
      available: false,
      cancelled_subscription_count: 0,
      description: "",
      source: "observed_paid_receipts+subscription_history",
      unavailable_reason: null,
      value_days: 0,
      value_months: 0,
    },
    mrr: {
      available: false,
      description: "",
      source: "local_observed_paid_periods",
      value_cents: 0,
    },
    latest_charges: {
      coverage_complete: false,
      items: [],
      source: "payment_event+gateway_subscription_summary+professional_subscription",
      total: 0,
    },
    new_subscriptions: {
      items: [],
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: 0,
    },
    subscription_relation: {
      items: [mapSubscription(financeContract)],
      source: "professional_subscription+subscription_plan+psychologist_profile+user",
      total: 1,
    },
    coverage_notes: [],
    export: { available: true, format: "csv" },
    period: {
      days: 1,
      from: "2026-11-10",
      to: "2026-11-10",
      previous_from: "2026-11-09",
      previous_to: "2026-11-09",
      label: "Local",
      max_days: 3660,
      group_by: "day",
      timezone: "America/Sao_Paulo",
    },
    series: {
      points: [
        {
          start_date: "2026-11-10",
          end_date: "2026-11-10",
          active_subscriptions: 0,
          cancellations: 0,
          confirmed_payments: 0,
          new_subscriptions: 0,
          new_subscriptions_revenue_cents: 0,
          revenue_cents: 0,
        },
      ],
      source: "payment_event+gateway_subscription_summary+professional_subscription",
    },
    unavailable: [],
  };
}
const input = {
  current: { start: new Date("2026-11-10T03:00:00Z"), end: new Date("2026-11-11T02:59:59.999Z") },
  previous: { start: new Date("2026-11-09T03:00:00Z"), end: new Date("2026-11-10T02:59:59.999Z") },
  currentCharges: [],
  activeSubscriptions: [],
  currentNewValues: [],
  previousNewValues: [],
  legacyLtv: summarizeAverageLtv([], []),
  legacyLtvPeople: [],
  legacyLifetime: summarizeAverageSubscriptionLifetime([]),
  tableTake: 5,
  subscriptionTake: 50,
};

test("dashboard projects gross paid cohort + current refunds, preserves legacy totals and never derives fees/net", () => {
  const value = dashboard();
  value.cards.revenue_total.value = 5000;
  const ledger = projectFinanceStripeLedger(
    financeSnapshot({
      receipts: [financeReceipt({ current_state: "refunded", refunded_cents: 2990 })],
      history: [
        financeHistory(),
        financeHistory({ id: 2n, status: "cancelada", observed_at: financeNow }),
      ],
    }),
  );
  applyStripeFinanceDashboard(value, ledger, input);
  assert.equal(value.cards.revenue_total.value, 7990);
  assert.equal(value.cards.new_subscriptions.value, 1);
  assert.equal(value.financial_basis?.gross_receipts_cents, 7990);
  assert.equal(value.financial_basis?.refund_snapshot_cents, 2990);
  assert.equal(value.financial_basis?.provider_coverage, "not_checked");
  assert.equal(value.financial_basis?.fees_available, false);
  assert.equal(value.financial_basis?.net_cash_flow_available, false);
  assert.equal(value.latest_charges.items[0].financial_status, "refunded");
  assert.equal(value.latest_charges.items[0].status_label, "Estornado");
  assert.equal(value.latest_charges.coverage_complete, false);
  assert.equal(value.new_subscriptions.items[0].started_at, financePaidAt.toISOString());
  assert.equal(value.series.points[0].revenue_cents, 2990);
  assert.equal(value.cards.active_subscriptions.available, true);
  assert.equal(value.cards.active_subscriptions.previous_available, false);
  assert.equal(value.cards.active_subscriptions.change_percent, null);
  const csv = buildCsv(value);
  assert.ok(csv.includes("recebimentos_brutos_registrados"));
  assert.ok(csv.includes("estornos_snapshot_stripe"));
  assert.ok(csv.includes("indisponiveis"));
  for (const secret of [
    "acct_localfinance",
    "sub_localfinance",
    "pi_localfinance",
    "price_localfinance",
  ])
    assert.equal(csv.includes(secret), false);
});

test("dashboard invalid ledger never grants authoritative basis/preview/history", () => {
  const value = dashboard();
  const row = financeReceipt();
  row.immutable_hash = "invalid";
  applyStripeFinanceDashboard(
    value,
    projectFinanceStripeLedger(financeSnapshot({ receipts: [row] })),
    input,
  );
  assert.equal(value.financial_basis?.available, false);
  assert.equal(value.cards.revenue_total.available, false);
  assert.equal(value.mrr.available, false);
  assert.deepEqual(value.latest_charges.items, []);
  assert.equal(value.subscription_relation.items[0].payment_history.available, false);
  assert.ok(buildCsv(value).includes('"recebimentos_brutos_registrados","indisponivel"'));
});

test("CSV cannot silently truncate any advertised list", () => {
  const value = dashboard();
  assert.equal(isFinanceExportComplete(value), true);
  value.latest_charges.total = 5001;
  assert.equal(isFinanceExportComplete(value), false);
  value.latest_charges.total = 0;
  value.new_subscriptions.total = 5001;
  assert.equal(isFinanceExportComplete(value), false);
  value.new_subscriptions.total = 0;
  value.subscription_relation.total = 5001;
  assert.equal(isFinanceExportComplete(value), false);
});

test("orphan receipt without contracts does not masquerade as an available empty ledger", () => {
  const value = dashboard();
  const ledger = projectFinanceStripeLedger(financeSnapshot({ contracts: [], prices: [] }));
  assert.equal(ledger.invalid, true);
  applyStripeFinanceDashboard(value, ledger, input);
  assert.equal(value.financial_basis?.available, false);
  assert.equal(value.cards.revenue_total.available, false);
  assert.deepEqual(value.latest_charges.items, []);
});
