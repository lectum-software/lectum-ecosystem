import type { Prisma } from "@/external/generated/prisma/client";

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
  const aggregate = await tx.professional_review.aggregate({
    where: {
      psychologist_id: psychologistId,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
    },
  });

  await tx.psychologist_profile.updateMany({
    where: {
      user_id: psychologistId,
      deleted: false,
    },
    data: {
      rating_avg: Math.round((aggregate._avg.rating || 0) * 100),
      rating_count: aggregate._count._all,
    },
  });
};
