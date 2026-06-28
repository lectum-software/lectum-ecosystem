import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  billing_address,
  professional_subscription,
  psychologist_profile,
} from "@/interfaces/objects";
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
        psychologist_id: psychologistId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async saveAddress(userId: string, data: IAddressDTO["b"]): Promise<billing_address> {
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

    if (current?.id) {
      return this.addressRepository.update({
        where: {
          id: current.id,
        },
        data: payload,
      });
    }

    return this.addressRepository.create({
      data: {
        ...payload,
        user_id: userId,
      },
    });
  }
}
