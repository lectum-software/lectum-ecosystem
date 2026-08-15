import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  billing_address,
  professional_subscription,
  psychologist_profile,
} from "@/interfaces/objects";
import type { BillingDunningUpdate } from "@/modules/billing/dunning";
import type { BillingSubscriptionStatus } from "@/modules/billing/payment-gateway";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { IAddressDTO } from "../DTOs/IAddressDTO";
import type { IAddressRepository } from "./interfaces/IAddressRepository";

export class AddressRepository implements IAddressRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly subscriptionRepository: ORM["professional_subscription"];
  readonly addressRepository: ORM["billing_address"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.subscriptionRepository = prisma.professional_subscription;
    this.addressRepository = prisma.billing_address;
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

  async findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        ...activeProfessionalEntitlementWhere(),
        gateway: "mercadopago",
        gateway_subscription_id: {
          not: null,
        },
        psychologist_id: psychologistId,
        source: "mercadopago",
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
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
    status: BillingSubscriptionStatus;
    billingDunning?: BillingDunningUpdate;
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null> {
    return this.subscriptionRepository.update({
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
  }

  async saveAddress(
    userId: string,
    psychologistProfileId: string,
    data: IAddressDTO["b"],
  ): Promise<billing_address> {
    const current = await this.addressRepository.findFirst({
      where: {
        user_id: userId,
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const payload = {
      zip: data.zip,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      district: data.district,
      city: data.city,
      state: data.state,
    };

    const profilePayload = {
      professional_address_zip: data.zip,
      professional_address_street: data.street,
      professional_address_number: data.number,
      professional_address_complement: data.complement || null,
      professional_address_district: data.district,
      professional_address_city: data.city,
      professional_address_state: data.state,
    };

    return prisma.$transaction(async (tx) => {
      const address = current?.id
        ? await tx.billing_address.update({
            where: {
              id: current.id,
            },
            data: payload,
          })
        : await tx.billing_address.create({
            data: {
              ...payload,
              user_id: userId,
            },
          });

      await tx.psychologist_profile.update({
        where: {
          id: psychologistProfileId,
        },
        data: profilePayload,
      });

      return address;
    });
  }
}
