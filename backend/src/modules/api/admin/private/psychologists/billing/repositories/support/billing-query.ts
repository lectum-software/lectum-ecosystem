import type { Prisma } from "@/external/generated/prisma/client";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { findPayloadValue, toAmountCents } from "@/modules/billing/payment-event-values";
import type { GatewaySubscriptionPaymentSummary } from "@/modules/billing/payment-gateway";

export {
  findPayloadValue,
  isConfirmedPaymentStatus,
  toAmountCents,
  valueContainsReference,
} from "@/modules/billing/payment-event-values";

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

  return Object.hasOwn(PAYMENT_METHOD_BRAND_LABELS, normalized)
    ? PAYMENT_METHOD_BRAND_LABELS[normalized]
    : null;
};

export const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const extractPaymentAmountCents = (payload: unknown) => {
  const directAmount = findPayloadValue(payload, [
    "transaction_amount",
    "total_paid_amount",
    "paid_amount",
  ]);
  const fallbackAmount = directAmount ?? findPayloadValue(payload, ["amount"]);

  return toAmountCents(asRecord(fallbackAmount)?.value ?? fallbackAmount);
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
