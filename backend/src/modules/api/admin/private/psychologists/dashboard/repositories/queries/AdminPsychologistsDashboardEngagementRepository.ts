import prisma from "@/infra/database/prisma";
import type { AdminPsychologistsDashboardDateRange } from "../../DTOs/IAdminPsychologistsDashboardDTO";
import { eventCreatedAtWhere } from "../support/dashboard-selects";

export class AdminPsychologistsDashboardEngagementRepository {
  async listReceivedEngagementEvents(range: AdminPsychologistsDashboardDateRange) {
    const favoriteEvents = await prisma.psychologist_favorite.findMany({
      select: {
        createdAt: true,
        psychologist_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const followEvents = await prisma.psychologist_follow.findMany({
      select: {
        createdAt: true,
        psychologist_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const postComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
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
      },
    });

    const nestedReplyComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        parent_reply: {
          select: {
            author_id: true,
          },
        },
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        parent_reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          deleted: false,
        },
        parent_reply_id: {
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
    });

    const seenCommentEvents = new Set<string>();
    const commentEvents = [
      ...postComments.flatMap((comment) => {
        const psychologistId = comment.post.author_id;
        if (comment.author_id === psychologistId) return [];

        return [
          {
            commentId: comment.id,
            createdAt: comment.createdAt,
            psychologist_id: psychologistId,
          },
        ];
      }),
      ...nestedReplyComments.flatMap((comment) => {
        const psychologistId = comment.parent_reply?.author_id;
        if (!psychologistId || comment.author_id === psychologistId) return [];

        return [
          {
            commentId: comment.id,
            createdAt: comment.createdAt,
            psychologist_id: psychologistId,
          },
        ];
      }),
    ].flatMap((event) => {
      const key = `${event.commentId}:${event.psychologist_id}`;
      if (seenCommentEvents.has(key)) return [];
      seenCommentEvents.add(key);

      return [
        {
          createdAt: event.createdAt,
          psychologist_id: event.psychologist_id,
          type: "comment_received" as const,
        },
      ];
    });

    const postVotes = await prisma.post_vote.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
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
        post_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        value: 1,
      },
    });

    const replyVotes = await prisma.post_vote.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
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
        reply_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        value: 1,
      },
    });

    const postSaves = await prisma.post_save.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
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
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const replySaves = await prisma.post_reply_save.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
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
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const postShares = await prisma.post_share.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
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
        reply_id: null,
        user: {
          is: {
            active: true,
            deleted: false,
            role: "paciente",
          },
        },
        user_id: {
          not: null,
        },
      },
    });

    const replyShares = await prisma.post_share.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
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
        reply_id: {
          not: null,
        },
        user: {
          is: {
            active: true,
            deleted: false,
            role: "paciente",
          },
        },
        user_id: {
          not: null,
        },
      },
    });

    return [
      ...favoriteEvents.map((event) => ({
        createdAt: event.createdAt,
        psychologist_id: event.psychologist_id,
        type: "profile_favorite" as const,
      })),
      ...followEvents.map((event) => ({
        createdAt: event.createdAt,
        psychologist_id: event.psychologist_id,
        type: "profile_follow" as const,
      })),
      ...commentEvents,
      ...postVotes.flatMap((vote) => {
        const psychologistId = vote.post?.author_id;
        if (!psychologistId || vote.user_id === psychologistId) return [];

        return [
          {
            createdAt: vote.createdAt,
            psychologist_id: psychologistId,
            type: "positive_vote" as const,
          },
        ];
      }),
      ...replyVotes.flatMap((vote) => {
        const psychologistId = vote.reply?.author_id;
        if (!psychologistId || vote.user_id === psychologistId) return [];

        return [
          {
            createdAt: vote.createdAt,
            psychologist_id: psychologistId,
            type: "positive_vote" as const,
          },
        ];
      }),
      ...postSaves.flatMap((save) => {
        const psychologistId = save.post.author_id;
        if (save.user_id === psychologistId) return [];

        return [
          {
            createdAt: save.createdAt,
            psychologist_id: psychologistId,
            type: "content_save" as const,
          },
        ];
      }),
      ...replySaves.flatMap((save) => {
        const psychologistId = save.reply.author_id;
        if (save.user_id === psychologistId) return [];

        return [
          {
            createdAt: save.createdAt,
            psychologist_id: psychologistId,
            type: "content_save" as const,
          },
        ];
      }),
      ...postShares.flatMap((share) => {
        const psychologistId = share.post.author_id;
        if (share.user_id === psychologistId) return [];

        return [
          {
            createdAt: share.createdAt,
            psychologist_id: psychologistId,
            type: "content_share" as const,
          },
        ];
      }),
      ...replyShares.flatMap((share) => {
        const psychologistId = share.reply?.author_id;
        if (!psychologistId || share.user_id === psychologistId) return [];

        return [
          {
            createdAt: share.createdAt,
            psychologist_id: psychologistId,
            type: "content_share" as const,
          },
        ];
      }),
    ];
  }
}
