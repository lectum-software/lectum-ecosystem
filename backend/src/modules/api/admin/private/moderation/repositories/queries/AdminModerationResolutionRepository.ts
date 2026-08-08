import prisma from "@/infra/database/prisma";
import {
  type AdminPostReportRecord,
  adminModerationEventDetailSelect,
  adminPostReportSelect,
} from "../interfaces/IAdminModerationRepository";
import {
  ACTIVE_POST_REPORT_STATUSES,
  type AdminModerationReportAudit,
  type AdminModerationReportMutationResult,
  activitySafeSnapshot,
  type ResolveReportUpheldInput,
  reportContentIsAvailable,
  reportTargetWhere,
  safeJsonObject,
} from "../support/moderation-query";

import type { AdminModerationMutationSupportRepository } from "./AdminModerationMutationSupportRepository";

export class AdminModerationResolutionRepository {
  constructor(protected readonly dependency: AdminModerationMutationSupportRepository) {}

  findEvent(id: string) {
    return prisma.content_moderation_event.findFirst({
      select: adminModerationEventDetailSelect,
      where: {
        deleted: false,
        id,
      },
    });
  }

  findPostReport(id: string) {
    return prisma.post_report.findFirst({
      select: adminPostReportSelect,
      where: {
        deleted: false,
        id,
      },
    });
  }

  listReplyTargets(replyIds: string[]) {
    if (replyIds.length === 0) return Promise.resolve([]);

    return prisma.post_reply.findMany({
      select: {
        id: true,
        post_id: true,
        post: {
          select: {
            community: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
      where: {
        id: {
          in: replyIds,
        },
      },
    });
  }

  async resolveReportDismissed(input: {
    audit: AdminModerationReportAudit;
    report: AdminPostReportRecord;
  }): Promise<AdminModerationReportMutationResult> {
    return prisma.$transaction(async (transaction) => {
      const report = await transaction.post_report.update({
        data: {
          status: "rejeitada",
        },
        select: adminPostReportSelect,
        where: {
          id: input.report.id,
        },
      });

      await this.dependency.createReportAuditLog(transaction, input.audit);

      return {
        affectedReportsCount: 1,
        contentAlreadyUnavailable: !reportContentIsAvailable(input.report),
        contentRemoved: false,
        report,
      };
    });
  }

  async resolveReportUpheld(
    input: ResolveReportUpheldInput,
  ): Promise<AdminModerationReportMutationResult> {
    return prisma.$transaction(async (transaction) => {
      const wasAvailable = reportContentIsAvailable(input.report);
      const contentRemoved =
        input.measure === "remove_content" && wasAvailable
          ? await this.dependency.softDeleteReportTargetContent(transaction, input.report)
          : false;

      const affectedReports =
        input.measure === "remove_content"
          ? await transaction.post_report.updateMany({
              data: {
                status: "resolvida",
              },
              where: {
                ...reportTargetWhere(input.report),
                status: {
                  in: ACTIVE_POST_REPORT_STATUSES,
                },
              },
            })
          : await transaction.post_report.updateMany({
              data: {
                status: "resolvida",
              },
              where: {
                deleted: false,
                id: input.report.id,
              },
            });

      const report = await transaction.post_report.findUniqueOrThrow({
        select: adminPostReportSelect,
        where: {
          id: input.report.id,
        },
      });

      await this.dependency.createReportAuditLog(transaction, {
        ...input.audit,
        metadata: {
          ...(input.audit.metadata ?? {}),
          affected_reports_count: affectedReports.count,
          content_already_unavailable: !wasAvailable,
          content_removed: contentRemoved,
        },
      });

      return {
        affectedReportsCount: affectedReports.count,
        contentAlreadyUnavailable: !wasAvailable,
        contentRemoved,
        report,
      };
    });
  }

  markReviewing(id: string, adminId: string) {
    return prisma.$transaction(async (transaction) => {
      const event = await transaction.content_moderation_event.findFirst({
        select: adminModerationEventDetailSelect,
        where: {
          deleted: false,
          id,
        },
      });
      if (!event) return null;

      const updated = await transaction.content_moderation_event.update({
        data: {
          reviewed_at: event.reviewed_at ?? new Date(),
          reviewed_by_admin_id: event.reviewed_by_admin_id ?? adminId,
          status: event.status === "resolved" ? "resolved" : "reviewing",
        },
        select: adminModerationEventDetailSelect,
        where: { id },
      });

      await transaction.admin_activity_log.create({
        data: {
          action: "content_moderation_review_started",
          admin_id: adminId,
          area: "moderacao",
          changed_fields: [
            "content_moderation_event.status",
            "content_moderation_event.reviewed_at",
          ],
          domain: "content_moderation",
          metadata: safeJsonObject({ community_id: updated.community_id }),
          safe_after: safeJsonObject(activitySafeSnapshot(updated)),
          safe_before: safeJsonObject(activitySafeSnapshot(event)),
          source: "admin_panel",
          target_id: id,
          target_type: "content_moderation_event",
        },
      });

      return updated;
    });
  }

  resolveEvent(id: string, input: { adminId: string; note: string }) {
    return prisma.$transaction(async (transaction) => {
      const event = await transaction.content_moderation_event.findFirst({
        select: adminModerationEventDetailSelect,
        where: {
          deleted: false,
          id,
        },
      });
      if (!event) return null;

      const now = new Date();
      const updated = await transaction.content_moderation_event.update({
        data: {
          admin_note: input.note,
          resolved_at: now,
          reviewed_at: event.reviewed_at ?? now,
          reviewed_by_admin_id: event.reviewed_by_admin_id ?? input.adminId,
          status: "resolved",
        },
        select: adminModerationEventDetailSelect,
        where: { id },
      });

      await transaction.admin_activity_log.create({
        data: {
          action: "content_moderation_resolved",
          admin_id: input.adminId,
          area: "moderacao",
          changed_fields: [
            "content_moderation_event.status",
            "content_moderation_event.resolved_at",
            "content_moderation_event.admin_note",
          ],
          domain: "content_moderation",
          metadata: safeJsonObject({ community_id: updated.community_id }),
          reason: input.note,
          safe_after: safeJsonObject(activitySafeSnapshot(updated)),
          safe_before: safeJsonObject(activitySafeSnapshot(event)),
          source: "admin_panel",
          target_id: id,
          target_type: "content_moderation_event",
        },
      });

      return updated;
    });
  }
}
