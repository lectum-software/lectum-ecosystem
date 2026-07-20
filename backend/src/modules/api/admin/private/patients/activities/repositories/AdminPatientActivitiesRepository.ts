import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const actorSelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.userSelect;

const patientSelect = {
  active: true,
  createdAt: true,
  id: true,
  name: true,
  role: true,
  patient_profile: {
    select: {
      createdAt: true,
      deleted: true,
      id: true,
      onboarding_completed_at: true,
      updatedAt: true,
      user_id: true,
    },
  },
} satisfies Prisma.userSelect;

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

const memberSelect = {
  createdAt: true,
  id: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_memberSelect;

const reviewSelect = {
  createdAt: true,
  id: true,
  rating: true,
  status: true,
  psychologist: {
    select: actorSelect,
  },
} satisfies Prisma.professional_reviewSelect;

const adminActivityLogSelect = {
  action: true,
  area: true,
  changed_fields: true,
  createdAt: true,
  id: true,
  reason: true,
  source: true,
  admin: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.admin_activity_logSelect;

const createdAtBetween = (from: Date | null, to: Date | null) =>
  from && to ? { createdAt: { gte: from, lte: to } } : {};

const publishedPostWhere = {
  deleted: false,
  status: "publicado",
} satisfies Prisma.community_postWhereInput;

export type AdminPatientActivitiesProfile = Prisma.userGetPayload<{
  select: typeof patientSelect;
}>;

export type AdminPatientActivityPost = Prisma.community_postGetPayload<{
  select: typeof postSummarySelect;
}>;

export type AdminPatientActivityReply = Prisma.post_replyGetPayload<{
  select: typeof replySummarySelect;
}>;

export type AdminPatientActivityVote = Prisma.post_voteGetPayload<{
  select: typeof voteSelect;
}>;

export type AdminPatientActivityPostSave = Prisma.post_saveGetPayload<{
  select: typeof postSaveSelect;
}>;

export type AdminPatientActivityReplySave = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveSelect;
}>;

export type AdminPatientActivityMember = Prisma.community_memberGetPayload<{
  select: typeof memberSelect;
}>;

export type AdminPatientActivityReview = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

export type AdminPatientActivityAdminLog = Prisma.admin_activity_logGetPayload<{
  select: typeof adminActivityLogSelect;
}>;

export class AdminPatientActivitiesRepository {
  async findPatient(id: string): Promise<AdminPatientActivitiesProfile | null> {
    return prisma.user.findFirst({
      select: patientSelect,
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
    });
  }

  async listAuthoredPosts(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityPost[]> {
    return prisma.community_post.findMany({
      orderBy: { createdAt: "desc" },
      select: postSummarySelect,
      where: {
        ...createdAtBetween(from, to),
        ...publishedPostWhere,
        author_id: patientId,
        community: { deleted: false },
      },
    });
  }

  async listAuthoredReplies(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityReply[]> {
    return prisma.post_reply.findMany({
      orderBy: { createdAt: "desc" },
      select: replySummarySelect,
      where: {
        ...createdAtBetween(from, to),
        author_id: patientId,
        deleted: false,
        post: {
          ...publishedPostWhere,
          community: { deleted: false },
        },
      },
    });
  }

  async listVotesMade(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityVote[]> {
    return prisma.post_vote.findMany({
      orderBy: { createdAt: "desc" },
      select: voteSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: patientId,
        OR: [
          {
            post: {
              ...publishedPostWhere,
              community: { deleted: false },
            },
          },
          {
            reply: {
              deleted: false,
              post: {
                ...publishedPostWhere,
                community: { deleted: false },
              },
            },
          },
        ],
      },
    });
  }

  async listPostSaves(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityPostSave[]> {
    return prisma.post_save.findMany({
      orderBy: { createdAt: "desc" },
      select: postSaveSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: patientId,
        post: {
          ...publishedPostWhere,
          community: { deleted: false },
        },
      },
    });
  }

  async listReplySaves(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityReplySave[]> {
    return prisma.post_reply_save.findMany({
      orderBy: { createdAt: "desc" },
      select: replySaveSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: patientId,
        reply: {
          deleted: false,
          post: {
            ...publishedPostWhere,
            community: { deleted: false },
          },
        },
      },
    });
  }

  async listMemberships(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityMember[]> {
    return prisma.community_member.findMany({
      orderBy: { createdAt: "desc" },
      select: memberSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        user_id: patientId,
        community: { deleted: false },
      },
    });
  }

  async listReviews(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityReview[]> {
    return prisma.professional_review.findMany({
      orderBy: { createdAt: "desc" },
      select: reviewSelect,
      where: {
        ...createdAtBetween(from, to),
        author_id: patientId,
        deleted: false,
        status: "publicada",
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listAdminActivityLogs(
    targetIds: string[],
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientActivityAdminLog[]> {
    return prisma.admin_activity_log.findMany({
      orderBy: { createdAt: "desc" },
      select: adminActivityLogSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        target_id: { in: targetIds },
        target_type: "patient",
      },
    });
  }
}
