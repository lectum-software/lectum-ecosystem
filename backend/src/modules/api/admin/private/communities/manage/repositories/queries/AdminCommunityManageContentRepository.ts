import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  adminCommunityContentModerationEventSelect,
  adminCommunityContentPostSelect,
  adminCommunityContentReplySelect,
  adminCommunityContentVideoWatchSelect,
  adminCommunityReportSelect,
  adminContentAuthorSelect,
  dateWhere,
} from "../support/manage-selects";

export class AdminCommunityManageContentRepository {
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

  async listContentDetailDataset(input: {
    communityId: string;
    from: Date | null;
    postId: string;
    targetId: string;
    targetType: "post" | "reply";
    to: Date | null;
  }) {
    const createdAtWindow =
      input.from && input.to ? { createdAt: dateWhere(input.from, input.to) } : {};
    const occurredAtWindow =
      input.from && input.to ? { occurred_at: dateWhere(input.from, input.to) } : {};
    const pageViewTarget =
      input.targetType === "post"
        ? {
            target_id: input.targetId,
            target_type: { in: ["post", "community_post"] },
          }
        : {
            target_id: input.targetId,
            target_type: { in: ["reply", "post_reply"] },
          };
    const moderationTarget =
      input.targetType === "post"
        ? {
            target_id: input.targetId,
            target_type: { in: ["post", "community_post"] },
          }
        : {
            target_id: input.targetId,
            target_type: { in: ["reply", "post_reply", "comment"] },
          };
    const reportWhere: Prisma.post_reportWhereInput =
      input.targetType === "post"
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

    const [
      comments,
      moderationEvents,
      pageViews,
      reports,
      saves,
      shares,
      videoWatchSessions,
      votes,
      whatsappClicks,
    ] = await Promise.all([
      prisma.post_reply.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          author: {
            select: adminContentAuthorSelect,
          },
          createdAt: true,
          id: true,
          parent_reply_id: true,
        },
        where:
          input.targetType === "post"
            ? {
                ...createdAtWindow,
                deleted: false,
                post_id: input.targetId,
              }
            : {
                deleted: false,
                post_id: input.postId,
              },
      }),
      prisma.content_moderation_event.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: adminCommunityContentModerationEventSelect,
        where: {
          ...createdAtWindow,
          community_id: input.communityId,
          deleted: false,
          ...moderationTarget,
        },
      }),
      prisma.page_view_event.findMany({
        orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          occurred_at: true,
        },
        where: {
          ...occurredAtWindow,
          deleted: false,
          ...pageViewTarget,
        },
      }),
      prisma.post_report.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: adminCommunityReportSelect,
        where: {
          ...createdAtWindow,
          deleted: false,
          ...reportWhere,
        },
      }),
      input.targetType === "post"
        ? prisma.post_save.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
              id: true,
            },
            where: {
              ...createdAtWindow,
              deleted: false,
              post_id: input.targetId,
            },
          })
        : prisma.post_reply_save.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              createdAt: true,
              id: true,
            },
            where: {
              ...createdAtWindow,
              deleted: false,
              reply_id: input.targetId,
            },
          }),
      prisma.post_share.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          createdAt: true,
          id: true,
        },
        where:
          input.targetType === "post"
            ? {
                ...createdAtWindow,
                deleted: false,
                post_id: input.targetId,
                reply_id: null,
              }
            : {
                ...createdAtWindow,
                deleted: false,
                reply_id: input.targetId,
              },
      }),
      prisma.content_video_watch_session.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: adminCommunityContentVideoWatchSelect,
        where: {
          ...createdAtWindow,
          community_id: input.communityId,
          deleted: false,
          target_id: input.targetId,
          target_type: input.targetType,
        },
      }),
      prisma.post_vote.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          createdAt: true,
          id: true,
          value: true,
        },
        where:
          input.targetType === "post"
            ? {
                ...createdAtWindow,
                deleted: false,
                post_id: input.targetId,
                value: {
                  in: [1, -1],
                },
              }
            : {
                ...createdAtWindow,
                deleted: false,
                reply_id: input.targetId,
                value: {
                  in: [1, -1],
                },
              },
      }),
      prisma.important_action_event.findMany({
        orderBy: [{ occurred_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          occurred_at: true,
        },
        where: {
          ...occurredAtWindow,
          action_type: "whatsapp_click",
          deleted: false,
          ...pageViewTarget,
        },
      }),
    ]);

    return {
      comments,
      moderationEvents,
      pageViews,
      reports,
      saves,
      shares,
      videoWatchSessions,
      votes,
      whatsappClicks,
    };
  }
}
