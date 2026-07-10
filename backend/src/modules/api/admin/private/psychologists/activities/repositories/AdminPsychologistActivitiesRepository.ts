import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const actorSelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.userSelect;

const psychologistSelect = {
  cfp_verified_at: true,
  createdAt: true,
  id: true,
  updatedAt: true,
  user_id: true,
  whatsapp_verified_at: true,
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
  id: true,
  name: true,
  slug: true,
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

const postSaveSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
} satisfies Prisma.post_saveSelect;

const replySaveSelect = {
  createdAt: true,
  id: true,
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_reply_saveSelect;

const subscriptionSelect = {
  createdAt: true,
  grant_started_at: true,
  id: true,
  source: true,
  status: true,
  plan: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.professional_subscriptionSelect;

const contactRequestSelect = {
  channel: true,
  createdAt: true,
  id: true,
  user: {
    select: actorSelect,
  },
} satisfies Prisma.contact_requestSelect;

const reviewSelect = {
  author: {
    select: actorSelect,
  },
  comment: true,
  createdAt: true,
  id: true,
  rating: true,
  responded_at: true,
  response: true,
  status: true,
} satisfies Prisma.professional_reviewSelect;

const reportSelect = {
  createdAt: true,
  description: true,
  id: true,
  reason: true,
  status: true,
  post: {
    select: {
      author_id: true,
      content: true,
      id: true,
      title: true,
      community: {
        select: communitySelect,
      },
    },
  },
  reply: {
    select: {
      author_id: true,
      content: true,
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
    },
  },
  reporter: {
    select: actorSelect,
  },
} satisfies Prisma.post_reportSelect;

const createdAtBetween = (from: Date | null, to: Date | null) =>
  from && to ? { createdAt: { gte: from, lte: to } } : {};

export type AdminPsychologistActivitiesProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistActivityPost = Prisma.community_postGetPayload<{
  select: typeof postSummarySelect;
}>;

export type AdminPsychologistActivityReply = Prisma.post_replyGetPayload<{
  select: typeof replySummarySelect;
}>;

export type AdminPsychologistActivityPostSave = Prisma.post_saveGetPayload<{
  select: typeof postSaveSelect;
}>;

export type AdminPsychologistActivityReplySave = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveSelect;
}>;

export type AdminPsychologistActivitySubscription = Prisma.professional_subscriptionGetPayload<{
  select: typeof subscriptionSelect;
}>;

export type AdminPsychologistActivityContactRequest = Prisma.contact_requestGetPayload<{
  select: typeof contactRequestSelect;
}>;

export type AdminPsychologistActivityReview = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

export type AdminPsychologistActivityReport = Prisma.post_reportGetPayload<{
  select: typeof reportSelect;
}>;

export class AdminPsychologistActivitiesRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistActivitiesProfile | null> {
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

  async listAuthoredPosts(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityPost[]> {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "desc" },
      select: postSummarySelect,
      where: {
        ...createdAtBetween(from, to),
        author_id: psychologistUserId,
        deleted: false,
        status: "publicado",
        community: { deleted: false },
      },
    });
  }

  async listAuthoredReplies(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityReply[]> {
    return prisma.post_reply.findMany({
      orderBy: { createdAt: "desc" },
      select: replySummarySelect,
      where: {
        ...createdAtBetween(from, to),
        author_id: psychologistUserId,
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: { deleted: false },
        },
      },
    });
  }

  async listPostSavesByPsychologist(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityPostSave[]> {
    return prisma.post_save.findMany({
      orderBy: { createdAt: "desc" },
      select: postSaveSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: psychologistUserId,
        post: {
          deleted: false,
          status: "publicado",
          community: { deleted: false },
        },
      },
    });
  }

  async listReplySavesByPsychologist(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityReplySave[]> {
    return prisma.post_reply_save.findMany({
      orderBy: { createdAt: "desc" },
      select: replySaveSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: psychologistUserId,
        reply: {
          deleted: false,
          post: {
            deleted: false,
            status: "publicado",
            community: { deleted: false },
          },
        },
      },
    });
  }

  async listSubscriptions(
    psychologistProfileId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivitySubscription[]> {
    return prisma.professional_subscription.findMany({
      orderBy: { createdAt: "desc" },
      select: subscriptionSelect,
      where: {
        deleted: false,
        psychologist_id: psychologistProfileId,
        ...(from && to
          ? {
              OR: [
                { createdAt: { gte: from, lte: to } },
                { grant_started_at: { gte: from, lte: to } },
              ],
            }
          : {}),
      },
    });
  }

  async listContactRequests(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityContactRequest[]> {
    return prisma.contact_request.findMany({
      orderBy: { createdAt: "desc" },
      select: contactRequestSelect,
      where: {
        ...createdAtBetween(from, to),
        channel: "whatsapp",
        deleted: false,
        psychologist_id: psychologistUserId,
      },
    });
  }

  async listReviews(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityReview[]> {
    return prisma.professional_review.findMany({
      orderBy: { createdAt: "desc" },
      select: reviewSelect,
      where: {
        author: {
          active: true,
          deleted: false,
        },
        deleted: false,
        psychologist_id: psychologistUserId,
        ...(from && to
          ? {
              OR: [{ createdAt: { gte: from, lte: to } }, { responded_at: { gte: from, lte: to } }],
            }
          : {}),
      },
    });
  }

  async listReports(
    psychologistUserId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPsychologistActivityReport[]> {
    return prisma.post_report.findMany({
      orderBy: { createdAt: "desc" },
      select: reportSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        OR: [
          {
            reply_id: null,
            target_type: "post",
            post: {
              author_id: psychologistUserId,
              deleted: false,
              status: "publicado",
              community: { deleted: false },
            },
          },
          {
            reply_id: { not: null },
            reply: {
              author_id: psychologistUserId,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: { deleted: false },
              },
            },
          },
        ],
      },
    });
  }
}
