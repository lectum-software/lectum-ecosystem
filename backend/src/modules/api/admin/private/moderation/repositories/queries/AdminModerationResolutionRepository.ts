import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  type AdminModerationEventAuditBuilder,
  adminModerationEventDetailSelect,
  adminPostReportSelect,
} from "../interfaces/IAdminModerationRepository";
import {
  ACTIVE_POST_REPORT_STATUSES,
  type AdminModerationReportMutationResult,
  type ResolveReportInput,
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

  async resolveReportDismissed(
    input: ResolveReportInput,
  ): Promise<AdminModerationReportMutationResult | null> {
    return withSerializableTransaction(async (transaction) => {
      const current = await transaction.post_report.findFirst({
        select: adminPostReportSelect,
        where: { deleted: false, id: input.reportId },
      });
      if (!current) return null;
      const audit = input.prepareAudit(current);
      if (!audit) return null;

      const affected = await transaction.post_report.updateMany({
        data: { status: "rejeitada" },
        where: { deleted: false, id: current.id, status: current.status },
      });
      if (affected.count === 0) return null;
      const report = await transaction.post_report.findUniqueOrThrow({
        select: adminPostReportSelect,
        where: { id: current.id },
      });

      await this.dependency.createReportAuditLog(transaction, audit);

      return {
        affectedReportsCount: 1,
        contentAlreadyUnavailable: !reportContentIsAvailable(current),
        contentRemoved: false,
        report,
      };
    });
  }

  async resolveReportUpheld(
    input: ResolveReportUpheldInput,
  ): Promise<AdminModerationReportMutationResult | null> {
    return withSerializableTransaction(async (transaction) => {
      const current = await transaction.post_report.findFirst({
        select: adminPostReportSelect,
        where: { deleted: false, id: input.reportId },
      });
      if (!current) return null;
      const audit = input.prepareAudit(current);
      if (!audit) return null;

      // Claim the eligible report before changing its target or related reports.
      const claimed = await transaction.post_report.updateMany({
        data: { status: "resolvida" },
        where: { deleted: false, id: current.id, status: current.status },
      });
      if (claimed.count === 0) return null;
      const wasAvailable = reportContentIsAvailable(current);
      const contentRemoved =
        input.measure === "remove_content" && wasAvailable
          ? await this.dependency.softDeleteReportTargetContent(transaction, current)
          : false;

      const affectedReports =
        input.measure === "remove_content"
          ? await transaction.post_report.updateMany({
              data: {
                status: "resolvida",
              },
              where: {
                ...reportTargetWhere(current),
                id: { not: current.id },
                status: {
                  in: ACTIVE_POST_REPORT_STATUSES,
                },
              },
            })
          : { count: 0 };
      const affectedReportsCount = claimed.count + affectedReports.count;

      const report = await transaction.post_report.findUniqueOrThrow({
        select: adminPostReportSelect,
        where: {
          id: current.id,
        },
      });

      await this.dependency.createReportAuditLog(transaction, {
        ...audit,
        metadata: {
          ...(audit.metadata ?? {}),
          affected_reports_count: affectedReportsCount,
          content_already_unavailable: !wasAvailable,
          content_removed: contentRemoved,
        },
      });

      return {
        affectedReportsCount,
        contentAlreadyUnavailable: !wasAvailable,
        contentRemoved,
        report,
      };
    });
  }

  markReviewing(
    id: string,
    input: { adminId: string; buildAudit: AdminModerationEventAuditBuilder },
  ) {
    return withSerializableTransaction(async (transaction) => {
      const event = await transaction.content_moderation_event.findFirst({
        select: adminModerationEventDetailSelect,
        where: {
          deleted: false,
          id,
        },
      });
      if (!event) return null;
      if (
        (event.status === "resolved" || event.status === "reviewing") &&
        event.reviewed_at &&
        event.reviewed_by_admin_id
      )
        return event;

      const updated = await transaction.content_moderation_event.update({
        data: {
          reviewed_at: event.reviewed_at ?? new Date(),
          reviewed_by_admin_id: event.reviewed_by_admin_id ?? input.adminId,
          status: event.status === "resolved" ? "resolved" : "reviewing",
        },
        select: adminModerationEventDetailSelect,
        where: { id },
      });
      const audit = input.buildAudit(event, updated);

      await transaction.admin_activity_log.create({
        data: {
          action: "content_moderation_review_started",
          admin_id: input.adminId,
          area: "moderacao",
          changed_fields: [
            "content_moderation_event.status",
            "content_moderation_event.reviewed_at",
          ],
          domain: "content_moderation",
          metadata: safeJsonObject({ community_id: updated.community_id }),
          safe_after: audit.safeAfter,
          safe_before: audit.safeBefore,
          source: "admin_panel",
          target_id: id,
          target_type: "content_moderation_event",
        },
      });

      return updated;
    });
  }

  resolveEvent(
    id: string,
    input: { adminId: string; note: string; buildAudit: AdminModerationEventAuditBuilder },
  ) {
    return withSerializableTransaction(async (transaction) => {
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
      const audit = input.buildAudit(event, updated);

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
          safe_after: audit.safeAfter,
          safe_before: audit.safeBefore,
          source: "admin_panel",
          target_id: id,
          target_type: "content_moderation_event",
        },
      });

      return updated;
    });
  }
}
