import prisma, { type ORM } from "@/infra/database/prisma";
import type { payment_method, professional_subscription } from "@/interfaces/objects";
import type { ISubscriptionRepository } from "./interfaces/ISubscriptionRepository";

export class SubscriptionRepository implements ISubscriptionRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly subscriptionRepository: ORM["professional_subscription"];
  readonly paymentMethodRepository: ORM["payment_method"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.subscriptionRepository = prisma.professional_subscription;
    this.paymentMethodRepository = prisma.payment_method;
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
}
