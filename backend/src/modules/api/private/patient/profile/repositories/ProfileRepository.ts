import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { patient_profile } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { publicFileKeyFromUrl } from "@/utils/public-origin";
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

const publicPatientAvatarKeyFromUrl = (value?: string | null) => {
  return publicFileKeyFromUrl(value, ["patient/avatar/"]);
};

const deletePublicPatientAvatar = async (value?: string | null) => {
  const key = publicPatientAvatarKeyFromUrl(value);
  if (!key) return;

  try {
    await S3.send(
      new DeleteObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: key,
      }),
    );
  } catch (_err) {
    // A troca de foto não deve falhar por limpeza assíncrona de arquivo anterior.
  }
};

export class ProfileRepository implements IProfileRepository {
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

  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<PatientPrivateProfileResponse | null> {
    const profile = await this.getOrCreate(userId);
    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "paciente",
        active: true,
        deleted: false,
      },
      select: userSelect,
    });

    if (!existing) return null;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatar: avatarUrl,
      },
      select: userSelect,
    });

    await deletePublicPatientAvatar(existing.avatar);

    return {
      user: {
        ...user,
        patient_profile: profile,
      },
      profile,
    };
  }

  async removeAvatar(userId: string): Promise<PatientPrivateProfileResponse | null> {
    const profile = await this.getOrCreate(userId);
    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "paciente",
        active: true,
        deleted: false,
      },
      select: userSelect,
    });

    if (!existing) return null;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatar: null,
      },
      select: userSelect,
    });

    await deletePublicPatientAvatar(existing.avatar);

    return {
      user: {
        ...user,
        patient_profile: profile,
      },
      profile,
    };
  }
}
