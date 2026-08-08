import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { patient_profile } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type { IOnboardingDTO } from "../DTOs/IOnboardingDTO";
import type { IOnboardingRepository } from "./interfaces/IOnboardingRepository";

export class OnboardingRepository implements IOnboardingRepository {
  readonly repository: ORM["patient_profile"];

  constructor() {
    this.repository = prisma.patient_profile;
  }

  async getOrCreate(userId: string): Promise<patient_profile> {
    return withSerializableTransaction(async (transaction) => {
      const existing = await transaction.patient_profile.findUnique({
        where: {
          user_id: userId,
        },
      });

      if (existing && !existing.deleted) return existing;

      if (existing?.deleted) {
        return transaction.patient_profile.update({
          where: {
            user_id: userId,
          },
          data: {
            deleted: false,
            deletedAt: null,
          },
        });
      }

      return transaction.patient_profile.create({
        data: {
          user_id: userId,
        },
      });
    });
  }

  async complete(props: IOnboardingDTO): Promise<patient_profile> {
    const profile = await this.getOrCreate(props.auth.id!);

    if (profile.onboarding_completed_at) return profile;

    const data: Prisma.patient_profileUpdateInput = {
      onboarding_completed_at: new Date(),
    };

    if (props.b.goal !== undefined) data.goal = props.b.goal;
    if (props.b.gender !== undefined) data.gender = props.b.gender;
    if (props.b.birthdate !== undefined) data.birthdate = props.b.birthdate;
    if (props.b.phone !== undefined) data.phone = props.b.phone;

    return prisma.$transaction(async (tx) => {
      if (props.b.name !== undefined) {
        await tx.user.update({
          where: {
            id: props.auth.id!,
          },
          data: {
            name: props.b.name.trim(),
          },
        });
      }

      return tx.patient_profile.update({
        where: {
          id: profile.id!,
        },
        data,
      });
    });
  }
}
