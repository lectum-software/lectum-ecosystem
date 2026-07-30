import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const TOP_MENTOR_UPVOTE_WEIGHT = 2;
const TOP_MENTOR_DOWNVOTE_WEIGHT = 3;
const TOP_MENTOR_COMMENT_WEIGHT = 5;
const TOP_MENTOR_SHARE_WEIGHT = 8;
const TOP_MENTOR_SAVE_WEIGHT = 2;
const TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT = 6;
const TOP_MENTOR_POST_WEIGHT = 1;
const TOP_MENTOR_REPLY_WEIGHT = 3;
const TOP_MENTOR_ACTIVE_DAY_WEIGHT = 1;
const TOP_MENTOR_REMOVED_POST_PENALTY_STEP = 30;

type TopMentorMutableMetrics = {
  active_days: number;
  comments_received: number;
  community_whatsapp_clicks: number;
  downvotes_received: number;
  posts_published: number;
  reply_coverage_count: number;
  removed_posts: number;
  removed_posts_penalty: number;
  replies_published: number;
  saves_received: number;
  shares_received: number;
  upvotes_received: number;
};

export type CommunityMentorRankingSignal = {
  position: number;
  score: number;
};

const emptyTopMentorMetrics = (): TopMentorMutableMetrics => ({
  active_days: 0,
  comments_received: 0,
  community_whatsapp_clicks: 0,
  downvotes_received: 0,
  posts_published: 0,
  reply_coverage_count: 0,
  removed_posts: 0,
  removed_posts_penalty: 0,
  replies_published: 0,
  saves_received: 0,
  shares_received: 0,
  upvotes_received: 0,
});

const topMentorRemovedPostsPenalty = (removedPosts: number) => {
  return (removedPosts * (removedPosts + 1) * TOP_MENTOR_REMOVED_POST_PENALTY_STEP) / 2;
};

const topMentorScore = (metrics: TopMentorMutableMetrics) => {
  const positivePoints =
    metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT +
    metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT +
    metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT +
    metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT +
    metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT +
    metrics.posts_published * TOP_MENTOR_POST_WEIGHT +
    metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT +
    metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT;
  const penaltyPoints =
    metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT + metrics.removed_posts_penalty;

  return positivePoints - penaltyPoints;
};

const hasTopMentorRankingSignal = (metrics: TopMentorMutableMetrics) => {
  return (
    metrics.upvotes_received > 0 ||
    metrics.downvotes_received > 0 ||
    metrics.comments_received > 0 ||
    metrics.shares_received > 0 ||
    metrics.saves_received > 0 ||
    metrics.community_whatsapp_clicks > 0 ||
    metrics.posts_published > 0 ||
    metrics.reply_coverage_count > 0 ||
    metrics.replies_published > 0 ||
    metrics.active_days > 0 ||
    metrics.removed_posts > 0
  );
};

export const getCommunityMentorRankingSignals = async (
  communityId: string,
  mentorIds: string[],
) => {
  const uniqueMentorIds = [...new Set(mentorIds.filter(Boolean))];
  const emptyRanking = new Map<string, CommunityMentorRankingSignal>();

  if (!communityId || uniqueMentorIds.length === 0) return emptyRanking;

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
      by: ["author_id"],
      where: {
        ...publishedPostFilter,
        author_id: {
          in: uniqueMentorIds,
        },
      },
      _count: {
        author_id: true,
      },
    }),
    prisma.post_reply.groupBy({
      by: ["author_id"],
      where: {
        deleted: false,
        author_id: {
          in: uniqueMentorIds,
        },
        post: {
          ...publishedPostFilter,
          author: {
            role: "paciente",
          },
        },
      },
      _count: {
        author_id: true,
      },
    }),
    prisma.post_reply.groupBy({
      by: ["author_id", "post_id"],
      where: {
        deleted: false,
        author_id: {
          in: uniqueMentorIds,
        },
        post: {
          ...publishedPostFilter,
          author: {
            role: "paciente",
          },
        },
      },
      _count: {
        post_id: true,
      },
    }),
    prisma.post_vote.findMany({
      where: {
        deleted: false,
        value: {
          in: [1, -1],
        },
        post_id: {
          not: null,
        },
        post: {
          ...publishedPostFilter,
          author_id: {
            in: uniqueMentorIds,
          },
        },
      },
      select: {
        user_id: true,
        value: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_vote.findMany({
      where: {
        deleted: false,
        value: {
          in: [1, -1],
        },
        reply_id: {
          not: null,
        },
        reply: {
          deleted: false,
          author_id: {
            in: uniqueMentorIds,
          },
          post: publishedPostFilter,
        },
      },
      select: {
        user_id: true,
        value: true,
        reply: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_reply.findMany({
      where: {
        deleted: false,
        parent_reply_id: null,
        post: {
          ...publishedPostFilter,
          author_id: {
            in: uniqueMentorIds,
          },
        },
      },
      select: {
        author_id: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_reply.findMany({
      where: {
        deleted: false,
        parent_reply_id: {
          not: null,
        },
        post: publishedPostFilter,
        parent_reply: {
          is: {
            deleted: false,
            author_id: {
              in: uniqueMentorIds,
            },
            post: publishedPostFilter,
          },
        },
      },
      select: {
        author_id: true,
        parent_reply: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_save.findMany({
      where: {
        deleted: false,
        post: {
          ...publishedPostFilter,
          author_id: {
            in: uniqueMentorIds,
          },
        },
      },
      select: {
        user_id: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_share.findMany({
      where: {
        deleted: false,
        reply_id: null,
        post: {
          ...publishedPostFilter,
          author_id: {
            in: uniqueMentorIds,
          },
        },
      },
      select: {
        user_id: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.post_share.findMany({
      where: {
        deleted: false,
        reply_id: {
          not: null,
        },
        reply: {
          deleted: false,
          author_id: {
            in: uniqueMentorIds,
          },
          post: publishedPostFilter,
        },
      },
      select: {
        user_id: true,
        reply: {
          select: {
            author_id: true,
          },
        },
      },
    }),
    prisma.community_post.groupBy({
      by: ["author_id"],
      where: {
        community_id: communityId,
        deleted: false,
        status: "removido",
        author_id: {
          in: uniqueMentorIds,
        },
      },
      _count: {
        author_id: true,
      },
    }),
    prisma.community_post.findMany({
      where: {
        ...publishedPostFilter,
        author_id: {
          in: uniqueMentorIds,
        },
      },
      select: {
        author_id: true,
        createdAt: true,
      },
    }),
    prisma.post_reply.findMany({
      where: {
        deleted: false,
        author_id: {
          in: uniqueMentorIds,
        },
        post: {
          ...publishedPostFilter,
          author: {
            role: "paciente",
          },
        },
      },
      select: {
        author_id: true,
        createdAt: true,
      },
    }),
  ]);

  const metricsByMentorId = new Map<string, TopMentorMutableMetrics>();
  const activeDaysByMentorId = new Map<string, Set<string>>();
  const getMetrics = (mentorId: string) => {
    const existing = metricsByMentorId.get(mentorId);
    if (existing) return existing;

    const metrics = emptyTopMentorMetrics();
    metricsByMentorId.set(mentorId, metrics);

    return metrics;
  };
  const addActiveDay = (mentorId: string, date: Date) => {
    const existing = activeDaysByMentorId.get(mentorId) ?? new Set<string>();
    existing.add(date.toISOString().slice(0, 10));
    activeDaysByMentorId.set(mentorId, existing);
  };

  for (const item of postParticipation) {
    getMetrics(item.author_id).posts_published = item._count.author_id;
  }

  for (const item of replyParticipation) {
    getMetrics(item.author_id).replies_published = item._count.author_id;
  }

  for (const item of replyCoverage) {
    getMetrics(item.author_id).reply_coverage_count += 1;
  }

  for (const vote of postVotes) {
    if (!vote.post?.author_id) continue;
    if (vote.user_id === vote.post.author_id) continue;

    const metrics = getMetrics(vote.post.author_id);
    if (vote.value === 1) metrics.upvotes_received += 1;
    if (vote.value === -1) metrics.downvotes_received += 1;
  }

  for (const vote of replyVotes) {
    if (!vote.reply?.author_id) continue;
    if (vote.user_id === vote.reply.author_id) continue;

    const metrics = getMetrics(vote.reply.author_id);
    if (vote.value === 1) metrics.upvotes_received += 1;
    if (vote.value === -1) metrics.downvotes_received += 1;
  }

  for (const comment of postCommentsReceived) {
    const mentorId = comment.post?.author_id;
    if (mentorId && comment.author_id !== mentorId) {
      getMetrics(mentorId).comments_received += 1;
    }
  }

  for (const comment of replyCommentsReceived) {
    const mentorId = comment.parent_reply?.author_id;
    if (mentorId && comment.author_id !== mentorId) {
      getMetrics(mentorId).comments_received += 1;
    }
  }

  for (const save of postSaves) {
    if (save.post?.author_id && save.user_id !== save.post.author_id) {
      getMetrics(save.post.author_id).saves_received += 1;
    }
  }

  for (const share of postShares) {
    if (share.post?.author_id && share.user_id !== share.post.author_id) {
      getMetrics(share.post.author_id).shares_received += 1;
    }
  }

  for (const share of replyShares) {
    if (share.reply?.author_id && share.user_id !== share.reply.author_id) {
      getMetrics(share.reply.author_id).shares_received += 1;
    }
  }

  for (const item of removedPostParticipation) {
    const metrics = getMetrics(item.author_id);
    metrics.removed_posts = item._count.author_id;
    metrics.removed_posts_penalty = topMentorRemovedPostsPenalty(metrics.removed_posts);
  }

  for (const item of postActivityDays) {
    addActiveDay(item.author_id, item.createdAt);
  }

  for (const item of replyActivityDays) {
    addActiveDay(item.author_id, item.createdAt);
  }

  for (const [mentorId, days] of activeDaysByMentorId.entries()) {
    getMetrics(mentorId).active_days = days.size;
  }

  const ranked = [...metricsByMentorId.entries()]
    .map(([mentorId, metrics]) => ({
      mentorId,
      metrics,
      score: topMentorScore(metrics),
    }))
    .filter((item) => hasTopMentorRankingSignal(item.metrics))
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const commentDiff = b.metrics.comments_received - a.metrics.comments_received;
      if (commentDiff !== 0) return commentDiff;

      const shareDiff = b.metrics.shares_received - a.metrics.shares_received;
      if (shareDiff !== 0) return shareDiff;

      const whatsappDiff =
        b.metrics.community_whatsapp_clicks - a.metrics.community_whatsapp_clicks;
      if (whatsappDiff !== 0) return whatsappDiff;

      const coverageDiff = b.metrics.reply_coverage_count - a.metrics.reply_coverage_count;
      if (coverageDiff !== 0) return coverageDiff;

      const saveDiff = b.metrics.saves_received - a.metrics.saves_received;
      if (saveDiff !== 0) return saveDiff;

      const upvoteDiff = b.metrics.upvotes_received - a.metrics.upvotes_received;
      if (upvoteDiff !== 0) return upvoteDiff;

      const activeDayDiff = b.metrics.active_days - a.metrics.active_days;
      if (activeDayDiff !== 0) return activeDayDiff;

      const replyDiff = b.metrics.replies_published - a.metrics.replies_published;
      if (replyDiff !== 0) return replyDiff;

      const postDiff = b.metrics.posts_published - a.metrics.posts_published;
      if (postDiff !== 0) return postDiff;

      const downvoteDiff = a.metrics.downvotes_received - b.metrics.downvotes_received;
      if (downvoteDiff !== 0) return downvoteDiff;

      const removedPostDiff = a.metrics.removed_posts - b.metrics.removed_posts;
      if (removedPostDiff !== 0) return removedPostDiff;

      return a.mentorId.localeCompare(b.mentorId);
    });

  return new Map(
    ranked.map((item, index) => [
      item.mentorId,
      {
        position: index + 1,
        score: item.score,
      },
    ]),
  );
};
