import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { crpExperienceYears } from "@/utils/professional-experience";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryProfileCatalogItem,
  DirectoryPsychologistPostsResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistReviewsResponse,
  DirectoryReviewAuthor,
  IProfileListDTO,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";
import type { IProfileRepository } from "./interfaces/IProfileRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CONTACT_MESSAGE =
  "Olá, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
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

const normalizePagination = (query: IProfileListDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const isCatalogItem = (
  value: DirectoryProfileCatalogItem | null,
): value is DirectoryProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const toSafeAuthor = (name: string): DirectoryReviewAuthor => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      initials: "P",
      name: "Paciente",
    };
  }

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : "";
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : firstName.slice(0, 2).toUpperCase();

  return {
    initials,
    name: [firstName, lastInitial].filter(Boolean).join(" "),
  };
};

const publishedProfileWhere = (psychologistId: string): Prisma.userWhereInput => ({
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
});

export class ProfileRepository implements IProfileRepository {
  async hasPublishedProfile(psychologistId: string): Promise<boolean> {
    const profile = await prisma.user.findFirst({
      where: publishedProfileWhere(psychologistId),
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async show(data: IProfileShowDTO): Promise<DirectoryPsychologistProfile | null> {
    const viewerId = data.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(data.p.id),
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
        psychologist_profile: {
          select: {
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
            target_audience: true,
            professional_address_city: true,
            professional_address_state: true,
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
    });

    const profile = item?.psychologist_profile;
    if (!item || !profile) return null;

    return {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      headline: profile.headline,
      bio: profile.bio,
      video_url: profile.video_url,
      crp: profile.crp,
      gender: profile.gender,
      modality: profile.modality,
      languages: normalizeStringArray(profile.languages),
      target_audience: normalizeStringArray(profile.target_audience),
      address_city: profile.professional_address_city,
      address_state: profile.professional_address_state,
      rating_avg: profile.rating_avg,
      rating_count: profile.rating_count,
      verified: profile.subscriptions.length > 0,
      available_today: hasAvailableToday(profile.available_days),
      formation_years: crpExperienceYears(profile.crp_registration_date),
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp),
      favorited: item.favorited_by_patients.length > 0,
      followed: item.followed_by_patients.length > 0,
      whatsapp_available: Boolean(profile.whatsapp),
      specialties: item.psychologist_specialties
        .map(({ specialty }) => specialty)
        .filter(isCatalogItem),
      services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
      approaches: item.psychologist_approaches
        .map(({ approach }) => approach)
        .filter(isCatalogItem),
    };
  }

  async posts(data: IProfileListDTO): Promise<DirectoryPsychologistPostsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.community_postWhereInput = {
      author_id: data.p.id,
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
      },
    };

    const [items, count] = await Promise.all([
      prisma.community_post.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          upvotes_count: true,
          downvotes_count: true,
          replies_count: true,
          saves_count: true,
          community: {
            select: catalogSelect,
          },
        },
      }),
      prisma.community_post.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.createdAt,
        upvotes_count: item.upvotes_count,
        downvotes_count: item.downvotes_count,
        replies_count: item.replies_count,
        saves_count: item.saves_count,
        community: item.community,
      })),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async reviews(data: IProfileListDTO): Promise<DirectoryPsychologistReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.professional_reviewWhereInput = {
      psychologist_id: data.p.id,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    };

    const [items, count, profile, distributionRows] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          response: true,
          responded_at: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.professional_review.count({ where }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: data.p.id,
          deleted: false,
          published: true,
        },
        select: {
          rating_avg: true,
          rating_count: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["rating"],
        where,
        _count: {
          rating: true,
        },
      }),
    ]);

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    } satisfies Record<1 | 2 | 3 | 4 | 5, number>;

    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
      }
    }

    return {
      data: items.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        response: item.response,
        responded_at: item.responded_at,
        created_at: item.createdAt,
        author: toSafeAuthor(item.author.name),
      })),
      summary: {
        rating_avg: profile?.rating_avg ?? 0,
        rating_count: profile?.rating_count ?? count,
        distribution,
      },
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }
}
