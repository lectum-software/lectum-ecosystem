import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";

export const TOP_MENTOR_UPVOTE_WEIGHT = 2;

export const TOP_MENTOR_DOWNVOTE_WEIGHT = 3;

export const TOP_MENTOR_COMMENT_WEIGHT = 5;

export const TOP_MENTOR_SHARE_WEIGHT = 8;

export const TOP_MENTOR_SAVE_WEIGHT = 2;

export const TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT = 6;

export const TOP_MENTOR_POST_WEIGHT = 1;

export const TOP_MENTOR_REPLY_WEIGHT = 3;

export const TOP_MENTOR_ACTIVE_DAY_WEIGHT = 1;

export const TOP_MENTOR_REMOVED_POST_PENALTY_STEP = 30;

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

export const adminCommunityListSelect = {
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

export const adminContentAuthorSelect = {
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

export const adminCommunityContentPostSelect = {
  anonymous: true,
  author: {
    select: adminContentAuthorSelect,
  },
  content: true,
  createdAt: true,
  deleted: true,
  deletedAt: true,
  downvotes_count: true,
  edited_at: true,
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

export const adminCommunityContentReplySelect = {
  author: {
    select: adminContentAuthorSelect,
  },
  content: true,
  createdAt: true,
  deleted: true,
  deletedAt: true,
  downvotes_count: true,
  edited_at: true,
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

export const adminCommunityReportSelect = {
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

export const adminCommunityContentModerationEventSelect = {
  categories: true,
  content_excerpt: true,
  createdAt: true,
  decision: true,
  id: true,
  reason_code: true,
  reviewed_at: true,
  severity: true,
  status: true,
} satisfies Prisma.content_moderation_eventSelect;

export const adminCommunityContentVideoWatchSelect = {
  completed: true,
  createdAt: true,
  duration_seconds: true,
  id: true,
  max_position_seconds: true,
  milestone_100: true,
  milestone_25: true,
  milestone_50: true,
  milestone_75: true,
  replay_count: true,
  retention_buckets: true,
  watched_seconds: true,
} satisfies Prisma.content_video_watch_sessionSelect;

export const adminCommunityActivitySelect = {
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

export const adminCommunityStatisticsUserSelect = {
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

export const adminCommunityStatisticsMemberSelect = {
  createdAt: true,
  user: {
    select: adminCommunityStatisticsUserSelect,
  },
  user_id: true,
} satisfies Prisma.community_memberSelect;

export const adminCommunityStatisticsPostSelect = {
  anonymous: true,
  author: {
    select: adminCommunityStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
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

export const adminCommunityStatisticsReplySelect = {
  author: {
    select: adminCommunityStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
  id: true,
  media_type: true,
  media_url: true,
  post_id: true,
} satisfies Prisma.post_replySelect;

export const adminCommunityStatisticsReportSelect = {
  createdAt: true,
  id: true,
} satisfies Prisma.post_reportSelect;

export const adminCommunityStatisticsPageViewSelect = {
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

export const adminCommunityMemberSelect = {
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

export const dateWhere = (from: Date, to: Date) => ({ gte: from, lte: to });

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

export type AdminCommunityContentModerationEventRecord = Prisma.content_moderation_eventGetPayload<{
  select: typeof adminCommunityContentModerationEventSelect;
}>;

export type AdminCommunityContentVideoWatchRecord = Prisma.content_video_watch_sessionGetPayload<{
  select: typeof adminCommunityContentVideoWatchSelect;
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
  reply_coverage_count: number;
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
    "score = (upvotes × 2) - (downvotes × 3) + (comentários recebidos × 5) + (compartilhamentos × 8) + (salvamentos × 2) + (cliques WhatsApp da comunidade × 6) + (posts publicados × 1) + (cobertura de respostas × 3) + (dias ativos × 1) - penalidade progressiva por posts removidos",
  downvote_weight: TOP_MENTOR_DOWNVOTE_WEIGHT,
  notes: [
    "A lista administrativa inclui todos os psicólogos participantes da comunidade, inclusive com score zero.",
    "A indicação de subida/queda compara a posição atual com o período anterior equivalente de 30 dias.",
    "Cobertura de respostas conta no máximo 1 ponto de cobertura por post de paciente respondido pelo psicólogo no período.",
    "Upvotes, downvotes, salvamentos e compartilhamentos feitos pelo próprio psicólogo no próprio conteúdo não entram no score.",
    "Cliques de WhatsApp permanecem zerados enquanto a origem por comunidade não puder ser identificada.",
  ],
  post_weight: TOP_MENTOR_POST_WEIGHT,
  removed_post_penalty_step: TOP_MENTOR_REMOVED_POST_PENALTY_STEP,
  reply_weight: TOP_MENTOR_REPLY_WEIGHT,
  reply_coverage_weight: TOP_MENTOR_REPLY_WEIGHT,
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
  reply_coverage_count: 0,
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
    metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT +
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
  replies_points: metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT,
  reply_coverage_points: metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT,
  saves_points: metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT,
  shares_points: metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT,
  upvotes_points: metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT,
});

export type TransactionClient = Prisma.TransactionClient;

export const activeReportStatuses = ["pendente", "em_analise"];
