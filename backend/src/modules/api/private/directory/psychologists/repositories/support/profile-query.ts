import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryPsychologistParticipationCommunity,
  DirectoryPsychologistTopMentorCommunity,
} from "../../DTOs/IProfileDTO";

import {
  communityCardSelect,
  type ProfilePostResult,
  type ProfileReplyResult,
} from "./profile-base";

export const publishedProfileWhere = (psychologistId: string): Prisma.userWhereInput => ({
  id: psychologistId,
  role: "psicologo",
  active: true,
  deleted: false,
  psychologist_specialties: {
    some: {
      deleted: false,
      specialty: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_services: {
    some: {
      deleted: false,
      service: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_approaches: {
    some: {
      deleted: false,
      approach: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_profile: {
    is: {
      published: true,
      deleted: false,
      video_url: {
        not: null,
      },
      modality: {
        not: null,
      },
      gender: {
        not: null,
      },
      cpf: {
        not: null,
      },
      crp: {
        not: null,
      },
      professional_address_city: {
        not: null,
      },
      professional_address_state: {
        not: null,
      },
      target_audience: {
        not: [],
      },
      NOT: [
        {
          video_url: "",
        },
        {
          modality: "",
        },
        {
          gender: "",
        },
        {
          cpf: "",
        },
        {
          crp: "",
        },
        {
          professional_address_city: "",
        },
        {
          professional_address_state: "",
        },
      ],
    },
  },
});

export const topMentorBadgeForPosition = (position: 1 | 2 | 3) => `TOP #${position} MENTOR`;

export const topMentorEligiblePsychologistWhere = (): Prisma.userWhereInput => ({
  deleted: false,
  active: true,
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
});

export const getProfileTopMentorCommunities = async (
  psychologistId: string,
): Promise<DirectoryPsychologistTopMentorCommunity[]> => {
  const [eligibleMentors, candidateCommunities] = await Promise.all([
    prisma.user.findMany({
      where: topMentorEligiblePsychologistWhere(),
      select: {
        id: true,
      },
    }),
    prisma.community.findMany({
      where: {
        active: true,
        deleted: false,
        OR: [
          {
            posts: {
              some: {
                author_id: psychologistId,
                deleted: false,
                status: "publicado",
              },
            },
          },
          {
            posts: {
              some: {
                deleted: false,
                status: "publicado",
                replies: {
                  some: {
                    author_id: psychologistId,
                    deleted: false,
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: communityCardSelect,
    }),
  ]);
  const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

  if (!eligibleMentorIds.includes(psychologistId) || candidateCommunities.length === 0) {
    return [];
  }

  const rankedCommunities = await Promise.all(
    candidateCommunities.map(async (community) => {
      const ranking = await getCommunityMentorRankingSignals(community.id, eligibleMentorIds);
      const signal = ranking.get(psychologistId);

      if (!signal || signal.position > 3) return null;

      const position = signal.position as 1 | 2 | 3;

      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        avatar_url: community.avatar_url,
        visual_primary_color: community.visual_primary_color,
        visual_primary_dark_color: community.visual_primary_dark_color,
        visual_soft_color: community.visual_soft_color,
        visual_text_color: community.visual_text_color,
        visual_gradient_color: community.visual_gradient_color,
        position,
        badge: topMentorBadgeForPosition(position),
        score: signal.score,
      };
    }),
  );

  return rankedCommunities
    .filter((community): community is DirectoryPsychologistTopMentorCommunity => community !== null)
    .sort((a, b) => {
      const positionDiff = a.position - b.position;
      if (positionDiff !== 0) return positionDiff;

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const nameDiff = a.name.localeCompare(b.name, "pt-BR");
      if (nameDiff !== 0) return nameDiff;

      return a.id.localeCompare(b.id);
    });
};

export const getProfileCommunityRankingById = async (
  psychologistId: string,
  communityIds: string[],
) => {
  const uniqueCommunityIds = [...new Set(communityIds.filter(Boolean))];
  if (uniqueCommunityIds.length === 0) {
    return new Map<string, { position: number; score: number }>();
  }

  const eligibleMentors = await prisma.user.findMany({
    where: topMentorEligiblePsychologistWhere(),
    select: {
      id: true,
    },
  });
  const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

  if (!eligibleMentorIds.includes(psychologistId)) {
    return new Map<string, { position: number; score: number }>();
  }

  const rankingEntries = await Promise.all(
    uniqueCommunityIds.map(async (communityId) => {
      const ranking = await getCommunityMentorRankingSignals(communityId, eligibleMentorIds);
      const signal = ranking.get(psychologistId);

      return signal ? ([communityId, signal] as const) : null;
    }),
  );

  return new Map(
    rankingEntries.filter(
      (entry): entry is readonly [string, { position: number; score: number }] => entry !== null,
    ),
  );
};

export const getProfileParticipationCommunities = async ({
  posts,
  psychologistId,
  replies,
  topMentorCommunities,
}: {
  posts: ProfilePostResult[];
  psychologistId: string;
  replies: ProfileReplyResult[];
  topMentorCommunities: DirectoryPsychologistTopMentorCommunity[];
}): Promise<DirectoryPsychologistParticipationCommunity[]> => {
  const participationByCommunityId = new Map<
    string,
    {
      community: ProfilePostResult["community"];
      lastActivityAt: Date;
      postsCount: number;
      repliesCount: number;
    }
  >();
  const ensureParticipationCommunity = (
    community: ProfilePostResult["community"],
    activityAt: Date,
  ) => {
    const existing = participationByCommunityId.get(community.id);
    if (existing) {
      if (activityAt.getTime() > existing.lastActivityAt.getTime()) {
        existing.lastActivityAt = activityAt;
      }

      return existing;
    }

    const next = {
      community,
      lastActivityAt: activityAt,
      postsCount: 0,
      repliesCount: 0,
    };
    participationByCommunityId.set(community.id, next);

    return next;
  };

  for (const post of posts) {
    ensureParticipationCommunity(post.community, post.createdAt).postsCount += 1;
  }

  for (const reply of replies) {
    ensureParticipationCommunity(reply.post.community, reply.createdAt).repliesCount += 1;
  }

  const topMentorCommunityById = new Map(
    topMentorCommunities.map((community) => [community.id, community]),
  );
  const communityRankingById = await getProfileCommunityRankingById(psychologistId, [
    ...participationByCommunityId.keys(),
  ]);

  return [...participationByCommunityId.values()]
    .map((item) => {
      const topMentorCommunity = topMentorCommunityById.get(item.community.id);
      const ranking = communityRankingById.get(item.community.id);

      return {
        id: item.community.id,
        name: item.community.name,
        slug: item.community.slug,
        avatar_url: item.community.avatar_url,
        visual_primary_color: item.community.visual_primary_color,
        visual_primary_dark_color: item.community.visual_primary_dark_color,
        visual_soft_color: item.community.visual_soft_color,
        visual_text_color: item.community.visual_text_color,
        visual_gradient_color: item.community.visual_gradient_color,
        position: ranking?.position ?? null,
        badge: topMentorCommunity?.badge ?? null,
        score: ranking?.score ?? 0,
        activityCount: item.postsCount + item.repliesCount,
        lastActivityAt: item.lastActivityAt,
      };
    })
    .sort((a, b) => {
      const positionDiff =
        (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY);
      if (positionDiff !== 0) return positionDiff;

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const activityDiff = b.activityCount - a.activityCount;
      if (activityDiff !== 0) return activityDiff;

      const dateDiff = b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
      if (dateDiff !== 0) return dateDiff;

      const nameDiff = a.name.localeCompare(b.name, "pt-BR");
      if (nameDiff !== 0) return nameDiff;

      return a.id.localeCompare(b.id);
    })
    .map(
      ({ activityCount: _activityCount, lastActivityAt: _lastActivityAt, ...community }) =>
        community,
    );
};
