import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { IAdminPsychologistsListRepository } from "./interfaces/IAdminPsychologistsListRepository";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

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
            category: {
              active: true,
              deleted: false,
            },
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

const psychologistIdsWhere = (psychologistIds: string[]) => ({
  in: psychologistIds,
});

export class AdminPsychologistsListRepository implements IAdminPsychologistsListRepository {
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
        registry_checks: {
          orderBy: [{ checked_at: "desc" }, { createdAt: "desc" }],
          select: {
            checked_at: true,
            createdAt: true,
            found: true,
            provider: true,
            raw: true,
          },
          take: 2,
          where: {
            deleted: false,
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

  async listFavoriteCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.psychologist_favorite.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
      },
      _count: {
        _all: true,
      },
    });
  }

  async listWhatsappClickCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.contact_request.groupBy({
      by: ["psychologist_id"],
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
      },
      _count: {
        _all: true,
      },
    });
  }
}
