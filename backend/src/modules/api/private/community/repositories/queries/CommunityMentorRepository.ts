import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type { ICommunityTopMentorsDTO } from "../../DTOs/ICommunityDTO";
import {
  communitySelect,
  TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  TOP_MENTOR_COMMENT_WEIGHT,
  TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  TOP_MENTOR_DOWNVOTE_WEIGHT,
  TOP_MENTOR_POST_WEIGHT,
  TOP_MENTOR_REPLY_WEIGHT,
  TOP_MENTOR_SAVE_WEIGHT,
  TOP_MENTOR_SHARE_WEIGHT,
  TOP_MENTOR_UPVOTE_WEIGHT,
  type TopMentorUserResult,
  topMentorUserSelect,
} from "../support/community-feed";
import {
  buildUserProfessionalDisplayName,
  emptyTopMentorMetrics,
  hasTopMentorRankingSignal,
  normalizeTopMentorsLimit,
  resolveTopMentorsPeriod,
  type TopMentorMutableMetrics,
  toCommunityResponse,
  topMentorBadgeForPosition,
  topMentorRemovedPostsPenalty,
  topMentorScore,
  topMentorsCreatedAtWindow,
  topMentorsFormula,
} from "../support/community-ranking";

import { CommunityRepositoryContext } from "./CommunityRepositoryContext";

export class CommunityMentorRepository extends CommunityRepositoryContext {
  async topMentors(data: ICommunityTopMentorsDTO) {
    const period = resolveTopMentorsPeriod(data.q.period);
    const createdAtWindow = topMentorsCreatedAtWindow(period);
    const communitySlug = data.q.community?.trim() || null;
    const limit = normalizeTopMentorsLimit(data.q.limit);

    const community = communitySlug
      ? await this.repository.findFirst({
          where: {
            slug: communitySlug,
            active: true,
            deleted: false,
          },
          select: communitySelect,
        })
      : null;

    if (communitySlug && !community) return null;

    const eligibleMentors = await prisma.user.findMany({
      where: {
        deleted: false,
        active: true,
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            published: true,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
            ...verifiedProfessionalProfileWhere(),
          },
        },
      },
      select: topMentorUserSelect,
    });
    const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

    if (eligibleMentorIds.length === 0) {
      return {
        data: [],
        period,
        community: community ? toCommunityResponse(community) : null,
        formula: topMentorsFormula(),
        count: 0,
      };
    }

    const communityFilter: Prisma.communityWhereInput = {
      active: true,
      deleted: false,
      slug: communitySlug || undefined,
    };
    const publishedPostFilter: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      community: communityFilter,
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
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
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
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
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
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
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
          createdAt: createdAtWindow,
          post_id: {
            not: null,
          },
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          reply_id: {
            not: null,
          },
          reply: {
            deleted: false,
            author_id: {
              in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          post: publishedPostFilter,
          parent_reply: {
            is: {
              deleted: false,
              author_id: {
                in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
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
          createdAt: createdAtWindow,
          reply: {
            deleted: false,
            author_id: {
              in: eligibleMentorIds,
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
          deleted: false,
          status: "removido",
          author_id: {
            in: eligibleMentorIds,
          },
          community: communityFilter,
          updatedAt: createdAtWindow,
        },
        _count: {
          author_id: true,
        },
      }),
      prisma.community_post.findMany({
        where: {
          ...publishedPostFilter,
          author_id: {
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
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
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
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
      if (vote.post?.author_id) {
        if (vote.user_id === vote.post.author_id) continue;

        const metrics = getMetrics(vote.post.author_id);
        if (vote.value === 1) metrics.upvotes_received += 1;
        if (vote.value === -1) metrics.downvotes_received += 1;
      }
    }

    for (const vote of replyVotes) {
      if (vote.reply?.author_id) {
        if (vote.user_id === vote.reply.author_id) continue;

        const metrics = getMetrics(vote.reply.author_id);
        if (vote.value === 1) metrics.upvotes_received += 1;
        if (vote.value === -1) metrics.downvotes_received += 1;
      }
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

    const mentorById = new Map<string, TopMentorUserResult>(
      eligibleMentors.map((mentor) => [mentor.id, mentor]),
    );
    const ranked = [...metricsByMentorId.entries()]
      .map(([mentorId, metrics]) => {
        const mentor = mentorById.get(mentorId);
        const score = topMentorScore(metrics);

        if (!mentor || !hasTopMentorRankingSignal(metrics)) return null;

        return {
          mentor,
          metrics,
          score,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
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

        const aName = buildUserProfessionalDisplayName(a.mentor);
        const bName = buildUserProfessionalDisplayName(b.mentor);
        const nameDiff = aName.localeCompare(bName, "pt-BR");
        if (nameDiff !== 0) return nameDiff;

        return a.mentor.id.localeCompare(b.mentor.id);
      })
      .slice(0, limit);

    const items = ranked.map((item, index) => {
      const position = index + 1;
      const profile = item.mentor.psychologist_profile;

      return {
        position,
        score: item.score,
        badge: topMentorBadgeForPosition(position),
        professional: {
          id: item.mentor.id,
          name: buildUserProfessionalDisplayName(item.mentor),
          avatar: item.mentor.avatar,
          headline: profile?.headline ?? null,
          crp: profile?.crp ?? null,
          rating_avg: profile?.rating_avg ?? 0,
          rating_count: profile?.rating_count ?? 0,
          profile_url: `/psicologos/${item.mentor.id}`,
        },
        metrics: {
          upvotes_received: item.metrics.upvotes_received,
          downvotes_received: item.metrics.downvotes_received,
          comments_received: item.metrics.comments_received,
          shares_received: item.metrics.shares_received,
          saves_received: item.metrics.saves_received,
          community_whatsapp_clicks: item.metrics.community_whatsapp_clicks,
          posts_published: item.metrics.posts_published,
          reply_coverage_count: item.metrics.reply_coverage_count,
          replies_published: item.metrics.replies_published,
          active_days: item.metrics.active_days,
          removed_posts: item.metrics.removed_posts,
          removed_posts_penalty: item.metrics.removed_posts_penalty,
          participation_events: item.metrics.posts_published + item.metrics.reply_coverage_count,
        },
        score_breakdown: {
          upvotes_points: item.metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT,
          downvotes_penalty: item.metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT,
          comments_points: item.metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT,
          shares_points: item.metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT,
          saves_points: item.metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT,
          community_whatsapp_points:
            item.metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
          posts_points: item.metrics.posts_published * TOP_MENTOR_POST_WEIGHT,
          replies_points: item.metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT,
          reply_coverage_points: item.metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT,
          active_days_points: item.metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT,
          removed_posts_penalty: item.metrics.removed_posts_penalty,
        },
      };
    });

    return {
      data: items,
      period,
      community: community ? toCommunityResponse(community) : null,
      formula: topMentorsFormula(),
      count: items.length,
    };
  }
}
