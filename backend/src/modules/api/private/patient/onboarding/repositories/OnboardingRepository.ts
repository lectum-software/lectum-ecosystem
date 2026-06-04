import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { patient_profile } from "@/interfaces/objects";
import type { IOnboardingDTO } from "../DTOs/IOnboardingDTO";
import type { IOnboardingRepository } from "./interfaces/IOnboardingRepository";

export class OnboardingRepository implements IOnboardingRepository {
  readonly repository: ORM["patient_profile"];

  constructor() {
    this.repository = prisma.patient_profile;
  }

  async getOrCreate(userId: string): Promise<patient_profile> {
    const existing = await this.repository.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (existing && !existing.deleted) return existing;

    if (existing?.deleted) {
      return this.repository.update({
        where: {
          user_id: userId,
        },
        data: {
          deleted: false,
          deletedAt: null,
        },
      });
    }

    return this.repository.create({
      data: {
        user_id: userId,
      },
    });
  }

  async complete(props: IOnboardingDTO): Promise<patient_profile> {
    const profile = await this.getOrCreate(props.auth.id!);

    if (profile.onboarding_completed_at) return profile;

    const data: Prisma.patient_profileUpdateInput = {
      onboarding_completed_at: new Date(),
    };

    if (props.b.goal !== undefined) data.goal = props.b.goal;
    if (props.b.birthdate !== undefined) data.birthdate = props.b.birthdate;
    if (props.b.phone !== undefined) data.phone = props.b.phone;

    return this.repository.update({
      where: {
        id: profile.id!,
      },
      data,
    });
  }
}
