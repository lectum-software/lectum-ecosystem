import type { Prisma } from "@/external/generated/prisma/client";
import { parseDateOnly } from "@/utils/date-range";
import type { AdminModerationEventsQuery } from "../../DTOs/IAdminModerationDTO";
import type { AdminPostReportRecord } from "../interfaces/IAdminModerationRepository";

export const ACTIVE_REVIEW_STATUSES = ["pending", "reviewing"];

export const ACTIVE_POST_REPORT_STATUSES = [
  "pendente",
  "pending",
  "em_analise",
  "em analise",
  "in_review",
  "in review",
];

export const safeJsonObject = (value: unknown) => value as Prisma.InputJsonObject;

export const buildWhere = (
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

export type TransactionClient = Prisma.TransactionClient;

export type ResolveReportUpheldInput = {
  audit: AdminModerationReportAudit;
  measure: "none" | "remove_content";
  report: AdminPostReportRecord;
};

export const activitySafeSnapshot = (event: {
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

export const reportTargetWhere = (report: AdminPostReportRecord) => ({
  deleted: false,
  target_id: report.target_id,
  target_type: report.target_type,
});

export const reportContentIsAvailable = (report: AdminPostReportRecord) => {
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
