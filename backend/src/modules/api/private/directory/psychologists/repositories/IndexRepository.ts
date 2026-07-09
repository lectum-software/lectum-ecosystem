import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { crpExperienceYears } from "@/utils/professional-experience";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import { rankPsychologistCandidates } from "@/utils/psychologist-public-ranking";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl } from "@/utils/whatsapp-contact";
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

const normalizeLanguages = (value: unknown): string[] => {
  const languages = normalizeStringArray(value);

  return languages.length > 0 ? languages : ["Português"];
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

const buildWhatsappUrl = (value?: string | null, psychologistName?: string | null) =>
  buildLectumWhatsappUrl({ phone: value, psychologistName, source: "profile" });

const normalizePagination = (query: IIndexDTO["q"]) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const moreExperiencedCutoffDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 10);

  return date;
};

const buildModalityWhere = (
  value?: string | null,
): Prisma.psychologist_profileWhereInput["modality"] => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return { not: null };

  if (normalized === "online") return { in: ["online", "hibrido"] };
  if (normalized === "presencial") return { in: ["presencial", "hibrido"] };
  if (normalized === "hibrido") return "hibrido";

  return "__invalid_modality_filter__";
};

export class IndexRepository implements IIndexRepository {
  readonly repository: ORM["psychologist_profile"];

  constructor() {
    this.repository = prisma.psychologist_profile;
  }

  async index(props: IIndexDTO): Promise<DirectoryPsychologistResponse> {
    const pagination = normalizePagination(props.q);
    const search = props.q.search?.trim();
    const viewerId = props.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          psychologist_id: {
            not: viewerId,
          },
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const whereConditions: Prisma.psychologist_profileWhereInput = {
      deleted: false,
      published: true,
      video_url: {
        not: null,
      },
      modality: buildModalityWhere(props.q.modality),
      gender: props.q.gender || { not: null },
      cpf: { not: null },
      crp: { not: null },
      NOT: [
        {
          video_url: "",
        },
        {
          modality: "",
        },
        {
          gender: "",
        },
        {
          cpf: "",
        },
        {
          crp: "",
        },
        {
          professional_address_city: "",
        },
        {
          professional_address_state: "",
        },
      ],
      crp_registration_date: props.q.more_experienced
        ? {
            lt: moreExperiencedCutoffDate(),
          }
        : undefined,
      show_experience_tag: props.q.more_experienced ? true : undefined,
      available_days: props.q.available_today
        ? {
            array_contains: [currentWeekdayValue()],
          }
        : undefined,
      target_audience: props.q.target_audience
        ? {
            array_contains: [props.q.target_audience],
          }
        : { not: [] },
      professional_address_state: props.q.state
        ? {
            equals: props.q.state,
            mode: "insensitive",
          }
        : { not: null },
      professional_address_city: props.q.city
        ? {
            equals: props.q.city,
            mode: "insensitive",
          }
        : { not: null },
      race_color: props.q.race_color || undefined,
      religion: props.q.religion || undefined,
      languages: props.q.language
        ? {
            array_contains: [props.q.language],
          }
        : undefined,
      discount_first_session: props.q.discount_first_session ? true : undefined,
      accepts_insurance: props.q.accepts_insurance ? true : undefined,
      social_value: props.q.social_value ? true : undefined,
      AND: props.q.verified ? [verifiedProfessionalProfileWhere()] : undefined,
      user: {
        active: true,
        deleted: false,
        psychologist_specialties: {
          some: {
            deleted: false,
            specialty: {
              slug: props.q.specialty || undefined,
              active: true,
              deleted: false,
            },
          },
        },
        psychologist_services: {
          some: {
            deleted: false,
            service: {
              slug: props.q.service || undefined,
              active: true,
              deleted: false,
            },
          },
        },
        psychologist_approaches: {
          some: {
            deleted: false,
            approach: {
              slug: props.q.approach || undefined,
              active: true,
              deleted: false,
            },
          },
        },
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

    const [candidates, count, filters] = await Promise.all([
      this.repository.findMany({
        where: whereConditions,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          user_id: true,
          createdAt: true,
          updatedAt: true,
          headline: true,
          bio: true,
          cover_image_url: true,
          video_url: true,
          video_cover_url: true,
          crp: true,
          cpf: true,
          crp_registration_date: true,
          cfp_verified_at: true,
          gender: true,
          target_audience: true,
          discount_first_session: true,
          social_value: true,
          accepts_insurance: true,
          show_experience_tag: true,
          academic_title: true,
          academic_institution: true,
          academic_graduation_year: true,
          academic_formations: true,
          available_days: true,
          professional_address_city: true,
          professional_address_state: true,
          modality: true,
          languages: true,
          rating_avg: true,
          rating_count: true,
          whatsapp: true,
          subscriptions: {
            where: activeProfessionalEntitlementWhere(),
            select: {
              id: true,
              source: true,
            },
            take: 1,
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              favorited_by_patients: {
                where: viewerRelationWhere,
                select: {
                  id: true,
                },
                take: 1,
              },
              followed_by_patients: {
                where: viewerRelationWhere,
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
    const rankedCandidates = (await rankPsychologistCandidates(candidates, viewerId ?? null))
      .slice(pagination.skip, pagination.skip + pagination.limit)
      .map(({ item }) => item);

    return {
      data: rankedCandidates.map((item) => ({
        id: item.user.id,
        name: normalizeProfessionalDisplayName(item.user.name) || item.user.name,
        avatar: item.user.avatar,
        headline: item.headline,
        bio: item.bio,
        video_url: item.video_url,
        video_cover_url: item.video_cover_url,
        crp: item.crp,
        gender: item.gender,
        modality: item.modality,
        languages: normalizeLanguages(item.languages),
        rating_avg: item.rating_avg,
        rating_count: item.rating_count,
        verified: isVerifiedProfessionalEntitlement(item),
        available_today: hasAvailableToday(item.available_days),
        formation_years: crpExperienceYears(item.crp_registration_date),
        discount_first_session: item.discount_first_session,
        social_value: item.social_value,
        accepts_insurance: item.accepts_insurance,
        show_experience_tag: item.show_experience_tag,
        whatsapp_url: buildWhatsappUrl(
          item.whatsapp,
          normalizeProfessionalDisplayName(item.user.name) || item.user.name,
        ),
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
