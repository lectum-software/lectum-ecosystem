import prisma from "@/infra/database/prisma";
import { psychologistIdsWhere } from "../support/list-selects";

export class AdminPsychologistsListEngagementRepository {
  async listReceivedEngagementCounts(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return [];

    const countsByPsychologistId = new Map(
      psychologistIds.map((psychologistId) => [
        psychologistId,
        {
          comments_received: 0,
          content_saves: 0,
          content_shares: 0,
          positive_votes: 0,
          profile_favorites: 0,
          profile_follows: 0,
          psychologist_id: psychologistId,
        },
      ]),
    );
    const countsFor = (psychologistId: string) => {
      const current = countsByPsychologistId.get(psychologistId) ?? {
        comments_received: 0,
        content_saves: 0,
        content_shares: 0,
        positive_votes: 0,
        profile_favorites: 0,
        profile_follows: 0,
        psychologist_id: psychologistId,
      };
      countsByPsychologistId.set(psychologistId, current);

      return current;
    };

    const favoriteGroups = await prisma.psychologist_favorite.groupBy({
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
    for (const group of favoriteGroups) {
      countsFor(group.psychologist_id).profile_favorites += group._count._all;
    }

    const followGroups = await prisma.psychologist_follow.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: psychologistIdsWhere(psychologistIds),
      },
      _count: {
        _all: true,
      },
    });
    for (const group of followGroups) {
      countsFor(group.psychologist_id).profile_follows += group._count._all;
    }

    const postComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
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
        deleted: false,
        post: {
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
      },
    });
    const nestedReplyComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
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
        deleted: false,
        parent_reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          author_id: psychologistIdsWhere(psychologistIds),
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
    for (const comment of postComments) {
      const psychologistId = comment.post.author_id;
      if (comment.author_id === psychologistId) continue;
      const key = `${comment.id}:${psychologistId}`;
      if (seenCommentEvents.has(key)) continue;
      seenCommentEvents.add(key);
      countsFor(psychologistId).comments_received += 1;
    }
    for (const comment of nestedReplyComments) {
      const psychologistId = comment.parent_reply?.author_id;
      if (!psychologistId || comment.author_id === psychologistId) continue;
      const key = `${comment.id}:${psychologistId}`;
      if (seenCommentEvents.has(key)) continue;
      seenCommentEvents.add(key);
      countsFor(psychologistId).comments_received += 1;
    }

    const postVotes = await prisma.post_vote.findMany({
      select: {
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        post: {
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
    for (const vote of postVotes) {
      const psychologistId = vote.post?.author_id;
      if (!psychologistId || vote.user_id === psychologistId) continue;
      countsFor(psychologistId).positive_votes += 1;
    }

    const replyVotes = await prisma.post_vote.findMany({
      select: {
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        reply: {
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
    for (const vote of replyVotes) {
      const psychologistId = vote.reply?.author_id;
      if (!psychologistId || vote.user_id === psychologistId) continue;
      countsFor(psychologistId).positive_votes += 1;
    }

    const postSaves = await prisma.post_save.findMany({
      select: {
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        post: {
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
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });
    for (const save of postSaves) {
      const psychologistId = save.post.author_id;
      if (save.user_id === psychologistId) continue;
      countsFor(psychologistId).content_saves += 1;
    }

    const replySaves = await prisma.post_reply_save.findMany({
      select: {
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        reply: {
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
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });
    for (const save of replySaves) {
      const psychologistId = save.reply.author_id;
      if (save.user_id === psychologistId) continue;
      countsFor(psychologistId).content_saves += 1;
    }

    const postShares = await prisma.post_share.findMany({
      select: {
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        post: {
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
    for (const share of postShares) {
      const psychologistId = share.post.author_id;
      if (share.user_id === psychologistId) continue;
      countsFor(psychologistId).content_shares += 1;
    }

    const replyShares = await prisma.post_share.findMany({
      select: {
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        reply: {
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
    for (const share of replyShares) {
      const psychologistId = share.reply?.author_id;
      if (!psychologistId || share.user_id === psychologistId) continue;
      countsFor(psychologistId).content_shares += 1;
    }

    return [...countsByPsychologistId.values()].filter(
      (counts) =>
        counts.comments_received > 0 ||
        counts.content_saves > 0 ||
        counts.content_shares > 0 ||
        counts.positive_votes > 0 ||
        counts.profile_favorites > 0 ||
        counts.profile_follows > 0,
    );
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
