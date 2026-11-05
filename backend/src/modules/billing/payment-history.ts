import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type {
  BillingPaymentHistoryItem,
  BillingPaymentHistoryStatus,
} from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import {
  findPayloadValue,
  isConfirmedPaymentStatus,
  paymentStatus,
  toAmountCents,
  valueContainsReference,
} from "./payment-event-values";
import type { GatewaySubscriptionPaymentSummary } from "./payment-gateway/PaymentGateway";

const MAX_PAYMENT_HISTORY_ITEMS = 10;

const extractPaymentAmountCents = (payload: unknown) => {
  const directAmount = findPayloadValue(payload, [
    "transaction_amount",
    "total_paid_amount",
    "paid_amount",
  ]);
  const fallbackAmount = directAmount ?? findPayloadValue(payload, ["amount"]);

  return toAmountCents(fallbackAmount);
};

const normalizeSubscriptionPaymentAmountCents = (
  amountCents: number | null,
  subscription: professional_subscription,
) => {
  const planPriceCents = subscription.plan?.price_cents ?? null;

  if (amountCents !== null) {
    const maxExpectedByPlan =
      planPriceCents && planPriceCents > 0 ? Math.max(planPriceCents * 12, 100_000) : null;
    const isReasonableWithoutPlan = !maxExpectedByPlan && amountCents <= 500_000;

    if (maxExpectedByPlan ? amountCents <= maxExpectedByPlan : isReasonableWithoutPlan) {
      return amountCents;
    }
  }

  return null;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isPaymentEvent = (event: Pick<payment_event, "payload" | "type">) => {
  const typeText = normalizeText(event.type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(event.payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

const resolvePaymentHistoryStatus = (
  event: payment_event,
): { status: BillingPaymentHistoryStatus; label: string } => {
  const source = paymentStatus(event.payload);

  if (isConfirmedPaymentStatus(event.payload)) {
    return { status: "pago", label: "Sucesso" };
  }

  if (
    source.includes("rejected") ||
    source.includes("refused") ||
    source.includes("charged_back") ||
    source.includes("chargeback")
  ) {
    return { status: "recusado", label: "Recusado" };
  }

  if (source.includes("cancelled") || source.includes("canceled")) {
    return { status: "cancelado", label: "Cancelado" };
  }

  if (source.includes("pending") || source.includes("in_process")) {
    return { status: "pendente", label: "Pendente" };
  }

  return { status: "processado", label: "Processado" };
};

const paymentHistoryDescription = (status: BillingPaymentHistoryStatus) => {
  const labels: Record<BillingPaymentHistoryStatus, string> = {
    cancelado: "Pagamento cancelado pelo provedor.",
    pago: "Pagamento confirmado pelo provedor.",
    pendente: "Pagamento pendente no provedor.",
    processado: "Evento de pagamento processado pelo provedor.",
    recusado: "Pagamento recusado pelo provedor.",
  };

  return labels[status];
};

const dedupePaymentHistoryItems = (items: BillingPaymentHistoryItem[]) => {
  const deduped = new Map<string, BillingPaymentHistoryItem>();

  for (const item of items) {
    const key = item.payment_id ? JSON.stringify([item.gateway, item.payment_id]) : item.id;

    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values());
};

const toDateOrNull = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

export const buildGatewaySummaryPaymentHistoryItem = (
  subscription: professional_subscription,
  summary: GatewaySubscriptionPaymentSummary,
): BillingPaymentHistoryItem | null => {
  if (summary.charged_quantity <= 0) return null;

  const amountCents =
    summary.last_charged_amount_cents ??
    (summary.charged_quantity === 1 ? summary.charged_amount_cents : null);

  return {
    amount_cents: amountCents,
    description:
      summary.charged_quantity === 1 ? "Cobrança confirmada." : "Última mensalidade confirmada.",
    external_id: summary.gateway_subscription_id,
    subscription_id: subscription.id ?? undefined,
    summary_charged_quantity: summary.charged_quantity,
    gateway: subscription.gateway ?? "mercadopago",
    id: `gateway-summary:${summary.gateway_subscription_id}:latest-paid-installment`,
    occurred_at: toDateOrNull(summary.last_charged_at),
    status: "pago",
    status_label: "Sucesso",
    title: "Pagamento confirmado",
  };
};

export const mergeGatewaySummaryPaymentHistory = (
  localItems: BillingPaymentHistoryItem[],
  gatewayItem: BillingPaymentHistoryItem | null,
) => {
  if (!gatewayItem) return localItems;

  const identified = localItems.filter(
    (item) =>
      item.payment_id &&
      item.gateway === gatewayItem.gateway &&
      item.subscription_id === gatewayItem.subscription_id,
  );
  if (
    gatewayItem.summary_charged_quantity &&
    identified.length >= gatewayItem.summary_charged_quantity
  )
    return localItems;
  return [gatewayItem, ...localItems].slice(0, MAX_PAYMENT_HISTORY_ITEMS);
};

const buildPaymentHistoryItem = (
  event: payment_event,
  subscription: professional_subscription,
): BillingPaymentHistoryItem | null => {
  const type = event.type ?? "";
  if (!isPaymentEvent(event)) return null;

  const status = resolvePaymentHistoryStatus(event);
  if (status.status !== "pago") return null;

  const amountFromPayload = extractPaymentAmountCents(event.payload);
  const amountCents = normalizeSubscriptionPaymentAmountCents(amountFromPayload, subscription);

  return {
    id: event.id ?? [event.gateway ?? "mercadopago", event.external_id ?? type].join(":"),
    title: "Pagamento confirmado",
    description: paymentHistoryDescription(status.status),
    amount_cents: amountCents,
    status: status.status,
    status_label: status.label,
    occurred_at: event.createdAt ?? null,
    gateway: event.gateway ?? "mercadopago",
    external_id: event.external_id ?? "",
    subscription_id: subscription.id ?? undefined,
    payment_id: paymentIdentity(event),
  };
};

const paymentIdentity = (event: payment_event): string | undefined => {
  const payload = event.payload as Record<string, unknown> | null;
  const payment = payload?.payment as Record<string, unknown> | undefined;
  const data = payload?.data as Record<string, unknown> | undefined;
  const value =
    payment?.id ??
    payload?.payment_id ??
    (event.type === "payment" ? (data?.id ?? payload?.id) : undefined);
  return typeof value === "string" && value.trim()
    ? value.trim()
    : typeof value === "number" && Number.isSafeInteger(value)
      ? String(value)
      : undefined;
};

export const buildPaymentHistoryItemsForSubscription = (
  events: payment_event[],
  subscription: professional_subscription,
) => {
  const references = [subscription.id, subscription.gateway_subscription_id].filter(
    (reference): reference is string => Boolean(reference),
  );

  if (references.length === 0) return [];

  const items = events
    .filter((event) => valueContainsReference(event.payload, references))
    .map((event) => buildPaymentHistoryItem(event, subscription))
    .filter((item): item is BillingPaymentHistoryItem => Boolean(item))
    .sort((left, right) => {
      const leftTime = left.occurred_at?.getTime() ?? 0;
      const rightTime = right.occurred_at?.getTime() ?? 0;

      return rightTime - leftTime;
    });

  return dedupePaymentHistoryItems(items).slice(0, MAX_PAYMENT_HISTORY_ITEMS);
};
