import type { Prisma } from "@/external/generated/prisma/client";

export const psychologistSelect = {
  cover_image_url: true,
  id: true,
  user_id: true,
  video_cover_url: true,
  video_url: true,
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

export const communitySelect = {
  avatar_url: true,
  id: true,
  name: true,
  slug: true,
  visual_primary_color: true,
} satisfies Prisma.communitySelect;

export const platformSessionSelect = {
  device_type: true,
  first_seen_at: true,
  last_seen_at: true,
  os: true,
  session_id: true,
  user_id: true,
} satisfies Prisma.visitor_sessionSelect;

export const postSelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  replies_count: true,
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  saves_count: true,
  title: true,
  upvotes_count: true,
  community: {
    select: communitySelect,
  },
  media_items: {
    orderBy: {
      position: "asc",
    },
    select: {
      media_type: true,
      media_url: true,
      position: true,
    },
    where: {
      deleted: false,
    },
  },
} satisfies Prisma.community_postSelect;

export const coveragePatientPostSelect = {
  createdAt: true,
  id: true,
  community: {
    select: communitySelect,
  },
} satisfies Prisma.community_postSelect;

export const replySelect = {
  content: true,
  createdAt: true,
  downvotes_count: true,
  id: true,
  media_type: true,
  media_url: true,
  parent_reply_id: true,
  reports: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
  },
  title: true,
  upvotes_count: true,
  post: {
    select: {
      createdAt: true,
      id: true,
      title: true,
      author: {
        select: {
          id: true,
          role: true,
        },
      },
      community: {
        select: communitySelect,
      },
    },
  },
} satisfies Prisma.post_replySelect;

export const PROFILE_PAGE_SOURCE = "profile_page";

export const SEARCH_RESULT_SOURCE = "search_result";

export const PROFILE_VIDEO_ACTION_TYPES = [
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
] as const;

export type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];

export type AdminPsychologistEngagementProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistPlatformSessionRecord = Prisma.visitor_sessionGetPayload<{
  select: typeof platformSessionSelect;
}>;

export type AdminPsychologistEngagementPost = Prisma.community_postGetPayload<{
  select: typeof postSelect;
}>;

export type AdminPsychologistCoveragePatientPost = Prisma.community_postGetPayload<{
  select: typeof coveragePatientPostSelect;
}>;

export type AdminPsychologistEngagementReply = Prisma.post_replyGetPayload<{
  select: typeof replySelect;
}>;

export type CountByDateRecord = { createdAt: Date };
