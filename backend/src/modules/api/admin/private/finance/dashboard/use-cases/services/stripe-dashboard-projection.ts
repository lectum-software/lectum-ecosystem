import {
  financialContractValue,
  isStripeFinancialContract,
  monthlyContractValue,
  sumFinancialValues,
} from "@/modules/billing/subscription-financial-values";
import type {
  AdminFinanceChargeItem,
  AdminFinanceDashboard,
  AdminFinanceDateRange,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import {
  metric,
  type summarizeAverageLtv,
  type summarizeAverageSubscriptionLifetime,
} from "./period-revenue";
import { parseFinanceDateOnly } from "./periods";
import { stripeFinanceChargeItems } from "./stripe-charge-projection";
import {
  type FinanceStripeLedger,
  inFinanceRange,
  stripeCancellations,
  stripeEntitlementsAt,
  stripeFirstPayments,
  stripeReceiptsInRange,
  stripeSubscriptionInsight,
} from "./stripe-ledger-projection";
import {
  type FinanceSubscriptionRecord,
  mapSubscription,
  type NewSubscriptionValueRecord,
} from "./subscriptions";

type ProjectionInput = {
  current: AdminFinanceDateRange;
  previous: AdminFinanceDateRange;
  currentCharges: AdminFinanceChargeItem[];
  activeSubscriptions: FinanceSubscriptionRecord[];
  currentNewValues: NewSubscriptionValueRecord[];
  previousNewValues: NewSubscriptionValueRecord[];
  legacyLtv: ReturnType<typeof summarizeAverageLtv>;
  legacyLtvPeople: string[];
  legacyLifetime: ReturnType<typeof summarizeAverageSubscriptionLifetime>;
  tableTake: number;
  subscriptionTake: number;
};
const legacy = <T extends { gateway?: string | null; source?: string | null }>(rows: T[]) =>
  rows.filter((row) => !isStripeFinancialContract(row));
const sum = (rows: Array<{ row: { amount_paid_cents: number } }>) =>
  rows.reduce((total, { row }) => total + row.amount_paid_cents, 0);

/** Merge only verified local facts. Current refund snapshots are not dated cash movements. */
export function applyStripeFinanceDashboard(
  dashboard: AdminFinanceDashboard,
  ledger: FinanceStripeLedger,
  input: ProjectionInput,
) {
  if (!ledger.contracts.length && !ledger.receipts.length) return;
  const currentAt = new Date(Math.min(input.current.end.getTime(), ledger.now.getTime()));
  const previousAt = new Date(Math.min(input.previous.end.getTime(), ledger.now.getTime()));
  const currentReceipts = stripeReceiptsInRange(ledger, input.current);
  const previousReceipts = stripeReceiptsInRange(ledger, input.previous);
  const first = stripeFirstPayments(ledger);
  const firstIn = (range: AdminFinanceDateRange) =>
    first.filter(({ row }) => inFinanceRange(row.paid_at, range));
  const currentActive = stripeEntitlementsAt(ledger, currentAt);
  const previousActive = stripeEntitlementsAt(ledger, previousAt);
  const currentCancels = stripeCancellations(ledger, input.current);
  const previousCancels = stripeCancellations(ledger, input.previous);
  const old = dashboard.cards;
  const revenueAvailable =
    !ledger.invalid && !dashboard.unavailable.some((row) => row.id === "revenue_total");
  const replace = (
    key: keyof typeof old,
    values: {
      current: number;
      previous: number;
      available: boolean;
      previousAvailable?: boolean;
      label?: string;
      description: string;
    },
  ) => {
    old[key] = metric({
      ...values,
      id: key,
      label: values.label ?? old[key].label,
      source: "local_verified_receipts+observed_subscription_history",
      unit: old[key].unit,
      unavailableReason: values.available
        ? null
        : "Falta prova local de escopo, integridade ou estado observado para este indicador.",
    });
    old[key].previous_available = values.previousAvailable ?? values.available;
    if (values.previousAvailable === false) {
      old[key].change_percent = null;
      old[key].trend = "unavailable";
      old[key].description += " Comparação anterior indisponível por lacuna histórica observada.";
    }
  };
  replace("revenue_total", {
    current: old.revenue_total.value + sum(currentReceipts),
    previous: old.revenue_total.previous_value + sum(previousReceipts),
    available: revenueAvailable,
    label: "Recebimentos brutos",
    description:
      "Valores originais de recebimentos registrados; não desconta estornos, disputas, tarifas ou despesas e não comprova cobertura completa no provedor.",
  });
  replace("active_subscriptions", {
    current: old.active_subscriptions.value + currentActive.active.length,
    previous: old.active_subscriptions.previous_value + previousActive.active.length,
    available: currentActive.available,
    previousAvailable: previousActive.available,
    description:
      "Estado ativo observado na data, com período pago Stripe comprovado por recibo; não usa a reserva como início de pagamento.",
  });
  replace("new_subscriptions", {
    current: legacy(input.currentNewValues).length + firstIn(input.current).length,
    previous: legacy(input.previousNewValues).length + firstIn(input.previous).length,
    available: !ledger.invalid,
    description:
      "Novas adesões Stripe com primeiro recebimento registrado no período; contratos legados conservam a fonte histórica.",
  });
  const legacyNewValue = (rows: NewSubscriptionValueRecord[]) =>
    sumFinancialValues(legacy(rows).map((row) => financialContractValue(row).amountCents));
  const a = legacyNewValue(input.currentNewValues),
    b = legacyNewValue(input.previousNewValues);
  replace("new_subscriptions_revenue", {
    current: (a ?? 0) + sum(firstIn(input.current)),
    previous: (b ?? 0) + sum(firstIn(input.previous)),
    available: !ledger.invalid && a !== null && b !== null,
    label: "Valor das novas adesões",
    description:
      "Valor das primeiras adesões Stripe comprovadas e dos contratos legados; não representa lucro nem nova cobrança.",
  });
  replace("cancellations", {
    label: "Cancelamentos",
    current: old.cancellations.value + currentCancels.count,
    previous: old.cancellations.previous_value + previousCancels.count,
    available: currentCancels.available,
    previousAvailable: previousCancels.available,
    description:
      "Cancelamentos de contratos com recebimento registrado, observados no período; não infere a data a partir do updated_at atual nem calcula uma taxa sem base histórica comprovada.",
  });
  const legacyMrr = sumFinancialValues(legacy(input.activeSubscriptions).map(monthlyContractValue));
  dashboard.mrr = {
    ...dashboard.mrr,
    available: currentActive.available && legacyMrr !== null,
    source: "local_observed_paid_periods",
    value_cents: (legacyMrr ?? 0) + currentActive.mrrCents,
    description:
      "Valor mensal contratado da base ativa observada, com período pago Stripe comprovado; não representa receita líquida.",
  };
  const stripePaidProfiles = new Set(ledger.valid.map(({ contract }) => contract.psychologist_id));
  const denominator = new Set([...input.legacyLtvPeople, ...stripePaidProfiles]).size;
  dashboard.average_ltv = {
    ...dashboard.average_ltv,
    available:
      !ledger.invalid &&
      (input.legacyLtv.available || input.legacyLtv.paidPsychologistCount === 0) &&
      denominator > 0,
    description:
      "Recebimentos brutos registrados por psicólogo com pagamento; não desconta tarifas ou ajustes posteriores.",
    source: "local_verified_gross_receipts",
    paid_psychologist_count: denominator,
    linked_confirmed_payments: input.legacyLtv.linkedConfirmedPayments + ledger.valid.length,
    value_cents: denominator
      ? Math.round((input.legacyLtv.totalRevenueCents + sum(ledger.valid)) / denominator)
      : 0,
    unavailable_reason: ledger.invalid
      ? "Há recibo ou escopo divergente."
      : denominator
        ? null
        : "Nenhum recebimento elegível foi registrado.",
  };
  const lifetimes = first.flatMap(({ row, contract }) => {
    const date = currentCancels.dates.find((x) => x.id === contract.id && x.at >= row.paid_at)?.at;
    return date ? [(date.getTime() - row.paid_at.getTime()) / 86_400_000] : [];
  });
  const lifetimeCount = input.legacyLifetime.cancelledSubscriptionCount + lifetimes.length;
  const lifetimeDays = lifetimeCount
    ? (input.legacyLifetime.valueDays * input.legacyLifetime.cancelledSubscriptionCount +
        lifetimes.reduce((a, b) => a + b, 0)) /
      lifetimeCount
    : 0;
  dashboard.average_subscription_lifetime = {
    ...dashboard.average_subscription_lifetime,
    available: !ledger.invalid && lifetimeCount > 0,
    source: "observed_paid_receipts+subscription_history",
    cancelled_subscription_count: lifetimeCount,
    value_days: lifetimeDays,
    value_months: lifetimeDays / 30.4375,
    description:
      "Tempo observado entre primeiro recebimento Stripe e cancelamento local; legado conserva sua fonte anterior.",
    unavailable_reason: lifetimeCount
      ? null
      : "Nenhum encerramento com início pago e data observada está disponível.",
  };
  const stripeCharges = stripeFinanceChargeItems(ledger, input.current);
  const charges = [...input.currentCharges, ...stripeCharges].sort(
    (a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.event_id.localeCompare(a.event_id),
  );
  dashboard.latest_charges = {
    ...dashboard.latest_charges,
    coverage_complete: false,
    total: charges.length,
    items: charges.slice(0, input.tableTake),
  };
  dashboard.new_subscriptions.items = [
    ...dashboard.new_subscriptions.items.filter((row) => row.gateway !== "stripe"),
    ...(ledger.invalid ? [] : firstIn(input.current)).map(({ contract, row }) => ({
      ...stripeSubscriptionInsight(mapSubscription(contract), ledger),
      started_at: row.paid_at.toISOString(),
    })),
  ]
    .sort((a, b) => b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id))
    .slice(0, input.subscriptionTake);
  dashboard.subscription_relation.items = dashboard.subscription_relation.items.map((row) =>
    stripeSubscriptionInsight(row, ledger),
  );
  dashboard.new_subscriptions.total = old.new_subscriptions.value;
  const unavailableSeries = new Set<string>();
  for (const point of dashboard.series.points) {
    const range = {
      start: parseFinanceDateOnly(point.start_date, "start")!,
      end: parseFinanceDateOnly(point.end_date, "end")!,
    };
    const active = stripeEntitlementsAt(ledger, range.end),
      cancelled = stripeCancellations(ledger, range);
    if (!active.available) unavailableSeries.add("active_subscriptions");
    if (!cancelled.available) unavailableSeries.add("cancellations");
    point.revenue_cents += sum(stripeReceiptsInRange(ledger, range));
    point.confirmed_payments += stripeReceiptsInRange(ledger, range).length;
    point.active_subscriptions += active.active.length;
    point.cancellations += cancelled.count;
    point.new_subscriptions += firstIn(range).length;
    point.new_subscriptions_revenue_cents += sum(firstIn(range));
  }
  dashboard.unavailable = dashboard.unavailable.filter(
    (row) => !["stripe_financial_history"].includes(row.id),
  );
  dashboard.series.unavailable_metrics = [
    ...new Set([
      ...Object.values(old)
        .filter((row) => !row.available)
        .map((row) => row.id),
      ...unavailableSeries,
    ]),
  ];
  dashboard.financial_basis = {
    kind: "local_gross_receipts",
    available: revenueAvailable,
    observed_at: ledger.now.toISOString(),
    provider_coverage: "not_checked",
    gross_receipts_cents: old.revenue_total.value,
    refund_snapshot_cents: currentReceipts.reduce((n, { row }) => n + row.refunded_cents, 0),
    refund_snapshot_scope: "stripe_receipts",
    fees_available: false,
    net_cash_flow_available: false,
    note: "Recebimentos brutos registrados, sem cobertura externa presumida. Estornos: apenas recibos Stripe pagos no período, em seu estado atual; não são ajustes datados nem fluxo líquido. Tarifas e despesas não estão disponíveis.",
  };
  dashboard.coverage_notes = dashboard.coverage_notes.filter(
    (note) =>
      !note.includes("ainda não") &&
      !note.includes("Cobranças listadas são somente") &&
      !note.includes("Sem os períodos pagos"),
  );
  if (ledger.invalid)
    dashboard.coverage_notes.unshift(
      "Há divergência de integridade ou escopo; indicadores monetários não representam um total completo.",
    );
  dashboard.coverage_notes.unshift(
    dashboard.financial_basis.note,
    "Leitura de registros financeiros sem alterar contratos; nenhuma cobrança ou emissão foi executada.",
  );
}
