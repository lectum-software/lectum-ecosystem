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

  async listLocations(): Promise<AdminPatientLocationRecord[]> {
    return prisma.visitor_location.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: latestLocationSelect,
      where: {
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
