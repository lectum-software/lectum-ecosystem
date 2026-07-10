import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const psychologistSelect = {
  id: true,
  user_id: true,
  user: {
    select: {
      active: true,
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const reviewSelect = {
  author: {
    select: {
      avatar: true,
      id: true,
      name: true,
      role: true,
    },
  },
  comment: true,
  createdAt: true,
  id: true,
  rating: true,
  response: true,
  responded_at: true,
  status: true,
} satisfies Prisma.professional_reviewSelect;

const communitySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

const reportSelect = {
  createdAt: true,
  description: true,
  id: true,
  reason: true,
  status: true,
  target_id: true,
  target_type: true,
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
    select: {
      role: true,
    },
  },
} satisfies Prisma.post_reportSelect;

export type AdminPsychologistFeedbackProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistReviewRecord = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

export type AdminPsychologistReportRecord = Prisma.post_reportGetPayload<{
  select: typeof reportSelect;
}>;

export class AdminPsychologistFeedbackRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistFeedbackProfile | null> {
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

  async listReviews(psychologistId: string): Promise<AdminPsychologistReviewRecord[]> {
    return prisma.professional_review.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: reviewSelect,
      where: {
        author: {
          active: true,
          deleted: false,
        },
        deleted: false,
        psychologist_id: psychologistId,
      },
    });
  }

  async listReports(
    psychologistId: string,
    from: Date,
    to: Date,
  ): Promise<AdminPsychologistReportRecord[]> {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: reportSelect,
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
        deleted: false,
        OR: [
          {
            reply_id: null,
            target_type: "post",
            post: {
              author_id: psychologistId,
              deleted: false,
              status: "publicado",
              community: {
                deleted: false,
              },
            },
          },
          {
            reply_id: {
              not: null,
            },
            reply: {
              author_id: psychologistId,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  deleted: false,
                },
              },
            },
          },
        ],
      },
    });
  }
}
