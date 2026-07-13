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
  rating_avg: true,
  rating_count: true,
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
      languages: languages.map(toDirectoryFilterItem),
      services: services.map(toDirectoryFilterItem),
      specialties: specialties.map((item) => ({
        ...toDirectoryFilterItem(item),
        category_id: item.category_id,
        category_label: item.category?.name ?? null,
      })),
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
          select: {
            id: true,
            source: true,
          },
          take: 1,
        },
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
