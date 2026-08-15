import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_subscription, psychologist_profile } from "@/interfaces/objects";
import type { BillingDunningUpdate } from "@/modules/billing/dunning";
import type { ISyncRepository } from "./interfaces/ISyncRepository";

export class SyncRepository implements ISyncRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.subscriptionRepository = prisma.professional_subscription;
  }

  async findProfileByUserId(
    userId: string,
  ): Promise<Pick<psychologist_profile, "id" | "deleted"> | null> {
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

  async findLatestGatewaySubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
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

  async updateSubscriptionStatus(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
    status: "inativa" | "ativa" | "inadimplente" | "cancelada";
    billingDunning?: BillingDunningUpdate;
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null> {
    const subscription = await this.subscriptionRepository.update({
      where: {
        id: data.subscriptionId,
      },
      data: {
        status: data.status,
        ...data.billingDunning,
        gateway: "mercadopago",
        gateway_subscription_id: data.gatewaySubscriptionId,
        current_period_end: data.currentPeriodEnd ?? null,
      },
      include: {
        plan: true,
      },
    });

    if (data.status === "ativa" && subscription.plan?.slug !== "gratuito") {
      await this.profileRepository.updateMany({
        where: {
          deleted: false,
          id: subscription.psychologist_id,
          show_experience_tag: false,
          updatedAt: {
            lte: subscription.grant_started_at ?? subscription.createdAt,
          },
        },
        data: {
          show_experience_tag: true,
        },
      });
    }

    return subscription;
  }
}
