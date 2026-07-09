import prisma from "@/infra/database/prisma";
import type { AdminDashboardDateRange } from "../DTOs/IAdminDashboardSummaryDTO";
import type { IAdminDashboardRepository } from "./interfaces/IAdminDashboardRepository";

const createdAtWhere = (range: AdminDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

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

  async listCommunityPostDates(
    range: AdminDashboardDateRange,
  ): Promise<Array<{ createdAt: Date }>> {
    return prisma.community_post.findMany({
      where: {
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

  async listPostReplyDates(range: AdminDashboardDateRange): Promise<Array<{ createdAt: Date }>> {
    return prisma.post_reply.findMany({
      where: {
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
