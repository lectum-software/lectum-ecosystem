import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
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
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

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

export type AdminPatientIntentProfileViewRecord = Prisma.profile_view_eventGetPayload<{
  select: typeof patientIntentProfileViewSelect;
}>;

export type AdminPatientIntentFavoriteRecord = Prisma.psychologist_favoriteGetPayload<{
  select: typeof patientIntentFavoriteSelect;
}>;

export type AdminPatientIntentWhatsappClickRecord = Prisma.contact_requestGetPayload<{
  select: typeof patientIntentWhatsappClickSelect;
}>;

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
