import prisma, { type ORM } from "@/infra/database/prisma";
import type { payment_method, professional_subscription } from "@/interfaces/objects";
import { resolveEffectiveBillingSubscription } from "@/modules/billing/effective-subscription";
import {
  cancelledProfessionalGatewaySubscriptionWhere,
  restoreFreePlanAfterProfessionalCancellation,
} from "@/modules/billing/free-subscription";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import {
  buildGatewaySummaryPaymentHistoryItem,
  buildPaymentHistoryItemsForSubscription,
  mergeGatewaySummaryPaymentHistory,
} from "@/modules/billing/payment-history";

import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";
import type {
  BillingPaymentHistoryItem,
  ISubscriptionRepository,
} from "./interfaces/ISubscriptionRepository";

export {
  buildGatewaySummaryPaymentHistoryItem,
  buildPaymentHistoryItemsForSubscription,
  mergeGatewaySummaryPaymentHistory,
} from "@/modules/billing/payment-history";

const MAX_PAYMENT_EVENTS_TO_SCAN = 100;
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
