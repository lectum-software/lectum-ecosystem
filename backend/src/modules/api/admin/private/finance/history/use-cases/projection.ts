import type {
  billing_financial_receipt,
  billing_invoice,
  payment_event,
} from "@/external/generated/prisma/client";
import { invoiceReference, invoiceRequestSchema } from "@/modules/billing/invoices/contracts";
import { invoiceScopeMatches } from "@/modules/billing/invoices/gateway-scope";
import {
  findPayloadValue,
  paymentStatus,
  toAmountCents,
  valueContainsReference,
} from "@/modules/billing/payment-event-values";
import { storedFinancialReceiptHash } from "@/modules/billing/stripe/financial-ledger/policy";
import type {
  AdminFinanceHistory,
  AdminFinanceHistoryItem,
  AdminFinanceHistoryQuery,
  FinancialStatus,
} from "../DTOs/IAdminFinanceHistoryDTO";
import type { HistoryContext, HistoryContract, HistoryRecords } from "../repositories/records";

const labels: Record<FinancialStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  failed: "Recusado",
  canceled: "Cancelado",
  refunded: "Estornado",
  partially_refunded: "Estorno parcial",
  disputed: "Em disputa",
  processed: "Processado",
};
type Entry = {
  item: AdminFinanceHistoryItem;
  accountId: string | null;
  paymentId: string | null;
  invoiceId: string | null;
  observedAt: Date;
};
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const identity = (value: unknown): string | null => {
  const id = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
};
const base = (contract: HistoryContract) => ({
  user_id: contract.psychologist.user.id,
  psychologist_id: contract.psychologist_id,
  display_name: contract.psychologist.user.name?.trim().slice(0, 150) || null,
  subscription_id: contract.id,
});
const scopeKey = (gateway: string, account: string | null, mode: string | null, id: string) =>
  JSON.stringify([gateway, account, mode, id]);
const entryKey = (entry: Entry) =>
  scopeKey(entry.item.gateway, entry.accountId, entry.item.mode, entry.paymentId ?? entry.item.id);

export function projectStripeReceipt(
  row: billing_financial_receipt,
  contract: HistoryContract,
  context: HistoryContext,
): Entry | null {
  if (
    contract.gateway !== "stripe" ||
    contract.source !== "stripe" ||
    row.gateway !== "stripe" ||
    row.subscription_id !== contract.id ||
    row.psychologist_id !== contract.psychologist_id ||
    row.provider_subscription_id !== contract.gateway_subscription_id ||
    row.price_version_id !== contract.price_version_id ||
    row.account_id !== contract.gateway_account_id ||
    row.mode !== contract.gateway_mode ||
    !invoiceScopeMatches(context.scopes, row) ||
    row.currency !== "BRL" ||
    !Number.isSafeInteger(row.amount_paid_cents) ||
    row.amount_paid_cents <= 0 ||
    !Number.isSafeInteger(row.refunded_cents) ||
    row.refunded_cents < 0 ||
    row.refunded_cents > row.amount_paid_cents ||
    (row.current_state === "refunded" && row.refunded_cents !== row.amount_paid_cents) ||
    (row.current_state === "partially_refunded" &&
      (row.refunded_cents <= 0 || row.refunded_cents >= row.amount_paid_cents)) ||
    row.paid_at > context.now ||
    row.invoice_paid_at > context.now ||
    row.period_end <= row.period_start ||
    !["paid", "partially_refunded", "refunded", "disputed"].includes(row.current_state) ||
    storedFinancialReceiptHash(row) !== row.immutable_hash
  )
    return null;
  const status = row.current_state as FinancialStatus;
  return {
    accountId: row.account_id,
    paymentId: row.invoice_payment_id,
    invoiceId: row.invoice_id,
    observedAt: row.observed_at,
    item: {
      ...base(contract),
      id: `receipt:${row.id}`,
      gateway: "stripe",
      mode: row.mode as "test" | "live",
      occurred_at: row.paid_at.toISOString(),
      amount_cents: row.amount_paid_cents,
      currency: row.currency,
      financial_status: status,
      status_label: labels[status],
      source: "stripe_receipt",
      invoice: null,
      description:
        status === "paid"
          ? "Pagamento confirmado no registro local."
          : "Valor original do pagamento; situação posterior observada no registro local, sem novo recebimento.",
    },
  };
}

const mpStatus = (value: string): FinancialStatus => {
  if (["approved", "accredited", "paid"].includes(value)) return "paid";
  if (["rejected", "refused"].includes(value)) return "failed";
  if (["pending", "in_process", "authorized"].includes(value)) return "pending";
  if (["cancelled", "canceled"].includes(value)) return "canceled";
  if (["refunded", "charged_back", "chargeback"].includes(value))
    return value === "refunded" ? "refunded" : "disputed";
  if (value === "partially_refunded") return "partially_refunded";
  return "processed";
};

export function projectMercadoPagoEvent(
  event: payment_event,
  contract: HistoryContract,
  context: HistoryContext,
): Entry | null {
  if (
    event.gateway !== "mercadopago" ||
    contract.source !== "mercadopago" ||
    ![null, "mercadopago"].includes(contract.gateway) ||
    !valueContainsReference(
      event.payload,
      [contract.id, contract.gateway_subscription_id].filter((id): id is string => Boolean(id)),
    ) ||
    !event.type.toLowerCase().includes("payment") ||
    event.createdAt > context.now
  )
    return null;
  const payload = record(event.payload);
  const payment = record(payload?.payment);
  const data = record(payload?.data);
  const paymentId = identity(
    payment?.id ??
      payload?.payment_id ??
      (event.type === "payment" ? (data?.id ?? payload?.id) : null),
  );
  const live = payment?.live_mode ?? payload?.live_mode;
  const mode =
    typeof live === "boolean"
      ? live
        ? "live"
        : "test"
      : contract.gateway_mode === "test" || contract.gateway_mode === "live"
        ? contract.gateway_mode
        : null;
  if (
    payment?.live_mode !== undefined &&
    payload?.live_mode !== undefined &&
    payment.live_mode !== payload.live_mode
  )
    return null;
  if (mode && contract.gateway_mode && contract.gateway_mode !== mode) return null;
  // Explicit test/live evidence must not leak across the configured runtime. Unscoped legacy stays labeled.
  if (mode && !context.scopes.some((scope) => scope.mode === mode)) return null;
  const status = mpStatus(paymentStatus(event.payload));
  const value = payment ?? payload;
  const amount = toAmountCents(
    findPayloadValue(value, ["transaction_amount", "total_paid_amount", "paid_amount", "amount"]),
  );
  const currencyValue = findPayloadValue(value, ["currency_id", "currency"]);
  const currency =
    typeof currencyValue === "string" && /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : null;
  return {
    accountId: contract.gateway_account_id,
    paymentId,
    invoiceId: paymentId,
    observedAt: event.createdAt,
    item: {
      ...base(contract),
      id: `event:${event.id}`,
      gateway: "mercadopago",
      mode,
      occurred_at: event.createdAt.toISOString(),
      amount_cents: amount,
      currency,
      financial_status: status,
      status_label: labels[status],
      source: "mercadopago_event",
      invoice: null,
      description:
        "Evento legado observado localmente; conta e modo podem não estar comprovados. Não consultado no provedor.",
    },
  };
}

const invoiceStatuses = new Set([
  "awaiting_activation",
  "awaiting_configuration",
  "manual_review",
  "queued",
  "pending",
  "processing",
  "authorized",
  "rejected",
  "blocked",
  "failed",
  "cancel_requested",
  "cancelled",
  "simulated",
  "authorization_unverified",
]);
export function validHistoryInvoice(
  row: billing_invoice,
  contract: HistoryContract,
  context: HistoryContext,
): boolean {
  const snapshot = invoiceRequestSchema.safeParse(row.request_snapshot);
  const stripe = row.gateway === "stripe";
  return Boolean(
    context.fiscal &&
      row.company_id === context.fiscal.companyId &&
      row.mode === context.fiscal.mode &&
      row.user_id === contract.psychologist.user.id &&
      row.subscription_id === contract.id &&
      row.gateway === contract.source &&
      invoiceScopeMatches(context.scopes, row) &&
      (!stripe ||
        (contract.gateway === "stripe" &&
          contract.gateway_account_id === row.account_id &&
          contract.gateway_mode === row.mode)) &&
      (stripe ||
        (row.gateway === "mercadopago" &&
          !contract.gateway_account_id &&
          (!contract.gateway_mode || contract.gateway_mode === row.mode))) &&
      row.currency === "BRL" &&
      Number.isSafeInteger(row.amount_cents) &&
      row.amount_cents > 0 &&
      row.paid_at <= context.now &&
      snapshot.success &&
      snapshot.data.company_id === row.company_id &&
      snapshot.data.reference === row.reference &&
      snapshot.data.items[0].unit_amount === row.amount_cents &&
      row.reference ===
        invoiceReference(
          row.company_id,
          row.payment_id,
          row.mode as "test" | "live",
          stripe ? row.account_id! : undefined,
        ),
  );
}

function invoiceView(row: billing_invoice): NonNullable<AdminFinanceHistoryItem["invoice"]> {
  const status = invoiceStatuses.has(row.status) ? row.status : "unknown";
  const number = row.number && /^[A-Za-z0-9/._-]{1,100}$/.test(row.number) ? row.number : null;
  return {
    id: row.id,
    status,
    number,
    mode: row.mode as "test" | "live",
    // Eligibility hint from local state; download always revalidates the canonical fiscal document.
    downloadable:
      status === "authorized" && Boolean(row.document_id) && !/^SIM-/i.test(number ?? ""),
  };
}

function eventCandidates(
  event: payment_event,
  references: Map<string, Set<HistoryContract>>,
  ambiguousReferences: Set<string>,
) {
  const candidates = new Set<HistoryContract>();
  let ambiguous = false;
  const keys = new Set([
    "external_reference",
    "preapproval_id",
    "subscription_id",
    "gateway_subscription_id",
  ]);
  const visit = (value: unknown, depth: number) => {
    if (depth > 8 || !value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (keys.has(key.toLowerCase()) && typeof item === "string") {
        if (ambiguousReferences.has(item.trim())) ambiguous = true;
        for (const contract of references.get(item.trim()) ?? []) candidates.add(contract);
      }
      visit(item, depth + 1);
    }
  };
  visit(event.payload, 0);
  return ambiguous ? [] : [...candidates];
}

export function projectAdminHistory(
  records: HistoryRecords,
  query: AdminFinanceHistoryQuery,
  context: HistoryContext,
): AdminFinanceHistory {
  const contracts = new Map(records.contracts.map((row) => [row.id, row]));
  const entries = new Map<string, Entry>();
  const put = (entry: Entry) => {
    const key = entryKey(entry);
    const previous = entries.get(key);
    if (
      !previous ||
      entry.observedAt > previous.observedAt ||
      (entry.observedAt.getTime() === previous.observedAt.getTime() &&
        entry.item.id > previous.item.id)
    )
      entries.set(key, entry);
  };
  for (const row of records.receipts) {
    const contract = contracts.get(row.subscription_id);
    const entry = contract && projectStripeReceipt(row, contract, context);
    if (entry) put(entry);
  }
  const references = new Map<string, Set<HistoryContract>>();
  for (const contract of records.contracts.filter((row) => row.source === "mercadopago")) {
    for (const id of [contract.id, contract.gateway_subscription_id].filter((id): id is string =>
      Boolean(id),
    )) {
      const group = references.get(id) ?? new Set<HistoryContract>();
      group.add(contract);
      references.set(id, group);
    }
  }
  const ambiguousReferences = new Set(records.ambiguousReferences);
  for (const row of records.events) {
    const candidates = eventCandidates(row, references, ambiguousReferences)
      .map((contract) => projectMercadoPagoEvent(row, contract, context))
      .filter((entry): entry is Entry => Boolean(entry));
    if (candidates.length === 1) put(candidates[0]); // Conflicting ownership never grants visibility.
  }
  for (const row of records.invoices) {
    const contract = contracts.get(row.subscription_id);
    if (!contract || !validHistoryInvoice(row, contract, context)) continue;
    const matching = [...entries.values()].filter(
      (entry) =>
        entry.item.gateway === row.gateway &&
        entry.accountId === row.account_id &&
        entry.item.mode === row.mode &&
        entry.item.user_id === row.user_id &&
        entry.item.subscription_id === row.subscription_id &&
        entry.invoiceId === row.payment_id,
    );
    if (matching.length) {
      for (const entry of matching) entry.item.invoice = invoiceView(row);
      continue;
    }
    // A fiscal record is not sufficient evidence of settlement or current entitlement.
    put({
      accountId: row.account_id,
      paymentId: row.payment_id,
      invoiceId: row.payment_id,
      observedAt: row.updated_at,
      item: {
        ...base(contract),
        id: `fiscal:${row.id}`,
        gateway: row.gateway as "stripe" | "mercadopago",
        mode: row.mode as "test" | "live",
        occurred_at: row.paid_at.toISOString(),
        amount_cents: row.amount_cents,
        currency: row.currency,
        financial_status: "processed",
        status_label: "Registro fiscal",
        source: "fiscal_payment_record",
        invoice: invoiceView(row),
        description:
          "Valor do registro fiscal; pagamento não comprovado por recibo financeiro neste histórico.",
      },
    });
  }
  const items = [...entries.values()]
    .map((entry) => entry.item)
    .filter((item) => !query.status || item.financial_status === query.status)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id.localeCompare(a.id));
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total: items.length, total_pages: Math.ceil(items.length / limit) },
    coverage: {
      source: "local_records",
      remote_readiness: "not_checked",
      complete: false,
      reason:
        "Histórico dos registros locais elegíveis de todos os contratos. Não comprova cobertura completa no provedor; dados legados podem não informar conta ou modo. Situação fiscal e financeira são independentes.",
    },
  };
}
