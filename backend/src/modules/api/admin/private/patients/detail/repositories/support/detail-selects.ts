import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminPatientDetailDateRange } from "../../DTOs/IAdminPatientDetailDTO";

export const rangeWhere = (range: AdminPatientDetailDateRange) => ({
  gte: range.start,
  lte: range.end,
});

export const communitySelect = {
  avatar_url: true,
  id: true,
  name: true,
  slug: true,
  visual_primary_color: true,
} satisfies Prisma.communitySelect;

export const postSummarySelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  replies_count: true,
  reports: {
    select: {
      id: true,
    },
    where: {
      deleted: false,
    },
  },
  saves_count: true,
  title: true,
  upvotes_count: true,
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

export const patientSelect = {
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
      createdAt: true,
      gender: true,
      id: true,
      onboarding_completed_at: true,
      state: true,
      updatedAt: true,
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

export const voteSelect = {
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

export const postSaveSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
} satisfies Prisma.post_saveSelect;

export type AdminPatientDetailPostSaveRecord = Prisma.post_saveGetPayload<{
  select: typeof postSaveSelect;
}>;

export const replySaveSelect = {
  createdAt: true,
  id: true,
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_reply_saveSelect;

export type AdminPatientDetailReplySaveRecord = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveSelect;
}>;

export const memberSelect = {
  createdAt: true,
  id: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_memberSelect;

export type AdminPatientDetailMemberRecord = Prisma.community_memberGetPayload<{
  select: typeof memberSelect;
}>;

export const reviewSelect = {
  createdAt: true,
  id: true,
  rating: true,
  status: true,
} satisfies Prisma.professional_reviewSelect;

export type AdminPatientDetailReviewRecord = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

export const psychologistVerificationProfileSelect = {
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

export const responseAuthorSelect = {
  id: true,
  psychologist_profile: {
    select: psychologistVerificationProfileSelect,
  },
  role: true,
} satisfies Prisma.userSelect;

export const responseReceivedSelect = {
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

export const postSaveReceivedSelect = {
  createdAt: true,
  id: true,
  post: {
    select: postSummarySelect,
  },
} satisfies Prisma.post_saveSelect;

export type AdminPatientDetailPostSaveReceivedRecord = Prisma.post_saveGetPayload<{
  select: typeof postSaveReceivedSelect;
}>;

export const replySaveReceivedSelect = {
  createdAt: true,
  id: true,
  reply: {
    select: replySummarySelect,
  },
} satisfies Prisma.post_reply_saveSelect;

export type AdminPatientDetailReplySaveReceivedRecord = Prisma.post_reply_saveGetPayload<{
  select: typeof replySaveReceivedSelect;
}>;

export const shareReceivedSelect = {
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

export const reportReceivedSelect = {
  createdAt: true,
  id: true,
} satisfies Prisma.post_reportSelect;

export type AdminPatientDetailReportReceivedRecord = Prisma.post_reportGetPayload<{
  select: typeof reportReceivedSelect;
}>;

export const patientPlatformPageViewSelect = {
  duration_seconds: true,
  id: true,
  normalized_path: true,
  occurred_at: true,
  page_kind: true,
  path: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.page_view_eventSelect;

export type AdminPatientDetailPlatformPageViewRecord = Prisma.page_view_eventGetPayload<{
  select: typeof patientPlatformPageViewSelect;
}>;

export const patientPlatformSessionSelect = {
  device_type: true,
  first_seen_at: true,
  last_seen_at: true,
  os: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

export type AdminPatientDetailPlatformSessionRecord = Prisma.visitor_sessionGetPayload<{
  select: typeof patientPlatformSessionSelect;
}>;

export const patientPlatformPwaInstallSelect = {
  occurred_at: true,
  user_id: true,
} satisfies Prisma.important_action_eventSelect;

export type AdminPatientDetailPwaInstallRecord = Prisma.important_action_eventGetPayload<{
  select: typeof patientPlatformPwaInstallSelect;
}>;

export const patientIntentProfileViewSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
} satisfies Prisma.profile_view_eventSelect;

export type AdminPatientIntentProfileViewRecord = Prisma.profile_view_eventGetPayload<{
  select: typeof patientIntentProfileViewSelect;
}>;

export const patientIntentFavoriteSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
} satisfies Prisma.psychologist_favoriteSelect;

export type AdminPatientIntentFavoriteRecord = Prisma.psychologist_favoriteGetPayload<{
  select: typeof patientIntentFavoriteSelect;
}>;

export const patientIntentWhatsappClickSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
} satisfies Prisma.contact_requestSelect;

export type AdminPatientIntentWhatsappClickRecord = Prisma.contact_requestGetPayload<{
  select: typeof patientIntentWhatsappClickSelect;
}>;
