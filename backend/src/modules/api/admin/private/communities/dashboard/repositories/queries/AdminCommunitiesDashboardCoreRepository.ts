import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";
import type { CommunityRecord } from "../interfaces/IAdminCommunitiesDashboardRepository";
import {
  createdAtWhere,
  earliestDate,
  optionalCreatedAtWhere,
  optionalOccurredAtWhere,
} from "../support/dashboard-selects";

export class AdminCommunitiesDashboardCoreRepository {
  async findEarliestDashboardEventDate(): Promise<Date | null> {
    const [
      community,
      member,
      post,
      reply,
      report,
      postVote,
      postSave,
      replySave,
      postShare,
      pageView,
      importantAction,
      moderationEvent,
    ] = await Promise.all([
      prisma.community.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.community_member.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.community_post.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_reply.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_report.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_vote.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_save.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_reply_save.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_share.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.page_view_event.findFirst({
        orderBy: { occurred_at: "asc" },
        select: { occurred_at: true },
        where: {
          deleted: false,
          target_type: {
            in: ["community", "community_post", "post", "post_reply", "reply"],
          },
        },
      }),
      prisma.important_action_event.findFirst({
        orderBy: { occurred_at: "asc" },
        select: { occurred_at: true },
        where: {
          deleted: false,
          target_type: {
            in: ["community", "community_post", "post", "post_reply", "reply"],
          },
        },
      }),
      prisma.content_moderation_event.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
    ]);

    return earliestDate([
      community?.createdAt,
      member?.createdAt,
      post?.createdAt,
      reply?.createdAt,
      report?.createdAt,
      postVote?.createdAt,
      postSave?.createdAt,
      replySave?.createdAt,
      postShare?.createdAt,
      pageView?.occurred_at,
      importantAction?.occurred_at,
      moderationEvent?.createdAt,
    ]);
  }

  async countPendingReports(range: AdminCommunitiesDashboardDateRange): Promise<number> {
    return prisma.post_report.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
    });
  }

  async countPendingModerationEvents(range: AdminCommunitiesDashboardDateRange): Promise<number> {
    return prisma.content_moderation_event.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: {
          in: ["pending", "reviewing"],
        },
      },
    });
  }

  async countUrgentModerationEvents(range: AdminCommunitiesDashboardDateRange): Promise<number> {
    return prisma.content_moderation_event.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        severity: "urgent",
        status: {
          in: ["pending", "reviewing"],
        },
      },
    });
  }

  async listCommunities() {
    return prisma.community.findMany({
      orderBy: [{ members_count: "desc" }, { name: "asc" }],
      where: {
        deleted: false,
      },
      select: {
        avatar_url: true,
        id: true,
        members_count: true,
        name: true,
        slug: true,
        visual_primary_color: true,
      },
    });
  }

  async listCommunityMembers() {
    return prisma.community_member.findMany({
      where: {
        deleted: false,
        community: {
          deleted: false,
        },
        user: {
          active: true,
          deleted: false,
        },
      },
      select: {
        community_id: true,
        user_id: true,
      },
    });
  }

  async listCommunityPosts(range?: AdminCommunitiesDashboardDateRange) {
    return prisma.community_post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        ...optionalCreatedAtWhere(range),
        deleted: false,
        status: "publicado",
        author: {
          active: true,
          deleted: false,
        },
        community: {
          deleted: false,
        },
      },
      select: {
        anonymous: true,
        author_id: true,
        community_id: true,
        content: true,
        createdAt: true,
        id: true,
        replies_count: true,
        saves_count: true,
        status: true,
        title: true,
        upvotes_count: true,
        author: {
          select: {
            avatar: true,
            id: true,
            name: true,
            psychologist_profile: {
              select: {
                cfp_verified_at: true,
                crp_status: true,
                gender: true,
                professional_first_name: true,
                professional_last_name: true,
                subscriptions: {
                  where: activeProfessionalEntitlementWhere(),
                  select: {
                    id: true,
                    source: true,
                  },
                },
              },
            },
            role: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async countPostViews(postIds: string[], range?: AdminCommunitiesDashboardDateRange) {
    if (postIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_type", "target_id"],
      where: {
        deleted: false,
        ...optionalOccurredAtWhere(range),
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      },
      _count: { _all: true },
    });
  }

  async countCommunityViews(
    communities: CommunityRecord[],
    range?: AdminCommunitiesDashboardDateRange,
  ) {
    if (communities.length === 0) return [];

    const targetIds = [
      ...new Set(communities.flatMap((community) => [community.id, community.slug])),
    ];

    return prisma.page_view_event.groupBy({
      by: ["target_type", "target_id"],
      where: {
        deleted: false,
        ...optionalOccurredAtWhere(range),
        target_id: {
          in: targetIds,
        },
        target_type: "community",
      },
      _count: { _all: true },
    });
  }
}
