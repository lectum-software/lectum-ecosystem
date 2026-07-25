import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";
import type { AdminModerationEventsQuery } from "../DTOs/IAdminModerationDTO";
import {
  type AdminPostReportRecord,
  adminModerationEventDetailSelect,
  adminModerationEventSelect,
  adminOperationalPsychologistSelect,
  adminPatientIntentFavoriteSelect,
  adminPatientIntentProfileViewSelect,
  adminPatientIntentWhatsappClickSelect,
  adminPostReportSelect,
  adminUncoveredPatientPostSelect,
  type IAdminModerationRepository,
} from "./interfaces/IAdminModerationRepository";

const ACTIVE_REVIEW_STATUSES = ["pending", "reviewing"];
const ACTIVE_POST_REPORT_STATUSES = [
  "pendente",
  "pending",
  "em_analise",
  "em analise",
  "in_review",
  "in review",
];

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "start") date.setHours(0, 0, 0, 0);
  else date.setHours(23, 59, 59, 999);

  return date;
};

const safeJsonObject = (value: unknown) => value as Prisma.InputJsonObject;

const buildWhere = (
  query: AdminModerationEventsQuery,
): Prisma.content_moderation_eventWhereInput => {
  const where: Prisma.content_moderation_eventWhereInput = {
    deleted: false,
  };

  if (query.status && query.status !== "all") where.status = query.status;
  if (query.decision && query.decision !== "all") where.decision = query.decision;
  if (query.severity && query.severity !== "all") where.severity = query.severity;
  if (query.targetType && query.targetType !== "all") where.target_type = query.targetType;
  if (query.community && query.community !== "all") {
    where.OR = [
      { community_id: query.community },
      { community: { slug: query.community } },
      { community: { name: { contains: query.community, mode: "insensitive" } } },
    ];
  }

  const from = parseDateOnly(query.from, "start");
  const to = parseDateOnly(query.to, "end");
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
};

export type AdminModerationReportAudit = {
  action:
    | "moderation_report_content_removed"
    | "moderation_report_dismissed"
    | "moderation_report_upheld";
  adminId: string;
  changedFields: string[];
  metadata?: Prisma.InputJsonObject;
  reason: string;
  safeAfter?: Prisma.InputJsonObject;
  safeBefore?: Prisma.InputJsonObject;
  targetId: string;
};

export type AdminModerationReportMutationResult = {
  affectedReportsCount: number;
  contentAlreadyUnavailable: boolean;
  contentRemoved: boolean;
  report: AdminPostReportRecord;
};

type TransactionClient = Prisma.TransactionClient;

type ResolveReportUpheldInput = {
  audit: AdminModerationReportAudit;
  measure: "none" | "remove_content";
  report: AdminPostReportRecord;
};

const activitySafeSnapshot = (event: {
  categories: unknown;
  decision: string;
  id: string;
  reason_code: string;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
}) => ({
  categories: event.categories,
  decision: event.decision,
  event_id: event.id,
  reason_code: event.reason_code,
  severity: event.severity,
  status: event.status,
  target_id: event.target_id,
  target_type: event.target_type,
});

const reportTargetWhere = (report: AdminPostReportRecord) => ({
  deleted: false,
  target_id: report.target_id,
  target_type: report.target_type,
});

const reportContentIsAvailable = (report: AdminPostReportRecord) => {
  if (report.reply) {
    return (
      !report.reply.deleted &&
      !report.reply.post.deleted &&
      report.reply.post.status === "publicado" &&
      !report.reply.post.community.deleted
    );
  }

  return (
    !report.post.deleted && report.post.status === "publicado" && !report.post.community.deleted
  );
};

export class AdminModerationRepository implements IAdminModerationRepository {
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

  async listPatientIntentSignals(patientIds: string[]) {
    if (patientIds.length === 0) {
      return {
        favorites: [],
        profileViews: [],
        whatsappClicks: [],
      };
    }

    const [profileViews, favorites, whatsappClicks] = await Promise.all([
      prisma.profile_view_event.findMany({
        select: adminPatientIntentProfileViewSelect,
        where: {
          deleted: false,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          source: "profile_page",
          viewer: {
            deleted: false,
            role: "paciente",
          },
          viewer_id: {
            in: patientIds,
          },
        },
      }),
      prisma.psychologist_favorite.findMany({
        select: adminPatientIntentFavoriteSelect,
        where: {
          deleted: false,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
      prisma.contact_request.findMany({
        select: adminPatientIntentWhatsappClickSelect,
        where: {
          channel: "whatsapp",
          deleted: false,
          psychologist: {
            deleted: false,
            role: "psicologo",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
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

      await this.createReportAuditLog(transaction, input.audit);

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
          ? await this.softDeleteReportTargetContent(transaction, input.report)
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

      await this.createReportAuditLog(transaction, {
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

  private async softDeleteReportTargetContent(
    transaction: TransactionClient,
    report: AdminPostReportRecord,
  ) {
    const now = new Date();

    if (report.reply) {
      const replyIds = await this.findReplyTreeIds(
        transaction,
        report.reply.post_id,
        report.reply.id,
      );
      if (replyIds.length === 0) return false;

      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          id: {
            in: replyIds,
          },
          post_id: report.reply.post_id,
        },
      });

      if (deletedReplies.count > 0) {
        await transaction.community_post.update({
          data: {
            replies_count: Math.max(0, report.reply.post.replies_count - deletedReplies.count),
          },
          where: {
            id: report.reply.post_id,
          },
        });
      }

      return deletedReplies.count > 0;
    }

    const deletedReplies = await transaction.post_reply.updateMany({
      data: {
        deleted: true,
        deletedAt: now,
      },
      where: {
        deleted: false,
        post_id: report.post.id,
      },
    });

    await transaction.community_post.update({
      data: {
        deleted: true,
        deletedAt: now,
        replies_count: Math.max(0, report.post.replies_count - deletedReplies.count),
        status: "removido",
      },
      where: {
        id: report.post.id,
      },
    });

    return true;
  }

  private async findReplyTreeIds(
    transaction: TransactionClient,
    postId: string,
    rootReplyId: string,
  ) {
    const replies = await transaction.post_reply.findMany({
      select: {
        id: true,
        parent_reply_id: true,
      },
      where: {
        deleted: false,
        post_id: postId,
      },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const reply of replies) {
      if (!reply.parent_reply_id) continue;
      const children = childrenByParent.get(reply.parent_reply_id) ?? [];
      children.push(reply.id);
      childrenByParent.set(reply.parent_reply_id, children);
    }

    const ids = new Set<string>();
    const stack = [rootReplyId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || ids.has(current)) continue;
      ids.add(current);
      for (const childId of childrenByParent.get(current) ?? []) stack.push(childId);
    }

    return [...ids];
  }

  private async createReportAuditLog(
    transaction: TransactionClient,
    audit: AdminModerationReportAudit,
  ) {
    await transaction.admin_activity_log.create({
      data: {
        action: audit.action,
        admin_id: audit.adminId,
        area: "denuncias",
        changed_fields: audit.changedFields,
        domain: "moderation",
        metadata: audit.metadata ?? {},
        reason: audit.reason,
        safe_after: audit.safeAfter ?? {},
        safe_before: audit.safeBefore ?? {},
        source: "admin_panel",
        target_id: audit.targetId,
        target_type: "post_report",
      },
    });
  }
}
