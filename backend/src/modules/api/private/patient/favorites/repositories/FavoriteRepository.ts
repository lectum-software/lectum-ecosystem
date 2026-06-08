import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  FavoriteActionResponse,
  IFavoriteIndexDTO,
  PatientRelationCatalogItem,
  PatientRelationPsychologist,
} from "../DTOs/IFavoriteDTO";
import type { IFavoriteRepository } from "./interfaces/IFavoriteRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

const normalizePagination = (query: IFavoriteIndexDTO["q"]) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const isCatalogItem = (
  value: PatientRelationCatalogItem | null,
): value is PatientRelationCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const activeVerifiedSubscriptionWhere = {
  deleted: false,
  status: "ativa",
  plan: {
    active: true,
    deleted: false,
    slug: {
      not: "gratuito",
    },
  },
} satisfies Prisma.professional_subscriptionWhereInput;

export class FavoriteRepository implements IFavoriteRepository {
  readonly repository: ORM["psychologist_favorite"];

  constructor() {
    this.repository = prisma.psychologist_favorite;
  }

  async index(data: IFavoriteIndexDTO) {
    const pagination = normalizePagination(data.q);
    const where: Prisma.psychologist_favoriteWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      psychologist: {
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
    };

    const [items, count] = await Promise.all([
      this.repository.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          psychologist: {
            select: {
              id: true,
              name: true,
              avatar: true,
              favorited_by_patients: {
                where: {
                  user_id: data.auth.id!,
                  deleted: false,
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              followed_by_patients: {
                where: {
                  user_id: data.auth.id!,
                  deleted: false,
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              psychologist_profile: {
                select: {
                  headline: true,
                  bio: true,
                  crp: true,
                  modality: true,
                  languages: true,
                  rating_avg: true,
                  rating_count: true,
                  subscriptions: {
                    where: activeVerifiedSubscriptionWhere,
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                },
              },
              psychologist_specialties: {
                where: {
                  deleted: false,
                  specialty: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  specialty: {
                    select: catalogSelect,
                  },
                },
              },
              psychologist_services: {
                where: {
                  deleted: false,
                  service: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  service: {
                    select: catalogSelect,
                  },
                },
              },
              psychologist_approaches: {
                where: {
                  deleted: false,
                  approach: {
                    active: true,
                    deleted: false,
                  },
                },
                select: {
                  approach: {
                    select: catalogSelect,
                  },
                },
              },
            },
          },
        },
      }),
      this.repository.count({ where }),
    ]);

    return {
      data: items
        .map<PatientRelationPsychologist | null>((item) => {
          const profile = item.psychologist.psychologist_profile;
          if (!profile) return null;

          return {
            id: item.psychologist.id,
            relation_id: item.id,
            relation_created_at: item.createdAt,
            name: item.psychologist.name,
            avatar: item.psychologist.avatar,
            headline: profile.headline,
            bio: profile.bio,
            crp: profile.crp,
            modality: profile.modality,
            languages: normalizeStringArray(profile.languages),
            rating_avg: profile.rating_avg,
            rating_count: profile.rating_count,
            verified: profile.subscriptions.length > 0,
            favorited: item.psychologist.favorited_by_patients.length > 0,
            followed: item.psychologist.followed_by_patients.length > 0,
            specialties: item.psychologist.psychologist_specialties
              .map(({ specialty }) => specialty)
              .filter(isCatalogItem),
            services: item.psychologist.psychologist_services
              .map(({ service }) => service)
              .filter(isCatalogItem),
            approaches: item.psychologist.psychologist_approaches
              .map(({ approach }) => approach)
              .filter(isCatalogItem),
          };
        })
        .filter((item): item is PatientRelationPsychologist => Boolean(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
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
