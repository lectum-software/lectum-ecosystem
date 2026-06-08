import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { patient_profile } from "@/interfaces/objects";
import type { IUpdateProfileDTO, PatientPrivateProfileResponse } from "../DTOs/IProfileDTO";
import type { IProfileRepository } from "./interfaces/IProfileRepository";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  confirmed: true,
  provider: true,
} satisfies Prisma.userSelect;

export class ProfileRepository implements IProfileRepository {
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

  async update(data: IUpdateProfileDTO): Promise<PatientPrivateProfileResponse> {
    const profile = await this.getOrCreate(data.auth.id!);
    const profileData: Prisma.patient_profileUpdateInput = {
      goal: data.b.goal ?? null,
      gender: data.b.gender ?? null,
      birthdate: data.b.birthdate ?? null,
      phone: data.b.phone ?? null,
      bio: data.b.bio ?? null,
    };

    const [user, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: {
          id: data.auth.id!,
        },
        data: {
          name: data.b.name.trim(),
        },
        select: userSelect,
      }),
      prisma.patient_profile.update({
        where: {
          id: profile.id!,
        },
        data: profileData,
      }),
    ]);

    return {
      user: {
        ...user,
        patient_profile: updatedProfile,
      },
      profile: updatedProfile,
    };
  }
}
