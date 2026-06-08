import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  FavoriteActionResponse,
  IFavoriteIndexDTO,
  PatientRelationCatalogItem,
  PatientRelationPsychologist,
} from "../DTOs/IFavoriteDTO";
import type { IFavoriteRepository } from "./interfaces/IFavoriteRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CONTACT_MESSAGE =
  "Olá, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.";

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

const currentYearValue = () => {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date()),
  );
};

const parseYear = (value: unknown) => {
  if (typeof value !== "string") return null;

  const match = value.match(/\d{4}/);
  if (!match) return null;

  const year = Number(match[0]);
  const currentYear = currentYearValue();

  if (!Number.isFinite(year) || year < 1950 || year > currentYear) return null;

  return year;
};

const academicFormationYears = (
  primaryYear: string | null,
  formations: Prisma.JsonValue | null,
) => {
  const years: number[] = [];
  const primary = parseYear(primaryYear);

  if (primary) years.push(primary);

  if (Array.isArray(formations)) {
    for (const item of formations) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;

      const formation = item as Record<string, unknown>;
      const year = parseYear(formation.graduation_year);

      if (year) years.push(year);
    }
  }

  if (years.length === 0) return null;

  const yearsSince = currentYearValue() - Math.min(...years);
  return yearsSince > 0 ? yearsSince : null;
};

const buildWhatsappUrl = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
};

const isCatalogItem = (
  value: PatientRelationCatalogItem | null,
): value is PatientRelationCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

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
                  video_url: true,
                  crp: true,
                  gender: true,
                  modality: true,
                  languages: true,
                  rating_avg: true,
                  rating_count: true,
                  available_days: true,
                  discount_first_session: true,
                  social_value: true,
                  accepts_insurance: true,
                  academic_graduation_year: true,
                  academic_formations: true,
                  whatsapp: true,
                  subscriptions: {
                    where: activeProfessionalEntitlementWhere(),
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
            video_url: profile.video_url,
            crp: profile.crp,
            gender: profile.gender,
            modality: profile.modality,
            languages: normalizeStringArray(profile.languages),
            rating_avg: profile.rating_avg,
            rating_count: profile.rating_count,
            verified: profile.subscriptions.length > 0,
            available_today: hasAvailableToday(profile.available_days),
            formation_years: academicFormationYears(
              profile.academic_graduation_year,
              profile.academic_formations,
            ),
            discount_first_session: profile.discount_first_session,
            social_value: profile.social_value,
            accepts_insurance: profile.accepts_insurance,
            whatsapp_url: buildWhatsappUrl(profile.whatsapp),
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
