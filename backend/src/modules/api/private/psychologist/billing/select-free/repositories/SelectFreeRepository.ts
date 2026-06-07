import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";
import type { ISelectFreeRepository } from "./interfaces/ISelectFreeRepository";

export class SelectFreeRepository implements ISelectFreeRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly planRepository: ORM["subscription_plan"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.planRepository = prisma.subscription_plan;
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

  async findPlanBySlug(slug: "gratuito"): Promise<subscription_plan | null> {
    return this.planRepository.findFirst({
      where: {
        slug,
        active: true,
        deleted: false,
      },
    });
  }

  async findCurrentSubscription(psychologistId: string): Promise<professional_subscription | null> {
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

  async findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        status: "ativa",
        plan: {
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

  async createFreeSubscription(
    psychologistId: string,
    planId: string,
  ): Promise<professional_subscription> {
    return prisma.$transaction(async (tx) => {
      await tx.professional_subscription.updateMany({
        where: {
          psychologist_id: psychologistId,
          deleted: false,
          status: {
            not: "cancelada",
          },
        },
        data: {
          status: "cancelada",
        },
      });

      return tx.professional_subscription.create({
        data: {
          psychologist_id: psychologistId,
          plan_id: planId,
          status: "ativa",
        },
        include: {
          plan: true,
        },
      });
    });
  }
}
