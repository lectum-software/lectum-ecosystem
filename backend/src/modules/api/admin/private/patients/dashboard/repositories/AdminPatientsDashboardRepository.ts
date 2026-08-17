import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE } from "@/modules/api/public/analytics/helpers/signup-identity";
import type { AdminPatientsDashboardDateRange } from "../DTOs/IAdminPatientsDashboardDTO";

import {
  type AdminPatientAnonymousConversionPageViewRecord,
  type AdminPatientAnonymousConversionSessionRecord,
  type AdminPatientCommunityEngagementEventRecord,
  type AdminPatientDeletedAccountRecord,
  type AdminPatientLocationRecord,
  type AdminPatientPageViewRecord,
  type AdminPatientPlatformSessionRecord,
  type AdminPatientPwaInstallRecord,
  type AdminPatientRecentRecord,
  type AdminPatientSignupAnalyticsIdentityRecord,
  type AdminPatientSnapshotRecord,
  patientAnonymousConversionPageViewSelect,
  patientAnonymousConversionSessionSelect,
  patientDeletedAccountSelect,
  patientIntentFavoriteSelect,
  patientIntentProfileViewSelect,
  patientIntentWhatsappClickSelect,
  patientPageViewSelect,
  patientPlatformSessionSelect,
  patientPwaInstallSelect,
  patientSignupAnalyticsIdentitySelect,
  patientSnapshotSelect,
  rangeWhere,
  recentPatientSelect,
} from "./support/dashboard-selects";

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

  async listDeletedPatientAccounts(): Promise<AdminPatientDeletedAccountRecord[]> {
    return prisma.user.findMany({
      orderBy: {
        deletedAt: "desc",
      },
      select: patientDeletedAccountSelect,
      where: {
        account_status: "deleted",
        deleted: true,
        deletedAt: {
          not: null,
        },
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
    const profiles = await prisma.patient_profile.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        city: true,
        state: true,
        updatedAt: true,
        user_id: true,
      },
      where: {
        deleted: false,
        user: {
          createdAt: {
            lte: range.end,
          },
          deleted: false,
          role: "paciente",
        },
      },
    });

    return profiles.map((profile) => {
      const hasLocation = Boolean(profile.city?.trim() && profile.state?.trim());

      return {
        city: hasLocation ? profile.city : null,
        country: hasLocation ? "BR" : null,
        state: hasLocation ? profile.state : null,
        updatedAt: hasLocation ? profile.updatedAt : null,
        user_id: profile.user_id,
      };
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

export type {
  AdminPatientAnonymousConversionPageViewRecord,
  AdminPatientAnonymousConversionSessionRecord,
  AdminPatientCommunityEngagementEventRecord,
  AdminPatientDeletedAccountRecord,
  AdminPatientIntentFavoriteRecord,
  AdminPatientIntentProfileViewRecord,
  AdminPatientIntentWhatsappClickRecord,
  AdminPatientLocationRecord,
  AdminPatientPageViewRecord,
  AdminPatientPlatformSessionRecord,
  AdminPatientPwaInstallRecord,
  AdminPatientRecentRecord,
  AdminPatientSignupAnalyticsIdentityRecord,
  AdminPatientSnapshotRecord,
} from "./support/dashboard-selects";
