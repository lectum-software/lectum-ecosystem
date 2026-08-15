import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  payment_event,
  payment_method,
  professional_subscription,
} from "@/interfaces/objects";
import { resolveEffectiveBillingSubscription } from "@/modules/billing/effective-subscription";
import {
  cancelledProfessionalGatewaySubscriptionWhere,
  restoreFreePlanAfterProfessionalCancellation,
} from "@/modules/billing/free-subscription";
import {
  type GatewaySubscriptionPaymentSummary,
  getPaymentGateway,
} from "@/modules/billing/payment-gateway";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";
import type {
  BillingPaymentHistoryItem,
  BillingPaymentHistoryStatus,
  ISubscriptionRepository,
} from "./interfaces/ISubscriptionRepository";

const MAX_PAYMENT_EVENTS_TO_SCAN = 100;
const MAX_PAYMENT_HISTORY_ITEMS = 10;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toSafeString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
};

const valueContainsReference = (value: unknown, references: string[], depth = 0): boolean => {
  if (references.length === 0 || depth > 8) return false;

  const stringValue = toSafeString(value);
  if (stringValue) {
    return references.some((reference) => stringValue.includes(reference));
  }

  if (Array.isArray(value)) {
    return value.some((item) => valueContainsReference(item, references, depth + 1));
  }

  const record = asRecord(value);
  if (!record) return false;

  return Object.values(record).some((item) => valueContainsReference(item, references, depth + 1));
};

const findPayloadValue = (value: unknown, keys: string[], depth = 0): unknown => {
  if (depth > 8) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }

    return undefined;
  }

  const record = asRecord(value);
  if (!record) return undefined;

  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const [key, item] of Object.entries(record)) {
    if (normalizedKeys.includes(key.toLowerCase())) return item;
  }

  for (const item of Object.values(record)) {
    const found = findPayloadValue(item, keys, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
};

const toAmountCents = (value: unknown) => {
  const amountValue = asRecord(value)?.value ?? value;

  const amount =
    typeof amountValue === "number"
      ? amountValue
      : typeof amountValue === "string"
        ? Number(amountValue.replace(",", "."))
        : null;
  if (amount === null || !Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
};

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
  const payloadStatus = normalizeText(
    findPayloadValue(event.payload, ["status", "status_detail", "action", "payment_status"]),
  );
  const source = `${payloadStatus} ${normalizeText(event.type)}`;

  if (
    source.includes("approved") ||
    source.includes("accredited") ||
    source.includes("authorized") ||
    source.includes("paid")
  ) {
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

const isMercadoPagoPaymentHistorySource = (subscription: professional_subscription | null) =>
  Boolean(
    subscription?.gateway_subscription_id &&
      (subscription.source === "mercadopago" ||
        subscription.gateway === "mercadopago" ||
        !subscription.gateway),
  );

export class SubscriptionRepository implements ISubscriptionRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly subscriptionRepository: ORM["professional_subscription"];
  readonly paymentMethodRepository: ORM["payment_method"];
  readonly paymentEventRepository: ORM["payment_event"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.subscriptionRepository = prisma.professional_subscription;
    this.paymentMethodRepository = prisma.payment_method;
    this.paymentEventRepository = prisma.payment_event;
  }

  async findProfileByUserId(
    userId: string,
  ): Promise<{ id?: string | null; deleted?: boolean | null } | null> {
    return this.profileRepository.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        deleted: true,
      },
    });
  }

  async showSubscription(psychologistId: string): Promise<professional_subscription | null> {
    const activeProfessional = await this.subscriptionRepository.findFirst({
      where: {
        ...activeProfessionalEntitlementWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeProfessional) return activeProfessional;

    const actionableGatewayProfessional = await this.subscriptionRepository.findFirst({
      where: {
        ...actionableProfessionalGatewaySubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (actionableGatewayProfessional) return actionableGatewayProfessional;

    const activeFree = await this.subscriptionRepository.findFirst({
      where: {
        ...activeFreeSubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return (
      resolveEffectiveBillingSubscription({
        activeProfessional,
        actionableGatewayProfessional,
        activeFree,
      }) ?? this.restoreFreeAfterLatestCancelledProfessional(psychologistId)
    );
  }

  private async restoreFreeAfterLatestCancelledProfessional(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    const cancelledProfessional = await this.subscriptionRepository.findFirst({
      where: {
        ...cancelledProfessionalGatewaySubscriptionWhere(),
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!cancelledProfessional?.id) return null;

    return prisma.$transaction(
      async (tx) =>
        (await restoreFreePlanAfterProfessionalCancellation({
          cancelledSubscriptionId: cancelledProfessional.id,
          psychologistId,
          tx,
        })) ?? null,
    );
  }

  async findCancelableSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        status: "ativa",
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        plan: {
          active: true,
          deleted: false,
          slug: "profissional",
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        status: {
          in: ["inativa", "inadimplente"],
        },
        plan: {
          active: true,
          deleted: false,
          slug: "profissional",
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async cancelSubscription(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
  }): Promise<{
    cancelled: professional_subscription;
    current: professional_subscription;
  }> {
    return prisma.$transaction(async (tx) => {
      const cancelled = await tx.professional_subscription.update({
        where: {
          id: data.subscriptionId,
        },
        data: {
          status: "cancelada",
          gateway: "mercadopago",
          gateway_subscription_id: data.gatewaySubscriptionId,
          current_period_end: null,
        },
        include: {
          plan: true,
        },
      });
      const current =
        (await restoreFreePlanAfterProfessionalCancellation({
          cancelledSubscriptionId: cancelled.id,
          psychologistId: cancelled.psychologist_id,
          tx,
        })) ?? cancelled;

      return {
        cancelled,
        current,
      };
    });
  }

  async showPaymentMethod(
    userId: string,
    gatewayToken?: string | null,
  ): Promise<payment_method | null> {
    return this.paymentMethodRepository.findFirst({
      where: {
        user_id: userId,
        gateway: "mercadopago",
        ...(gatewayToken ? { gateway_token: gatewayToken } : {}),
        deleted: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async showPaymentHistory(
    subscription: professional_subscription | null,
  ): Promise<BillingPaymentHistoryItem[]> {
    if (!subscription) return [];

    const events = await this.paymentEventRepository.findMany({
      where: {
        gateway: subscription.gateway || "mercadopago",
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: MAX_PAYMENT_EVENTS_TO_SCAN,
    });

    const localItems = buildPaymentHistoryItemsForSubscription(events, subscription);

    if (isMercadoPagoPaymentHistorySource(subscription)) {
      try {
        const gateway = getPaymentGateway();
        const summary = await gateway.getSubscriptionPaymentSummary(
          subscription.gateway_subscription_id!,
        );
        const gatewayItem = buildGatewaySummaryPaymentHistoryItem(subscription, summary);

        return mergeGatewaySummaryPaymentHistory(localItems, gatewayItem);
      } catch {
        // Mantém o histórico local quando a reconciliação online não estiver disponível.
      }
    }

    return localItems;
  }
}
