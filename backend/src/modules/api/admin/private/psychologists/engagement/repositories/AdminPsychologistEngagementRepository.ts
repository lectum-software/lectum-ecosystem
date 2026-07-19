import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";

const psychologistSelect = {
  cover_image_url: true,
  id: true,
  user_id: true,
  video_cover_url: true,
  video_url: true,
  user: {
    select: {
      active: true,
      createdAt: true,
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const communitySelect = {
  avatar_url: true,
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
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
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
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
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

const PROFILE_PAGE_SOURCE = "profile_page";
const SEARCH_RESULT_SOURCE = "search_result";

export const PROFILE_VIDEO_ACTION_TYPES = [
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
] as const;

export type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];

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
        source: PROFILE_PAGE_SOURCE,
      },
      select: { createdAt: true },
    });
  }

  async listPlatformPageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async findPwaInstallAction(userId: string) {
    return prisma.important_action_event.findFirst({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPublicProfilePageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        traffic_source: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: userId,
        target_type: "psychologist",
      },
    });
  }

  async listSearchResultImpressions(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        source: SEARCH_RESULT_SOURCE,
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
      select: { createdAt: true, post_id: true, value: true },
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
      select: { createdAt: true, reply_id: true, value: true },
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

  async countReplyViews(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      },
      _count: { _all: true },
    });
  }

  async countPostWhatsappClicks(postIds: string[]) {
    if (postIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        action_type: "whatsapp_click",
        deleted: false,
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async countReplyWhatsappClicks(replyIds: string[]) {
    if (replyIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        action_type: "whatsapp_click",
        deleted: false,
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
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

  async listCommunityPsychologistParticipantIds(communityIds: string[]) {
    const uniqueCommunityIds = [...new Set(communityIds.filter(Boolean))];
    const participantIdsByCommunityId = new Map<string, Set<string>>();

    if (uniqueCommunityIds.length === 0) return participantIdsByCommunityId;

    const ensureCommunity = (communityId: string) => {
      const existing = participantIdsByCommunityId.get(communityId);
      if (existing) return existing;

      const next = new Set<string>();
      participantIdsByCommunityId.set(communityId, next);

      return next;
    };

    const [members, posts, replies] = await Promise.all([
      prisma.community_member.findMany({
        select: {
          community_id: true,
          user_id: true,
        },
        where: {
          community_id: { in: uniqueCommunityIds },
          deleted: false,
          community: { deleted: false },
          user: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
        },
      }),
      prisma.community_post.findMany({
        select: {
          author_id: true,
          community_id: true,
        },
        where: {
          community_id: { in: uniqueCommunityIds },
          deleted: false,
          community: { deleted: false },
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
        where: {
          deleted: false,
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          post: {
            community_id: { in: uniqueCommunityIds },
            community: { deleted: false },
            deleted: false,
          },
        },
      }),
    ]);

    for (const member of members) {
      ensureCommunity(member.community_id).add(member.user_id);
    }

    for (const post of posts) {
      ensureCommunity(post.community_id).add(post.author_id);
    }

    for (const reply of replies) {
      ensureCommunity(reply.post.community_id).add(reply.author_id);
    }

    return participantIdsByCommunityId;
  }

  async getCommunityMentorRankingSignals(communityId: string, mentorIds: string[]) {
    return getCommunityMentorRankingSignals(communityId, mentorIds);
  }

  async listTopMentorEligiblePsychologistIds() {
    const mentors = await prisma.user.findMany({
      where: {
        active: true,
        deleted: false,
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            published: true,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
            ...verifiedProfessionalProfileWhere(),
          },
        },
      },
      select: {
        id: true,
      },
    });

    return mentors.map((mentor) => mentor.id);
  }
}
