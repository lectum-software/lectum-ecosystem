import type { Prisma } from "@/external/generated/prisma/client";
import { refreshTestimonialCount } from "@/utils/testimonial-summary";

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

  return {
    review_id: reviewId,
    psychologist_id: review.psychologist_id,
    ...(await refreshTestimonialCount(tx, review.psychologist_id)),
  };
};
