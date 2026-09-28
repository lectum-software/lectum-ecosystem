import type { Prisma } from "@/external/generated/prisma/client";

export const deleteOwnReview = async (
  tx: Prisma.TransactionClient,
  authorId: string,
  reviewId: string,
) => {
  if (!authorId) return null;
  const where = { id: reviewId, author_id: authorId, deleted: false };
  const review = await tx.professional_review.findFirst({
    where,
    select: { psychologist_id: true },
  });
  if (!review) return null;

  const removed = await tx.professional_review.updateMany({
    where,
    data: { deleted: true, deletedAt: new Date() },
  });
  if (!removed.count) return null;

  const aggregate = await tx.professional_review.aggregate({
    where: { psychologist_id: review.psychologist_id, deleted: false, status: "publicada" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const rating_avg = Math.round((aggregate._avg.rating || 0) * 100);
  const rating_count = aggregate._count._all;
  await tx.psychologist_profile.update({
    where: { user_id: review.psychologist_id },
    data: { rating_avg, rating_count },
  });
  return { review_id: reviewId, psychologist_id: review.psychologist_id, rating_avg, rating_count };
};
