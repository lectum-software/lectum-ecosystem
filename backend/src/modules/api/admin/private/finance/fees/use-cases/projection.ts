import type {
  billing_stripe_balance_fact,
  billing_stripe_fee_observation,
} from "@/external/generated/prisma/client";
import {
  observationHasMore,
  safeFeeNumber,
  storedBalanceFactHash,
} from "@/modules/billing/stripe/balance-observer/policy";
import type {
  AdminFeeItem,
  AdminStripeFees,
  BalanceFactKind,
  FeeDiagnostic,
  FeeQuery,
  FeeState,
} from "../DTOs/IAdminStripeFeesDTO";
import type { StripeFeesSnapshot } from "../repositories/AdminStripeFeesRepository";

const states: FeeState[] = [
  "not_observed",
  "processing",
  "partial",
  "observed",
  "unavailable",
  "conflict",
];
const diagnostics: FeeDiagnostic[] = [
  "read_access_denied",
  "provider_unavailable",
  "scope_mismatch",
  "invalid_receipt",
  "balance_missing",
  "unsupported_balance",
  "fact_conflict",
  "lease_unavailable",
  "live_not_authorized",
];
function factValid(
  row: billing_stripe_balance_fact,
  receipt: StripeFeesSnapshot["receipts"][number]["row"],
  now: Date,
) {
  if (
    row.gateway !== "stripe" ||
    row.mode !== receipt.mode ||
    row.account_id !== receipt.account_id ||
    row.receipt_id !== receipt.id ||
    row.receipt_immutable_hash !== receipt.immutable_hash ||
    row.charge_id !== receipt.charge_id ||
    row.currency !== "BRL" ||
    row.net_cents !== row.amount_cents - row.fee_cents ||
    !/^txn_[A-Za-z0-9]{1,100}$/.test(row.provider_transaction_id) ||
    !["capture", "refund", "refund_reversal", "dispute"].includes(row.kind) ||
    !["pending", "available"].includes(row.status) ||
    row.provider_created_at > now ||
    row.observed_at > now ||
    storedBalanceFactHash(row) !== row.immutable_hash
  )
    return false;
  if (row.kind === "capture")
    return (
      row.source_id === receipt.charge_id && row.amount_cents === BigInt(receipt.amount_paid_cents)
    );
  if (row.kind === "refund")
    return /^re_[A-Za-z0-9]{1,100}$/.test(row.source_id) && row.amount_cents < 0n;
  if (row.kind === "refund_reversal")
    return /^re_[A-Za-z0-9]{1,100}$/.test(row.source_id) && row.amount_cents > 0n;
  return /^(dp|du)_[A-Za-z0-9]{1,100}$/.test(row.source_id);
}
export function projectStripeFees(snapshot: StripeFeesSnapshot, query: FeeQuery): AdminStripeFees {
  const factsByReceipt = new Map<string, billing_stripe_balance_fact[]>();
  for (const row of snapshot.facts) {
    const list = factsByReceipt.get(row.receipt_id) ?? [];
    list.push(row);
    factsByReceipt.set(row.receipt_id, list);
  }
  const obsByReceipt = new Map<string, billing_stripe_fee_observation[]>();
  for (const row of snapshot.observations) {
    const list = obsByReceipt.get(row.receipt_id) ?? [];
    list.push(row);
    obsByReceipt.set(row.receipt_id, list);
  }
  let captureGross = 0n,
    captureFee = 0n,
    captureNet = 0n,
    adjustmentFee = 0n,
    gross = 0n,
    captureCount = 0,
    adjustmentCount = 0,
    transactionCount = 0,
    allSafe = true;
  const items: AdminFeeItem[] = snapshot.receipts
    .map(({ row: receipt }) => {
      gross += BigInt(receipt.amount_paid_cents);
      const facts = factsByReceipt.get(receipt.id) ?? [];
      const observations = obsByReceipt.get(receipt.id) ?? [];
      const observation = observations[0];
      const valid = facts.every((fact) => factValid(fact, receipt, snapshot.now));
      const captures = facts.filter((fact) => fact.kind === "capture");
      const conflict =
        !valid ||
        captures.length > 1 ||
        observations.length > 1 ||
        Boolean(
          observation &&
            (observation.gateway !== "stripe" ||
              observation.mode !== receipt.mode ||
              observation.account_id !== receipt.account_id ||
              observation.receipt_hash !== receipt.immutable_hash ||
              !states.includes(observation.state as FeeState) ||
              observation.state === "conflict"),
        );
      const numericSafe = facts.every((fact) =>
        [fact.amount_cents, fact.fee_cents, fact.net_cents].every(
          (value) => safeFeeNumber(value) !== null,
        ),
      );
      if (conflict || !numericSafe) allSafe = false;
      const capture = captures[0];
      const available = Boolean(capture && !conflict && numericSafe);
      if (available) {
        captureCount++;
        captureGross += BigInt(receipt.amount_paid_cents);
        captureFee += capture.fee_cents;
        captureNet += capture.net_cents;
      }
      if (!conflict && numericSafe)
        for (const fact of facts)
          if (fact.kind !== "capture") {
            adjustmentCount++;
            adjustmentFee += fact.fee_cents;
          }
      transactionCount += valid ? facts.length : 0;
      return {
        receipt_id: receipt.id,
        paid_at: receipt.paid_at.toISOString(),
        amount_paid_cents: receipt.amount_paid_cents,
        financial_status: receipt.current_state,
        can_refresh: !conflict,
        capture:
          capture && valid
            ? {
                available,
                fee_cents: available ? safeFeeNumber(capture.fee_cents) : null,
                net_cents: available ? safeFeeNumber(capture.net_cents) : null,
                observed_at: capture.observed_at.toISOString(),
                status: capture.status as "pending" | "available",
              }
            : null,
        transactions: valid
          ? facts.map((fact) => ({
              id_local: fact.id,
              kind: fact.kind as BalanceFactKind,
              occurred_at: fact.provider_created_at.toISOString(),
              available_on: fact.available_on.toISOString(),
              amount_cents: conflict ? null : safeFeeNumber(fact.amount_cents),
              fee_cents: conflict ? null : safeFeeNumber(fact.fee_cents),
              net_cents: conflict ? null : safeFeeNumber(fact.net_cents),
              status: fact.status as "pending" | "available",
            }))
          : [],
        coverage: {
          state: conflict ? "conflict" : ((observation?.state as FeeState) ?? "not_observed"),
          capture_verified: available,
          refunds_scanned: !conflict && Boolean(observation?.refunds_scanned),
          disputes_scanned: !conflict && Boolean(observation?.disputes_scanned),
          has_more: !conflict && (!observation || observationHasMore(observation)),
          last_observed_at: observation?.observed_at?.toISOString() ?? null,
          cutoff_at: observation?.cutoff.toISOString() ?? null,
          last_error_code: conflict
            ? "fact_conflict"
            : observation?.last_error_code &&
                diagnostics.includes(observation.last_error_code as FeeDiagnostic)
              ? (observation.last_error_code as FeeDiagnostic)
              : null,
        },
      };
    })
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at) || b.receipt_id.localeCompare(a.receipt_id));
  const sums = [gross, captureGross, captureFee, captureNet, adjustmentFee];
  if (sums.some((sum) => safeFeeNumber(sum) === null)) allSafe = false;
  const page = Math.min(query.page, Math.max(1, Math.ceil(items.length / query.limit)));
  return {
    mode: snapshot.mode,
    items: items.slice((page - 1) * query.limit, page * query.limit),
    pagination: {
      page,
      limit: query.limit,
      total: items.length,
      total_pages: Math.ceil(items.length / query.limit),
    },
    summary: {
      available: allSafe,
      receipt_count: items.length,
      eligible_gross_cents: allSafe ? safeFeeNumber(gross) : null,
      capture_verified_count: captureCount,
      capture_missing_count: items.length - captureCount,
      observed_capture_gross_cents: allSafe && captureCount ? safeFeeNumber(captureGross) : null,
      observed_capture_fee_cents: allSafe && captureCount ? safeFeeNumber(captureFee) : null,
      observed_capture_net_cents: allSafe && captureCount ? safeFeeNumber(captureNet) : null,
      observed_adjustment_fee_cents:
        allSafe && adjustmentCount ? safeFeeNumber(adjustmentFee) : null,
      transaction_count: transactionCount,
    },
    coverage: {
      complete: false,
      account_costs_complete: false,
      net_cash_flow_available: false,
      profit_available: false,
      note: "Coorte de recibos pagos nas datas selecionadas (BRT). Captura observada e seu líquido são anteriores aos ajustes e não representam saldo disponível, payout ou lucro. Estornos e disputas são pesquisados pela criação de seus objetos até o cutoff; as transações de saldo e a disponibilidade têm datas próprias. Custos completos da conta, Billing, tarifas legadas e OPEX não estão incluídos; ausência de fatos não significa tarifa zero.",
    },
  };
}
