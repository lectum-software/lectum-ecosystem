import prisma from "@/infra/database/prisma";
import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";
import type { AdminModerationEventsQuery } from "../../DTOs/IAdminModerationDTO";
import {
  adminModerationEventSelect,
  adminOperationalPsychologistSelect,
  adminPostReportSelect,
  adminRegistrationFailureUserSelect,
  adminUncoveredPatientPostSelect,
} from "../interfaces/IAdminModerationRepository";
import {
  ACTIVE_POST_REPORT_STATUSES,
  ACTIVE_REVIEW_STATUSES,
  buildWhere,
} from "../support/moderation-query";

export class AdminModerationOverviewRepository {
  countPending() {
    return prisma.content_moderation_event.count({
      where: {
        deleted: false,
        status: {
          in: ACTIVE_REVIEW_STATUSES,
        },
      },
    });
  }

  countPendingPostReports() {
    return prisma.post_report.count({
      where: {
        deleted: false,
        status: {
          in: ACTIVE_POST_REPORT_STATUSES,
        },
      },
    });
  }

  countRegistrationFailureUsers() {
    return prisma.user.count({
      where: {
        account_status: "active",
        active: true,
        confirmed: false,
        deleted: false,
        role: {
          in: ["paciente", "psicologo"],
        },
      },
    });
  }

  countUrgentPending() {
    return prisma.content_moderation_event.count({
      where: {
        deleted: false,
        severity: "urgent",
        status: {
          in: ACTIVE_REVIEW_STATUSES,
        },
      },
    });
  }

  countUncoveredPatientPosts(cutoff: Date) {
    return prisma.community_post.count({
      where: {
        author: {
          deleted: false,
          role: "paciente",
        },
        createdAt: {
          lte: cutoff,
        },
        deleted: false,
        replies: {
          none: {
            author: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
            deleted: false,
          },
        },
        status: "publicado",
      },
    });
  }

  listEvents(query: AdminModerationEventsQuery) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminModerationEventSelect,
      where: buildWhere(query),
    });
  }

  listLatestPending(limit: number) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminModerationEventSelect,
      take: limit,
      where: {
        deleted: false,
        status: {
          in: ACTIVE_REVIEW_STATUSES,
        },
      },
    });
  }

  listPendingPostReports(limit?: number) {
    return prisma.post_report.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminPostReportSelect,
      ...(limit ? { take: limit } : {}),
      where: {
        deleted: false,
        status: {
          in: ACTIVE_POST_REPORT_STATUSES,
        },
      },
    });
  }

  listPostReports(limit?: number) {
    return prisma.post_report.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminPostReportSelect,
      ...(limit ? { take: limit } : {}),
      where: {
        deleted: false,
      },
    });
  }

  listRegistrationFailureUsers(limit?: number) {
    return prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminRegistrationFailureUserSelect,
      ...(limit ? { take: limit } : {}),
      where: {
        account_status: "active",
        active: true,
        confirmed: false,
        deleted: false,
        role: {
          in: ["paciente", "psicologo"],
        },
      },
    });
  }

  listUncoveredPatientPosts(cutoff: Date, limit?: number) {
    return prisma.community_post.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminUncoveredPatientPostSelect,
      ...(limit ? { take: limit } : {}),
      where: {
        author: {
          deleted: false,
          role: "paciente",
        },
        createdAt: {
          lte: cutoff,
        },
        deleted: false,
        replies: {
          none: {
            author: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
            deleted: false,
          },
        },
        status: "publicado",
      },
    });
  }

  listOperationalPsychologistProfiles() {
    return prisma.psychologist_profile.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: adminOperationalPsychologistSelect,
      where: {
        deleted: false,
        subscriptions: {
          some: {
            ...activeSubscriptionPeriodWhere(),
            plan: {
              active: true,
              deleted: false,
            },
          },
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  countProfileViewsByPsychologist(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return Promise.resolve([]);

    return prisma.profile_view_event.groupBy({
      by: ["psychologist_id"],
      where: {
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
        source: "profile_page",
      },
      _count: {
        _all: true,
      },
    });
  }

  countWhatsappClicksByPsychologist(psychologistIds: string[]) {
    if (psychologistIds.length === 0) return Promise.resolve([]);

    return prisma.contact_request.groupBy({
      by: ["psychologist_id"],
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
      },
      _count: {
        _all: true,
      },
    });
  }
}
