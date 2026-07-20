import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminPatientDetailDateRange } from "../DTOs/IAdminPatientDetailDTO";

const rangeWhere = (range: AdminPatientDetailDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const communitySelect = {
  avatar_url: true,
  id: true,
  name: true,
  slug: true,
  visual_primary_color: true,
} satisfies Prisma.communitySelect;

const postSummarySelect = {
  content: true,
  createdAt: true,
  id: true,
  title: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_postSelect;

const replySummarySelect = {
  content: true,
  createdAt: true,
  id: true,
  title: true,
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

const latestLocationSelect = {
  city: true,
  country: true,
  createdAt: true,
  source: true,
  state: true,
} satisfies Prisma.visitor_locationSelect;

const patientSelect = {
  active: true,
  avatar: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  provider: true,
  patient_profile: {
    select: {
      createdAt: true,
      gender: true,
      id: true,
      onboarding_completed_at: true,
    },
  },
  visitor_locations: {
    orderBy: {
      createdAt: "desc" as const,
    },
    select: latestLocationSelect,
    take: 1,
    where: {
      deleted: false,
    },
  },
  user_tokens: {
    orderBy: {
      updatedAt: "desc" as const,
    },
    select: {
      createdAt: true,
      updatedAt: true,
    },
    take: 1,
    where: {
      deleted: false,
      token: {
        not: null,
      },
    },
  },
} satisfies Prisma.userSelect;

export type AdminPatientDetailRecord = Prisma.userGetPayload<{
  select: typeof patientSelect;
}>;

export type AdminPatientDetailPostRecord = Prisma.community_postGetPayload<{
  select: typeof postSummarySelect;
}>;

export type AdminPatientDetailReplyRecord = Prisma.post_replyGetPayload<{
  select: typeof replySummarySelect;
}>;

const voteSelect = {
  createdAt: true,
  id: true,
  value: true,
  post: {
    select: postSummarySelect,
  },
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_voteSelect;

export type AdminPatientDetailVoteRecord = Prisma.post_voteGetPayload<{
  select: typeof voteSelect;
}>;

const postSaveSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
} satisfies Prisma.post_saveSelect;

export type AdminPatientDetailPostSaveRecord = Prisma.post_saveGetPayload<{
  select: typeof postSaveSelect;
}>;

const replySaveSelect = {
  createdAt: true,
  id: true,
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_reply_saveSelect;

export type AdminPatientDetailReplySaveRecord = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveSelect;
}>;

const memberSelect = {
  createdAt: true,
  id: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_memberSelect;

export type AdminPatientDetailMemberRecord = Prisma.community_memberGetPayload<{
  select: typeof memberSelect;
}>;

const reviewSelect = {
  createdAt: true,
  id: true,
  rating: true,
  status: true,
} satisfies Prisma.professional_reviewSelect;

export type AdminPatientDetailReviewRecord = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

const psychologistVerificationProfileSelect = {
  cfp_verified_at: true,
  crp_status: true,
  subscriptions: {
    select: {
      id: true,
      source: true,
    },
    where: activeProfessionalEntitlementWhere(),
  },
} satisfies Prisma.psychologist_profileSelect;

const responseAuthorSelect = {
  id: true,
  psychologist_profile: {
    select: psychologistVerificationProfileSelect,
  },
  role: true,
} satisfies Prisma.userSelect;

const responseReceivedSelect = {
  author: {
    select: responseAuthorSelect,
  },
  content: true,
  createdAt: true,
  id: true,
  post: {
    select: {
      id: true,
      title: true,
      community: {
        select: communitySelect,
      },
    },
  },
  parent_reply: {
    select: {
      id: true,
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.post_replySelect;

export type AdminPatientDetailResponseReceivedRecord = Prisma.post_replyGetPayload<{
  select: typeof responseReceivedSelect;
}>;

const postSaveReceivedSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
} satisfies Prisma.post_saveSelect;

export type AdminPatientDetailPostSaveReceivedRecord = Prisma.post_saveGetPayload<{
  select: typeof postSaveReceivedSelect;
}>;

const replySaveReceivedSelect = {
  createdAt: true,
  id: true,
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_reply_saveSelect;

export type AdminPatientDetailReplySaveReceivedRecord = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveReceivedSelect;
}>;

const shareReceivedSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_shareSelect;

export type AdminPatientDetailShareReceivedRecord = Prisma.post_shareGetPayload<{
  select: typeof shareReceivedSelect;
}>;

export class AdminPatientDetailRepository {
  async findPatient(id: string): Promise<AdminPatientDetailRecord | null> {
    return prisma.user.findFirst({
      select: patientSelect,
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
    });
  }

  async listEngagementBundle(patientId: string, range: AdminPatientDetailDateRange) {
    const createdAt = rangeWhere(range);
    const publishedPostWhere = {
      deleted: false,
      status: "publicado",
    } satisfies Prisma.community_postWhereInput;

    const [
      posts,
      replies,
      votesMade,
      postSaves,
      replySaves,
      memberships,
      membershipsInPeriod,
      reviews,
      votesReceived,
      responsesReceived,
      postSavesReceived,
      replySavesReceived,
      sharesReceived,
    ] = await Promise.all([
      prisma.community_post.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSummarySelect,
        where: {
          ...publishedPostWhere,
          author_id: patientId,
          createdAt,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.post_reply.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySummarySelect,
        where: {
          author_id: patientId,
          createdAt,
          deleted: false,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: voteSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          OR: [
            {
              post: {
                ...publishedPostWhere,
                community: {
                  deleted: false,
                },
              },
            },
            {
              reply: {
                deleted: false,
                post: {
                  ...publishedPostWhere,
                  community: {
                    deleted: false,
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.post_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSaveSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_reply_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySaveSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          reply: {
            deleted: false,
            post: {
              ...publishedPostWhere,
              community: {
                deleted: false,
              },
            },
          },
        },
      }),
      prisma.community_member.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: memberSelect,
        where: {
          deleted: false,
          user_id: patientId,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.community_member.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: memberSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.professional_review.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: reviewSelect,
        where: {
          author_id: patientId,
          createdAt,
          deleted: false,
          status: "publicada",
        },
      }),
      prisma.post_vote.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: voteSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          OR: [
            {
              post: {
                ...publishedPostWhere,
                author_id: patientId,
                community: {
                  deleted: false,
                },
              },
            },
            {
              reply: {
                author_id: patientId,
                deleted: false,
                post: {
                  ...publishedPostWhere,
                  community: {
                    deleted: false,
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.post_reply.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: responseReceivedSelect,
        where: {
          author_id: {
            not: patientId,
          },
          createdAt,
          deleted: false,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
          OR: [
            {
              post: {
                author_id: patientId,
              },
            },
            {
              parent_reply: {
                author_id: patientId,
                deleted: false,
              },
            },
          ],
        },
      }),
      prisma.post_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSaveReceivedSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          post: {
            ...publishedPostWhere,
            author_id: patientId,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_reply_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySaveReceivedSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          reply: {
            author_id: patientId,
            deleted: false,
            post: {
              ...publishedPostWhere,
              community: {
                deleted: false,
              },
            },
          },
        },
      }),
      prisma.post_share.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: shareReceivedSelect,
        where: {
          AND: [
            {
              OR: [
                {
                  user_id: null,
                },
                {
                  user_id: {
                    not: patientId,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  post: {
                    ...publishedPostWhere,
                    author_id: patientId,
                    community: {
                      deleted: false,
                    },
                  },
                  reply_id: null,
                },
                {
                  reply: {
                    author_id: patientId,
                    deleted: false,
                    post: {
                      ...publishedPostWhere,
                      community: {
                        deleted: false,
                      },
                    },
                  },
                },
              ],
            },
          ],
          createdAt,
          deleted: false,
        },
      }),
    ]);

    return {
      memberships,
      membershipsInPeriod,
      postSaves,
      postSavesReceived,
      posts,
      replies,
      replySaves,
      replySavesReceived,
      responsesReceived,
      reviews,
      sharesReceived,
      votesMade,
      votesReceived,
    };
  }
}

export type AdminPatientEngagementBundle = Awaited<
  ReturnType<AdminPatientDetailRepository["listEngagementBundle"]>
>;
