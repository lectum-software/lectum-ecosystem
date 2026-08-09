import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalCourtesyEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminModerationEventsQuery } from "../../DTOs/IAdminModerationDTO";

export const adminModerationEventSelect = {
  id: true,
  createdAt: true,
  target_type: true,
  target_id: true,
  community_id: true,
  author_id: true,
  decision: true,
  categories: true,
  severity: true,
  status: true,
  reason_code: true,
  matched_rules: true,
  title_snapshot: true,
  content_excerpt: true,
  reviewed_at: true,
  resolved_at: true,
  community: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      psychologist_profile: {
        select: {
          cfp_verified_at: true,
          crp_status: true,
          gender: true,
          professional_first_name: true,
          professional_last_name: true,
          subscriptions: {
            select: {
              id: true,
              source: true,
            },
            where: activeProfessionalCourtesyEntitlementWhere(),
          },
        },
      },
      role: true,
    },
  },
} satisfies Prisma.content_moderation_eventSelect;

export const adminModerationEventDetailSelect = {
  ...adminModerationEventSelect,
  admin_note: true,
  content_snapshot: true,
  reviewed_by_admin_id: true,
} satisfies Prisma.content_moderation_eventSelect;

const adminModerationCommunitySelect = {
  deleted: true,
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

const adminModerationUserSelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.userSelect;

const adminModerationReportUserSelect = {
  avatar: true,
  id: true,
  name: true,
  psychologist_profile: {
    select: {
      cfp_verified_at: true,
      crp_status: true,
      gender: true,
      professional_first_name: true,
      professional_last_name: true,
      subscriptions: {
        select: {
          id: true,
          source: true,
        },
        where: activeProfessionalCourtesyEntitlementWhere(),
      },
    },
  },
  role: true,
} satisfies Prisma.userSelect;

const adminModerationCatalogRelationCountSelect = {
  id: true,
} as const;

export const adminPostReportSelect = {
  createdAt: true,
  deleted: true,
  deletedAt: true,
  description: true,
  id: true,
  post_id: true,
  reason: true,
  reply_id: true,
  status: true,
  target_id: true,
  target_type: true,
  post: {
    select: {
      author: {
        select: adminModerationReportUserSelect,
      },
      author_id: true,
      community: {
        select: adminModerationCommunitySelect,
      },
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          media_type: true,
          media_url: true,
          position: true,
        },
        where: {
          deleted: false,
        },
      },
      media_type: true,
      media_url: true,
      replies_count: true,
      status: true,
      title: true,
    },
  },
  reply: {
    select: {
      author: {
        select: adminModerationReportUserSelect,
      },
      author_id: true,
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_type: true,
      media_url: true,
      parent_reply_id: true,
      post: {
        select: {
          community: {
            select: adminModerationCommunitySelect,
          },
          deleted: true,
          deletedAt: true,
          id: true,
          replies_count: true,
          status: true,
          title: true,
        },
      },
      post_id: true,
      title: true,
    },
  },
  reporter: {
    select: adminModerationUserSelect,
  },
} satisfies Prisma.post_reportSelect;

export const adminUncoveredPatientPostSelect = {
  author: {
    select: adminModerationUserSelect,
  },
  community: {
    select: adminModerationCommunitySelect,
  },
  content: true,
  createdAt: true,
  id: true,
  replies_count: true,
  title: true,
} satisfies Prisma.community_postSelect;

export const adminOperationalPsychologistSelect = {
  bio: true,
  birthdate: true,
  cfp_verified_at: true,
  cpf: true,
  createdAt: true,
  crp: true,
  crp_status: true,
  gender: true,
  headline: true,
  id: true,
  modality: true,
  professional_address_city: true,
  professional_address_state: true,
  professional_first_name: true,
  professional_last_name: true,
  published: true,
  target_audience: true,
  updatedAt: true,
  user_id: true,
  video_url: true,
  whatsapp: true,
  subscriptions: {
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      current_period_end: true,
      grant_started_at: true,
      id: true,
      plan: {
        select: {
          name: true,
          slug: true,
        },
      },
      source: true,
      status: true,
    },
    where: {
      deleted: false,
      plan: {
        active: true,
        deleted: false,
      },
      status: "ativa",
    },
  },
  user: {
    select: {
      active: true,
      email: true,
      id: true,
      name: true,
      role: true,
      psychologist_approaches: {
        select: adminModerationCatalogRelationCountSelect,
        where: {
          approach: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
      },
      psychologist_services: {
        select: adminModerationCatalogRelationCountSelect,
        where: {
          deleted: false,
          service: {
            active: true,
            deleted: false,
          },
        },
      },
      psychologist_specialties: {
        select: adminModerationCatalogRelationCountSelect,
        where: {
          deleted: false,
          specialty: {
            active: true,
            deleted: false,
          },
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileSelect;

export const adminRegistrationFailureUserSelect = {
  account_status: true,
  active: true,
  confirmed: true,
  confirmed_date: true,
  confirm_date: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  provider: true,
  role: true,
} satisfies Prisma.userSelect;

export const adminPatientCommunityPostEngagementSelect = {
  author_id: true,
  community_id: true,
  createdAt: true,
} satisfies Prisma.community_postSelect;

export const adminPatientCommunityReplyEngagementSelect = {
  author_id: true,
  createdAt: true,
  post: {
    select: {
      community_id: true,
    },
  },
} satisfies Prisma.post_replySelect;

export const adminPatientCommunityVoteEngagementSelect = {
  createdAt: true,
  post: {
    select: {
      community_id: true,
    },
  },
  reply: {
    select: {
      post: {
        select: {
          community_id: true,
        },
      },
    },
  },
  user_id: true,
} satisfies Prisma.post_voteSelect;

export const adminPatientCommunityPostSaveEngagementSelect = {
  createdAt: true,
  post: {
    select: {
      community_id: true,
    },
  },
  user_id: true,
} satisfies Prisma.post_saveSelect;

export const adminPatientCommunityReplySaveEngagementSelect = {
  createdAt: true,
  reply: {
    select: {
      post: {
        select: {
          community_id: true,
        },
      },
    },
  },
  user_id: true,
} satisfies Prisma.post_reply_saveSelect;

export const adminPatientCommunityShareEngagementSelect = {
  createdAt: true,
  post: {
    select: {
      community_id: true,
    },
  },
  user_id: true,
} satisfies Prisma.post_shareSelect;

export type AdminModerationEventRecord = Prisma.content_moderation_eventGetPayload<{
  select: typeof adminModerationEventSelect;
}>;

export type AdminModerationEventDetailRecord = Prisma.content_moderation_eventGetPayload<{
  select: typeof adminModerationEventDetailSelect;
}>;

export type AdminPostReportRecord = Prisma.post_reportGetPayload<{
  select: typeof adminPostReportSelect;
}>;

export type AdminUncoveredPatientPostRecord = Prisma.community_postGetPayload<{
  select: typeof adminUncoveredPatientPostSelect;
}>;

export type AdminOperationalPsychologistRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof adminOperationalPsychologistSelect;
}>;

export type AdminRegistrationFailureUserRecord = Prisma.userGetPayload<{
  select: typeof adminRegistrationFailureUserSelect;
}>;

export type AdminPsychologistMetricCountRecord = {
  _count: {
    _all: number;
  };
  psychologist_id: string;
};

export type AdminPatientCommunityEngagementTarget = {
  communityId: string;
  userId: string;
};

export type AdminPatientCommunityPostEngagementRecord = Prisma.community_postGetPayload<{
  select: typeof adminPatientCommunityPostEngagementSelect;
}>;

export type AdminPatientCommunityReplyEngagementRecord = Prisma.post_replyGetPayload<{
  select: typeof adminPatientCommunityReplyEngagementSelect;
}>;

export type AdminPatientCommunityVoteEngagementRecord = Prisma.post_voteGetPayload<{
  select: typeof adminPatientCommunityVoteEngagementSelect;
}>;

export type AdminPatientCommunityPostSaveEngagementRecord = Prisma.post_saveGetPayload<{
  select: typeof adminPatientCommunityPostSaveEngagementSelect;
}>;

export type AdminPatientCommunityReplySaveEngagementRecord = Prisma.post_reply_saveGetPayload<{
  select: typeof adminPatientCommunityReplySaveEngagementSelect;
}>;

export type AdminPatientCommunityShareEngagementRecord = Prisma.post_shareGetPayload<{
  select: typeof adminPatientCommunityShareEngagementSelect;
}>;

export type AdminPatientCommunityEngagementSignals = {
  postSaves: AdminPatientCommunityPostSaveEngagementRecord[];
  posts: AdminPatientCommunityPostEngagementRecord[];
  replies: AdminPatientCommunityReplyEngagementRecord[];
  replySaves: AdminPatientCommunityReplySaveEngagementRecord[];
  shares: AdminPatientCommunityShareEngagementRecord[];
  votes: AdminPatientCommunityVoteEngagementRecord[];
};

export type ReplyTargetRecord = {
  id: string;
  post_id: string;
  post: {
    community: {
      slug: string;
    };
  };
};

export interface IAdminModerationRepository {
  countPending(): Promise<number>;
  countPendingPostReports(): Promise<number>;
  countRegistrationFailureUsers(): Promise<number>;
  countUrgentPending(): Promise<number>;
  countUncoveredPatientPosts(cutoff: Date): Promise<number>;
  findEvent(id: string): Promise<AdminModerationEventDetailRecord | null>;
  findPostReport(id: string): Promise<AdminPostReportRecord | null>;
  listOperationalPsychologistProfiles(): Promise<AdminOperationalPsychologistRecord[]>;
  listEvents(query: AdminModerationEventsQuery): Promise<AdminModerationEventRecord[]>;
  listLatestPending(limit: number): Promise<AdminModerationEventRecord[]>;
  listPendingPostReports(limit?: number): Promise<AdminPostReportRecord[]>;
  listPostReports(limit?: number): Promise<AdminPostReportRecord[]>;
  listPatientCommunityEngagementSignals(
    targets: AdminPatientCommunityEngagementTarget[],
  ): Promise<AdminPatientCommunityEngagementSignals>;
  listRegistrationFailureUsers(limit?: number): Promise<AdminRegistrationFailureUserRecord[]>;
  listReplyTargets(replyIds: string[]): Promise<ReplyTargetRecord[]>;
  listUncoveredPatientPosts(
    cutoff: Date,
    limit?: number,
  ): Promise<AdminUncoveredPatientPostRecord[]>;
  markReviewing(id: string, adminId: string): Promise<AdminModerationEventDetailRecord | null>;
  countProfileViewsByPsychologist(
    psychologistIds: string[],
  ): Promise<AdminPsychologistMetricCountRecord[]>;
  countWhatsappClicksByPsychologist(
    psychologistIds: string[],
  ): Promise<AdminPsychologistMetricCountRecord[]>;
  resolveEvent(
    id: string,
    input: { adminId: string; note: string },
  ): Promise<AdminModerationEventDetailRecord | null>;
}
