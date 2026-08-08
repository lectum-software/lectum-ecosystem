import prisma from "@/infra/database/prisma";
import {
  countGroupsFromCounts,
  psychologistIdsWhere,
  sumCountsByPsychologistId,
} from "../support/list-selects";

export class AdminPsychologistsListVisibilityRepository {
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
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
      _count: {
        _all: true,
      },
    });
  }
}
