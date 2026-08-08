import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeReportStatuses, adminCommunityReportSelect } from "../support/manage-selects";

import type { AdminCommunityManageCoreRepository } from "./AdminCommunityManageCoreRepository";

export class AdminCommunityManageReportRepository {
  constructor(protected readonly dependency: AdminCommunityManageCoreRepository) {}

  async listReports(communityId: string) {
    return prisma.post_report.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminCommunityReportSelect,
      where: {
        deleted: false,
        OR: [
          {
            post: {
              community_id: communityId,
            },
          },
          {
            reply: {
              post: {
                community_id: communityId,
              },
            },
          },
        ],
      },
    });
  }

  async resolveReportsForTarget(input: {
    adminId: string;
    communityId: string;
    previousResolution: "dismissed" | "pending" | "upheld";
    reason: string;
    resolution: "dismissed" | "pending" | "upheld";
    review: boolean;
    safeBefore: Prisma.InputJsonObject;
    targetId: string;
    targetType: "comment" | "post" | "reply";
  }) {
    const targetType = input.targetType === "post" ? "post" : "reply";
    const targetWhere: Prisma.post_reportWhereInput =
      targetType === "post"
        ? {
            OR: [
              { post_id: input.targetId, reply_id: null },
              { target_id: input.targetId, target_type: "post" },
            ],
            post: {
              community_id: input.communityId,
            },
          }
        : {
            OR: [{ reply_id: input.targetId }, { target_id: input.targetId, target_type: "reply" }],
            reply: {
              post: {
                community_id: input.communityId,
              },
            },
          };
    const status =
      input.resolution === "dismissed"
        ? "rejeitada"
        : input.resolution === "upheld"
          ? "resolvida"
          : "pendente";

    return prisma.$transaction(async (transaction) => {
      const existingReports = await transaction.post_report.findMany({
        select: {
          id: true,
          post_id: true,
          reply_id: true,
          status: true,
        },
        where: {
          deleted: false,
          ...targetWhere,
        },
      });
      if (existingReports.length === 0) return null;

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status,
        },
        where: {
          deleted: false,
          ...targetWhere,
          ...(input.review
            ? {
                status: {
                  not: status,
                },
              }
            : {
                status: {
                  in: activeReportStatuses,
                },
              }),
        },
      });

      await this.dependency.createContentActivityLog(transaction, {
        action: input.review
          ? "community_report_decision_reviewed"
          : input.resolution === "dismissed"
            ? "community_report_dismissed"
            : "community_report_upheld",
        adminId: input.adminId,
        area: "denuncias",
        changedFields: ["post_report.status"],
        communityId: input.communityId,
        metadata: {
          affected_reports_count: affectedReports.count,
          content_id: input.targetId,
          content_type: targetType === "post" ? "post" : "comment",
          existing_reports_count: existingReports.length,
          post_id: existingReports[0]?.post_id ?? null,
          previous_resolution: input.previousResolution,
          resolution: input.resolution,
          review: input.review,
        },
        reason: input.reason,
        safeAfter: {
          status,
          status_group: input.resolution,
        },
        safeBefore: input.safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        existingReportsCount: existingReports.length,
      };
    });
  }
}
