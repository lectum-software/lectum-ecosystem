import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  payment_event,
  payment_method,
  professional_subscription,
} from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { SubscriptionRepository } from "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

const ADMIN_GRANT_SOURCE = "admin_grant";
const PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS = 5 * 60 * 1000;
const PAYMENT_GATEWAY_FALLBACK = "mercadopago";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toSafeString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
  for (const [key, entry] of Object.entries(record)) {
    if (normalizedKeys.includes(key.toLowerCase())) return entry;
  }

  for (const entry of Object.values(record)) {
    const found = findPayloadValue(entry, keys, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
};

const toAmountCents = (value: unknown): number | null => {
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

const extractPaymentAmountCents = (payload: unknown) =>
  toAmountCents(
    findPayloadValue(payload, [
      "transaction_amount",
      "total_paid_amount",
      "paid_amount",
      "amount",
      "value",
    ]),
  );

const isConfirmedPaymentStatus = (payload: unknown) => {
  const status = normalizeText(
    findPayloadValue(payload, ["status", "status_detail", "action", "payment_status"]),
  );

  return ["approved", "accredited", "authorized", "paid"].some((term) => status.includes(term));
};

const isPaymentEvent = (event: Pick<payment_event, "payload" | "type">) => {
  const typeText = normalizeText(event.type);
  if (typeText.includes("payment")) return true;

  const topic = normalizeText(findPayloadValue(event.payload, ["topic", "type", "action"]));
  return topic.includes("payment");
};

const isGatewaySubscription = (subscription: AdminPsychologistBillingSubscription) =>
  Boolean(
    subscription.source === "mercadopago" ||
      subscription.gateway ||
      subscription.gateway_subscription_id,
  );

const isMercadoPagoSubscription = (subscription: AdminPsychologistBillingSubscription) =>
  Boolean(
    subscription.gateway_subscription_id &&
      (subscription.source === "mercadopago" ||
        subscription.gateway === "mercadopago" ||
        !subscription.gateway),
  );

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const billingSelect = {
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

export class AdminPsychologistBillingRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistBillingRecord | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: billingSelect,
    });
  }

  async findCurrentSubscription(
    psychologistId: string,
  ): Promise<AdminPsychologistBillingSubscription | null> {
    const activeProfessional = await prisma.professional_subscription.findFirst({
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

    const actionableGatewayProfessional = await prisma.professional_subscription.findFirst({
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

    const activeFree = await prisma.professional_subscription.findFirst({
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

    return null;
  }

  async findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<AdminPsychologistBillingSubscription | null> {
    return prisma.professional_subscription.findFirst({
      where: {
        deleted: false,
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        psychologist_id: psychologistId,
        source: "mercadopago",
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

  async findPaymentMethod(
    userId: string,
    gatewayToken?: string | null,
  ): Promise<payment_method | null> {
    return prisma.payment_method.findFirst({
      where: {
        deleted: false,
        gateway: "mercadopago",
        ...(gatewayToken ? { gateway_token: gatewayToken } : {}),
        user_id: userId,
      },
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
    });
  }

  async showPaymentHistory(
    subscription: professional_subscription | null,
  ): Promise<BillingPaymentHistoryItem[]> {
    const repository = new SubscriptionRepository();
    return repository.showPaymentHistory(subscription);
  }

  private async summarizeGatewayPaymentMetrics(
    subscriptions: AdminPsychologistBillingSubscription[],
  ): Promise<AdminPsychologistBillingPaymentMetrics | null> {
    const mercadoPagoSubscriptions = subscriptions.filter(isMercadoPagoSubscription);

    if (mercadoPagoSubscriptions.length === 0) return null;

    try {
      const gateway = getPaymentGateway();
      const summaries = await Promise.allSettled(
        mercadoPagoSubscriptions.map((subscription) =>
          gateway.getSubscriptionPaymentSummary(subscription.gateway_subscription_id!),
        ),
      );
      const fulfilledSummaries = summaries
        .filter(
          (
            summary,
          ): summary is PromiseFulfilledResult<
            Awaited<ReturnType<typeof gateway.getSubscriptionPaymentSummary>>
          > => summary.status === "fulfilled",
        )
        .map((summary) => summary.value);

      if (fulfilledSummaries.length === 0) return null;

      const aggregate = fulfilledSummaries.reduce(
        (accumulator, summary) => {
          accumulator.paidInstallmentsCount += summary.charged_quantity;

          if (summary.charged_quantity > 0 && summary.charged_amount_cents === null) {
            accumulator.missingAmountCount += 1;
            return accumulator;
          }

          accumulator.lifetimeValueCents += summary.charged_amount_cents ?? 0;
          return accumulator;
        },
        {
          lifetimeValueCents: 0,
          missingAmountCount: 0,
          paidInstallmentsCount: 0,
        },
      );
      const rejectedCount = summaries.length - fulfilledSummaries.length;
      const hasUnavailableAmount = aggregate.missingAmountCount > 0 || rejectedCount > 0;

      return {
        lifetimeValueAvailable: !hasUnavailableAmount,
        lifetimeValueCents: hasUnavailableAmount ? null : aggregate.lifetimeValueCents,
        lifetimeValueUnavailableReason:
          aggregate.missingAmountCount > 0
            ? "O gateway confirmou cobranças, mas não retornou valor monetário agregado suficiente para calcular o LTV."
            : rejectedCount > 0
              ? "Parte das assinaturas do gateway não pôde ser reconciliada agora."
              : null,
        paidInstallmentsCount: aggregate.paidInstallmentsCount,
      };
    } catch {
      return null;
    }
  }

  async summarizePaymentMetrics(
    subscriptions: AdminPsychologistBillingSubscription[],
  ): Promise<AdminPsychologistBillingPaymentMetrics> {
    const gatewaySubscriptions = subscriptions.filter(isGatewaySubscription);
    const references = uniqueStrings(
      gatewaySubscriptions.flatMap((subscription) => [
        subscription.id,
        subscription.gateway_subscription_id,
      ]),
    );

    if (references.length === 0) {
      return {
        lifetimeValueAvailable: true,
        lifetimeValueCents: 0,
        lifetimeValueUnavailableReason: null,
        paidInstallmentsCount: 0,
      };
    }

    const gatewayMetrics = await this.summarizeGatewayPaymentMetrics(gatewaySubscriptions);

    if (gatewayMetrics) return gatewayMetrics;

    const gateways = uniqueStrings(
      gatewaySubscriptions.map((subscription) => subscription.gateway ?? PAYMENT_GATEWAY_FALLBACK),
    );
    const events = await prisma.payment_event.findMany({
      where: {
        deleted: false,
        gateway: {
          in: gateways.length > 0 ? gateways : [PAYMENT_GATEWAY_FALLBACK],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        payload: true,
        type: true,
      },
    });
    const confirmedPayments = events.filter(
      (event) =>
        valueContainsReference(event.payload, references) &&
        isPaymentEvent(event) &&
        isConfirmedPaymentStatus(event.payload),
    );
    const summary = confirmedPayments.reduce(
      (accumulator, event) => {
        const amountCents = extractPaymentAmountCents(event.payload);

        if (amountCents === null) {
          accumulator.missingAmountCount += 1;
          return accumulator;
        }

        accumulator.lifetimeValueCents += amountCents;
        return accumulator;
      },
      {
        lifetimeValueCents: 0,
        missingAmountCount: 0,
      },
    );

    return {
      lifetimeValueAvailable: summary.missingAmountCount === 0,
      lifetimeValueCents: summary.missingAmountCount === 0 ? summary.lifetimeValueCents : null,
      lifetimeValueUnavailableReason:
        summary.missingAmountCount === 0
          ? null
          : "Existe pagamento confirmado sem valor monetário extraível no payment_event.",
      paidInstallmentsCount: confirmedPayments.length,
    };
  }

  async revokeCourtesy(
    subscription: AdminPsychologistBillingSubscription,
    actor: string,
  ): Promise<professional_subscription> {
    const now = new Date();
    const previousNotes = subscription.grant_notes?.trim();
    const revokeNote = `Cortesia revogada em ${now.toISOString()} por ${actor}.`;

    return prisma.$transaction(async (tx) => {
      const grant = await tx.professional_subscription.findUnique({
        where: {
          id: subscription.id,
        },
        select: {
          createdAt: true,
          grant_notes: true,
          id: true,
          psychologist_id: true,
          source: true,
        },
      });

      if (!grant || grant.source !== ADMIN_GRANT_SOURCE) {
        return tx.professional_subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            current_period_end: now,
            grant_notes: previousNotes ? `${previousNotes}\n${revokeNote}` : revokeNote,
            status: "cancelada",
          },
        });
      }

      const restoreWindowStart = new Date(
        grant.createdAt.getTime() - PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS,
      );
      const restoreWindowEnd = new Date(
        grant.createdAt.getTime() + PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS,
      );
      const previousSubscriptionWhere = {
        deleted: false,
        gateway: null,
        gateway_subscription_id: null,
        id: {
          not: grant.id,
        },
        plan: {
          active: true,
          deleted: false,
        },
        psychologist_id: grant.psychologist_id,
        source: {
          not: ADMIN_GRANT_SOURCE,
        },
        status: "cancelada",
      } satisfies Prisma.professional_subscriptionWhereInput;
      const previousSubscriptionOrderBy = [
        {
          createdAt: "desc" as const,
        },
        {
          updatedAt: "desc" as const,
        },
      ];
      const previousSubscription =
        (await tx.professional_subscription.findFirst({
          where: {
            ...previousSubscriptionWhere,
            updatedAt: {
              gte: restoreWindowStart,
              lte: restoreWindowEnd,
            },
          },
          orderBy: previousSubscriptionOrderBy,
        })) ??
        (await tx.professional_subscription.findFirst({
          where: {
            ...previousSubscriptionWhere,
            createdAt: {
              lt: grant.createdAt,
            },
          },
          orderBy: previousSubscriptionOrderBy,
        }));

      const revokedGrant = await tx.professional_subscription.update({
        where: {
          id: grant.id,
        },
        data: {
          current_period_end: now,
          grant_notes: previousNotes ? `${previousNotes}\n${revokeNote}` : revokeNote,
          status: "cancelada",
        },
      });

      if (previousSubscription) {
        await tx.professional_subscription.update({
          where: {
            id: previousSubscription.id,
          },
          data: {
            status: "ativa",
          },
        });
      }

      return revokedGrant;
    });
  }
}
