import type { billing_financial_receipt } from "@/external/generated/prisma/client";
import { invoiceScopeMatches } from "@/modules/billing/invoices/gateway-scope";
import {
  financialContractValue,
  monthlyContractValue,
} from "@/modules/billing/subscription-financial-values";
import type { SubscriptionHistorySnapshot } from "@/utils/professional-plan-history";
import { projectStripeReceipt } from "../../../history/use-cases/projection";
import type {
  AdminFinanceDateRange,
  AdminFinancePaymentHealth,
  AdminFinancePaymentHistory,
  AdminFinanceSubscriptionItem,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import type {
  FinanceStripeContract,
  FinanceStripeSnapshot,
} from "../../repositories/AdminFinanceStripeLedgerRepository";
import { endOfFinanceDate } from "./periods";

export type ValidFinanceReceipt = {
  row: billing_financial_receipt;
  contract: FinanceStripeContract;
  label: string;
};
export const inFinanceRange = (date: Date, range: AdminFinanceDateRange) =>
  date >= range.start && date <= range.end;
export function projectFinanceStripeLedger(snapshot: FinanceStripeSnapshot) {
  const contracts = new Map(snapshot.contracts.map((row) => [row.id, row]));
  const prices = new Map(snapshot.prices.map((row) => [row.id, row]));
  let invalid = false;
  for (const contract of snapshot.contracts) {
    const price = contract.price_version_id && prices.get(contract.price_version_id);
    if (
      !invoiceScopeMatches(snapshot.scopes, {
        gateway: contract.gateway!,
        account_id: contract.gateway_account_id,
        mode: contract.gateway_mode,
      }) ||
      !price ||
      price.gateway !== "stripe" ||
      price.account_id !== contract.gateway_account_id ||
      price.mode !== contract.gateway_mode ||
      price.plan_id !== contract.plan_id ||
      price.amount_cents !== financialContractValue(contract).amountCents ||
      price.currency !== "BRL" ||
      price.interval !== "month" ||
      price.interval_count !== 1
    )
      invalid = true;
  }
  const valid: ValidFinanceReceipt[] = [];
  const seen = new Set<string>();
  for (const row of snapshot.receipts) {
    const contract = contracts.get(row.subscription_id);
    const entry =
      contract &&
      projectStripeReceipt(row, contract, {
        now: snapshot.now,
        scopes: snapshot.scopes,
        fiscal: null,
      });
    const price = contract?.price_version_id && prices.get(contract.price_version_id);
    const key = JSON.stringify([row.gateway, row.account_id, row.mode, row.invoice_payment_id]);
    if (
      !entry ||
      !contract ||
      !price ||
      price.external_price_id !== row.price_id ||
      row.amount_paid_cents !== price.amount_cents ||
      row.observed_at > snapshot.now ||
      (row.current_state === "paid" && row.refunded_cents !== 0) ||
      seen.has(key)
    ) {
      invalid = true;
      continue;
    }
    seen.add(key);
    valid.push({ row, contract, label: entry.item.status_label });
  }
  const historyBySubscription = new Map<string, SubscriptionHistorySnapshot[]>();
  for (const row of snapshot.history) {
    const contract = contracts.get(row.subscription_id);
    if (
      !contract ||
      row.psychologist_id !== contract.psychologist_id ||
      row.observed_at > snapshot.now
    )
      continue;
    const group = historyBySubscription.get(row.subscription_id) ?? [];
    group.push(row);
    historyBySubscription.set(row.subscription_id, group);
  }
  for (const group of historyBySubscription.values())
    group.sort(
      (a, b) => a.observed_at.getTime() - b.observed_at.getTime() || (a.id < b.id ? -1 : 1),
    );
  const receiptsBySubscription = new Map<string, ValidFinanceReceipt[]>();
  valid.sort(
    (a, b) => a.row.paid_at.getTime() - b.row.paid_at.getTime() || a.row.id.localeCompare(b.row.id),
  );
  for (const item of valid) {
    const group = receiptsBySubscription.get(item.contract.id) ?? [];
    group.push(item);
    receiptsBySubscription.set(item.contract.id, group);
  }
  const cancellationDates: Array<{ id: string; at: Date }> = [];
  for (const [id, rows] of historyBySubscription) {
    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      if (
        !row.deleted &&
        row.source === "stripe" &&
        row.gateway === "stripe" &&
        row.status === "cancelada" &&
        rows[index - 1].status !== "cancelada" &&
        row.observation === "update_observed"
      )
        cancellationDates.push({ id, at: row.observed_at });
    }
  }
  return {
    ...snapshot,
    valid,
    invalid,
    historyBySubscription,
    receiptsBySubscription,
    cancellationDates,
  };
}
export type FinanceStripeLedger = ReturnType<typeof projectFinanceStripeLedger>;
export const stripeReceiptsInRange = (ledger: FinanceStripeLedger, range: AdminFinanceDateRange) =>
  ledger.valid.filter(({ row }) => inFinanceRange(row.paid_at, range));
export const stripeFirstPayments = (ledger: FinanceStripeLedger) =>
  [...ledger.receiptsBySubscription.values()].flatMap((rows) => (rows[0] ? [rows[0]] : []));

/** Observed subscription state plus an immutable paid interval, never reservation/catalog guesses. */
export function stripeEntitlementsAt(ledger: FinanceStripeLedger, requestedAt: Date) {
  if (requestedAt > endOfFinanceDate(ledger.now))
    return { available: false, active: [] as FinanceStripeContract[], mrrCents: 0 };
  const at = new Date(Math.min(requestedAt.getTime(), ledger.now.getTime()));
  let available = !ledger.invalid;
  const active: FinanceStripeContract[] = [];
  for (const contract of ledger.contracts) {
    if (contract.createdAt > at) continue;
    const state = (ledger.historyBySubscription.get(contract.id) ?? [])
      .filter((row) => row.observed_at <= at)
      .at(-1);
    if (!ledger.coverageStartedAt || ledger.coverageStartedAt > at || !state) {
      available = false;
      continue;
    }
    if (state.deleted || state.status !== "ativa") continue;
    if (
      state.source !== "stripe" ||
      state.gateway !== "stripe" ||
      !state.has_gateway_subscription_id ||
      !state.current_period_end ||
      state.current_period_end <= at ||
      state.plan_id !== contract.plan_id
    ) {
      available = false;
      continue;
    }
    const receipt = (ledger.receiptsBySubscription.get(contract.id) ?? []).some(
      ({ row }) =>
        row.paid_at <= at &&
        row.invoice_paid_at <= at &&
        row.period_start <= at &&
        row.period_end > at,
    );
    if (!receipt || monthlyContractValue(contract) === null) {
      available = false;
      continue;
    }
    active.push(contract);
  }
  return {
    available,
    active,
    mrrCents: active.reduce((sum, row) => sum + (monthlyContractValue(row) ?? 0), 0),
  };
}
export function stripeCancellations(ledger: FinanceStripeLedger, range: AdminFinanceDateRange) {
  const paidBefore = (id: string, at: Date) =>
    (ledger.receiptsBySubscription.get(id) ?? []).some(({ row }) => row.paid_at <= at);
  const dates = ledger.cancellationDates.filter((row) => paidBefore(row.id, row.at));
  const relevant = ledger.contracts.filter((row) => paidBefore(row.id, range.end));
  const coverageKnown = relevant.every((contract) => {
    const start = new Date(Math.max(range.start.getTime(), contract.createdAt.getTime()));
    if (!ledger.coverageStartedAt || ledger.coverageStartedAt > start) return false;
    const history = ledger.historyBySubscription.get(contract.id) ?? [];
    if (contract.createdAt < range.start)
      return history.some((row) => row.observed_at <= range.start);
    return history.some(
      (row) =>
        row.observation === "insert_observed" &&
        row.source_created_at.getTime() === contract.createdAt.getTime() &&
        row.observed_at <= range.end,
    );
  });
  return {
    dates,
    count: new Set(dates.filter((row) => inFinanceRange(row.at, range)).map((row) => row.id)).size,
    available: !ledger.invalid && coverageKnown,
  };
}

export function stripeSubscriptionInsight(
  item: AdminFinanceSubscriptionItem,
  ledger: FinanceStripeLedger,
) {
  if (item.gateway !== "stripe" || item.source !== "stripe") return item;
  const receipts = [...(ledger.receiptsBySubscription.get(item.id) ?? [])].reverse();
  const history: AdminFinancePaymentHistory = {
    available: receipts.length > 0 && !ledger.invalid,
    total: receipts.length,
    source: "stripe_receipt",
    reason: ledger.invalid
      ? "Há divergência de escopo ou integridade no registro local."
      : receipts.length
        ? null
        : "Nenhum recebimento Stripe elegível foi registrado localmente.",
    items: ledger.invalid
      ? []
      : receipts.slice(0, 10).map(({ row, label }) => ({
          amount_available: true,
          amount_cents: row.amount_paid_cents,
          event_id: `receipt:${row.id}`,
          event_type: "recorded_receipt",
          external_id: "",
          gateway: "stripe",
          internal_id: 0,
          internal_id_available: false,
          occurred_at: row.paid_at.toISOString(),
          reference: null,
          source: "stripe_receipt",
          status: row.current_state === "paid" ? "successful" : "processed",
          status_detail: null,
          status_label: label,
          financial_status: row.current_state,
          refunded_cents: row.refunded_cents,
          title: "Recebimento bruto Stripe",
          unavailable_reason:
            row.current_state === "paid"
              ? null
              : "Valor original recebido; situação posterior observada localmente. Não é fluxo líquido nem nova cobrança.",
        })),
  };
  const health: AdminFinancePaymentHealth = {
    ...item.payment_health,
    status: "insufficient_history",
    label: "Histórico de tentativas indisponível",
    summary: "Recibos confirmam recebimentos, mas não cobrem todas as tentativas ou recusas.",
    success_rate_percent: null,
    consecutive_failures: 0,
    days_overdue: null,
    failed_payments: 0,
    final_attempts: 0,
    pending_payments: 0,
    successful_payments: 0,
    total_events: 0,
    last_failure_at: null,
    last_success_at: !ledger.invalid ? (receipts[0]?.row.paid_at.toISOString() ?? null) : null,
    notes: [
      "Recibos locais não são uma taxa de aprovação nem comprovam todas as tentativas de cobrança.",
    ],
  };
  const firstReceipt = !ledger.invalid ? receipts.at(-1) : undefined;
  const canceledAt = ledger.cancellationDates.filter((row) => row.id === item.id).at(-1)?.at;
  return {
    ...item,
    started_at: firstReceipt?.row.paid_at.toISOString() ?? item.started_at,
    started_at_available: Boolean(firstReceipt),
    cancelled_at:
      item.status === "cancelada" && !ledger.invalid ? (canceledAt?.toISOString() ?? null) : null,
    last_charge_at: !ledger.invalid ? (receipts[0]?.row.paid_at.toISOString() ?? null) : null,
    payment_history: history,
    payment_health: health,
  };
}
