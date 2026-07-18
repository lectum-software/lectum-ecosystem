import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDirectoryFilterItem,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import type { IAdminPsychologistsDashboardRepository } from "./interfaces/IAdminPsychologistsDashboardRepository";

const eventCreatedAtWhere = (range: AdminPsychologistsDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const directoryCategorySelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialty_categorySelect;

const directorySpecialtySelect = {
  category: {
    select: directoryCategorySelect,
  },
  category_id: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const directoryCatalogSelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
};

const STATIC_MODALITY_FILTERS = [
  { id: "online", label: "Online" },
  { id: "presencial", label: "Presencial" },
] as const;

const STATIC_GENDER_FILTERS = [
  { id: "feminino", label: "Feminino" },
  { id: "masculino", label: "Masculino" },
  { id: "nao_binario", label: "Não binário" },
  { id: "outro", label: "Outro" },
] as const;

const STATIC_RACE_COLOR_FILTERS = [
  { id: "branca", label: "Branca" },
  { id: "preta", label: "Preta" },
  { id: "parda", label: "Parda" },
  { id: "amarela", label: "Amarela" },
  { id: "indigena", label: "Indígena" },
] as const;

const STATIC_RELIGION_FILTERS = [
  { id: "catolica", label: "Católica" },
  { id: "evangelica", label: "Evangélica" },
  { id: "espirita", label: "Espírita" },
  { id: "umbanda_candomble", label: "Umbanda/Candomblé" },
  { id: "judaica", label: "Judaica" },
  { id: "islamica", label: "Islâmica" },
  { id: "budista", label: "Budista" },
  { id: "sem_religiao", label: "Sem religião" },
  { id: "ateu_agnostico", label: "Ateu/Agnóstico" },
  { id: "outra", label: "Outra" },
] as const;

const STATIC_STATE_FILTERS = [
  { id: "AC", label: "Acre" },
  { id: "AL", label: "Alagoas" },
  { id: "AP", label: "Amapá" },
  { id: "AM", label: "Amazonas" },
  { id: "BA", label: "Bahia" },
  { id: "CE", label: "Ceará" },
  { id: "DF", label: "Distrito Federal" },
  { id: "ES", label: "Espírito Santo" },
  { id: "GO", label: "Goiás" },
  { id: "MA", label: "Maranhão" },
  { id: "MT", label: "Mato Grosso" },
  { id: "MS", label: "Mato Grosso do Sul" },
  { id: "MG", label: "Minas Gerais" },
  { id: "PA", label: "Pará" },
  { id: "PB", label: "Paraíba" },
  { id: "PR", label: "Paraná" },
  { id: "PE", label: "Pernambuco" },
  { id: "PI", label: "Piauí" },
  { id: "RJ", label: "Rio de Janeiro" },
  { id: "RN", label: "Rio Grande do Norte" },
  { id: "RS", label: "Rio Grande do Sul" },
  { id: "RO", label: "Rondônia" },
  { id: "RR", label: "Roraima" },
  { id: "SC", label: "Santa Catarina" },
  { id: "SP", label: "São Paulo" },
  { id: "SE", label: "Sergipe" },
  { id: "TO", label: "Tocantins" },
] as const;

const STATIC_FEATURE_FILTERS = [
  { id: "available_today", label: "Disponível hoje" },
  { id: "verified", label: "Somente verificados" },
  { id: "more_experienced", label: "Mais experientes" },
  { id: "discount_first_session", label: "Desconto na 1ª sessão" },
  { id: "accepts_insurance", label: "Aceita convênios" },
  { id: "social_value", label: "Valor social" },
] as const;

const catalogOrderBy = () => [{ position: "asc" as const }, { name: "asc" as const }];

const toDirectoryFilterItem = (item: {
  id: string;
  name: string;
  position: number | null;
  slug: string;
}): AdminPsychologistsDashboardDirectoryFilterItem => ({
  id: item.id,
  label: item.name,
  position: item.position,
  slug: item.slug,
});

const toStaticDirectoryFilterItem = (
  item: { id: string; label: string },
  position: number,
): AdminPsychologistsDashboardDirectoryFilterItem => ({
  id: item.id,
  label: item.label,
  position,
  slug: item.id,
});

const profileBaseSelect = {
  accepts_insurance: true,
  academic_formations: true,
  academic_graduation_year: true,
  academic_institution: true,
  academic_title: true,
  available_days: true,
  bio: true,
  cfp_verified_at: true,
  cover_image_url: true,
  cpf: true,
  createdAt: true,
  crp: true,
  crp_registration_date: true,
  crp_status: true,
  discount_first_session: true,
  gender: true,
  headline: true,
  id: true,
  languages: true,
  modality: true,
  professional_address_city: true,
  professional_address_state: true,
  published: true,
  race_color: true,
  rating_avg: true,
  rating_count: true,
  religion: true,
  show_experience_tag: true,
  social_value: true,
  target_audience: true,
  updatedAt: true,
  user_id: true,
  video_url: true,
  whatsapp: true,
  user: {
    select: {
      avatar: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      provider: true,
      psychologist_approaches: {
        where: {
          approach: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
        select: {
          approach: {
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
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const publicDirectoryWhere = {
  deleted: false,
  published: true,
  video_url: {
    not: null,
  },
  modality: {
    not: null,
  },
  gender: {
    not: null,
  },
  cpf: {
    not: null,
  },
  crp: {
    not: null,
  },
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
  professional_address_state: {
    not: null,
  },
  professional_address_city: {
    not: null,
  },
  target_audience: {
    not: [],
  },
  user: {
    active: true,
    deleted: false,
    role: "psicologo",
    psychologist_approaches: {
      some: {
        approach: {
          active: true,
          deleted: false,
        },
        deleted: false,
      },
    },
    psychologist_services: {
      some: {
        deleted: false,
        service: {
          active: true,
          deleted: false,
        },
      },
    },
    psychologist_specialties: {
      some: {
        deleted: false,
        specialty: {
          active: true,
          deleted: false,
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileWhereInput;

export class AdminPsychologistsDashboardRepository
  implements IAdminPsychologistsDashboardRepository
{
  async listDirectoryFilters() {
    const [specialties, services, approaches, languages, targetAudiences] = await Promise.all([
      prisma.specialty.findMany({
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
        select: directorySpecialtySelect,
        where: {
          active: true,
          category: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
      }),
      prisma.service.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.approach.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "language",
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "target_audience",
        },
      }),
    ]);

    return {
      approaches: approaches.map(toDirectoryFilterItem),
      features: STATIC_FEATURE_FILTERS.map(toStaticDirectoryFilterItem),
      genders: STATIC_GENDER_FILTERS.map(toStaticDirectoryFilterItem),
      languages: languages.map(toDirectoryFilterItem),
      modalities: STATIC_MODALITY_FILTERS.map(toStaticDirectoryFilterItem),
      race_colors: STATIC_RACE_COLOR_FILTERS.map(toStaticDirectoryFilterItem),
      religions: STATIC_RELIGION_FILTERS.map(toStaticDirectoryFilterItem),
      services: services.map(toDirectoryFilterItem),
      specialties: specialties.map((item) => ({
        ...toDirectoryFilterItem(item),
        category_id: item.category_id,
        category_label: item.category?.name ?? null,
      })),
      states: STATIC_STATE_FILTERS.map(toStaticDirectoryFilterItem),
      target_audiences: targetAudiences.map(toDirectoryFilterItem),
    };
  }

  async listPsychologistProfiles() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: {
        ...profileBaseSelect,
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          where: {
            deleted: false,
            plan: {
              active: true,
              deleted: false,
            },
          },
          select: {
            createdAt: true,
            current_period_end: true,
            gateway: true,
            gateway_subscription_id: true,
            grant_started_at: true,
            id: true,
            plan: {
              select: {
                name: true,
                price_cents: true,
                slug: true,
              },
            },
            source: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async listPublicRankingCandidates() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: publicDirectoryWhere,
      select: {
        ...profileBaseSelect,
        subscriptions: {
          where: activeProfessionalEntitlementWhere(),
          orderBy: [{ grant_started_at: "asc" }, { createdAt: "asc" }],
          select: {
            createdAt: true,
            grant_started_at: true,
            id: true,
            source: true,
          },
          take: 1,
        },
      },
    });
  }

  async listPlatformPageViews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformPwaInstallActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        user_id: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listDirectoryFilterSearchActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        target_id: true,
        target_type: true,
      },
      where: {
        action_type: "psychologist_directory_filter_search",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
      },
    });
  }

  async listPublicProfilePageViews(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        traffic_source: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        page_kind: "psychologist_profile",
        target_id: {
          in: uniquePsychologistIds,
        },
        target_type: "psychologist",
      },
    });
  }

  async listProfileViews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        source: "profile_page",
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }

  async listPublishedReviews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.professional_review.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        status: "publicada",
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }

  async listWhatsappContactRequests(range: AdminPsychologistsDashboardDateRange) {
    return prisma.contact_request.findMany({
      where: {
        channel: "whatsapp",
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }
}
