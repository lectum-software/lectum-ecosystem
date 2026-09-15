import type { Prisma } from "@/external/generated/prisma/client";
import type { AdminPatientsDashboardDateRange } from "../../DTOs/IAdminPatientsDashboardDTO";

export const rangeWhere = (range: AdminPatientsDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

export const patientProfileSelect = {
  city: true,
  createdAt: true,
  gender: true,
  id: true,
  onboarding_completed_at: true,
  state: true,
  updatedAt: true,
} satisfies Prisma.patient_profileSelect;

export const patientSnapshotSelect = {
  active: true,
  createdAt: true,
  id: true,
  provider: true,
  patient_profile: {
    select: patientProfileSelect,
  },
} satisfies Prisma.userSelect;

export const patientDeletedAccountSelect = {
  createdAt: true,
  deletedAt: true,
  id: true,
} satisfies Prisma.userSelect;

export const communitySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

export const postSummarySelect = {
  createdAt: true,
  id: true,
  title: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_postSelect;

export const replySummarySelect = {
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

export const patientPageViewSelect = {
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

export const patientPwaInstallSelect = {
  occurred_at: true,
  user_id: true,
} satisfies Prisma.important_action_eventSelect;

export const patientPlatformSessionSelect = {
  device_type: true,
  os: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

export const patientAnonymousConversionPageViewSelect = {
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

export const patientAnonymousConversionSessionSelect = {
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

export const patientSignupAnalyticsIdentitySelect = {
  createdAt: true,
  data: true,
  user_id: true,
} satisfies Prisma.user_backgroundSelect;

export const patientIntentProfileViewSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  viewer_id: true,
} satisfies Prisma.profile_view_eventSelect;

export const patientIntentFavoriteSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.psychologist_favoriteSelect;

export const patientIntentWhatsappClickSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.contact_requestSelect;

export const recentPatientSelect = {
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

export type AdminPatientDeletedAccountRecord = Prisma.userGetPayload<{
  select: typeof patientDeletedAccountSelect;
}>;

export type AdminPatientRecentRecord = Prisma.userGetPayload<{
  select: typeof recentPatientSelect;
}>;

export type AdminPatientLocationRecord = {
  city: string | null;
  country: "BR" | null;
  state: string | null;
  updatedAt: Date | null;
  user_id: string;
};

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
