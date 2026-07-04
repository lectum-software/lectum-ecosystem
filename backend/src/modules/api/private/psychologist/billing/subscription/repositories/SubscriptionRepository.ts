import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  payment_event,
  payment_method,
  professional_subscription,
} from "@/interfaces/objects";
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

const findPayloadValue = (value: unknown, keys: string[], depth = 0): string | number | null => {
  if (depth > 8) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys, depth + 1);
      if (found !== null) return found;
    }

    return null;
  }

  const record = asRecord(value);
  if (!record) {
    return typeof value === "string" || typeof value === "number" ? value : null;
  }

  for (const [key, item] of Object.entries(record)) {
    if (keys.includes(key) && (typeof item === "string" || typeof item === "number")) {
      return item;
    }
  }

  for (const item of Object.values(record)) {
    const found = findPayloadValue(item, keys, depth + 1);
    if (found !== null) return found;
  }

  return null;
};

const toAmountCents = (value: string | number | null) => {
  if (value === null) return null;

  const amount = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
};

const resolvePaymentHistoryStatus = (
  event: payment_event,
): { status: BillingPaymentHistoryStatus; label: string } => {
  const payloadStatus = toSafeString(
    findPayloadValue(event.payload, ["status", "status_detail", "action"]),
  );
  const source = `${payloadStatus ?? ""} ${event.type ?? ""}`.toLowerCase();

  if (
    source.includes("approved") ||
    source.includes("accredited") ||
    source.includes("authorized") ||
    source.includes("paid")
  ) {
    return { status: "pago", label: "Pago" };
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

const buildPaymentHistoryItem = (
  event: payment_event,
  subscription: professional_subscription,
): BillingPaymentHistoryItem => {
  const type = event.type ?? "";
  const isPaymentEvent = type.toLowerCase().includes("payment");
  const status = resolvePaymentHistoryStatus(event);
  const amountFromPayload = toAmountCents(
    findPayloadValue(event.payload, [
      "transaction_amount",
      "amount",
      "total_paid_amount",
      "paid_amount",
    ]),
  );

  return {
    id: event.id ?? `${event.gateway ?? "mercadopago"}:${event.external_id ?? type}`,
    title: isPaymentEvent ? "Assinatura mensal" : "Atualização da assinatura",
    description: isPaymentEvent
      ? "Cobrança registrada pelo Mercado Pago."
      : "Evento de cobrança confirmado pelo Mercado Pago.",
    amount_cents:
      amountFromPayload ?? (isPaymentEvent ? (subscription.plan?.price_cents ?? null) : null),
    status: status.status,
    status_label: status.label,
    occurred_at: event.createdAt ?? null,
    gateway: event.gateway ?? "mercadopago",
    external_id: event.external_id ?? "",
  };
};

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

    if (activeFree) return activeFree;

    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async showPaymentMethod(userId: string): Promise<payment_method | null> {
    return this.paymentMethodRepository.findFirst({
      where: {
        user_id: userId,
        gateway: "mercadopago",
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

    const references = [subscription.id, subscription.gateway_subscription_id].filter(
      (reference): reference is string => Boolean(reference),
    );

    if (references.length === 0) return [];

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

    return events
      .filter((event) => valueContainsReference(event.payload, references))
      .slice(0, MAX_PAYMENT_HISTORY_ITEMS)
      .map((event) => buildPaymentHistoryItem(event, subscription));
  }
}
