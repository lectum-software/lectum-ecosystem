import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const patientIntentProfileViewSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  viewer_id: true,
} satisfies Prisma.profile_view_eventSelect;

const patientIntentFavoriteSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.psychologist_favoriteSelect;

const patientIntentWhatsappClickSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.contact_requestSelect;

const patientListSelect = {
  active: true,
  avatar: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  provider: true,
  patient_profile: {
    select: {
      city: true,
      gender: true,
      onboarding_completed_at: true,
      state: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.userSelect;

export type AdminPatientListRecord = Prisma.userGetPayload<{
  select: typeof patientListSelect;
}>;

export type AdminPatientListCommunityEngagementEventRecord = {
  createdAt: Date;
  patient_id: string;
  type: "post" | "post_save" | "reply" | "reply_save" | "vote";
};

export class AdminPatientsListRepository {
  async listPatients(): Promise<AdminPatientListRecord[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: patientListSelect,
      where: {
        deleted: false,
        role: "paciente",
      },
    });
  }

  async listIntentSignals(patientIds: string[]) {
    if (patientIds.length === 0) {
      return {
        favorites: [],
        profileViews: [],
        whatsappClicks: [],
      };
    }

    const profileViews = await prisma.profile_view_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentProfileViewSelect,
      where: {
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        source: "profile_page",
        viewer: {
          deleted: false,
          role: "paciente",
        },
        viewer_id: {
          in: patientIds,
        },
      },
    });
    const favorites = await prisma.psychologist_favorite.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentFavoriteSelect,
      where: {
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        user: {
          deleted: false,
          role: "paciente",
        },
        user_id: {
          in: patientIds,
        },
      },
    });
    const whatsappClicks = await prisma.contact_request.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentWhatsappClickSelect,
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        user: {
          deleted: false,
          role: "paciente",
        },
        user_id: {
          in: patientIds,
        },
      },
    });

    return {
      favorites,
      profileViews,
      whatsappClicks,
    };
  }

  async listCommunityEngagementEvents(
    patientIds: string[],
  ): Promise<AdminPatientListCommunityEngagementEventRecord[]> {
    if (patientIds.length === 0) return [];

    const publishedPostWhere = {
      community: {
        deleted: false,
      },
      deleted: false,
      status: "publicado",
    } satisfies Prisma.community_postWhereInput;

    const [posts, replies, votes, postSaves, replySaves] = await Promise.all([
      prisma.community_post.findMany({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          author_id: true,
          createdAt: true,
        },
        where: {
          ...publishedPostWhere,
          author: {
            deleted: false,
            role: "paciente",
          },
          author_id: {
            in: patientIds,
          },
        },
      }),
      prisma.post_reply.findMany({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          author_id: true,
          createdAt: true,
        },
        where: {
          author: {
            deleted: false,
            role: "paciente",
          },
          author_id: {
            in: patientIds,
          },
          deleted: false,
          post: publishedPostWhere,
        },
      }),
      prisma.post_vote.findMany({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          user_id: true,
        },
        where: {
          deleted: false,
          OR: [
            {
              post: publishedPostWhere,
            },
            {
              reply: {
                deleted: false,
                post: publishedPostWhere,
              },
            },
          ],
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
          value: {
            in: [1, -1],
          },
        },
      }),
      prisma.post_save.findMany({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          user_id: true,
        },
        where: {
          deleted: false,
          post: publishedPostWhere,
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
      prisma.post_reply_save.findMany({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
          user_id: true,
        },
        where: {
          deleted: false,
          reply: {
            deleted: false,
            post: publishedPostWhere,
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
    ]);

    return [
      ...posts.map((post) => ({
        createdAt: post.createdAt,
        patient_id: post.author_id,
        type: "post" as const,
      })),
      ...replies.map((reply) => ({
        createdAt: reply.createdAt,
        patient_id: reply.author_id,
        type: "reply" as const,
      })),
      ...votes.map((vote) => ({
        createdAt: vote.createdAt,
        patient_id: vote.user_id,
        type: "vote" as const,
      })),
      ...postSaves.map((save) => ({
        createdAt: save.createdAt,
        patient_id: save.user_id,
        type: "post_save" as const,
      })),
      ...replySaves.map((save) => ({
        createdAt: save.createdAt,
        patient_id: save.user_id,
        type: "reply_save" as const,
      })),
    ].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }
}
