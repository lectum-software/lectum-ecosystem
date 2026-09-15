import prisma from "@/infra/database/prisma";
import type { AdminCommunitiesDashboardDateRange } from "../../DTOs/IAdminCommunitiesDashboardDTO";
import { createdAtWhere, optionalCreatedAtWhere } from "../support/dashboard-selects";

export class AdminCommunitiesDashboardModerationRepository {
  async listPendingReports(range: AdminCommunitiesDashboardDateRange) {
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
                slug: true,
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
                    slug: true,
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

  async listPendingModerationEvents(range: AdminCommunitiesDashboardDateRange) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: 10,
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: {
          in: ["pending", "reviewing"],
        },
      },
      select: {
        categories: true,
        content_excerpt: true,
        createdAt: true,
        decision: true,
        id: true,
        reason_code: true,
        severity: true,
        status: true,
        target_id: true,
        target_type: true,
        community: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async listPostReplies(range?: AdminCommunitiesDashboardDateRange) {
    return prisma.post_reply.findMany({
      where: {
        ...optionalCreatedAtWhere(range),
        deleted: false,
        author: {
          active: true,
          deleted: false,
        },
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        author: {
          select: {
            id: true,
            role: true,
          },
        },
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
  }
}
