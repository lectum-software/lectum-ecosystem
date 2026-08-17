import prisma from "@/infra/database/prisma";
import { PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE } from "@/modules/api/public/analytics/helpers/signup-identity";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type { AdminPsychologistsDashboardDateRange } from "../../DTOs/IAdminPsychologistsDashboardDTO";
import {
  catalogOrderBy,
  directoryCatalogSelect,
  directorySpecialtySelect,
  eventCreatedAtWhere,
  preSignupConversionPageViewSelect,
  preSignupConversionSessionSelect,
  profileBaseSelect,
  publicDirectoryWhere,
  STATIC_FEATURE_FILTERS,
  STATIC_GENDER_FILTERS,
  STATIC_MODALITY_FILTERS,
  STATIC_RACE_COLOR_FILTERS,
  STATIC_RELIGION_FILTERS,
  STATIC_STATE_FILTERS,
  signupAnalyticsIdentitySelect,
  toDirectoryFilterItem,
  toStaticDirectoryFilterItem,
} from "../support/dashboard-selects";

export class AdminPsychologistsDashboardDirectoryRepository {
  async listDirectoryFilters() {
    const [specialties, services, approaches, languages, targetAudiences] = await Promise.all([
      prisma.specialty.findMany({
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
        select: directorySpecialtySelect,
        where: {
          active: true,
          category: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
      }),
      prisma.service.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.approach.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "language",
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "target_audience",
        },
      }),
    ]);

    return {
      approaches: approaches.map(toDirectoryFilterItem),
      features: STATIC_FEATURE_FILTERS.map(toStaticDirectoryFilterItem),
      genders: STATIC_GENDER_FILTERS.map(toStaticDirectoryFilterItem),
      languages: languages.map(toDirectoryFilterItem),
      modalities: STATIC_MODALITY_FILTERS.map(toStaticDirectoryFilterItem),
      race_colors: STATIC_RACE_COLOR_FILTERS.map(toStaticDirectoryFilterItem),
      religions: STATIC_RELIGION_FILTERS.map(toStaticDirectoryFilterItem),
      services: services.map(toDirectoryFilterItem),
      specialties: specialties.map((item) => ({
        ...toDirectoryFilterItem(item),
        category_id: item.category_id,
        category_label: item.category?.name ?? null,
      })),
      states: STATIC_STATE_FILTERS.map(toStaticDirectoryFilterItem),
      target_audiences: targetAudiences.map(toDirectoryFilterItem),
    };
  }

  async listPsychologistProfiles() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: {
        ...profileBaseSelect,
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          where: {
            deleted: false,
            plan: {
              active: true,
              deleted: false,
            },
          },
          select: {
            createdAt: true,
            current_period_end: true,
            gateway: true,
            gateway_subscription_id: true,
            grant_started_at: true,
            id: true,
            plan: {
              select: {
                name: true,
                price_cents: true,
                slug: true,
              },
            },
            source: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async listDeletedPsychologistAccounts() {
    return prisma.user.findMany({
      orderBy: {
        deletedAt: "desc",
      },
      select: {
        createdAt: true,
        deletedAt: true,
        id: true,
      },
      where: {
        account_status: "deleted",
        deleted: true,
        deletedAt: {
          not: null,
        },
        role: "psicologo",
      },
    });
  }

  async listPublicRankingCandidates() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: publicDirectoryWhere,
      select: {
        ...profileBaseSelect,
        subscriptions: {
          where: activeProfessionalEntitlementWhere(),
          orderBy: [{ grant_started_at: "asc" }, { createdAt: "asc" }],
          select: {
            createdAt: true,
            grant_started_at: true,
            id: true,
            source: true,
          },
          take: 1,
        },
      },
    });
  }

  async listPlatformPageViews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformSessions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.visitor_session.findMany({
      orderBy: {
        last_seen_at: "asc",
      },
      select: {
        device_type: true,
        os: true,
        session_id: true,
        user_id: true,
      },
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
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionLinkedPageViews(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: preSignupConversionPageViewSelect,
      where: {
        deleted: false,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionLinkedSessions(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: preSignupConversionSessionSelect,
      where: {
        deleted: false,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionPageViewsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxOccurredAt: Date | null,
  ) {
    const uniqueVisitorIds = [...new Set(visitorIds.filter(Boolean))];
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniqueVisitorIds.length === 0 || !maxOccurredAt) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: preSignupConversionPageViewSelect,
      where: {
        deleted: false,
        occurred_at: {
          lte: maxOccurredAt,
        },
        visitor_id: {
          in: uniqueVisitorIds,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: uniquePsychologistIds,
            },
            user: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
          },
        ],
      },
    });
  }

  async listPreSignupConversionSessionsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxFirstSeenAt: Date | null,
  ) {
    const uniqueVisitorIds = [...new Set(visitorIds.filter(Boolean))];
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniqueVisitorIds.length === 0 || !maxFirstSeenAt) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: preSignupConversionSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: maxFirstSeenAt,
        },
        visitor_id: {
          in: uniqueVisitorIds,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: uniquePsychologistIds,
            },
            user: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
          },
        ],
      },
    });
  }

  async listPreSignupConversionSignupIdentities(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.user_background.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: signupAnalyticsIdentitySelect,
      where: {
        deleted: false,
        type: PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformPwaInstallActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        user_id: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listDirectoryFilterSearchActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        target_id: true,
        target_type: true,
      },
      where: {
        action_type: "psychologist_directory_filter_search",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
      },
    });
  }

  async listPublicProfilePageViews(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        target_id: true,
        traffic_source: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        page_kind: "psychologist_profile",
        target_id: {
          in: uniquePsychologistIds,
        },
        target_type: "psychologist",
      },
    });
  }

  async listWhatsappTrafficActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        action_type: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        target_id: true,
        target_type: true,
        user_id: true,
      },
      where: {
        action_type: {
          in: ["psychologist_video_whatsapp_click", "whatsapp_click"],
        },
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
      },
    });
  }

  async listTrafficCommunityPosts(postIds: string[]) {
    const uniquePostIds = [...new Set(postIds.filter(Boolean))];
    if (uniquePostIds.length === 0) return [];

    return prisma.community_post.findMany({
      select: {
        author_id: true,
        id: true,
        media_items: {
          select: {
            media_type: true,
          },
          where: {
            deleted: false,
          },
        },
        media_type: true,
      },
      where: {
        deleted: false,
        id: {
          in: uniquePostIds,
        },
        status: "publicado",
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listTrafficCommunityReplies(replyIds: string[]) {
    const uniqueReplyIds = [...new Set(replyIds.filter(Boolean))];
    if (uniqueReplyIds.length === 0) return [];

    return prisma.post_reply.findMany({
      select: {
        author_id: true,
        id: true,
        media_type: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        id: {
          in: uniqueReplyIds,
        },
        post: {
          deleted: false,
          status: "publicado",
        },
      },
    });
  }
}
