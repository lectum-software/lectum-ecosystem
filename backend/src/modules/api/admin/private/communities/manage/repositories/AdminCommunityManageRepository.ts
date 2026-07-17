import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  activeProfessionalEntitlementWhere,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import type {
  AdminCommunityCreateBody,
  AdminCommunityRuleBody,
  AdminCommunityStatusBody,
  AdminCommunityUpdateBody,
} from "../DTOs/IAdminCommunityManageDTO";

const TOP_MENTOR_UPVOTE_WEIGHT = 5;
const TOP_MENTOR_DOWNVOTE_WEIGHT = 3;
const TOP_MENTOR_COMMENT_WEIGHT = 2;
const TOP_MENTOR_SHARE_WEIGHT = 4;
const TOP_MENTOR_SAVE_WEIGHT = 3;
const TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT = 6;
const TOP_MENTOR_POST_WEIGHT = 1;
const TOP_MENTOR_REPLY_WEIGHT = 1;
const TOP_MENTOR_ACTIVE_DAY_WEIGHT = 1;
const TOP_MENTOR_REMOVED_POST_PENALTY_STEP = 30;

export const adminCommunitySelect = {
  active: true,
  avatar_url: true,
  category: true,
  createdAt: true,
  deactivatedAt: true,
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

const adminCommunityListSelect = {
  active: true,
  avatar_url: true,
  category: true,
  createdAt: true,
  deactivatedAt: true,
  description: true,
  id: true,
  members_count: true,
  name: true,
  slug: true,
  updatedAt: true,
  visual_primary_color: true,
  members: {
    where: {
      deleted: false,
    },
    select: {
      createdAt: true,
      id: true,
    },
  },
  posts: {
    where: {
      deleted: false,
    },
    select: {
      createdAt: true,
      id: true,
      replies_count: true,
      reports: {
        where: {
          deleted: false,
          status: "pendente",
        },
        select: {
          createdAt: true,
          id: true,
        },
      },
      replies: {
        where: {
          deleted: false,
        },
        select: {
          createdAt: true,
          id: true,
          reports: {
            where: {
              deleted: false,
              status: "pendente",
            },
            select: {
              createdAt: true,
              id: true,
            },
          },
        },
      },
      status: true,
    },
  },
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

const adminContentAuthorSelect = {
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
} satisfies Prisma.userSelect;

const adminCommunityContentPostSelect = {
  anonymous: true,
  author: {
    select: adminContentAuthorSelect,
  },
  content: true,
  createdAt: true,
  deleted: true,
  deletedAt: true,
  downvotes_count: true,
  id: true,
  media_items: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      media_type: true,
      media_url: true,
      position: true,
    },
    where: {
      deleted: false,
    },
  },
  media_type: true,
  media_url: true,
  replies_count: true,
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  saves_count: true,
  status: true,
  title: true,
  upvotes_count: true,
} satisfies Prisma.community_postSelect;

const adminCommunityContentReplySelect = {
  author: {
    select: adminContentAuthorSelect,
  },
  content: true,
  createdAt: true,
  deleted: true,
  deletedAt: true,
  downvotes_count: true,
  id: true,
  parent_reply_id: true,
  post_id: true,
  post: {
    select: {
      author: {
        select: adminContentAuthorSelect,
      },
      content: true,
      deleted: true,
      id: true,
      status: true,
      title: true,
    },
  },
  media_type: true,
  media_url: true,
  parent_reply: {
    select: {
      content: true,
      id: true,
      title: true,
    },
  },
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  saves: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  title: true,
  upvotes_count: true,
} satisfies Prisma.post_replySelect;

const adminCommunityReportSelect = {
  createdAt: true,
  description: true,
  id: true,
  post_id: true,
  reason: true,
  reply_id: true,
  status: true,
  target_id: true,
  target_type: true,
  post: {
    select: {
      author: {
        select: adminContentAuthorSelect,
      },
      content: true,
      deleted: true,
      id: true,
      media_items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          media_type: true,
          media_url: true,
          position: true,
        },
        where: {
          deleted: false,
        },
      },
      media_type: true,
      media_url: true,
      status: true,
      title: true,
    },
  },
  reply: {
    select: {
      author: {
        select: adminContentAuthorSelect,
      },
      content: true,
      deleted: true,
      id: true,
      media_type: true,
      media_url: true,
      parent_reply_id: true,
      post_id: true,
      title: true,
      post: {
        select: {
          deleted: true,
          id: true,
          status: true,
          title: true,
        },
      },
    },
  },
  reporter: {
    select: adminContentAuthorSelect,
  },
} satisfies Prisma.post_reportSelect;

const adminCommunityActivitySelect = {
  action: true,
  admin: {
    select: {
      email: true,
      name: true,
    },
  },
  area: true,
  createdAt: true,
  id: true,
  metadata: true,
  reason: true,
  safe_after: true,
  safe_before: true,
  source: true,
} satisfies Prisma.admin_activity_logSelect;

const adminCommunityStatisticsUserSelect = {
  active: true,
  deleted: true,
  id: true,
  psychologist_profile: {
    select: {
      cfp_verified_at: true,
      crp_status: true,
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
} satisfies Prisma.userSelect;

const adminCommunityStatisticsMemberSelect = {
  createdAt: true,
  user: {
    select: adminCommunityStatisticsUserSelect,
  },
  user_id: true,
} satisfies Prisma.community_memberSelect;

const adminCommunityStatisticsPostSelect = {
  anonymous: true,
  author: {
    select: adminCommunityStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
  id: true,
  replies: {
    where: {
      deleted: false,
    },
    select: {
      author: {
        select: adminCommunityStatisticsUserSelect,
      },
      author_id: true,
      createdAt: true,
      id: true,
    },
  },
} satisfies Prisma.community_postSelect;

const adminCommunityStatisticsReplySelect = {
  author: {
    select: adminCommunityStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
  id: true,
  post_id: true,
} satisfies Prisma.post_replySelect;

const adminCommunityStatisticsReportSelect = {
  createdAt: true,
  id: true,
} satisfies Prisma.post_reportSelect;

const adminCommunityStatisticsPageViewSelect = {
  occurred_at: true,
  user: {
    select: {
      active: true,
      deleted: true,
      id: true,
      role: true,
    },
  },
  user_id: true,
} satisfies Prisma.page_view_eventSelect;

const adminCommunityMemberSelect = {
  createdAt: true,
  user: {
    select: {
      active: true,
      avatar: true,
      deleted: true,
      id: true,
      name: true,
      psychologist_profile: {
        select: {
          cfp_verified_at: true,
          crp: true,
          crp_status: true,
          headline: true,
          professional_first_name: true,
          professional_last_name: true,
          rating_avg: true,
          rating_count: true,
          subscriptions: {
            where: activeProfessionalEntitlementWhere(),
            select: { id: true },
          },
        },
      },
      role: true,
    },
  },
} satisfies Prisma.community_memberSelect;

const dateWhere = (from: Date, to: Date) => ({ gte: from, lte: to });

export type AdminCommunityRecord = Prisma.communityGetPayload<{
  select: typeof adminCommunitySelect;
}>;
export type AdminCommunityListRecord = Prisma.communityGetPayload<{
  select: typeof adminCommunityListSelect;
}>;
export type AdminCommunityRuleRecord = Prisma.community_ruleGetPayload<{
  select: typeof adminCommunityRuleSelect;
}>;
export type AdminCommunityContentPostRecord = Prisma.community_postGetPayload<{
  select: typeof adminCommunityContentPostSelect;
}>;
export type AdminCommunityContentReplyRecord = Prisma.post_replyGetPayload<{
  select: typeof adminCommunityContentReplySelect;
}>;
export type AdminCommunityReportRecord = Prisma.post_reportGetPayload<{
  select: typeof adminCommunityReportSelect;
}>;
export type AdminCommunityActivityRecord = Prisma.admin_activity_logGetPayload<{
  select: typeof adminCommunityActivitySelect;
}>;
export type AdminCommunityStatisticsMemberRecord = Prisma.community_memberGetPayload<{
  select: typeof adminCommunityStatisticsMemberSelect;
}>;
export type AdminCommunityStatisticsPostRecord = Prisma.community_postGetPayload<{
  select: typeof adminCommunityStatisticsPostSelect;
}>;
export type AdminCommunityStatisticsReplyRecord = Prisma.post_replyGetPayload<{
  select: typeof adminCommunityStatisticsReplySelect;
}>;
export type AdminCommunityStatisticsReportRecord = Prisma.post_reportGetPayload<{
  select: typeof adminCommunityStatisticsReportSelect;
}>;
export type AdminCommunityStatisticsPageViewRecord = Prisma.page_view_eventGetPayload<{
  select: typeof adminCommunityStatisticsPageViewSelect;
}>;
export type AdminCommunityMemberRecord = Prisma.community_memberGetPayload<{
  select: typeof adminCommunityMemberSelect;
}>;

export type AdminCommunityMentorMetrics = {
  active_days: number;
  comments_received: number;
  community_whatsapp_clicks: number;
  downvotes_received: number;
  posts_published: number;
  removed_posts: number;
  removed_posts_penalty: number;
  replies_published: number;
  saves_received: number;
  shares_received: number;
  upvotes_received: number;
};

export const adminCommunityMentorFormula = () => ({
  active_day_weight: TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  comment_weight: TOP_MENTOR_COMMENT_WEIGHT,
  community_whatsapp_weight: TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  description:
    "score = (upvotes × 5) - (downvotes × 3) + (comentários recebidos × 2) + (compartilhamentos × 4) + (salvamentos × 3) + (cliques WhatsApp da comunidade × 6) + (posts publicados × 1) + (respostas publicadas × 1) + (dias ativos × 1) - penalidade progressiva por posts removidos",
  downvote_weight: TOP_MENTOR_DOWNVOTE_WEIGHT,
  notes: [
    "A lista administrativa inclui todos os psicólogos participantes da comunidade, inclusive com score zero.",
    "A indicação de subida/queda compara a posição atual com o período anterior equivalente de 30 dias.",
    "Cliques de WhatsApp da comunidade permanecem zerados enquanto não houver origem persistida por comunidade.",
  ],
  post_weight: TOP_MENTOR_POST_WEIGHT,
  removed_post_penalty_step: TOP_MENTOR_REMOVED_POST_PENALTY_STEP,
  reply_weight: TOP_MENTOR_REPLY_WEIGHT,
  save_weight: TOP_MENTOR_SAVE_WEIGHT,
  share_weight: TOP_MENTOR_SHARE_WEIGHT,
  upvote_weight: TOP_MENTOR_UPVOTE_WEIGHT,
});

export const emptyAdminCommunityMentorMetrics = (): AdminCommunityMentorMetrics => ({
  active_days: 0,
  comments_received: 0,
  community_whatsapp_clicks: 0,
  downvotes_received: 0,
  posts_published: 0,
  removed_posts: 0,
  removed_posts_penalty: 0,
  replies_published: 0,
  saves_received: 0,
  shares_received: 0,
  upvotes_received: 0,
});

export const adminCommunityMentorRemovedPostsPenalty = (removedPosts: number) =>
  (removedPosts * (removedPosts + 1) * TOP_MENTOR_REMOVED_POST_PENALTY_STEP) / 2;

export const adminCommunityMentorScore = (metrics: AdminCommunityMentorMetrics) => {
  const positivePoints =
    metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT +
    metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT +
    metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT +
    metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT +
    metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT +
    metrics.posts_published * TOP_MENTOR_POST_WEIGHT +
    metrics.replies_published * TOP_MENTOR_REPLY_WEIGHT +
    metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT;
  const penaltyPoints =
    metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT + metrics.removed_posts_penalty;

  return positivePoints - penaltyPoints;
};

export const adminCommunityMentorScoreBreakdown = (metrics: AdminCommunityMentorMetrics) => ({
  active_days_points: metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  comments_points: metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT,
  community_whatsapp_points:
    metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  downvotes_penalty: metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT,
  posts_points: metrics.posts_published * TOP_MENTOR_POST_WEIGHT,
  removed_posts_penalty: metrics.removed_posts_penalty,
  replies_points: metrics.replies_published * TOP_MENTOR_REPLY_WEIGHT,
  saves_points: metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT,
  shares_points: metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT,
  upvotes_points: metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT,
});

type TransactionClient = Prisma.TransactionClient;
const activeReportStatuses = ["pendente", "em_analise"];

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

  async listCommunities() {
    return prisma.community.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: adminCommunityListSelect,
      where: {
        deleted: false,
      },
    });
  }

  async createCommunity(data: AdminCommunityCreateBody & { slug: string }) {
    return prisma.community.create({
      data: {
        category: data.category,
        description: data.description,
        name: data.name,
        slug: data.slug,
        visual_gradient_color: data.visual_gradient_color,
        visual_primary_color: data.visual_primary_color,
        visual_primary_dark_color: data.visual_primary_dark_color,
        visual_soft_color: data.visual_soft_color,
        visual_text_color: data.visual_text_color,
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

  async updateCommunityStatus(
    community: Pick<AdminCommunityRecord, "active" | "deactivatedAt" | "id" | "name" | "slug">,
    data: AdminCommunityStatusBody & { adminId: string },
  ) {
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.community.update({
        where: { id: community.id },
        data: {
          active: data.active,
          deactivatedAt: data.active ? null : new Date(),
        },
        select: adminCommunitySelect,
      });

      await this.createContentActivityLog(transaction, {
        action: data.active ? "community_reactivated" : "community_deactivated",
        adminId: data.adminId,
        area: "dados",
        changedFields: ["community.active", "community.deactivated_at"],
        communityId: community.id,
        metadata: {
          community_name: community.name,
          community_slug: community.slug,
          next_active: updated.active,
          previous_active: community.active,
        },
        reason: data.reason,
        safeAfter: {
          active: updated.active,
          deactivated_at: updated.deactivatedAt?.toISOString() ?? null,
        },
        safeBefore: {
          active: community.active,
          deactivated_at: community.deactivatedAt?.toISOString() ?? null,
        },
      });

      return updated;
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

  async listContent(communityId: string) {
    const [posts, replies] = await Promise.all([
      prisma.community_post.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: adminCommunityContentPostSelect,
        where: {
          community_id: communityId,
        },
      }),
      prisma.post_reply.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: adminCommunityContentReplySelect,
        where: {
          post: {
            community_id: communityId,
          },
        },
      }),
    ]);

    return { posts, replies };
  }

  async countContentPostShares(postIds: string[]) {
    if (postIds.length === 0) return [];

    return prisma.post_share.groupBy({
      by: ["post_id"],
      where: {
        deleted: false,
        post_id: { in: postIds },
        reply_id: null,
      },
      _count: { _all: true },
    });
  }

  async countContentReplyShares(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.post_share.groupBy({
      by: ["reply_id"],
      where: {
        deleted: false,
        reply_id: { in: replyIds },
      },
      _count: { _all: true },
    });
  }

  async countContentViews(postIds: string[], replyIds: string[]) {
    const targets: Prisma.page_view_eventWhereInput[] = [];

    if (postIds.length > 0) {
      targets.push({
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      });
    }

    if (replyIds.length > 0) {
      targets.push({
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      });
    }

    if (targets.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_type", "target_id"],
      where: {
        deleted: false,
        OR: targets,
      },
      _count: { _all: true },
    });
  }

  async countContentWhatsappClicks(postIds: string[], replyIds: string[]) {
    const targets: Prisma.important_action_eventWhereInput[] = [];

    if (postIds.length > 0) {
      targets.push({
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      });
    }

    if (replyIds.length > 0) {
      targets.push({
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      });
    }

    if (targets.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_type", "target_id"],
      where: {
        action_type: "whatsapp_click",
        deleted: false,
        OR: targets,
      },
      _count: { _all: true },
    });
  }

  async findPostContent(communityId: string, postId: string) {
    return prisma.community_post.findFirst({
      select: adminCommunityContentPostSelect,
      where: {
        community_id: communityId,
        id: postId,
      },
    });
  }

  async findReplyContent(communityId: string, replyId: string) {
    return prisma.post_reply.findFirst({
      select: adminCommunityContentReplySelect,
      where: {
        id: replyId,
        post: {
          community_id: communityId,
        },
      },
    });
  }

  async removePostContent(input: {
    adminId: string;
    communityId: string;
    post: AdminCommunityContentPostRecord;
    reason: string;
    safeBefore: Prisma.InputJsonObject;
  }) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          post_id: input.post.id,
        },
      });

      await transaction.community_post.update({
        data: {
          deleted: true,
          deletedAt: now,
          replies_count: Math.max(0, input.post.replies_count - deletedReplies.count),
          status: "removido",
        },
        where: {
          id: input.post.id,
        },
      });

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          deleted: false,
          OR: [{ post_id: input.post.id, reply_id: null }, { target_id: input.post.id }],
          status: {
            in: activeReportStatuses,
          },
        },
      });

      await this.createContentActivityLog(transaction, {
        action: "community_content_removed",
        adminId: input.adminId,
        area: "conteudo",
        changedFields: ["community_post.deleted", "community_post.status", "post_reply.deleted"],
        communityId: input.communityId,
        metadata: {
          affected_replies_count: deletedReplies.count,
          affected_reports_count: affectedReports.count,
          content_id: input.post.id,
          content_type: "post",
          post_id: input.post.id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore: input.safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        affectedRepliesCount: deletedReplies.count,
      };
    });
  }

  async removeReplyContent(input: {
    adminId: string;
    communityId: string;
    reason: string;
    reply: AdminCommunityContentReplyRecord;
    safeBefore: Prisma.InputJsonObject;
  }) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const replyIds = await this.findReplyTreeIds(
        transaction,
        input.reply.post_id,
        input.reply.id,
      );
      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          id: {
            in: replyIds,
          },
          post_id: input.reply.post_id,
        },
      });

      if (deletedReplies.count > 0) {
        const post = await transaction.community_post.findUnique({
          select: { replies_count: true },
          where: { id: input.reply.post_id },
        });
        await transaction.community_post.update({
          data: {
            replies_count: Math.max(0, (post?.replies_count ?? 0) - deletedReplies.count),
          },
          where: {
            id: input.reply.post_id,
          },
        });
      }

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          deleted: false,
          OR: [{ reply_id: { in: replyIds } }, { target_id: { in: replyIds } }],
          status: {
            in: activeReportStatuses,
          },
        },
      });

      await this.createContentActivityLog(transaction, {
        action: "community_content_removed",
        adminId: input.adminId,
        area: "conteudo",
        changedFields: ["post_reply.deleted", "community_post.replies_count"],
        communityId: input.communityId,
        metadata: {
          affected_replies_count: deletedReplies.count,
          affected_reports_count: affectedReports.count,
          content_id: input.reply.id,
          content_type: "comment",
          post_id: input.reply.post_id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore: input.safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        affectedRepliesCount: deletedReplies.count,
      };
    });
  }

  async listPsychologistMembers(communityId: string) {
    return prisma.community_member.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityMemberSelect,
      where: {
        community_id: communityId,
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

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
          post: publishedPostFilter,
        },
      }),
      prisma.post_vote.findMany({
        select: {
          post: {
            select: {
              author_id: true,
            },
          },
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
          post: publishedPostFilter,
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

    for (const vote of postVotes) {
      const mentorId = vote.post?.author_id;
      if (!mentorId) continue;
      if (vote.value === 1) metrics(mentorId).upvotes_received += 1;
      if (vote.value === -1) metrics(mentorId).downvotes_received += 1;
    }

    for (const vote of replyVotes) {
      const mentorId = vote.reply?.author_id;
      if (!mentorId) continue;
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
      if (mentorId) metrics(mentorId).saves_received += 1;
    }

    for (const share of postShares) {
      const mentorId = share.post?.author_id;
      if (mentorId) metrics(mentorId).shares_received += 1;
    }

    for (const share of replyShares) {
      const mentorId = share.reply?.author_id;
      if (mentorId) metrics(mentorId).shares_received += 1;
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

  async listReports(communityId: string) {
    return prisma.post_report.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminCommunityReportSelect,
      where: {
        deleted: false,
        OR: [
          {
            post: {
              community_id: communityId,
            },
          },
          {
            reply: {
              post: {
                community_id: communityId,
              },
            },
          },
        ],
      },
    });
  }

  async resolveReportsForTarget(input: {
    adminId: string;
    communityId: string;
    previousResolution: "dismissed" | "pending" | "upheld";
    reason: string;
    resolution: "dismissed" | "pending" | "upheld";
    review: boolean;
    safeBefore: Prisma.InputJsonObject;
    targetId: string;
    targetType: "comment" | "post" | "reply";
  }) {
    const targetType = input.targetType === "post" ? "post" : "reply";
    const targetWhere: Prisma.post_reportWhereInput =
      targetType === "post"
        ? {
            OR: [
              { post_id: input.targetId, reply_id: null },
              { target_id: input.targetId, target_type: "post" },
            ],
            post: {
              community_id: input.communityId,
            },
          }
        : {
            OR: [{ reply_id: input.targetId }, { target_id: input.targetId, target_type: "reply" }],
            reply: {
              post: {
                community_id: input.communityId,
              },
            },
          };
    const status =
      input.resolution === "dismissed"
        ? "rejeitada"
        : input.resolution === "upheld"
          ? "resolvida"
          : "pendente";

    return prisma.$transaction(async (transaction) => {
      const existingReports = await transaction.post_report.findMany({
        select: {
          id: true,
          post_id: true,
          reply_id: true,
          status: true,
        },
        where: {
          deleted: false,
          ...targetWhere,
        },
      });
      if (existingReports.length === 0) return null;

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status,
        },
        where: {
          deleted: false,
          ...targetWhere,
          ...(input.review
            ? {
                status: {
                  not: status,
                },
              }
            : {
                status: {
                  in: activeReportStatuses,
                },
              }),
        },
      });

      await this.createContentActivityLog(transaction, {
        action: input.review
          ? "community_report_decision_reviewed"
          : input.resolution === "dismissed"
            ? "community_report_dismissed"
            : "community_report_upheld",
        adminId: input.adminId,
        area: "denuncias",
        changedFields: ["post_report.status"],
        communityId: input.communityId,
        metadata: {
          affected_reports_count: affectedReports.count,
          content_id: input.targetId,
          content_type: targetType === "post" ? "post" : "comment",
          existing_reports_count: existingReports.length,
          post_id: existingReports[0]?.post_id ?? null,
          previous_resolution: input.previousResolution,
          resolution: input.resolution,
          review: input.review,
        },
        reason: input.reason,
        safeAfter: {
          status,
          status_group: input.resolution,
        },
        safeBefore: input.safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        existingReportsCount: existingReports.length,
      };
    });
  }

  async listStatisticsDataset(communityId: string, communitySlug: string, to: Date) {
    const membersPromise = prisma.community_member.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityStatisticsMemberSelect,
      where: {
        community_id: communityId,
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: {
            in: ["paciente", "psicologo"],
          },
        },
      },
    });
    const postsPromise = prisma.community_post.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityStatisticsPostSelect,
      where: {
        community_id: communityId,
        createdAt: {
          lte: to,
        },
        deleted: false,
        status: "publicado",
      },
    });
    const repliesPromise = prisma.post_reply.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityStatisticsReplySelect,
      where: {
        createdAt: {
          lte: to,
        },
        deleted: false,
        post: {
          community_id: communityId,
          deleted: false,
          status: "publicado",
        },
      },
    });
    const reportsPromise = prisma.post_report.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityStatisticsReportSelect,
      where: {
        createdAt: {
          lte: to,
        },
        deleted: false,
        OR: [
          {
            post: {
              community_id: communityId,
            },
          },
          {
            reply: {
              post: {
                community_id: communityId,
              },
            },
          },
        ],
      },
    });

    const [members, posts, replies, reports] = await Promise.all([
      membersPromise,
      postsPromise,
      repliesPromise,
      reportsPromise,
    ]);
    const postIds = posts.map((post) => post.id);
    const replyIds = replies.map((reply) => reply.id);
    const profileAccessPsychologistIds = [
      ...new Set([
        ...members
          .filter((member) => member.user.role === "psicologo")
          .map((member) => member.user_id),
        ...posts.filter((post) => post.author.role === "psicologo").map((post) => post.author_id),
        ...replies
          .filter((reply) => reply.author.role === "psicologo")
          .map((reply) => reply.author_id),
      ]),
    ];
    const pageViewTargets: Prisma.page_view_eventWhereInput[] = [
      {
        target_id: {
          in: [communityId, communitySlug],
        },
        target_type: "community",
      },
    ];

    if (postIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      });
    }

    if (replyIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: {
          in: ["post_reply", "reply"],
        },
      });
    }

    const contentActionTargets: Prisma.important_action_eventWhereInput[] = [];

    if (postIds.length > 0) {
      contentActionTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      });
    }

    if (replyIds.length > 0) {
      contentActionTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: {
          in: ["post_reply", "reply"],
        },
      });
    }

    const [
      pageViews,
      postVotes,
      replyVotes,
      postSaves,
      replySaves,
      contentWhatsappClicks,
      profileAccesses,
    ] = await Promise.all([
      prisma.page_view_event.findMany({
        orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
        select: adminCommunityStatisticsPageViewSelect,
        where: {
          deleted: false,
          occurred_at: {
            lte: to,
          },
          user: {
            active: true,
            deleted: false,
            role: {
              in: ["paciente", "psicologo"],
            },
          },
          user_id: {
            not: null,
          },
          OR: pageViewTargets,
        },
      }),
      postIds.length > 0
        ? prisma.post_vote.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
              value: true,
            },
            where: {
              createdAt: {
                lte: to,
              },
              deleted: false,
              post_id: {
                in: postIds,
              },
              value: {
                in: [1, -1],
              },
            },
          })
        : Promise.resolve([]),
      replyIds.length > 0
        ? prisma.post_vote.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
              value: true,
            },
            where: {
              createdAt: {
                lte: to,
              },
              deleted: false,
              reply_id: {
                in: replyIds,
              },
              value: {
                in: [1, -1],
              },
            },
          })
        : Promise.resolve([]),
      postIds.length > 0
        ? prisma.post_save.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
            },
            where: {
              createdAt: {
                lte: to,
              },
              deleted: false,
              post_id: {
                in: postIds,
              },
            },
          })
        : Promise.resolve([]),
      replyIds.length > 0
        ? prisma.post_reply_save.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
            },
            where: {
              createdAt: {
                lte: to,
              },
              deleted: false,
              reply_id: {
                in: replyIds,
              },
            },
          })
        : Promise.resolve([]),
      contentActionTargets.length > 0
        ? prisma.important_action_event.findMany({
            orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
            select: {
              occurred_at: true,
            },
            where: {
              action_type: "whatsapp_click",
              deleted: false,
              occurred_at: {
                lte: to,
              },
              OR: contentActionTargets,
            },
          })
        : Promise.resolve([]),
      profileAccessPsychologistIds.length > 0
        ? prisma.page_view_event.findMany({
            orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
            select: {
              occurred_at: true,
            },
            where: {
              deleted: false,
              occurred_at: {
                lte: to,
              },
              page_kind: "psychologist_profile",
              target_id: {
                in: profileAccessPsychologistIds,
              },
              target_type: "psychologist",
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      contentWhatsappClicks,
      members,
      pageViews,
      posts,
      postSaves,
      postVotes,
      profileAccesses,
      replies,
      replySaves,
      replyVotes,
      reports,
    };
  }

  async listActivities(communityId: string) {
    return prisma.admin_activity_log.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminCommunityActivitySelect,
      where: {
        deleted: false,
        target_id: communityId,
        target_type: "community",
      },
    });
  }

  private async findReplyTreeIds(
    transaction: TransactionClient,
    postId: string,
    rootReplyId: string,
  ) {
    const replies = await transaction.post_reply.findMany({
      select: {
        id: true,
        parent_reply_id: true,
      },
      where: {
        deleted: false,
        post_id: postId,
      },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const reply of replies) {
      if (!reply.parent_reply_id) continue;
      const children = childrenByParent.get(reply.parent_reply_id) ?? [];
      children.push(reply.id);
      childrenByParent.set(reply.parent_reply_id, children);
    }

    const ids = new Set<string>();
    const stack = [rootReplyId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || ids.has(current)) continue;
      ids.add(current);
      for (const childId of childrenByParent.get(current) ?? []) stack.push(childId);
    }

    return [...ids];
  }

  private async createContentActivityLog(
    transaction: TransactionClient,
    input: {
      action: string;
      adminId: string;
      area: string;
      changedFields: string[];
      communityId: string;
      metadata: Prisma.InputJsonObject;
      reason: string;
      safeAfter: Prisma.InputJsonObject;
      safeBefore: Prisma.InputJsonObject;
    },
  ) {
    await transaction.admin_activity_log.create({
      data: {
        action: input.action,
        admin_id: input.adminId,
        area: input.area,
        changed_fields: input.changedFields,
        domain: "communities",
        metadata: input.metadata,
        reason: input.reason,
        safe_after: input.safeAfter,
        safe_before: input.safeBefore,
        source: "admin_panel",
        target_id: input.communityId,
        target_type: "community",
      },
    });
  }
}
