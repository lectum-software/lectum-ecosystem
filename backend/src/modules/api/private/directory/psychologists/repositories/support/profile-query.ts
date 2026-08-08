import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";
import type { DirectoryPsychologistTopMentorCommunity } from "../../DTOs/IProfileDTO";

import { communityCardSelect } from "./profile-base";

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
