import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE } from "@/modules/api/public/analytics/helpers/signup-identity";
import type { AdminPatientsDashboardDateRange } from "../DTOs/IAdminPatientsDashboardDTO";

const rangeWhere = (range: AdminPatientsDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const patientProfileSelect = {
  createdAt: true,
  gender: true,
  id: true,
  onboarding_completed_at: true,
} satisfies Prisma.patient_profileSelect;

const patientSnapshotSelect = {
  active: true,
  createdAt: true,
  id: true,
  provider: true,
  patient_profile: {
    select: patientProfileSelect,
  },
} satisfies Prisma.userSelect;

const communitySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

const postSummarySelect = {
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
  id: true,
  state: true,
  user_id: true,
} satisfies Prisma.visitor_locationSelect;

const patientPageViewSelect = {
  duration_seconds: true,
  id: true,
  normalized_path: true,
  occurred_at: true,
  page_kind: true,
  path: true,
  session_id: true,
  user_id: true,
  visitor_id: true,
} satisfies Prisma.page_view_eventSelect;

const patientPwaInstallSelect = {
  occurred_at: true,
  user_id: true,
} satisfies Prisma.important_action_eventSelect;

const patientPlatformSessionSelect = {
  device_type: true,
  os: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

const patientAnonymousConversionPageViewSelect = {
  normalized_path: true,
  occurred_at: true,
  page_kind: true,
  path: true,
  session_id: true,
  user_id: true,
  user: {
    select: {
      createdAt: true,
      id: true,
      role: true,
    },
  },
  visitor_id: true,
} satisfies Prisma.page_view_eventSelect;

const patientAnonymousConversionSessionSelect = {
  first_seen_at: true,
  last_seen_at: true,
  session_id: true,
  user_id: true,
  user: {
    select: {
      createdAt: true,
      id: true,
      role: true,
    },
  },
  visitor_id: true,
} satisfies Prisma.visitor_sessionSelect;

const patientSignupAnalyticsIdentitySelect = {
  createdAt: true,
  data: true,
  user_id: true,
} satisfies Prisma.user_backgroundSelect;

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

const recentPatientSelect = {
  active: true,
  avatar: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  provider: true,
  patient_profile: {
    select: patientProfileSelect,
  },
  visitor_locations: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
    },
    select: latestLocationSelect,
  },
  community_members: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      community: {
        deleted: false,
      },
      deleted: false,
    },
    select: {
      createdAt: true,
      id: true,
      community: {
        select: communitySelect,
      },
    },
  },
  community_posts: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      community: {
        deleted: false,
      },
      deleted: false,
      status: "publicado",
    },
    select: postSummarySelect,
  },
  post_replies: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
      post: {
        community: {
          deleted: false,
        },
        deleted: false,
        status: "publicado",
      },
    },
    select: replySummarySelect,
  },
  post_votes: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
    },
    select: {
      createdAt: true,
      id: true,
      value: true,
      post: {
        select: postSummarySelect,
      },
      reply: {
        select: replySummarySelect,
      },
    },
  },
  post_saves: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
      post: {
        community: {
          deleted: false,
        },
        deleted: false,
        status: "publicado",
      },
    },
    select: {
      createdAt: true,
      id: true,
      post: {
        select: postSummarySelect,
      },
    },
  },
  post_reply_saves: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
      reply: {
        deleted: false,
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    },
    select: {
      createdAt: true,
      id: true,
      reply: {
        select: replySummarySelect,
      },
    },
  },
} satisfies Prisma.userSelect;

export type AdminPatientSnapshotRecord = Prisma.userGetPayload<{
  select: typeof patientSnapshotSelect;
}>;

export type AdminPatientRecentRecord = Prisma.userGetPayload<{
  select: typeof recentPatientSelect;
}>;

export type AdminPatientLocationRecord = Prisma.visitor_locationGetPayload<{
  select: typeof latestLocationSelect;
}>;

export type AdminPatientPageViewRecord = Prisma.page_view_eventGetPayload<{
  select: typeof patientPageViewSelect;
}>;

export type AdminPatientPwaInstallRecord = Prisma.important_action_eventGetPayload<{
  select: typeof patientPwaInstallSelect;
}>;

export type AdminPatientPlatformSessionRecord = Prisma.visitor_sessionGetPayload<{
  select: typeof patientPlatformSessionSelect;
}>;

export type AdminPatientAnonymousConversionPageViewRecord = Prisma.page_view_eventGetPayload<{
  select: typeof patientAnonymousConversionPageViewSelect;
}>;

export type AdminPatientAnonymousConversionSessionRecord = Prisma.visitor_sessionGetPayload<{
  select: typeof patientAnonymousConversionSessionSelect;
}>;

export type AdminPatientSignupAnalyticsIdentityRecord = Prisma.user_backgroundGetPayload<{
  select: typeof patientSignupAnalyticsIdentitySelect;
}>;

export type AdminPatientIntentProfileViewRecord = Prisma.profile_view_eventGetPayload<{
  select: typeof patientIntentProfileViewSelect;
}>;

export type AdminPatientIntentFavoriteRecord = Prisma.psychologist_favoriteGetPayload<{
  select: typeof patientIntentFavoriteSelect;
}>;

export type AdminPatientIntentWhatsappClickRecord = Prisma.contact_requestGetPayload<{
  select: typeof patientIntentWhatsappClickSelect;
}>;

export type AdminPatientCommunityEngagementEventRecord = {
  createdAt: Date;
  patient_id: string;
  type: "post" | "post_save" | "reply" | "reply_save" | "vote";
};

export class AdminPatientsDashboardRepository {
  async listPatientSnapshots(): Promise<AdminPatientSnapshotRecord[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: patientSnapshotSelect,
      where: {
        deleted: false,
        role: "paciente",
      },
    });
  }

  async listRecentPatients(limit = 5): Promise<AdminPatientRecentRecord[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: recentPatientSelect,
      take: limit,
      where: {
        deleted: false,
        role: "paciente",
      },
    });
  }

  async listLocations(
    range: AdminPatientsDashboardDateRange,
  ): Promise<AdminPatientLocationRecord[]> {
    return prisma.visitor_location.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: latestLocationSelect,
      where: {
        createdAt: rangeWhere(range),
        deleted: false,
        user_id: {
          not: null,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listPatientPageViews(
    range: AdminPatientsDashboardDateRange,
  ): Promise<AdminPatientPageViewRecord[]> {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientPageViewSelect,
      where: {
        deleted: false,
        occurred_at: rangeWhere(range),
        user_id: {
          not: null,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listPatientPwaInstallActions(
    range: AdminPatientsDashboardDateRange,
  ): Promise<AdminPatientPwaInstallRecord[]> {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientPwaInstallSelect,
      where: {
        action_type: "pwa_installed",
        deleted: false,
        occurred_at: rangeWhere(range),
        user_id: {
          not: null,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listPatientPlatformSessions(
    range: AdminPatientsDashboardDateRange,
  ): Promise<AdminPatientPlatformSessionRecord[]> {
    return prisma.visitor_session.findMany({
      orderBy: {
        last_seen_at: "asc",
      },
      select: patientPlatformSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: range.end,
        },
        last_seen_at: {
          gte: range.start,
        },
        user_id: {
          not: null,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listAnonymousConversionLinkedPageViews(
    patientIds: string[],
  ): Promise<AdminPatientAnonymousConversionPageViewRecord[]> {
    if (patientIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientAnonymousConversionPageViewSelect,
      where: {
        deleted: false,
        user_id: {
          in: patientIds,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listAnonymousConversionLinkedSessions(
    patientIds: string[],
  ): Promise<AdminPatientAnonymousConversionSessionRecord[]> {
    if (patientIds.length === 0) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: patientAnonymousConversionSessionSelect,
      where: {
        deleted: false,
        user_id: {
          in: patientIds,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listAnonymousConversionSignupIdentities(
    patientIds: string[],
  ): Promise<AdminPatientSignupAnalyticsIdentityRecord[]> {
    if (patientIds.length === 0) return [];

    return prisma.user_background.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientSignupAnalyticsIdentitySelect,
      where: {
        deleted: false,
        type: PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE,
        user_id: {
          in: patientIds,
        },
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listAnonymousConversionPageViewsByVisitorIds(
    visitorIds: string[],
    patientIds: string[],
    maxOccurredAt: Date | null,
  ): Promise<AdminPatientAnonymousConversionPageViewRecord[]> {
    if (visitorIds.length === 0 || !maxOccurredAt) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientAnonymousConversionPageViewSelect,
      where: {
        deleted: false,
        occurred_at: {
          lte: maxOccurredAt,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: patientIds,
            },
            user: {
              deleted: false,
              role: "paciente",
            },
          },
        ],
        visitor_id: {
          in: visitorIds,
        },
      },
    });
  }

  async listAnonymousConversionSessionsByVisitorIds(
    visitorIds: string[],
    patientIds: string[],
    maxFirstSeenAt: Date | null,
  ): Promise<AdminPatientAnonymousConversionSessionRecord[]> {
    if (visitorIds.length === 0 || !maxFirstSeenAt) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: patientAnonymousConversionSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: maxFirstSeenAt,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: patientIds,
            },
            user: {
              deleted: false,
              role: "paciente",
            },
          },
        ],
        visitor_id: {
          in: visitorIds,
        },
      },
    });
  }

  async listIntentSignals(range: AdminPatientsDashboardDateRange) {
    const createdAt = rangeWhere(range);

    const profileViews = await prisma.profile_view_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentProfileViewSelect,
      where: {
        createdAt,
        deleted: false,
        source: "profile_page",
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        viewer: {
          deleted: false,
          role: "paciente",
        },
        viewer_id: {
          not: null,
        },
      },
    });
    const favorites = await prisma.psychologist_favorite.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentFavoriteSelect,
      where: {
        createdAt,
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        user: {
          deleted: false,
          role: "paciente",
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
        createdAt,
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
          not: null,
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
    range: AdminPatientsDashboardDateRange,
  ): Promise<AdminPatientCommunityEngagementEventRecord[]> {
    const createdAt = rangeWhere(range);
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
          createdAt,
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
          createdAt,
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
          createdAt,
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
          createdAt,
          deleted: false,
          post: publishedPostWhere,
          user: {
            deleted: false,
            role: "paciente",
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
          createdAt,
          deleted: false,
          reply: {
            deleted: false,
            post: publishedPostWhere,
          },
          user: {
            deleted: false,
            role: "paciente",
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

  async countNewPatients(range: AdminPatientsDashboardDateRange): Promise<number> {
    return prisma.user.count({
      where: {
        createdAt: rangeWhere(range),
        deleted: false,
        role: "paciente",
      },
    });
  }
}
