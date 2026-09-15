import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";
import type { MemberActivityRecord } from "../interfaces/IAdminCommunitiesDashboardRepository";
import {
  dashboardStatisticsMemberSelect,
  dashboardStatisticsPageViewSelect,
  dashboardStatisticsPostSelect,
  dashboardStatisticsReplySelect,
  dashboardStatisticsReportSelect,
  optionalCreatedAtWhere,
} from "../support/dashboard-selects";

export class AdminCommunitiesDashboardStatisticsRepository {
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
              post_id: true,
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
              reply_id: true,
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
              post_id: true,
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
              reply_id: true,
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
              target_id: true,
              target_type: true,
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
}
