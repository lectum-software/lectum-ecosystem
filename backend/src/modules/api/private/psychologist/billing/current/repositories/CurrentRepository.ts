import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_subscription } from "@/interfaces/objects";
import {
  actionableProfessionalGatewaySubscriptionWhere,
  activeFreeSubscriptionWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";
import type { ICurrentRepository } from "./interfaces/ICurrentRepository";

export class CurrentRepository implements ICurrentRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.subscriptionRepository = prisma.professional_subscription;
  }

  async show(userId: string): Promise<professional_subscription | null> {
    const profile = await this.profileRepository.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        deleted: true,
      },
    });

    if (!profile || profile.deleted) return null;

    const activeProfessional = await this.subscriptionRepository.findFirst({
      where: {
        ...activeProfessionalEntitlementWhere(),
        psychologist_id: profile.id,
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
        psychologist_id: profile.id,
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
        psychologist_id: profile.id,
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
        psychologist_id: profile.id,
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
}
