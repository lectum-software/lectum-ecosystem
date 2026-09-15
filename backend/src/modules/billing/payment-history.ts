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

const dateKey = (date?: Date | null) => (date ? date.toISOString().slice(0, 10) : "sem-data");

const dedupePaymentHistoryItems = (items: BillingPaymentHistoryItem[]) => {
  const deduped = new Map<string, BillingPaymentHistoryItem>();

  for (const item of items) {
    const key =
      item.status === "pago"
        ? ["pago", dateKey(item.occurred_at), item.amount_cents ?? "sem-valor", item.title].join(
            ":",
          )
        : item.id;

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
    gateway: subscription.gateway ?? "mercadopago",
    id: `gateway-summary:${summary.gateway_subscription_id}:latest-paid-installment`,
    occurred_at: toDateOrNull(summary.last_charged_at),
    status: "pago",
    status_label: "Sucesso",
    title: subscription.plan?.name?.trim() || "Plano profissional",
  };
};

export const mergeGatewaySummaryPaymentHistory = (
  localItems: BillingPaymentHistoryItem[],
  gatewayItem: BillingPaymentHistoryItem | null,
) => {
  if (!gatewayItem) return localItems;

  const gatewayDate = dateKey(gatewayItem.occurred_at);
  const localWithoutGatewayDay =
    gatewayDate !== "sem-data"
      ? localItems.filter((item) => dateKey(item.occurred_at) !== gatewayDate)
      : localItems.filter(
          (item) =>
            item.status !== gatewayItem.status || item.amount_cents !== gatewayItem.amount_cents,
        );

  return [gatewayItem, ...localWithoutGatewayDay].slice(0, MAX_PAYMENT_HISTORY_ITEMS);
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
    title: subscription.plan?.name?.trim() || "Plano profissional",
    description: paymentHistoryDescription(status.status),
    amount_cents: amountCents,
    status: status.status,
    status_label: status.label,
    occurred_at: event.createdAt ?? null,
    gateway: event.gateway ?? "mercadopago",
    external_id: event.external_id ?? "",
  };
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
