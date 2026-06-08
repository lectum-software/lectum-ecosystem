import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { crpExperienceYears } from "@/utils/professional-experience";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistResponse,
  IIndexDTO,
} from "../DTOs/IIndexDTO";
import type { IIndexRepository } from "./interfaces/IIndexRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CONTACT_MESSAGE =
  "Olá, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.";

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

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = weekday
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";
  return "domingo";
};

const hasAvailableToday = (value: unknown) => {
  return normalizeStringArray(value).includes(currentWeekdayValue());
};

const buildWhatsappUrl = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
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
      subscriptions: props.q.verified
        ? {
            some: activeProfessionalEntitlementWhere(),
          }
        : undefined,
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
          video_url: true,
          crp: true,
          crp_registration_date: true,
          cfp_verified_at: true,
          gender: true,
          discount_first_session: true,
          social_value: true,
          accepts_insurance: true,
          available_days: true,
          modality: true,
          languages: true,
          rating_avg: true,
          rating_count: true,
          whatsapp: true,
          subscriptions: {
            where: activeProfessionalEntitlementWhere(),
            select: {
              id: true,
            },
            take: 1,
          },
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
              followed_by_patients: {
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
        video_url: item.video_url,
        crp: item.crp,
        gender: item.gender,
        modality: item.modality,
        languages: normalizeStringArray(item.languages),
        rating_avg: item.rating_avg,
        rating_count: item.rating_count,
        verified: item.subscriptions.length > 0,
        available_today: hasAvailableToday(item.available_days),
        formation_years: crpExperienceYears(item.crp_registration_date),
        discount_first_session: item.discount_first_session,
        social_value: item.social_value,
        accepts_insurance: item.accepts_insurance,
        whatsapp_url: buildWhatsappUrl(item.whatsapp),
        favorited: item.user.favorited_by_patients.length > 0,
        followed: item.user.followed_by_patients.length > 0,
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
