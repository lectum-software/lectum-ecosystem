import prisma from "@/infra/database/prisma";
import {
  communitySelect,
  coveragePatientPostSelect,
  PROFILE_VIDEO_ACTION_TYPES,
  postSelect,
  replySelect,
} from "../support/engagement-selects";

export class AdminPsychologistEngagementContentRepository {
  async listReviews(psychologistId: string, from: Date, to: Date) {
    return prisma.professional_review.findMany({
      where: {
        author: {
          active: true,
          deleted: false,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: { createdAt: true },
    });
  }

  async listVideoSessions(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_video_watch_session.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        completed: true,
        createdAt: true,
        duration_seconds: true,
        last_event_at: true,
        max_position_seconds: true,
        milestone_100: true,
        milestone_25: true,
        milestone_50: true,
        milestone_75: true,
        replay_count: true,
        retention_buckets: true,
        video_url: true,
        viewer_id: true,
        watched_seconds: true,
      },
    });
  }

  async listVideoActionEvents(psychologistId: string, from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      where: {
        action_type: { in: [...PROFILE_VIDEO_ACTION_TYPES] },
        deleted: false,
        occurred_at: { gte: from, lte: to },
        target_id: psychologistId,
        target_type: "psychologist",
      },
      select: {
        action_type: true,
        occurred_at: true,
      },
    });
  }

  async listAuthoredPosts(psychologistId: string, from?: Date, to?: Date) {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "desc" },
      select: postSelect,
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: psychologistId,
        deleted: false,
        status: "publicado",
        community: { deleted: false },
      },
    });
  }

  async listAuthoredReplies(psychologistId: string, from?: Date, to?: Date) {
    return prisma.post_reply.findMany({
      orderBy: { createdAt: "desc" },
      select: replySelect,
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: psychologistId,
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: { deleted: false },
        },
      },
    });
  }

  async countPatientPostsByCommunity(from: Date, to: Date) {
    return prisma.community_post.groupBy({
      by: ["community_id"],
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        community: { deleted: false },
        createdAt: { gte: from, lte: to },
        deleted: false,
        status: "publicado",
      },
      _count: { _all: true },
    });
  }

  async listPatientPostsByCommunityForCoverage(from: Date, to: Date) {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "asc" },
      select: coveragePatientPostSelect,
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        community: { deleted: false },
        createdAt: { gte: from, lte: to },
        deleted: false,
        status: "publicado",
      },
    });
  }

  async listPostSaves(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_save.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listReplySaves(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_reply_save.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true },
    });
  }

  async listCommentsReceived(postIds: string[], psychologistId: string, from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_reply.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        author_id: { not: psychologistId },
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listPostVotes(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_vote.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
      },
      select: { createdAt: true, post_id: true, value: true },
    });
  }

  async listReplyVotes(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_vote.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true, value: true },
    });
  }

  async listPostShareEvents(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.post_share.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post_id: { in: postIds },
        reply_id: null,
      },
      select: { createdAt: true, post_id: true },
    });
  }

  async listReplyShareEvents(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.post_share.findMany({
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply_id: { in: replyIds },
      },
      select: { createdAt: true, reply_id: true },
    });
  }

  async listPostSavesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_save.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, post_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        user_id: userId,
      },
    });
  }

  async listReplySavesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_reply_save.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, reply_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        user_id: userId,
      },
    });
  }

  async listPostVotesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_vote.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        post_id: true,
        value: true,
        post: {
          select: {
            community: {
              select: communitySelect,
            },
          },
        },
      },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        post_id: { not: null },
        user_id: userId,
        value: { in: [1, -1] },
      },
    });
  }

  async listReplyVotesByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_vote.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        reply_id: true,
        value: true,
        reply: {
          select: {
            post: {
              select: {
                community: {
                  select: communitySelect,
                },
              },
            },
          },
        },
      },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: { not: null },
        user_id: userId,
        value: { in: [1, -1] },
      },
    });
  }

  async listPostShareEventsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_share.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, post_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        post: {
          community: { deleted: false },
          deleted: false,
          status: "publicado",
        },
        reply_id: null,
        user_id: userId,
      },
    });
  }

  async listReplyShareEventsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_share.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, reply_id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        reply: {
          deleted: false,
          post: {
            community: { deleted: false },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: { not: null },
        user_id: userId,
      },
    });
  }

  async listReportsByUser(userId: string, from?: Date, to?: Date) {
    return prisma.post_report.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, id: true },
      where: {
        ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        deleted: false,
        OR: [
          {
            reply_id: null,
            target_type: "post",
            post: {
              community: { deleted: false },
              deleted: false,
              status: "publicado",
            },
          },
          {
            reply_id: { not: null },
            reply: {
              deleted: false,
              post: {
                community: { deleted: false },
                deleted: false,
                status: "publicado",
              },
            },
          },
        ],
        reporter_id: userId,
      },
    });
  }
}
