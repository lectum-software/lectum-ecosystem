import prisma from "@/infra/database/prisma";
import type { AdminDashboardDateRange } from "../DTOs/IAdminDashboardSummaryDTO";
import type {
  DashboardCommunityAuthorRole,
  IAdminDashboardRepository,
} from "./interfaces/IAdminDashboardRepository";

const createdAtWhere = (range: AdminDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const sumCountsByPsychologistId = (records: Array<{ count: number; psychologist_id: string }>) => {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.psychologist_id, (counts.get(record.psychologist_id) ?? 0) + record.count);
  }

  return [...counts.entries()].map(([psychologist_id, count]) => ({
    count,
    psychologist_id,
  }));
};

const authorRoleWhere = (authorRole?: DashboardCommunityAuthorRole) =>
  authorRole
    ? {
        author: {
          deleted: false,
          role: authorRole,
        },
      }
    : {};

const earliestDate = (dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((earliest, date) => {
    if (!date) return earliest;

    return !earliest || date < earliest ? date : earliest;
  }, null);

export class AdminDashboardRepository implements IAdminDashboardRepository {
  async countPendingReports(range: AdminDashboardDateRange): Promise<number> {
    return prisma.post_report.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
    });
  }

  async countUsersByRole(
    role: "paciente" | "psicologo",
    range: AdminDashboardDateRange,
  ): Promise<number> {
    return prisma.user.count({
      where: {
        active: true,
        createdAt: createdAtWhere(range),
        deleted: false,
        role,
      },
    });
  }

  async countVisitorSessions(range: AdminDashboardDateRange): Promise<number> {
    return prisma.visitor_session.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
      },
    });
  }

  async findEarliestDashboardDate(): Promise<Date | null> {
    const [
      visitorSessions,
      visitorLocations,
      users,
      communityPosts,
      postReplies,
      postReports,
      paidSubscriptions,
      profileViews,
      psychologistFavorites,
      whatsappClicks,
    ] = await Promise.all([
      prisma.visitor_session.aggregate({
        _min: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.visitor_location.aggregate({
        _min: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.user.aggregate({
        _min: { createdAt: true },
        where: {
          active: true,
          deleted: false,
          role: { in: ["paciente", "psicologo"] },
        },
      }),
      prisma.community_post.aggregate({
        _min: { createdAt: true },
        where: {
          deleted: false,
          status: "publicado",
        },
      }),
      prisma.post_reply.aggregate({
        _min: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.post_report.aggregate({
        _min: { createdAt: true },
        where: {
          deleted: false,
          status: "pendente",
        },
      }),
      prisma.professional_subscription.aggregate({
        _min: { createdAt: true },
        where: {
          deleted: false,
          plan: {
            active: true,
            deleted: false,
            price_cents: { gt: 0 },
            slug: { not: "gratuito" },
          },
        },
      }),
      prisma.profile_view_event.aggregate({
        _min: { createdAt: true },
        where: {
          deleted: false,
          source: "profile_page",
        },
      }),
      prisma.psychologist_favorite.aggregate({
        _min: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.contact_request.aggregate({
        _min: { createdAt: true },
        where: {
          channel: "whatsapp",
          deleted: false,
        },
      }),
    ]);

    return earliestDate([
      visitorSessions._min.createdAt,
      visitorLocations._min.createdAt,
      users._min.createdAt,
      communityPosts._min.createdAt,
      postReplies._min.createdAt,
      postReports._min.createdAt,
      paidSubscriptions._min.createdAt,
      profileViews._min.createdAt,
      psychologistFavorites._min.createdAt,
      whatsappClicks._min.createdAt,
    ]);
  }

  async listCommunityPostDates(
    range: AdminDashboardDateRange,
    authorRole?: DashboardCommunityAuthorRole,
  ): Promise<Array<{ createdAt: Date }>> {
    return prisma.community_post.findMany({
      where: {
        ...authorRoleWhere(authorRole),
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "publicado",
      },
      select: {
        createdAt: true,
      },
    });
  }

  async listPaidSubscriptionsUntil(end: Date): Promise<
    Array<{
      createdAt: Date;
      current_period_end: Date | null;
      id: string;
      source: string;
      status: string;
      plan: {
        interval: string;
        name: string;
        price_cents: number;
        slug: string;
      };
    }>
  > {
    return prisma.professional_subscription.findMany({
      where: {
        createdAt: {
          lte: end,
        },
        deleted: false,
        plan: {
          active: true,
          deleted: false,
          price_cents: {
            gt: 0,
          },
          slug: {
            not: "gratuito",
          },
        },
      },
      select: {
        createdAt: true,
        current_period_end: true,
        id: true,
        source: true,
        status: true,
        plan: {
          select: {
            interval: true,
            name: true,
            price_cents: true,
            slug: true,
          },
        },
      },
    });
  }

  async listPendingReports(range: AdminDashboardDateRange): Promise<
    Array<{
      createdAt: Date;
      description: string | null;
      id: string;
      reason: string;
      status: string;
      target_id: string;
      target_type: string;
      post: {
        content: string;
        title: string;
        community: { name: string };
      };
      reply: {
        content: string;
        title: string | null;
        post: {
          title: string;
          community: { name: string };
        };
      } | null;
      reporter: {
        role: string;
      };
    }>
  > {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
      select: {
        createdAt: true,
        description: true,
        id: true,
        reason: true,
        status: true,
        target_id: true,
        target_type: true,
        post: {
          select: {
            content: true,
            title: true,
            community: {
              select: {
                name: true,
              },
            },
          },
        },
        reply: {
          select: {
            content: true,
            title: true,
            post: {
              select: {
                title: true,
                community: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        reporter: {
          select: {
            role: true,
          },
        },
      },
    });
  }

  async listPostReplyDates(
    range: AdminDashboardDateRange,
    authorRole?: DashboardCommunityAuthorRole,
  ): Promise<Array<{ createdAt: Date }>> {
    return prisma.post_reply.findMany({
      where: {
        ...authorRoleWhere(authorRole),
        createdAt: createdAtWhere(range),
        deleted: false,
      },
      select: {
        createdAt: true,
      },
    });
  }

  async listVisitorLocations(
    range: AdminDashboardDateRange,
  ): Promise<Array<{ country: string | null }>> {
    return prisma.visitor_location.findMany({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
      },
      select: {
        country: true,
      },
    });
  }

  async listVisitorSessions(
    range: AdminDashboardDateRange,
  ): Promise<Array<{ device_type: string }>> {
    return prisma.visitor_session.findMany({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
      },
      select: {
        device_type: true,
      },
    });
  }

  async listIntentConversionSignals(range: AdminDashboardDateRange) {
    const createdAt = createdAtWhere(range);

    const [profileViews, favorites, whatsappClicks] = await Promise.all([
      prisma.profile_view_event.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          psychologist_id: true,
          viewer_id: true,
        },
        where: {
          createdAt,
          deleted: false,
          psychologist: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          source: "profile_page",
          viewer: {
            active: true,
            deleted: false,
            role: "paciente",
          },
          viewer_id: {
            not: null,
          },
        },
      }),
      prisma.psychologist_favorite.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          psychologist_id: true,
          user_id: true,
        },
        where: {
          createdAt,
          deleted: false,
          psychologist: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          user: {
            active: true,
            deleted: false,
            role: "paciente",
          },
        },
      }),
      prisma.contact_request.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          psychologist_id: true,
          user_id: true,
        },
        where: {
          channel: "whatsapp",
          createdAt,
          deleted: false,
          psychologist: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          user: {
            active: true,
            deleted: false,
            role: "paciente",
          },
          user_id: {
            not: null,
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

  async listPsychologistCommunityPostViewCounts(range: AdminDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: createdAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["post", "community_post"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const postIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (postIds.length === 0) return [];

    const posts = await prisma.community_post.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        community: {
          deleted: false,
        },
        deleted: false,
        id: {
          in: postIds,
        },
        status: "publicado",
      },
    });
    const authorByPostId = new Map(posts.map((post) => [post.id, post.author_id]));

    return sumCountsByPsychologistId(
      viewGroups.flatMap((group) => {
        const targetId = group.target_id;
        if (!targetId) return [];

        const psychologistId = authorByPostId.get(targetId);
        if (!psychologistId) return [];

        return [
          {
            count: group._count._all,
            psychologist_id: psychologistId,
          },
        ];
      }),
    );
  }

  async listPsychologistCommunityReplyViewCounts(range: AdminDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: createdAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["reply", "post_reply"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const replyIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (replyIds.length === 0) return [];

    const replies = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        id: {
          in: replyIds,
        },
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });
    const authorByReplyId = new Map(replies.map((reply) => [reply.id, reply.author_id]));

    return sumCountsByPsychologistId(
      viewGroups.flatMap((group) => {
        const targetId = group.target_id;
        if (!targetId) return [];

        const psychologistId = authorByReplyId.get(targetId);
        if (!psychologistId) return [];

        return [
          {
            count: group._count._all,
            psychologist_id: psychologistId,
          },
        ];
      }),
    );
  }

  async listPsychologistConversionEvents(range: AdminDashboardDateRange) {
    const createdAt = createdAtWhere(range);

    return {
      whatsappClicks: await prisma.contact_request.findMany({
        select: {
          createdAt: true,
          psychologist_id: true,
        },
        where: {
          channel: "whatsapp",
          createdAt,
          deleted: false,
          psychologist: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
        },
      }),
    };
  }

  async listPsychologistConversionProfiles() {
    return prisma.psychologist_profile.findMany({
      select: {
        user: {
          select: {
            createdAt: true,
            id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }
}
