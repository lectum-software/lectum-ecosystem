import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { AdminPatientDetailDateRange } from "../DTOs/IAdminPatientDetailDTO";

import {
  type AdminPatientDetailPlatformPageViewRecord,
  type AdminPatientDetailPlatformSessionRecord,
  type AdminPatientDetailPwaInstallRecord,
  type AdminPatientDetailRecord,
  memberSelect,
  patientIntentFavoriteSelect,
  patientIntentProfileViewSelect,
  patientIntentWhatsappClickSelect,
  patientPlatformPageViewSelect,
  patientPlatformPwaInstallSelect,
  patientPlatformSessionSelect,
  patientSelect,
  postSaveReceivedSelect,
  postSaveSelect,
  postSummarySelect,
  rangeWhere,
  replySaveReceivedSelect,
  replySaveSelect,
  replySummarySelect,
  reportReceivedSelect,
  responseReceivedSelect,
  reviewSelect,
  shareReceivedSelect,
  voteSelect,
} from "./support/detail-selects";

export class AdminPatientDetailRepository {
  async findPatient(id: string): Promise<AdminPatientDetailRecord | null> {
    return prisma.user.findFirst({
      select: patientSelect,
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
    });
  }

  async listEngagementBundle(patientId: string, range: AdminPatientDetailDateRange) {
    const createdAt = rangeWhere(range);
    const publishedPostWhere = {
      deleted: false,
      status: "publicado",
    } satisfies Prisma.community_postWhereInput;

    const [
      posts,
      replies,
      votesMade,
      postSaves,
      replySaves,
      memberships,
      membershipsInPeriod,
      reviews,
      votesReceived,
      responsesReceived,
      postSavesReceived,
      replySavesReceived,
      sharesReceived,
      reportsReceived,
    ] = await Promise.all([
      prisma.community_post.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSummarySelect,
        where: {
          ...publishedPostWhere,
          author_id: patientId,
          createdAt,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.post_reply.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySummarySelect,
        where: {
          author_id: patientId,
          createdAt,
          deleted: false,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: voteSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          OR: [
            {
              post: {
                ...publishedPostWhere,
                community: {
                  deleted: false,
                },
              },
            },
            {
              reply: {
                deleted: false,
                post: {
                  ...publishedPostWhere,
                  community: {
                    deleted: false,
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.post_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSaveSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_reply_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySaveSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          reply: {
            deleted: false,
            post: {
              ...publishedPostWhere,
              community: {
                deleted: false,
              },
            },
          },
        },
      }),
      prisma.community_member.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: memberSelect,
        where: {
          deleted: false,
          user_id: patientId,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.community_member.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: memberSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          community: {
            deleted: false,
          },
        },
      }),
      prisma.professional_review.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: reviewSelect,
        where: {
          author_id: patientId,
          createdAt,
          deleted: false,
          status: "publicada",
        },
      }),
      prisma.post_vote.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: voteSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          OR: [
            {
              post: {
                ...publishedPostWhere,
                author_id: patientId,
                community: {
                  deleted: false,
                },
              },
            },
            {
              reply: {
                author_id: patientId,
                deleted: false,
                post: {
                  ...publishedPostWhere,
                  community: {
                    deleted: false,
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.post_reply.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: responseReceivedSelect,
        where: {
          author_id: {
            not: patientId,
          },
          createdAt,
          deleted: false,
          post: {
            ...publishedPostWhere,
            community: {
              deleted: false,
            },
          },
          OR: [
            {
              post: {
                author_id: patientId,
              },
            },
            {
              parent_reply: {
                author_id: patientId,
                deleted: false,
              },
            },
          ],
        },
      }),
      prisma.post_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: postSaveReceivedSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          post: {
            ...publishedPostWhere,
            author_id: patientId,
            community: {
              deleted: false,
            },
          },
        },
      }),
      prisma.post_reply_save.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: replySaveReceivedSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: {
            not: patientId,
          },
          reply: {
            author_id: patientId,
            deleted: false,
            post: {
              ...publishedPostWhere,
              community: {
                deleted: false,
              },
            },
          },
        },
      }),
      prisma.post_share.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: shareReceivedSelect,
        where: {
          AND: [
            {
              OR: [
                {
                  user_id: null,
                },
                {
                  user_id: {
                    not: patientId,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  post: {
                    ...publishedPostWhere,
                    author_id: patientId,
                    community: {
                      deleted: false,
                    },
                  },
                  reply_id: null,
                },
                {
                  reply: {
                    author_id: patientId,
                    deleted: false,
                    post: {
                      ...publishedPostWhere,
                      community: {
                        deleted: false,
                      },
                    },
                  },
                },
              ],
            },
          ],
          createdAt,
          deleted: false,
        },
      }),
      prisma.post_report.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: reportReceivedSelect,
        where: {
          createdAt,
          deleted: false,
          OR: [
            {
              post: {
                author_id: patientId,
              },
              reply_id: null,
              target_type: "post",
            },
            {
              reply: {
                author_id: patientId,
              },
              reply_id: {
                not: null,
              },
            },
          ],
        },
      }),
    ]);

    return {
      memberships,
      membershipsInPeriod,
      postSaves,
      postSavesReceived,
      posts,
      replies,
      replySaves,
      replySavesReceived,
      reportsReceived,
      responsesReceived,
      reviews,
      sharesReceived,
      votesMade,
      votesReceived,
    };
  }

  async listPlatformPageViews(
    patientId: string,
    range: AdminPatientDetailDateRange,
  ): Promise<AdminPatientDetailPlatformPageViewRecord[]> {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientPlatformPageViewSelect,
      where: {
        deleted: false,
        occurred_at: rangeWhere(range),
        user_id: patientId,
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listPlatformSessions(
    patientId: string,
    range: AdminPatientDetailDateRange,
  ): Promise<AdminPatientDetailPlatformSessionRecord[]> {
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
        user_id: patientId,
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async findPwaInstallAction(
    patientId: string,
  ): Promise<AdminPatientDetailPwaInstallRecord | null> {
    return prisma.important_action_event.findFirst({
      orderBy: {
        occurred_at: "asc",
      },
      select: patientPlatformPwaInstallSelect,
      where: {
        action_type: "pwa_installed",
        deleted: false,
        user_id: patientId,
        user: {
          deleted: false,
          role: "paciente",
        },
      },
    });
  }

  async listIntentSignals(patientId: string, range: AdminPatientDetailDateRange) {
    const createdAt = rangeWhere(range);

    const [profileViews, favorites, whatsappClicks] = await Promise.all([
      prisma.profile_view_event.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: patientIntentProfileViewSelect,
        where: {
          createdAt,
          deleted: false,
          source: "profile_page",
          viewer_id: patientId,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          viewer: {
            deleted: false,
            role: "paciente",
          },
        },
      }),
      prisma.psychologist_favorite.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: patientIntentFavoriteSelect,
        where: {
          createdAt,
          deleted: false,
          user_id: patientId,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
        },
      }),
      prisma.contact_request.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: patientIntentWhatsappClickSelect,
        where: {
          channel: "whatsapp",
          createdAt,
          deleted: false,
          user_id: patientId,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
        },
      }),
    ]);

    return {
      favorites,
      profileViews,
      whatsappClicks,
    };
  }

  async countPostViews(postIds: string[]) {
    if (postIds.length === 0) return [];

    return prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      },
      _count: {
        _all: true,
      },
    });
  }
}

export type AdminPatientEngagementBundle = Awaited<
  ReturnType<AdminPatientDetailRepository["listEngagementBundle"]>
>;

export type {
  AdminPatientDetailMemberRecord,
  AdminPatientDetailPlatformPageViewRecord,
  AdminPatientDetailPlatformSessionRecord,
  AdminPatientDetailPostRecord,
  AdminPatientDetailPostSaveReceivedRecord,
  AdminPatientDetailPostSaveRecord,
  AdminPatientDetailPwaInstallRecord,
  AdminPatientDetailRecord,
  AdminPatientDetailReplyRecord,
  AdminPatientDetailReplySaveReceivedRecord,
  AdminPatientDetailReplySaveRecord,
  AdminPatientDetailReportReceivedRecord,
  AdminPatientDetailResponseReceivedRecord,
  AdminPatientDetailReviewRecord,
  AdminPatientDetailShareReceivedRecord,
  AdminPatientDetailVoteRecord,
  AdminPatientIntentFavoriteRecord,
  AdminPatientIntentProfileViewRecord,
  AdminPatientIntentWhatsappClickRecord,
} from "./support/detail-selects";
