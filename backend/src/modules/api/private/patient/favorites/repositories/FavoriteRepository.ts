import prisma, { type ORM } from "@/infra/database/prisma";
import type { FavoriteActionResponse } from "../DTOs/IFavoriteDTO";
import type { IFavoriteRepository } from "./interfaces/IFavoriteRepository";

export class FavoriteRepository implements IFavoriteRepository {
  readonly repository: ORM["psychologist_favorite"];

  constructor() {
    this.repository = prisma.psychologist_favorite;
  }

  async hasPublishedPsychologist(psychologistId: string): Promise<boolean> {
    const psychologist = await prisma.user.findFirst({
      where: {
        id: psychologistId,
        role: "psicologo",
        active: true,
        deleted: false,
        psychologist_profile: {
          is: {
            published: true,
            deleted: false,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(psychologist);
  }

  async favorite(userId: string, psychologistId: string): Promise<FavoriteActionResponse> {
    const existing = await this.repository.findUnique({
      where: {
        user_id_psychologist_id: {
          user_id: userId,
          psychologist_id: psychologistId,
        },
      },
    });

    if (existing) {
      await this.repository.update({
        where: {
          user_id_psychologist_id: {
            user_id: userId,
            psychologist_id: psychologistId,
          },
        },
        data: {
          deleted: false,
          deletedAt: null,
        },
      });
    } else {
      await this.repository.create({
        data: {
          user_id: userId,
          psychologist_id: psychologistId,
        },
      });
    }

    return {
      psychologist_id: psychologistId,
      favorited: true,
    };
  }

  async unfavorite(userId: string, psychologistId: string): Promise<FavoriteActionResponse> {
    const existing = await this.repository.findUnique({
      where: {
        user_id_psychologist_id: {
          user_id: userId,
          psychologist_id: psychologistId,
        },
      },
      select: {
        deleted: true,
      },
    });

    if (existing && !existing.deleted) {
      await this.repository.update({
        where: {
          user_id_psychologist_id: {
            user_id: userId,
            psychologist_id: psychologistId,
          },
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });
    }

    return {
      psychologist_id: psychologistId,
      favorited: false,
    };
  }
}
