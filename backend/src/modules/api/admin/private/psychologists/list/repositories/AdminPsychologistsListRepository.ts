import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { ADMIN_PROFILE_CONVERSION_QUALIFIED_VIDEO_WATCH_SECONDS } from "@/utils/admin-profile-conversion";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { IAdminPsychologistsListRepository } from "./interfaces/IAdminPsychologistsListRepository";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const specialtyCategorySelect = {
  active: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialty_categorySelect;

const specialtyFilterCatalogSelect = {
  category: {
    select: specialtyCategorySelect,
  },
  category_id: true,
  id: true,
  name: true,
  position: true,
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

const SEARCH_RESULT_SOURCE = "search_result";

const countGroupsFromCounts = (records: Array<{ count: number; psychologist_id: string }>) =>
  records.map((record) => ({
    _count: {
      _all: record.count,
    },
    psychologist_id: record.psychologist_id,
  }));

const sumCountsByPsychologistId = (records: Array<{ count: number; psychologist_id: string }>) => {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.psychologist_id, (counts.get(record.psychologist_id) ?? 0) + record.count);
  }

  return [...counts.entries()].map(([psychologist_id, count]) => ({
    count,
    psychologist_id,
  }));
};

export class AdminPsychologistsListRepository implements IAdminPsychologistsListRepository {
  async listSpecialtyCatalog() {
    return prisma.specialty.findMany({
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
      select: specialtyFilterCatalogSelect,
      where: {
        active: true,
        deleted: false,
        category: {
          active: true,
          deleted: false,
        },
      },
    });
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

  async listCommunityPostCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.community_post.groupBy({
      by: ["author_id"],
      where: {
        author_id: psychologistIdsWhere(psychologistIds),
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        community: {
          deleted: false,
        },
        deleted: false,
        status: "publicado",
      },
      _count: {
        _all: true,
      },
    });
  }

  async listCommunityReplyCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.post_reply.groupBy({
      by: ["author_id"],
      where: {
        author_id: psychologistIdsWhere(psychologistIds),
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  async listPatientReplyCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.post_reply.groupBy({
      by: ["author_id"],
      where: {
        author_id: psychologistIdsWhere(psychologistIds),
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        post: {
          author: {
            deleted: false,
            role: "paciente",
          },
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  async listCommunityVoteCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.post_vote.groupBy({
      by: ["user_id"],
      where: {
        deleted: false,
        user_id: psychologistIdsWhere(psychologistIds),
        value: {
          in: [1, -1],
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        OR: [
          {
            post_id: {
              not: null,
            },
            post: {
              community: {
                deleted: false,
              },
              deleted: false,
              status: "publicado",
            },
          },
          {
            reply_id: {
              not: null,
            },
            reply: {
              deleted: false,
              post: {
                community: {
                  deleted: false,
                },
                deleted: false,
                status: "publicado",
              },
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
  }

  async listProfileViewCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.profile_view_event.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
        source: "profile_page",
      },
      _count: {
        _all: true,
      },
    });
  }

  async listSearchResultImpressionCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.profile_view_event.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
        source: SEARCH_RESULT_SOURCE,
      },
      _count: {
        _all: true,
      },
    });
  }

  async listQualifiedVideoViewCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    return prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
        OR: [
          {
            watched_seconds: {
              gte: ADMIN_PROFILE_CONVERSION_QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
          {
            max_position_seconds: {
              gte: ADMIN_PROFILE_CONVERSION_QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
  }

  async listCommunityPostViewCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    const posts = await prisma.community_post.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        author_id: psychologistIdsWhere(psychologistIds),
        community: {
          deleted: false,
        },
        deleted: false,
        status: "publicado",
      },
    });
    const postIds = posts.map((post) => post.id);
    if (postIds.length === 0) return [];

    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["post", "community_post"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const authorByPostId = new Map(posts.map((post) => [post.id, post.author_id]));

    return countGroupsFromCounts(
      sumCountsByPsychologistId(
        viewGroups.flatMap((group) => {
          const targetId = group.target_id;
          if (!targetId) return [];

          const psychologistId = authorByPostId.get(targetId);
          if (!psychologistId) return [];

          return [
            {
              count: group._count._all,
              psychologist_id: psychologistId,
            },
          ];
        }),
      ),
    );
  }

  async listCommunityReplyViewCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    const replies = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        author_id: psychologistIdsWhere(psychologistIds),
        deleted: false,
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });
    const replyIds = replies.map((reply) => reply.id);
    if (replyIds.length === 0) return [];

    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        target_id: {
          in: replyIds,
        },
        target_type: {
          in: ["reply", "post_reply"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const authorByReplyId = new Map(replies.map((reply) => [reply.id, reply.author_id]));

    return countGroupsFromCounts(
      sumCountsByPsychologistId(
        viewGroups.flatMap((group) => {
          const targetId = group.target_id;
          if (!targetId) return [];

          const psychologistId = authorByReplyId.get(targetId);
          if (!psychologistId) return [];

          return [
            {
              count: group._count._all,
              psychologist_id: psychologistId,
            },
          ];
        }),
      ),
    );
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
