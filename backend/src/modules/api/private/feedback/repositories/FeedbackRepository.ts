import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type { FeedbackInput, FeedbackQuery, FeedbackUpdate } from "../DTOs";

const select = {
  id: true,
  description: true,
  status: true,
  category: true,
  created_at: true,
  updated_at: true,
  revision: true,
  user: { select: { id: true, name: true, role: true } },
  attachments: { select: { id: true, size: true } },
} satisfies Prisma.user_feedbackSelect;

export class FeedbackRepository {
  create(userId: string, input: FeedbackInput, images: Buffer[], fingerprint: string) {
    return withSerializableTransaction(async (tx) => {
      const existing = await tx.user_feedback.findUnique({
        where: { user_id_request_id: { user_id: userId, request_id: input.request_id } },
        select: { id: true, fingerprint: true },
      });
      if (existing)
        return existing.fingerprint === fingerprint
          ? { id: existing.id }
          : { error: "feedback_conflict" };
      const recent = await tx.user_feedback.count({
        where: { user_id: userId, created_at: { gte: new Date(Date.now() - 86_400_000) } },
      });
      if (recent >= 5) return { error: "feedback_limit" };
      return tx.user_feedback.create({
        data: {
          ...input,
          user_id: userId,
          fingerprint,
          attachments: {
            create: images.map((content) => ({
              content: new Uint8Array(content),
              size: content.length,
            })),
          },
        },
        select: { id: true },
      });
    });
  }

  async list(query: FeedbackQuery) {
    const where: Prisma.user_feedbackWhereInput = {
      status: query.status,
      category: query.category,
      ...(query.role ? { user: { role: query.role } } : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q, mode: "insensitive" } },
              { user: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const page = query.page ?? 1;
    const [items, total, new_count] = await prisma.$transaction([
      prisma.user_feedback.findMany({
        where,
        select,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.user_feedback.count({ where }),
      prisma.user_feedback.count({ where: { status: "new" } }),
    ]);
    return { items, total, page, pages: Math.ceil(total / 20), new_count };
  }

  detail(id: string) {
    return prisma.user_feedback.findUnique({
      where: { id },
      select: { ...select, internal_note: true, app_version: true, viewport: true },
    });
  }

  count() {
    return prisma.user_feedback.count({ where: { status: "new" } });
  }

  attachment(feedbackId: string, attachmentId: string) {
    return prisma.feedback_attachment.findFirst({
      where: { id: attachmentId, feedback_id: feedbackId },
    });
  }

  update(id: string, adminId: string, input: FeedbackUpdate) {
    return withSerializableTransaction(async (tx) => {
      const before = await tx.user_feedback.findUnique({ where: { id } });
      if (!before) return { error: "feedback_missing" };
      const { revision, ...data } = input;
      const updated = await tx.user_feedback.updateMany({
        where: { id, revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!updated.count) return { error: "feedback_conflict" };
      await tx.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: "feedback_updated",
          area: "moderacao",
          domain: "feedback",
          target_type: "user_feedback",
          target_id: id,
          changed_fields: [
            "status",
            "category",
            ...(before.internal_note !== data.internal_note ? ["internal_note"] : []),
          ],
          safe_before: { status: before.status, category: before.category, revision },
          safe_after: { status: data.status, category: data.category, revision: revision + 1 },
        },
      });
      return { id };
    });
  }
}
