import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminCommunitiesDashboardDateRange } from "../DTOs/IAdminCommunitiesDashboardDTO";
import type {
  IAdminCommunitiesDashboardRepository,
  MemberActivityRecord,
} from "./interfaces/IAdminCommunitiesDashboardRepository";

const createdAtWhere = (range: AdminCommunitiesDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});
const optionalCreatedAtWhere = (range?: AdminCommunitiesDashboardDateRange) =>
  range ? { createdAt: createdAtWhere(range) } : {};
const optionalOccurredAtWhere = (range?: AdminCommunitiesDashboardDateRange) =>
  range ? { occurred_at: createdAtWhere(range) } : {};
const dashboardStatisticsUserSelect = {
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

const dashboardStatisticsMemberSelect = {
  createdAt: true,
  user: {
    select: dashboardStatisticsUserSelect,
  },
  user_id: true,
} satisfies Prisma.community_memberSelect;

const dashboardStatisticsPostSelect = {
  anonymous: true,
  author: {
    select: dashboardStatisticsUserSelect,
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
        select: dashboardStatisticsUserSelect,
      },
      author_id: true,
      createdAt: true,
      id: true,
    },
  },
} satisfies Prisma.community_postSelect;

const dashboardStatisticsReplySelect = {
  author: {
    select: dashboardStatisticsUserSelect,
  },
  author_id: true,
  createdAt: true,
  id: true,
  post_id: true,
} satisfies Prisma.post_replySelect;

const dashboardStatisticsReportSelect = {
  createdAt: true,
  id: true,
} satisfies Prisma.post_reportSelect;

const dashboardStatisticsPageViewSelect = {
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

const earliestDate = (dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((earliest, date) => {
    if (!date) return earliest;
    if (!earliest || date < earliest) return date;

    return earliest;
  }, null);

export class AdminCommunitiesDashboardRepository implements IAdminCommunitiesDashboardRepository {
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

  async listMemberActivity(range?: AdminCommunitiesDashboardDateRange) {
    const [posts, replies, votes, saves] = await Promise.all([
      prisma.community_post.findMany({
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
          author_id: true,
          community_id: true,
        },
      }),
      prisma.post_reply.findMany({
        where: {
          ...optionalCreatedAtWhere(range),
          deleted: false,
          author: {
            active: true,
            deleted: false,
          },
          post: {
            deleted: false,
            status: "publicado",
            community: {
              deleted: false,
            },
          },
        },
        select: {
          author_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        where: {
          ...optionalCreatedAtWhere(range),
          deleted: false,
          user: {
            active: true,
            deleted: false,
          },
        },
        select: {
          user_id: true,
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
        },
      }),
      prisma.post_save.findMany({
        where: {
          ...optionalCreatedAtWhere(range),
          deleted: false,
          user: {
            active: true,
            deleted: false,
          },
          post: {
            deleted: false,
            status: "publicado",
            community: {
              deleted: false,
            },
          },
        },
        select: {
          user_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
    ]);

    const activity: MemberActivityRecord[] = [
      ...posts.map((post) => ({ community_id: post.community_id, user_id: post.author_id })),
      ...replies.map((reply) => ({
        community_id: reply.post.community_id,
        user_id: reply.author_id,
      })),
      ...votes.map((vote) => ({
        community_id: vote.post?.community_id ?? vote.reply?.post.community_id ?? null,
        user_id: vote.user_id,
      })),
      ...saves.map((save) => ({ community_id: save.post.community_id, user_id: save.user_id })),
    ];

    return activity;
  }

  async listGlobalStatisticsDataset(to: Date) {
    const communitiesPromise = prisma.community.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
      },
      where: {
        deleted: false,
      },
    });
    const membersPromise = prisma.community_member.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: dashboardStatisticsMemberSelect,
      where: {
        deleted: false,
        community: {
          deleted: false,
        },
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
      select: dashboardStatisticsPostSelect,
      where: {
        createdAt: {
          lte: to,
        },
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    });
    const repliesPromise = prisma.post_reply.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: dashboardStatisticsReplySelect,
      where: {
        createdAt: {
          lte: to,
        },
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
    });
    const reportsPromise = prisma.post_report.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: dashboardStatisticsReportSelect,
      where: {
        createdAt: {
          lte: to,
        },
        deleted: false,
        OR: [
          {
            post: {
              community: {
                deleted: false,
              },
            },
          },
          {
            reply: {
              post: {
                community: {
                  deleted: false,
                },
              },
            },
          },
        ],
      },
    });

    const [communities, members, posts, replies, reports] = await Promise.all([
      communitiesPromise,
      membersPromise,
      postsPromise,
      repliesPromise,
      reportsPromise,
    ]);
    const communityIds = communities.map((community) => community.id);
    const communitySlugs = communities.map((community) => community.slug);
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
    const pageViewTargets: Prisma.page_view_eventWhereInput[] = [];

    if (communityIds.length > 0 || communitySlugs.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: [...communityIds, ...communitySlugs],
        },
        target_type: "community",
      });
    }

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
      pageViewTargets.length > 0
        ? prisma.page_view_event.findMany({
            orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
            select: dashboardStatisticsPageViewSelect,
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
          })
        : Promise.resolve([]),
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

  async listPendingReports(range: AdminCommunitiesDashboardDateRange) {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
      select: {
        createdAt: true,
        description: true,
        id: true,
        reason: true,
        status: true,
        target_id: true,
        target_type: true,
        post: {
          select: {
            content: true,
            title: true,
            community: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        reply: {
          select: {
            content: true,
            title: true,
            post: {
              select: {
                title: true,
                community: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        reporter: {
          select: {
            role: true,
          },
        },
      },
    });
  }

  async listPendingModerationEvents(range: AdminCommunitiesDashboardDateRange) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: 10,
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: {
          in: ["pending", "reviewing"],
        },
      },
      select: {
        categories: true,
        content_excerpt: true,
        createdAt: true,
        decision: true,
        id: true,
        reason_code: true,
        severity: true,
        status: true,
        target_id: true,
        target_type: true,
        community: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async listPostReplies(range?: AdminCommunitiesDashboardDateRange) {
    return prisma.post_reply.findMany({
      where: {
        ...optionalCreatedAtWhere(range),
        deleted: false,
        author: {
          active: true,
          deleted: false,
        },
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        author: {
          select: {
            id: true,
            role: true,
          },
        },
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
  }
}
