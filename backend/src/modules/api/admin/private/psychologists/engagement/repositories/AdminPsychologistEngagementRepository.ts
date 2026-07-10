import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const psychologistSelect = {
  cover_image_url: true,
  id: true,
  user_id: true,
  video_cover_url: true,
  video_url: true,
  user: {
    select: {
      active: true,
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  visual_primary_color: true,
} satisfies Prisma.communitySelect;

const postSelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  replies_count: true,
  saves_count: true,
  title: true,
  upvotes_count: true,
  community: {
    select: communitySelect,
  },
  media_items: {
    orderBy: {
      position: "asc",
    },
    select: {
      media_type: true,
      media_url: true,
      position: true,
    },
    take: 1,
    where: {
      deleted: false,
    },
  },
} satisfies Prisma.community_postSelect;

const replySelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  parent_reply_id: true,
  title: true,
  upvotes_count: true,
  post: {
    select: {
      id: true,
      title: true,
      community: {
        select: communitySelect,
      },
    },
  },
} satisfies Prisma.post_replySelect;

export type AdminPsychologistEngagementProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistEngagementPost = Prisma.community_postGetPayload<{
  select: typeof postSelect;
}>;

export type AdminPsychologistEngagementReply = Prisma.post_replyGetPayload<{
  select: typeof replySelect;
}>;

export type CountByDateRecord = { createdAt: Date };

export class AdminPsychologistEngagementRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistEngagementProfile | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: psychologistSelect,
    });
  }

  async listProfileViews(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: { createdAt: true },
    });
  }

  async listWhatsappClicks(psychologistId: string, from: Date, to: Date) {
    return prisma.contact_request.findMany({
      where: {
        channel: "whatsapp",
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: { createdAt: true },
    });
  }

  async listFavorites(psychologistId: string, from: Date, to: Date) {
    return prisma.psychologist_favorite.findMany({
      where: {
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
        duration_seconds: true,
        max_position_seconds: true,
        milestone_100: true,
        milestone_25: true,
        milestone_50: true,
        milestone_75: true,
        replay_count: true,
        retention_buckets: true,
        watched_seconds: true,
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

  async countReplyChildren(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.post_reply.groupBy({
      by: ["parent_reply_id"],
      where: {
        deleted: false,
        parent_reply_id: { in: replyIds },
      },
      _count: { _all: true },
    });
  }

  async countPostShares(postIds: string[]) {
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

  async countReplyShares(replyIds: string[]) {
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

  async countPostViews(postIds: string[]) {
    if (postIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async listCommunities(psychologistId: string) {
    return prisma.community_member.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        community: {
          select: communitySelect,
        },
      },
      where: {
        deleted: false,
        user_id: psychologistId,
        community: { deleted: false },
      },
    });
  }
}
