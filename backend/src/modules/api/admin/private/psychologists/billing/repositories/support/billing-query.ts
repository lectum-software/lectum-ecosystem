import type { Prisma } from "@/external/generated/prisma/client";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import type { GatewaySubscriptionPaymentSummary } from "@/modules/billing/payment-gateway";

export const ADMIN_GRANT_SOURCE = "admin_grant";

export const PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS = 5 * 60 * 1000;

export const PAYMENT_GATEWAY_FALLBACK = "mercadopago";

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const toSafeString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
};

export const PAYMENT_METHOD_BRAND_LABELS: Record<string, string> = {
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  master: "Mastercard",
  mastercard: "Mastercard",
  visa: "Visa",
};

export const toPaymentMethodBrandLabel = (value: unknown) => {
  const raw = toSafeString(value);
  if (!raw) return null;

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return PAYMENT_METHOD_BRAND_LABELS[normalized] ?? raw.toUpperCase();
};

export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const valueContainsReference = (
  value: unknown,
  references: string[],
  depth = 0,
): boolean => {
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

export const findPayloadValue = (value: unknown, keys: string[], depth = 0): unknown => {
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
  for (const [key, entry] of Object.entries(record)) {
    if (normalizedKeys.includes(key.toLowerCase())) return entry;
  }

  for (const entry of Object.values(record)) {
    const found = findPayloadValue(entry, keys, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
};

export const toAmountCents = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized =
    trimmed.includes(",") && !trimmed.includes(".") ? trimmed.replace(",", ".") : trimmed;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 100);
};

export const extractPaymentAmountCents = (payload: unknown) => {
  const directAmount = findPayloadValue(payload, [
    "transaction_amount",
    "total_paid_amount",
    "paid_amount",
  ]);
  const fallbackAmount = directAmount ?? findPayloadValue(payload, ["amount"]);

  return toAmountCents(asRecord(fallbackAmount)?.value ?? fallbackAmount);
};

export const isConfirmedPaymentStatus = (payload: unknown) => {
  const status = normalizeText(
    findPayloadValue(payload, ["status", "status_detail", "action", "payment_status"]),
  );

  return ["approved", "accredited", "authorized", "paid"].some((term) => status.includes(term));
};

export const isPaymentEvent = (event: Pick<payment_event, "payload" | "type">) => {
  const typeText = normalizeText(event.type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(event.payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

export const isGatewaySubscription = (subscription: AdminPsychologistBillingSubscription) =>
  Boolean(
    subscription.source === "mercadopago" ||
      subscription.gateway ||
      subscription.gateway_subscription_id,
  );

export const isMercadoPagoSubscription = (subscription: AdminPsychologistBillingSubscription) =>
  Boolean(
    subscription.gateway_subscription_id &&
      (subscription.source === "mercadopago" ||
        subscription.gateway === "mercadopago" ||
        !subscription.gateway),
  );

export const isMercadoPagoPaymentHistorySource = (subscription: professional_subscription | null) =>
  Boolean(
    subscription?.gateway_subscription_id &&
      (subscription.source === "mercadopago" ||
        subscription.gateway === "mercadopago" ||
        !subscription.gateway),
  );

export const toDateOrNull = (value?: string | null) => {
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
  const planName = subscription.plan?.name?.trim() || "Plano profissional";

  return {
    amount_cents: amountCents,
    description:
      summary.charged_quantity === 1
        ? "Cobrança confirmada pelo provedor de pagamento."
        : "Última mensalidade confirmada pelo provedor de pagamento.",
    external_id: summary.gateway_subscription_id,
    gateway: subscription.gateway ?? PAYMENT_GATEWAY_FALLBACK,
    id: `gateway-summary:${summary.gateway_subscription_id}:latest-paid-installment`,
    occurred_at: toDateOrNull(summary.last_charged_at),
    status: "pago",
    status_label: "Sucesso",
    title: planName,
  };
};

export const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

export const billingSelect = {
  cfp_verified_at: true,
  cpf: true,
  createdAt: true,
  crp: true,
  crp_registration_date: true,
  id: true,
  user_id: true,
  subscriptions: {
    orderBy: {
      createdAt: "desc",
    },
    where: {
      deleted: false,
      plan: {
        active: true,
        deleted: false,
      },
    },
    select: {
      createdAt: true,
      current_period_end: true,
      gateway: true,
      gateway_subscription_id: true,
      grant_notes: true,
      grant_reason: true,
      grant_started_at: true,
      granted_by: true,
      id: true,
      plan: {
        select: {
          interval: true,
          name: true,
          price_cents: true,
          slug: true,
        },
      },
      source: true,
      status: true,
      updatedAt: true,
    },
  },
  user: {
    select: {
      active: true,
      email: true,
      id: true,
      name: true,
      role: true,
      payment_methods: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          brand: true,
          exp_month: true,
          exp_year: true,
          gateway: true,
          last4: true,
        },
        take: 1,
        where: {
          deleted: false,
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileSelect;

export type AdminPsychologistBillingRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof billingSelect;
}>;

export type AdminPsychologistBillingSubscription =
  AdminPsychologistBillingRecord["subscriptions"][number];

export type AdminPsychologistBillingPaymentMetrics = {
  lifetimeValueAvailable: boolean;
  lifetimeValueCents: number | null;
  lifetimeValueUnavailableReason: string | null;
  paidInstallmentsCount: number;
};
