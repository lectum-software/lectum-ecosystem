import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";

export const createdAtWhere = (range: AdminCommunitiesDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

export const optionalCreatedAtWhere = (range?: AdminCommunitiesDashboardDateRange) =>
  range ? { createdAt: createdAtWhere(range) } : {};

export const optionalOccurredAtWhere = (range?: AdminCommunitiesDashboardDateRange) =>
  range ? { occurred_at: createdAtWhere(range) } : {};

export const dashboardStatisticsUserSelect = {
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

export const dashboardStatisticsMemberSelect = {
  createdAt: true,
  user: {
    select: dashboardStatisticsUserSelect,
  },
  user_id: true,
} satisfies Prisma.community_memberSelect;

export const dashboardStatisticsPostSelect = {
  anonymous: true,
  author: {
    select: dashboardStatisticsUserSelect,
  },
  author_id: true,
  community_id: true,
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
        select: dashboardStatisticsUserSelect,
      },
      author_id: true,
      createdAt: true,
      id: true,
    },
  },
} satisfies Prisma.community_postSelect;

export const dashboardStatisticsReplySelect = {
  author: {
    select: dashboardStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
  id: true,
  media_type: true,
  media_url: true,
  post: {
    select: {
      community_id: true,
    },
  },
  post_id: true,
} satisfies Prisma.post_replySelect;

export const dashboardStatisticsReportSelect = {
  createdAt: true,
  id: true,
  post: {
    select: {
      community_id: true,
    },
  },
  reply: {
    select: {
      post: {
        select: {
          community_id: true,
        },
      },
    },
  },
} satisfies Prisma.post_reportSelect;

export const dashboardStatisticsPageViewSelect = {
  occurred_at: true,
  target_id: true,
  target_type: true,
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

export const earliestDate = (dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((earliest, date) => {
    if (!date) return earliest;
    if (!earliest || date < earliest) return date;

    return earliest;
  }, null);
