import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  type AdminCommunityMentorMetrics,
  adminCommunityMentorRemovedPostsPenalty,
  dateWhere,
  emptyAdminCommunityMentorMetrics,
} from "../support/manage-selects";

export class AdminCommunityManageMentorRepository {
  async buildMentorMetrics(
    communityId: string,
    mentorIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, AdminCommunityMentorMetrics>> {
    const metricsByMentorId = new Map<string, AdminCommunityMentorMetrics>(
      mentorIds.map((mentorId) => [mentorId, emptyAdminCommunityMentorMetrics()]),
    );
    if (mentorIds.length === 0) return metricsByMentorId;

    const createdAtWindow = dateWhere(from, to);
    const publishedPostFilter: Prisma.community_postWhereInput = {
      community_id: communityId,
      deleted: false,
      status: "publicado",
    };

    const [
      postParticipation,
      replyParticipation,
      replyCoverage,
      postVotes,
      replyVotes,
      postCommentsReceived,
      replyCommentsReceived,
      postSaves,
      postShares,
      replyShares,
      removedPostParticipation,
      postActivityDays,
      replyActivityDays,
    ] = await Promise.all([
      prisma.community_post.groupBy({
        _count: {
          author_id: true,
        },
        by: ["author_id"],
        where: {
          ...publishedPostFilter,
          author_id: {
            in: mentorIds,
          },
          createdAt: createdAtWindow,
        },
      }),
      prisma.post_reply.groupBy({
        _count: {
          author_id: true,
        },
        by: ["author_id"],
        where: {
          author_id: {
            in: mentorIds,
          },
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author: {
              role: "paciente",
            },
          },
        },
      }),
      prisma.post_reply.groupBy({
        _count: {
          post_id: true,
        },
        by: ["author_id", "post_id"],
        where: {
          author_id: {
            in: mentorIds,
          },
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author: {
              role: "paciente",
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        select: {
          post: {
            select: {
              author_id: true,
            },
          },
          user_id: true,
          value: true,
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: mentorIds,
            },
          },
          post_id: {
            not: null,
          },
          value: {
            in: [1, -1],
          },
        },
      }),
      prisma.post_vote.findMany({
        select: {
          reply: {
            select: {
              author_id: true,
            },
          },
          user_id: true,
          value: true,
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          reply: {
            author_id: {
              in: mentorIds,
            },
            deleted: false,
            post: publishedPostFilter,
          },
          reply_id: {
            not: null,
          },
          value: {
            in: [1, -1],
          },
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          post: {
            select: {
              author_id: true,
            },
          },
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          parent_reply_id: null,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: mentorIds,
            },
          },
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          parent_reply: {
            select: {
              author_id: true,
            },
          },
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          parent_reply: {
            is: {
              author_id: {
                in: mentorIds,
              },
              deleted: false,
              post: publishedPostFilter,
            },
          },
          parent_reply_id: {
            not: null,
          },
          post: publishedPostFilter,
        },
      }),
      prisma.post_save.findMany({
        select: {
          post: {
            select: {
              author_id: true,
            },
          },
          user_id: true,
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: mentorIds,
            },
          },
        },
      }),
      prisma.post_share.findMany({
        select: {
          post: {
            select: {
              author_id: true,
            },
          },
          user_id: true,
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: mentorIds,
            },
          },
          reply_id: null,
        },
      }),
      prisma.post_share.findMany({
        select: {
          reply: {
            select: {
              author_id: true,
            },
          },
          user_id: true,
        },
        where: {
          createdAt: createdAtWindow,
          deleted: false,
          reply: {
            author_id: {
              in: mentorIds,
            },
            deleted: false,
            post: publishedPostFilter,
          },
          reply_id: {
            not: null,
          },
        },
      }),
      prisma.community_post.groupBy({
        _count: {
          author_id: true,
        },
        by: ["author_id"],
        where: {
          author_id: {
            in: mentorIds,
          },
          community_id: communityId,
          deleted: false,
          status: "removido",
          updatedAt: createdAtWindow,
        },
      }),
      prisma.community_post.findMany({
        select: {
          author_id: true,
          createdAt: true,
        },
        where: {
          ...publishedPostFilter,
          author_id: {
            in: mentorIds,
          },
          createdAt: createdAtWindow,
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          createdAt: true,
        },
        where: {
          author_id: {
            in: mentorIds,
          },
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            ...publishedPostFilter,
            author: {
              role: "paciente",
            },
          },
        },
      }),
    ]);

    const activeDaysByMentorId = new Map<string, Set<string>>();
    const metrics = (mentorId: string) => {
      const existing = metricsByMentorId.get(mentorId);
      if (existing) return existing;

      const empty = emptyAdminCommunityMentorMetrics();
      metricsByMentorId.set(mentorId, empty);
      return empty;
    };
    const addActiveDay = (mentorId: string, date: Date) => {
      const days = activeDaysByMentorId.get(mentorId) ?? new Set<string>();
      days.add(date.toISOString().slice(0, 10));
      activeDaysByMentorId.set(mentorId, days);
    };

    for (const item of postParticipation)
      metrics(item.author_id).posts_published = item._count.author_id;
    for (const item of replyParticipation)
      metrics(item.author_id).replies_published = item._count.author_id;
    for (const item of replyCoverage) metrics(item.author_id).reply_coverage_count += 1;

    for (const vote of postVotes) {
      const mentorId = vote.post?.author_id;
      if (!mentorId) continue;
      if (vote.user_id === mentorId) continue;
      if (vote.value === 1) metrics(mentorId).upvotes_received += 1;
      if (vote.value === -1) metrics(mentorId).downvotes_received += 1;
    }

    for (const vote of replyVotes) {
      const mentorId = vote.reply?.author_id;
      if (!mentorId) continue;
      if (vote.user_id === mentorId) continue;
      if (vote.value === 1) metrics(mentorId).upvotes_received += 1;
      if (vote.value === -1) metrics(mentorId).downvotes_received += 1;
    }

    for (const comment of postCommentsReceived) {
      const mentorId = comment.post?.author_id;
      if (mentorId && comment.author_id !== mentorId) metrics(mentorId).comments_received += 1;
    }

    for (const comment of replyCommentsReceived) {
      const mentorId = comment.parent_reply?.author_id;
      if (mentorId && comment.author_id !== mentorId) metrics(mentorId).comments_received += 1;
    }

    for (const save of postSaves) {
      const mentorId = save.post?.author_id;
      if (mentorId && save.user_id !== mentorId) metrics(mentorId).saves_received += 1;
    }

    for (const share of postShares) {
      const mentorId = share.post?.author_id;
      if (mentorId && share.user_id !== mentorId) metrics(mentorId).shares_received += 1;
    }

    for (const share of replyShares) {
      const mentorId = share.reply?.author_id;
      if (mentorId && share.user_id !== mentorId) metrics(mentorId).shares_received += 1;
    }

    for (const item of removedPostParticipation) {
      const itemMetrics = metrics(item.author_id);
      itemMetrics.removed_posts = item._count.author_id;
      itemMetrics.removed_posts_penalty = adminCommunityMentorRemovedPostsPenalty(
        itemMetrics.removed_posts,
      );
    }

    for (const item of postActivityDays) addActiveDay(item.author_id, item.createdAt);
    for (const item of replyActivityDays) addActiveDay(item.author_id, item.createdAt);
    for (const [mentorId, days] of activeDaysByMentorId.entries()) {
      metrics(mentorId).active_days = days.size;
    }

    return metricsByMentorId;
  }
}
