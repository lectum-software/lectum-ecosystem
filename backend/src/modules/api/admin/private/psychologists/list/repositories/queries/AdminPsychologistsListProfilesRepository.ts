import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import {
  profileBaseSelect,
  psychologistIdsWhere,
  publicDirectoryWhere,
  QUALIFIED_VIDEO_WATCH_SECONDS,
  SEARCH_RESULT_SOURCE,
  specialtyFilterCatalogSelect,
} from "../support/list-selects";

export class AdminPsychologistsListProfilesRepository {
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
              gte: QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
          {
            max_position_seconds: {
              gte: QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
    });
  }
}
