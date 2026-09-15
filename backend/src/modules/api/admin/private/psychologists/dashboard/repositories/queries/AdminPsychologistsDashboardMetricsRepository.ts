import prisma from "@/infra/database/prisma";
import type { AdminPsychologistsDashboardDateRange } from "../../DTOs/IAdminPsychologistsDashboardDTO";
import type { AdminPsychologistContentAttentionRecord } from "../interfaces/IAdminPsychologistsDashboardRepository";
import {
  countRecordsFromGroups,
  eventCreatedAtWhere,
  QUALIFIED_VIDEO_WATCH_SECONDS,
  SEARCH_RESULT_SOURCE,
  sumCountsByPsychologistId,
} from "../support/dashboard-selects";

export class AdminPsychologistsDashboardMetricsRepository {
  async listFavoriteEvents(range: AdminPsychologistsDashboardDateRange) {
    return prisma.psychologist_favorite.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      select: {
        createdAt: true,
        psychologist_id: true,
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

  async listProfileAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    const views = await prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        target_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        duration_seconds: {
          gt: 0,
        },
        occurred_at: eventCreatedAtWhere(range),
        page_kind: "psychologist_profile",
        target_id: {
          in: uniquePsychologistIds,
        },
        target_type: "psychologist",
      },
    });
    const secondsByPsychologistId = new Map<string, number>();

    for (const view of views) {
      const psychologistId = view.target_id;
      if (!psychologistId) continue;
      if (view.user_id && view.user_id === psychologistId) continue;

      secondsByPsychologistId.set(
        psychologistId,
        (secondsByPsychologistId.get(psychologistId) ?? 0) + (view.duration_seconds ?? 0),
      );
    }

    return [...secondsByPsychologistId.entries()].map(([psychologist_id, attention_seconds]) => ({
      attention_seconds,
      psychologist_id,
    }));
  }

  async listProfileVideoAttentionSeconds(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        watched_seconds: {
          gt: 0,
        },
      },
      _sum: {
        watched_seconds: true,
      },
    });

    return groups.map((group) => ({
      attention_seconds: group._sum.watched_seconds ?? 0,
      psychologist_id: group.psychologist_id,
    }));
  }

  async listCommunityContentAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistContentAttentionRecord[]> {
    const groups = await prisma.content_attention_session.groupBy({
      by: ["psychologist_id", "target_type"],
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      _sum: {
        attention_seconds: true,
      },
    });

    return groups.flatMap((group) => {
      if (group.target_type !== "post" && group.target_type !== "reply") return [];

      return [
        {
          attention_seconds: group._sum.attention_seconds ?? 0,
          psychologist_id: group.psychologist_id,
          target_type: group.target_type,
        },
      ];
    });
  }

  async listSearchResultImpressionCounts(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_view_event.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        source: SEARCH_RESULT_SOURCE,
      },
      _count: {
        _all: true,
      },
    });

    return countRecordsFromGroups(groups);
  }

  async listQualifiedVideoViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
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

    return countRecordsFromGroups(groups);
  }

  async listCommunityPostViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["post", "community_post"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const postIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (postIds.length === 0) return [];

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
        community: {
          deleted: false,
        },
        deleted: false,
        id: {
          in: postIds,
        },
        status: "publicado",
      },
    });
    const authorByPostId = new Map(posts.map((post) => [post.id, post.author_id]));

    return sumCountsByPsychologistId(
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
    );
  }

  async listCommunityReplyViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["reply", "post_reply"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const replyIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (replyIds.length === 0) return [];

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
        deleted: false,
        id: {
          in: replyIds,
        },
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });
    const authorByReplyId = new Map(replies.map((reply) => [reply.id, reply.author_id]));

    return sumCountsByPsychologistId(
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
    );
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
