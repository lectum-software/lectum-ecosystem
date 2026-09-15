import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  adminCommunityStatisticsMemberSelect,
  adminCommunityStatisticsPageViewSelect,
  adminCommunityStatisticsPostSelect,
  adminCommunityStatisticsReplySelect,
  adminCommunityStatisticsReportSelect,
} from "../support/manage-selects";

export class AdminCommunityManageStatisticsRepository {
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
}
