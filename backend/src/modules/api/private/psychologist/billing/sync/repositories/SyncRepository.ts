import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_subscription, psychologist_profile } from "@/interfaces/objects";
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
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null> {
    return this.subscriptionRepository.update({
      where: {
        id: data.subscriptionId,
      },
      data: {
        status: data.status,
        gateway: "mercadopago",
        gateway_subscription_id: data.gatewaySubscriptionId,
        current_period_end: data.currentPeriodEnd ?? null,
      },
      include: {
        plan: true,
      },
    });
  }
}
