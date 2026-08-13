import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { payment_method, professional_subscription } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { SubscriptionRepository } from "@/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

import {
  ADMIN_GRANT_SOURCE,
  type AdminPsychologistBillingPaymentMetrics,
  type AdminPsychologistBillingRecord,
  type AdminPsychologistBillingSubscription,
  asRecord,
  billingSelect,
  buildGatewaySummaryPaymentHistoryItem,
  extractPaymentAmountCents,
  isConfirmedPaymentStatus,
  isGatewaySubscription,
  isMercadoPagoPaymentHistorySource,
  isMercadoPagoSubscription,
  isPaymentEvent,
  PAYMENT_GATEWAY_FALLBACK,
  PREVIOUS_SUBSCRIPTION_RESTORE_WINDOW_MS,
  toPaymentMethodBrandLabel,
  uniqueStrings,
  valueContainsReference,
} from "./support/billing-query";

export type AdminPsychologistBillingCancelAudit = {
  adminId: string;
  changedFields: string[];
  metadata: Prisma.InputJsonObject;
  reason: string;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
};

const historyDateKey = (date?: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

const mergeGatewaySummaryPaymentHistory = (
  localItems: BillingPaymentHistoryItem[],
  gatewayItem: BillingPaymentHistoryItem | null,
) => {
  if (!gatewayItem) return localItems;

  const gatewayDate = historyDateKey(gatewayItem.occurred_at);
  const localWithoutGatewayDay = gatewayDate
    ? localItems.filter((item) => historyDateKey(item.occurred_at) !== gatewayDate)
    : localItems.filter(
        (item) =>
          item.status !== gatewayItem.status || item.amount_cents !== gatewayItem.amount_cents,
      );

  return [gatewayItem, ...localWithoutGatewayDay].slice(0, 10);
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
    const localPaymentMethod = await prisma.payment_method.findFirst({
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

    if (localPaymentMethod || !gatewayToken) return localPaymentMethod;

    try {
      const gatewaySubscription = await getPaymentGateway().getSubscription(gatewayToken);
      const raw = asRecord(gatewaySubscription.raw);
      const brand = toPaymentMethodBrandLabel(raw?.payment_method_id);

      if (!brand) return null;

      return {
        brand,
        exp_month: null,
        exp_year: null,
        gateway: PAYMENT_GATEWAY_FALLBACK,
        gateway_token: gatewayToken,
        last4: null,
      };
    } catch {
      return null;
    }
  }

  async showPaymentHistory(
    subscription: professional_subscription | null,
  ): Promise<BillingPaymentHistoryItem[]> {
    const repository = new SubscriptionRepository();
    const localItems = await repository.showPaymentHistory(subscription);

    if (subscription && isMercadoPagoPaymentHistorySource(subscription)) {
      try {
        const gateway = getPaymentGateway();
        const summary = await gateway.getSubscriptionPaymentSummary(
          subscription.gateway_subscription_id!,
        );
        const gatewayItem = buildGatewaySummaryPaymentHistoryItem(subscription, summary);

        return mergeGatewaySummaryPaymentHistory(localItems, gatewayItem);
      } catch {
        // Mantem fallback local para payment_event real quando a reconciliacao online falhar.
      }
    }

    return localItems;
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
            ? "O provedor confirmou cobranças, mas não informou valores suficientes para calcular o LTV."
            : rejectedCount > 0
              ? "Parte das assinaturas do provedor de pagamento não pôde ser conciliada agora."
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
          : "Existe pagamento confirmado sem valor informado pelo provedor.",
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

  async cancelSubscription(input: {
    audit: AdminPsychologistBillingCancelAudit;
    gatewaySubscriptionId: string;
    subscription: AdminPsychologistBillingSubscription;
  }): Promise<professional_subscription> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.professional_subscription.findUnique({
        where: {
          id: input.subscription.id,
        },
        select: {
          current_period_end: true,
          deleted: true,
          gateway: true,
          gateway_subscription_id: true,
          id: true,
          plan: {
            select: {
              name: true,
              price_cents: true,
              slug: true,
            },
          },
          psychologist_id: true,
          source: true,
          status: true,
        },
      });

      if (!current || current.deleted) {
        throw new Error("admin_subscription_cancel_target_not_found");
      }

      if (current.status === "cancelada") {
        throw new Error("admin_subscription_cancel_already_cancelled");
      }

      if (
        current.source !== "mercadopago" ||
        (current.gateway && current.gateway !== "mercadopago") ||
        !current.gateway_subscription_id
      ) {
        throw new Error("admin_subscription_cancel_target_invalid");
      }

      const cancelledSubscription = await tx.professional_subscription.update({
        where: {
          id: current.id,
        },
        data: {
          current_period_end: null,
          gateway: "mercadopago",
          gateway_subscription_id: input.gatewaySubscriptionId,
          status: "cancelada",
        },
        include: {
          plan: true,
        },
      });

      await tx.admin_activity_log.create({
        data: {
          action: "psychologist_subscription_cancelled",
          admin_id: input.audit.adminId,
          area: "financeiro",
          changed_fields: input.audit.changedFields as Prisma.InputJsonValue,
          domain: "psychologist_subscription",
          metadata: input.audit.metadata,
          reason: input.audit.reason,
          safe_after: input.audit.safeAfter,
          safe_before: input.audit.safeBefore,
          source: "admin_panel",
          target_id: input.audit.targetId,
          target_type: "psychologist",
        },
        select: {
          id: true,
        },
      });

      return cancelledSubscription;
    });
  }
}

export type {
  AdminPsychologistBillingPaymentMetrics,
  AdminPsychologistBillingRecord,
  AdminPsychologistBillingSubscription,
} from "./support/billing-query";
