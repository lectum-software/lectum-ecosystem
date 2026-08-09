import prisma, { type ORM } from "@/infra/database/prisma";
import type { payment_method, professional_subscription } from "@/interfaces/objects";
import type { IPaymentMethodSessionRepository } from "./interfaces/IPaymentMethodSessionRepository";

type PaymentMethodDisplay = {
  gatewaySubscriptionId: string;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
};

export class PaymentMethodSessionRepository implements IPaymentMethodSessionRepository {
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

  async findManageableSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        status: {
          in: ["ativa", "inadimplente", "inativa"],
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

  async savePaymentMethod(userId: string, data: PaymentMethodDisplay): Promise<payment_method> {
    const current = await this.paymentMethodRepository.findFirst({
      where: {
        user_id: userId,
        gateway: "mercadopago",
        deleted: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const paymentMethodData = {
      gateway_token: data.gatewaySubscriptionId,
      brand: data.brand || null,
      last4: data.last4 || null,
      exp_month: data.exp_month || null,
      exp_year: data.exp_year || null,
    };

    if (current?.id) {
      return this.paymentMethodRepository.update({
        where: {
          id: current.id,
        },
        data: paymentMethodData,
      });
    }

    return this.paymentMethodRepository.create({
      data: {
        user_id: userId,
        gateway: "mercadopago",
        ...paymentMethodData,
      },
    });
  }
}
