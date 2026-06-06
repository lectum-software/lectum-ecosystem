import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistResponse,
  IIndexDTO,
} from "../DTOs/IIndexDTO";
import type { IIndexRepository } from "./interfaces/IIndexRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const isCatalogItem = (value: DirectoryCatalogItem | null): value is DirectoryCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const normalizePagination = (query: IIndexDTO["q"]) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export class IndexRepository implements IIndexRepository {
  readonly repository: ORM["psychologist_profile"];

  constructor() {
    this.repository = prisma.psychologist_profile;
  }

  async index(props: IIndexDTO): Promise<DirectoryPsychologistResponse> {
    const pagination = normalizePagination(props.q);
    const search = props.q.search?.trim();

    const whereConditions: Prisma.psychologist_profileWhereInput = {
      deleted: false,
      published: true,
      cfp_verified_at: props.q.verified ? { not: null } : undefined,
      user: {
        active: true,
        deleted: false,
        psychologist_specialties: props.q.specialty
          ? {
              some: {
                deleted: false,
                specialty: {
                  slug: props.q.specialty,
                  active: true,
                  deleted: false,
                },
              },
            }
          : undefined,
        psychologist_services: props.q.service
          ? {
              some: {
                deleted: false,
                service: {
                  slug: props.q.service,
                  active: true,
                  deleted: false,
                },
              },
            }
          : undefined,
        psychologist_approaches: props.q.approach
          ? {
              some: {
                deleted: false,
                approach: {
                  slug: props.q.approach,
                  active: true,
                  deleted: false,
                },
              },
            }
          : undefined,
      },
      OR: search
        ? [
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              headline: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              bio: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              crp: {
                contains: search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };

    const [res, count, filters] = await Promise.all([
      this.repository.findMany({
        where: whereConditions,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ rating_avg: "desc" }, { rating_count: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          user_id: true,
          headline: true,
          bio: true,
          crp: true,
          cfp_verified_at: true,
          modality: true,
          languages: true,
          rating_avg: true,
          rating_count: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              favorited_by_patients: {
                where: {
                  user_id: props.auth.id!,
                  deleted: false,
                },
                select: {
                  id: true,
                },
                take: 1,
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
      this.repository.count({
        where: whereConditions,
      }),
      this.getFilters(),
    ]);

    return {
      data: res.map((item) => ({
        id: item.user.id,
        name: item.user.name,
        avatar: item.user.avatar,
        headline: item.headline,
        bio: item.bio,
        crp: item.crp,
        modality: item.modality,
        languages: normalizeStringArray(item.languages),
        rating_avg: item.rating_avg,
        rating_count: item.rating_count,
        verified: Boolean(item.cfp_verified_at),
        favorited: item.user.favorited_by_patients.length > 0,
        specialties: item.user.psychologist_specialties
          .map(({ specialty }) => specialty)
          .filter(isCatalogItem),
        services: item.user.psychologist_services
          .map(({ service }) => service)
          .filter(isCatalogItem),
        approaches: item.user.psychologist_approaches
          .map(({ approach }) => approach)
          .filter(isCatalogItem),
      })),
      filters,
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  private async getFilters() {
    const [specialties, services, approaches] = await Promise.all([
      prisma.specialty.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.service.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.approach.findMany({
        where: {
          active: true,
          deleted: false,
        },
        select: catalogSelect,
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return {
      specialties,
      services,
      approaches,
    };
  }
}
