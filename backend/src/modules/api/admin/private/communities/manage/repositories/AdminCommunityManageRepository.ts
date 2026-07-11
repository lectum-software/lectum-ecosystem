import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  activeProfessionalEntitlementWhere,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import type {
  AdminCommunityRuleBody,
  AdminCommunityUpdateBody,
} from "../DTOs/IAdminCommunityManageDTO";

export const adminCommunitySelect = {
  avatar_url: true,
  category: true,
  createdAt: true,
  description: true,
  id: true,
  members_count: true,
  name: true,
  slug: true,
  visual_gradient_color: true,
  visual_primary_color: true,
  visual_primary_dark_color: true,
  visual_soft_color: true,
  visual_text_color: true,
} satisfies Prisma.communitySelect;

export const adminCommunityRuleSelect = {
  active: true,
  createdAt: true,
  description: true,
  id: true,
  position: true,
  title: true,
  updatedAt: true,
} satisfies Prisma.community_ruleSelect;

const dateWhere = (from: Date, to: Date) => ({ gte: from, lte: to });

export type AdminCommunityRecord = Prisma.communityGetPayload<{
  select: typeof adminCommunitySelect;
}>;
export type AdminCommunityRuleRecord = Prisma.community_ruleGetPayload<{
  select: typeof adminCommunityRuleSelect;
}>;

export class AdminCommunityManageRepository {
  async findCommunity(idOrSlug: string) {
    return prisma.community.findFirst({
      where: {
        deleted: false,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: adminCommunitySelect,
    });
  }

  async updateCommunity(communityId: string, data: AdminCommunityUpdateBody) {
    return prisma.community.update({
      where: { id: communityId },
      data,
      select: adminCommunitySelect,
    });
  }

  async listRules(communityId: string, includeInactive = true) {
    return prisma.community_rule.findMany({
      where: {
        community_id: communityId,
        deleted: false,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityRuleSelect,
    });
  }

  async addRule(communityId: string, data: Required<AdminCommunityRuleBody>) {
    return prisma.community_rule.create({
      data: {
        active: data.active,
        community_id: communityId,
        description: data.description,
        position: data.position,
        title: data.title,
      },
      select: adminCommunityRuleSelect,
    });
  }

  async updateRule(
    communityId: string,
    ruleId: string,
    data: Partial<Required<AdminCommunityRuleBody>>,
  ) {
    const existing = await prisma.community_rule.findFirst({
      where: {
        community_id: communityId,
        deleted: false,
        id: ruleId,
      },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.community_rule.update({
      where: { id: ruleId },
      data,
      select: adminCommunityRuleSelect,
    });
  }

  async softDeleteRule(communityId: string, ruleId: string) {
    const existing = await prisma.community_rule.findFirst({
      where: {
        community_id: communityId,
        deleted: false,
        id: ruleId,
      },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.community_rule.update({
      where: { id: ruleId },
      data: {
        active: false,
        deleted: true,
        deletedAt: new Date(),
      },
      select: adminCommunityRuleSelect,
    });
  }

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
        createdAt: true,
        id: true,
        replies_count: true,
        saves_count: true,
        title: true,
        upvotes_count: true,
        author: {
          select: {
            name: true,
            role: true,
          },
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
