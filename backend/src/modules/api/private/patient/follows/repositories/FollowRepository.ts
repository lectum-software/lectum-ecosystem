import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
} from "@/utils/subscription-entitlement";
import type {
  FollowActionResponse,
  IFollowIndexDTO,
  PatientFollowCatalogItem,
  PatientFollowPsychologist,
} from "../DTOs/IFollowDTO";
import type { IFollowRepository } from "./interfaces/IFollowRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

const normalizePagination = (query: IFollowIndexDTO["q"]) => {
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
  value: PatientFollowCatalogItem | null,
): value is PatientFollowCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

export class FollowRepository implements IFollowRepository {
  readonly repository: ORM["psychologist_follow"];

  constructor() {
    this.repository = prisma.psychologist_follow;
  }

  async index(data: IFollowIndexDTO) {
    const pagination = normalizePagination(data.q);
    const where: Prisma.psychologist_followWhereInput = {
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
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
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
                  cfp_verified_at: true,
                  crp_status: true,
                  subscriptions: {
                    where: activeProfessionalEntitlementWhere(),
                    select: {
                      id: true,
                      source: true,
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
        .map<PatientFollowPsychologist | null>((item) => {
          const profile = item.psychologist.psychologist_profile;
          if (!profile) return null;

          return {
            id: item.psychologist.id,
            relation_id: item.id,
            relation_created_at: item.createdAt,
            name:
              normalizeProfessionalDisplayName(item.psychologist.name) || item.psychologist.name,
            avatar: item.psychologist.avatar,
            headline: profile.headline,
            bio: profile.bio,
            crp: profile.crp,
            modality: profile.modality,
            languages: normalizeStringArray(profile.languages),
            rating_avg: profile.rating_avg,
            rating_count: profile.rating_count,
            verified: isVerifiedProfessionalEntitlement(profile),
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
        .filter((item): item is PatientFollowPsychologist => Boolean(item)),
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
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(psychologist);
  }

  async follow(userId: string, psychologistId: string): Promise<FollowActionResponse> {
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
      followed: true,
    };
  }

  async unfollow(userId: string, psychologistId: string): Promise<FollowActionResponse> {
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
      followed: false,
    };
  }
}
