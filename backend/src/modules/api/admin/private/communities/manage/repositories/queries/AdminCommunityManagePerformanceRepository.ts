import prisma from "@/infra/database/prisma";
import {
  activeProfessionalEntitlementWhere,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import { adminContentAuthorSelect, dateWhere } from "../support/manage-selects";

export class AdminCommunityManagePerformanceRepository {
  async countPublishedPosts(communityId: string) {
    return prisma.community_post.count({
      where: {
        community_id: communityId,
        deleted: false,
        status: "publicado",
      },
    });
  }

  async countComments(communityId: string) {
    return prisma.post_reply.count({
      where: {
        deleted: false,
        post: {
          community_id: communityId,
          deleted: false,
          status: "publicado",
        },
      },
    });
  }

  async countPopularPosts(communityId: string) {
    return prisma.community_post.count({
      where: {
        community_id: communityId,
        deleted: false,
        status: "publicado",
        OR: [
          { upvotes_count: { gt: 0 } },
          { replies_count: { gt: 0 } },
          { saves_count: { gt: 0 } },
        ],
      },
    });
  }

  async listPopularPosts(communityId: string) {
    return prisma.community_post.findMany({
      take: 5,
      where: {
        community_id: communityId,
        deleted: false,
        status: "publicado",
      },
      orderBy: [
        { upvotes_count: "desc" },
        { replies_count: "desc" },
        { saves_count: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        anonymous: true,
        createdAt: true,
        id: true,
        replies_count: true,
        saves_count: true,
        title: true,
        upvotes_count: true,
        author: {
          select: adminContentAuthorSelect,
        },
      },
    });
  }

  async listTopMentors(communityId: string, from: Date, to: Date) {
    return prisma.post_reply.findMany({
      where: {
        createdAt: dateWhere(from, to),
        deleted: false,
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
          psychologist_profile: {
            is: {
              deleted: false,
              ...verifiedProfessionalProfileWhere(),
            },
          },
        },
        post: {
          community_id: communityId,
          deleted: false,
          status: "publicado",
        },
      },
      select: {
        author: {
          select: {
            avatar: true,
            id: true,
            name: true,
            psychologist_profile: {
              select: {
                cfp_verified_at: true,
                crp_status: true,
                crp: true,
                rating_avg: true,
                subscriptions: {
                  where: activeProfessionalEntitlementWhere(),
                  select: { id: true },
                },
              },
            },
          },
        },
        id: true,
        upvotes_count: true,
      },
    });
  }

  async listPerformance(communityId: string, from: Date, to: Date) {
    const [posts, comments, members, reports] = await Promise.all([
      prisma.community_post.findMany({
        where: {
          community_id: communityId,
          createdAt: dateWhere(from, to),
          deleted: false,
          status: "publicado",
        },
        select: { createdAt: true },
      }),
      prisma.post_reply.findMany({
        where: {
          createdAt: dateWhere(from, to),
          deleted: false,
          post: {
            community_id: communityId,
            deleted: false,
            status: "publicado",
          },
        },
        select: { createdAt: true },
      }),
      prisma.community_member.findMany({
        where: {
          community_id: communityId,
          createdAt: dateWhere(from, to),
          deleted: false,
        },
        select: { createdAt: true },
      }),
      prisma.post_report.findMany({
        where: {
          createdAt: dateWhere(from, to),
          deleted: false,
          OR: [
            { post: { community_id: communityId } },
            { reply: { post: { community_id: communityId } } },
          ],
        },
        select: { createdAt: true },
      }),
    ]);

    return { comments, members, posts, reports };
  }
}
