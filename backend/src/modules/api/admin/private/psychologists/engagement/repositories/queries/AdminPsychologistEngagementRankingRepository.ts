import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import { communitySelect } from "../support/engagement-selects";

export class AdminPsychologistEngagementRankingRepository {
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

  async countPostViews(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async countReplyViews(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        target_id: { in: replyIds },
        target_type: { in: ["reply", "post_reply"] },
      },
      _count: { _all: true },
    });
  }

  async countPostWhatsappClicks(postIds: string[], from?: Date, to?: Date) {
    if (postIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
        action_type: "whatsapp_click",
        deleted: false,
        target_id: { in: postIds },
        target_type: { in: ["post", "community_post"] },
      },
      _count: { _all: true },
    });
  }

  async countReplyWhatsappClicks(replyIds: string[], from?: Date, to?: Date) {
    if (replyIds.length === 0) return [];

    return prisma.important_action_event.groupBy({
      by: ["target_id"],
      where: {
        ...(from && to ? { occurred_at: { gte: from, lte: to } } : {}),
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
