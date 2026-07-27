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
    ]);

    return earliestDate([
      visitorSessions._min.createdAt,
      visitorLocations._min.createdAt,
      users._min.createdAt,
      communityPosts._min.createdAt,
      postReplies._min.createdAt,
      postReports._min.createdAt,
      paidSubscriptions._min.createdAt,
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
}
