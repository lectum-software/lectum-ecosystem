import type { Prisma } from "@/external/generated/prisma/client";
import { visibleTestimonialsWhere } from "@/utils/testimonial-summary";

export const GOOGLE_DELETE_REAUTH_TTL_MS = 10 * 60 * 1000;

export const ACCOUNT_DELETE_TRANSACTION_OPTIONS = {
  timeout: 30 * 1000,
} as const;

export const getDeletedAuthorName = (role?: string | null) =>
  role === "psicologo" ? "Psicólogo Excluído" : "Membro Excluído";

export const markDeleted = (now: Date) => ({
  deleted: true,
  deletedAt: now,
});

export type AccountDeletionAdminAudit = {
  action?: string;
  adminId: string;
  area?: string;
  changedFields: string[];
  domain?: string;
  metadata: Prisma.InputJsonObject;
  reason: string;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
  targetType?: string;
};

export const recalculatePsychologistRating = async (
  tx: Prisma.TransactionClient,
  psychologistId: string,
) => {
  const count = await tx.professional_review.count({
    where: visibleTestimonialsWhere(psychologistId),
  });

  await tx.psychologist_profile.updateMany({
    where: {
      user_id: psychologistId,
      deleted: false,
    },
    data: {
      rating_avg: 0,
      rating_count: count,
    },
  });
};
