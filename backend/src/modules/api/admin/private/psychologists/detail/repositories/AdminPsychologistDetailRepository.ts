import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const userCatalogRelations = {
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
} satisfies Pick<
  Prisma.userSelect,
  "psychologist_approaches" | "psychologist_services" | "psychologist_specialties"
>;

export const adminPsychologistDetailSelect = {
  accepts_insurance: true,
  academic_formations: true,
  academic_graduation_year: true,
  academic_institution: true,
  academic_title: true,
  available_days: true,
  bio: true,
  birthdate: true,
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
  professional_first_name: true,
  professional_last_name: true,
  professional_address_city: true,
  professional_address_complement: true,
  professional_address_district: true,
  professional_address_number: true,
  professional_address_state: true,
  professional_address_street: true,
  professional_address_zip: true,
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
  video_cover_url: true,
  video_url: true,
  whatsapp: true,
  whatsapp_verified_at: true,
  registry_checks: {
    orderBy: {
      checked_at: "desc",
    },
    select: {
      checked_at: true,
      cpf: true,
      found: true,
      provider: true,
      registro: true,
      uf: true,
    },
    take: 1,
    where: {
      deleted: false,
    },
  },
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
      grant_started_at: true,
      id: true,
      plan: {
        select: {
          interval: true,
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
  user: {
    select: {
      active: true,
      avatar: true,
      confirmed: true,
      confirmed_date: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      provider: true,
      role: true,
      updatedAt: true,
      user_tokens: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
        take: 1,
        where: {
          deleted: false,
          token: {
            not: null,
          },
        },
      },
      payment_methods: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          brand: true,
          exp_month: true,
          exp_year: true,
          gateway: true,
          last4: true,
        },
        take: 1,
        where: {
          deleted: false,
        },
      },
      ...userCatalogRelations,
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
    { video_url: "" },
    { modality: "" },
    { gender: "" },
    { cpf: "" },
    { crp: "" },
    { professional_address_city: "" },
    { professional_address_state: "" },
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

const rankingCandidateSelect = {
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
  gender: true,
  headline: true,
  id: true,
  languages: true,
  modality: true,
  professional_address_city: true,
  professional_address_state: true,
  rating_avg: true,
  rating_count: true,
  target_audience: true,
  updatedAt: true,
  user_id: true,
  video_url: true,
  whatsapp: true,
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
  user: {
    select: {
      avatar: true,
      id: true,
      ...userCatalogRelations,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

export type AdminPsychologistDetailRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof adminPsychologistDetailSelect;
}>;

export type AdminPsychologistRankingCandidateRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof rankingCandidateSelect;
}>;

export class AdminPsychologistDetailRepository {
  async findPsychologist(id: string) {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          deleted: false,
          role: "psicologo",
        },
      },
      select: adminPsychologistDetailSelect,
    });
  }

  async listPublicRankingCandidates() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: publicDirectoryWhere,
      select: rankingCandidateSelect,
    });
  }

  async countFavorites(psychologistId: string) {
    return prisma.psychologist_favorite.count({
      where: {
        deleted: false,
        psychologist_id: psychologistId,
      },
    });
  }

  async countWhatsappClicks(psychologistId: string) {
    return prisma.contact_request.count({
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist_id: psychologistId,
      },
    });
  }

  async countProfileViews(psychologistId: string) {
    return prisma.profile_view_event.count({
      where: {
        deleted: false,
        psychologist_id: psychologistId,
        source: "profile_page",
      },
    });
  }

  async listRecentPosts(psychologistId: string) {
    return prisma.community_post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        community: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        id: true,
        title: true,
      },
      take: 5,
      where: {
        author_id: psychologistId,
        deleted: false,
        status: "publicado",
      },
    });
  }

  async listRecentReplies(psychologistId: string) {
    return prisma.post_reply.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        post: {
          select: {
            title: true,
          },
        },
      },
      take: 5,
      where: {
        author_id: psychologistId,
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
        },
      },
    });
  }

  async listRecentReviews(psychologistId: string) {
    return prisma.professional_review.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
        rating: true,
      },
      take: 5,
      where: {
        deleted: false,
        psychologist_id: psychologistId,
        status: "publicada",
      },
    });
  }

  async listRecentContacts(psychologistId: string) {
    return prisma.contact_request.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        id: true,
      },
      take: 5,
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist_id: psychologistId,
      },
    });
  }
}
