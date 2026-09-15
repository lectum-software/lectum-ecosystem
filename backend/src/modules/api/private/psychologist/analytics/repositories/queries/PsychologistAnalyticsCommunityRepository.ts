import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsCommunityContentBreakdownId,
} from "../../DTOs/IAnalyticsDTO";
import {
  buildCommunityTopMentors,
  COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS,
  emptyCommunityContentSummary,
  emptyCommunityTopMentors,
  isVideoCommunityContent,
  toCommunityActivityDiagnosis,
  toCommunityContentBreakdownId,
} from "../support/community";
import {
  COMMUNITY_ANALYTICS_SOURCE,
  COMMUNITY_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES,
} from "../support/traffic";

export class PsychologistAnalyticsCommunityRepository {
  async hasProfessionalEntitlement(userId: string): Promise<boolean> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
        subscriptions: {
          some: activeProfessionalEntitlementWhere(),
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async buildCommunities(
    userId: string,
    createdAtWindow: Prisma.DateTimeFilter,
  ): Promise<PsychologistAnalyticsCommunities> {
    const communities = await prisma.community.findMany({
      where: {
        active: true,
        deleted: false,
        OR: [
          {
            members: {
              some: {
                deleted: false,
                user_id: userId,
              },
            },
          },
          {
            posts: {
              some: {
                author_id: userId,
                deleted: false,
                status: "publicado",
              },
            },
          },
          {
            posts: {
              some: {
                deleted: false,
                replies: {
                  some: {
                    author_id: userId,
                    deleted: false,
                  },
                },
                status: "publicado",
              },
            },
          },
        ],
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        members: {
          where: {
            deleted: false,
            user_id: userId,
          },
          select: {
            createdAt: true,
          },
          take: 1,
        },
        name: true,
        slug: true,
      },
    });
    const communityIds = communities.map((community) => community.id);
    const followingCommunities = communities.filter(
      (community) => community.members.length > 0,
    ).length;
    const emptyActivityTotals = {
      active_communities: 0,
      total_posts: 0,
      total_replies: 0,
      total_whatsapp_clicks: 0,
    };

    if (communityIds.length === 0) {
      return {
        content: emptyCommunityContentSummary(),
        description:
          "Compare seus posts e respostas e veja quais formatos levam pacientes ao WhatsApp.",
        diagnosis: toCommunityActivityDiagnosis(emptyActivityTotals, 0),
        following_communities: 0,
        participating_communities: 0,
        source: COMMUNITY_ANALYTICS_SOURCE,
        top_mentors: emptyCommunityTopMentors(),
        updated_at: null,
      };
    }

    const [postItems, replyItems, authoredPosts, authoredReplies, topMentorWhatsappActions] =
      await Promise.all([
        prisma.community_post.findMany({
          where: {
            author_id: userId,
            community_id: {
              in: communityIds,
            },
            createdAt: createdAtWindow,
            deleted: false,
            status: "publicado",
          },
          select: {
            community_id: true,
            createdAt: true,
            id: true,
            media_type: true,
          },
        }),
        prisma.post_reply.findMany({
          where: {
            author_id: userId,
            createdAt: createdAtWindow,
            deleted: false,
            post: {
              community: {
                active: true,
                deleted: false,
              },
              community_id: {
                in: communityIds,
              },
              deleted: false,
              status: "publicado",
            },
          },
          select: {
            createdAt: true,
            id: true,
            media_type: true,
            post: {
              select: {
                community_id: true,
              },
            },
          },
        }),
        prisma.community_post.findMany({
          where: {
            author_id: userId,
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
          select: {
            community_id: true,
            id: true,
            media_type: true,
          },
        }),
        prisma.post_reply.findMany({
          where: {
            author_id: userId,
            deleted: false,
            post: {
              community: {
                active: true,
                deleted: false,
              },
              community_id: {
                in: communityIds,
              },
              deleted: false,
              status: "publicado",
            },
          },
          select: {
            id: true,
            media_type: true,
            post: {
              select: {
                community_id: true,
              },
            },
          },
        }),
        prisma.important_action_event.findMany({
          where: {
            action_type: "whatsapp_click",
            deleted: false,
            occurred_at: createdAtWindow,
            target_id: userId,
            target_type: "psychologist",
            AND: [
              {
                OR: [
                  {
                    user_id: null,
                  },
                  {
                    user_id: {
                      not: userId,
                    },
                  },
                ],
              },
              {
                OR: [
                  {
                    page_kind: "community_top_mentors",
                  },
                  {
                    path: {
                      contains: "/comunidades/top-mentores",
                      mode: "insensitive",
                    },
                  },
                  {
                    path: {
                      contains: "/community/top-mentors",
                      mode: "insensitive",
                    },
                  },
                  {
                    path: {
                      contains: "traffic_origin=community_top_mentors",
                      mode: "insensitive",
                    },
                  },
                ],
              },
            ],
          },
          select: {
            occurred_at: true,
          },
        }),
      ]);

    const postIdToCommunityId = new Map(
      authoredPosts.map((post) => [post.id, post.community_id] as const),
    );
    const postIdToContentBreakdownId = new Map(
      authoredPosts.map(
        (post) => [post.id, toCommunityContentBreakdownId("post", post.media_type)] as const,
      ),
    );
    const replyIdToCommunityId = new Map(
      authoredReplies.map((reply) => [reply.id, reply.post.community_id] as const),
    );
    const replyIdToContentBreakdownId = new Map(
      authoredReplies.map(
        (reply) => [reply.id, toCommunityContentBreakdownId("reply", reply.media_type)] as const,
      ),
    );
    const authoredPostIds = [...postIdToCommunityId.keys()];
    const authoredReplyIds = [...replyIdToCommunityId.keys()];
    const targetFilters: Prisma.important_action_eventWhereInput[] = [];

    if (authoredPostIds.length > 0) {
      targetFilters.push({
        target_id: {
          in: authoredPostIds,
        },
        target_type: {
          in: [...COMMUNITY_WHATSAPP_POST_TARGET_TYPES],
        },
      });
    }

    if (authoredReplyIds.length > 0) {
      targetFilters.push({
        target_id: {
          in: authoredReplyIds,
        },
        target_type: {
          in: [...COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES],
        },
      });
    }

    const whatsappActions =
      targetFilters.length > 0
        ? await prisma.important_action_event.findMany({
            where: {
              action_type: "whatsapp_click",
              deleted: false,
              occurred_at: createdAtWindow,
              AND: [
                {
                  OR: [
                    {
                      user_id: null,
                    },
                    {
                      user_id: {
                        not: userId,
                      },
                    },
                  ],
                },
                {
                  OR: targetFilters,
                },
              ],
            },
            select: {
              occurred_at: true,
              target_id: true,
              target_type: true,
            },
          })
        : [];

    const metricsByCommunityId = new Map<
      string,
      { posts_published: number; replies_published: number; whatsapp_clicks: number }
    >();
    const getCommunityMetrics = (communityId: string) => {
      const existing = metricsByCommunityId.get(communityId);
      if (existing) return existing;

      const metrics = {
        posts_published: 0,
        replies_published: 0,
        whatsapp_clicks: 0,
      };
      metricsByCommunityId.set(communityId, metrics);

      return metrics;
    };
    const content = emptyCommunityContentSummary();
    const incrementContent = (contentType: "post" | "reply", mediaType: string | null) => {
      const totals = contentType === "post" ? content.posts : content.replies;
      totals.total += 1;

      if (isVideoCommunityContent(mediaType)) {
        totals.with_video += 1;
        return;
      }

      totals.without_video += 1;
    };

    for (const item of postItems) {
      getCommunityMetrics(item.community_id).posts_published += 1;
      incrementContent("post", item.media_type);
    }

    for (const reply of replyItems) {
      getCommunityMetrics(reply.post.community_id).replies_published += 1;
      incrementContent("reply", reply.media_type);
    }

    const whatsappClicksByContentId = new Map<
      PsychologistAnalyticsCommunityContentBreakdownId,
      number
    >(COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => [item.id, 0]));

    for (const action of whatsappActions) {
      if (!action.target_id) continue;

      const isPostTarget =
        action.target_type &&
        (COMMUNITY_WHATSAPP_POST_TARGET_TYPES as readonly string[]).includes(action.target_type);
      const communityId = isPostTarget
        ? postIdToCommunityId.get(action.target_id)
        : replyIdToCommunityId.get(action.target_id);
      const breakdownId = isPostTarget
        ? postIdToContentBreakdownId.get(action.target_id)
        : replyIdToContentBreakdownId.get(action.target_id);

      if (communityId) {
        getCommunityMetrics(communityId).whatsapp_clicks += 1;
      }

      if (breakdownId) {
        whatsappClicksByContentId.set(
          breakdownId,
          (whatsappClicksByContentId.get(breakdownId) ?? 0) + 1,
        );
      }
    }

    const contentCountByBreakdownId = new Map<
      PsychologistAnalyticsCommunityContentBreakdownId,
      number
    >([
      ["post_with_video", content.posts.with_video],
      ["post_without_video", content.posts.without_video],
      ["reply_with_video", content.replies.with_video],
      ["reply_without_video", content.replies.without_video],
    ]);
    content.whatsapp_clicks_by_content = COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => ({
      ...item,
      content_count: contentCountByBreakdownId.get(item.id) ?? 0,
      whatsapp_clicks: whatsappClicksByContentId.get(item.id) ?? 0,
    }));
    const topMentors = await buildCommunityTopMentors(
      userId,
      communities.map((community) => ({
        id: community.id,
        name: community.name,
        slug: community.slug,
      })),
      topMentorWhatsappActions.length,
    );
    const communityActivityTotals = [...metricsByCommunityId.values()].reduce(
      (acc, metrics) => ({
        active_communities:
          acc.active_communities +
          (metrics.posts_published > 0 ||
          metrics.replies_published > 0 ||
          metrics.whatsapp_clicks > 0
            ? 1
            : 0),
        total_posts: acc.total_posts + metrics.posts_published,
        total_replies: acc.total_replies + metrics.replies_published,
        total_whatsapp_clicks: acc.total_whatsapp_clicks + metrics.whatsapp_clicks,
      }),
      emptyActivityTotals,
    );
    const activityTotals = {
      ...communityActivityTotals,
      total_whatsapp_clicks:
        communityActivityTotals.total_whatsapp_clicks + topMentors.whatsapp_clicks,
    };
    const updatedAt =
      [
        ...postItems.map((post) => post.createdAt),
        ...replyItems.map((reply) => reply.createdAt),
        ...whatsappActions.map((action) => action.occurred_at),
        ...topMentorWhatsappActions.map((action) => action.occurred_at),
      ]
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      content,
      description:
        "Compare seus posts e respostas e veja quais formatos levam pacientes ao WhatsApp.",
      diagnosis: toCommunityActivityDiagnosis(activityTotals, communities.length),
      following_communities: followingCommunities,
      participating_communities: communities.length,
      source: COMMUNITY_ANALYTICS_SOURCE,
      top_mentors: topMentors,
      updated_at: updatedAt,
    };
  }
}
