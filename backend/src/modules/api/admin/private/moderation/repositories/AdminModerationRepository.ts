import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { AdminModerationEventsQuery } from "../DTOs/IAdminModerationDTO";
import {
  adminModerationEventDetailSelect,
  adminModerationEventSelect,
  type IAdminModerationRepository,
} from "./interfaces/IAdminModerationRepository";

const ACTIVE_REVIEW_STATUSES = ["pending", "reviewing"];

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

  listEvents(query: AdminModerationEventsQuery) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminModerationEventSelect,
      where: buildWhere(query),
    });
  }

  listLatestPending(limit: number) {
    return prisma.content_moderation_event.findMany({
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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

  findEvent(id: string) {
    return prisma.content_moderation_event.findFirst({
      select: adminModerationEventDetailSelect,
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
