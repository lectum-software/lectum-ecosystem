import type { Prisma } from "@/external/generated/prisma/client";

export const visibleTestimonialsWhere = (psychologistId: string | { in: string[] }) => ({
  psychologist_id: psychologistId,
  deleted: false,
  status: "publicada",
  author: { active: true, deleted: false },
});

export const getPublicTestimonialCounts = async (
  client: Prisma.TransactionClient,
  psychologistIds: string[],
) => {
  if (!psychologistIds.length) return new Map<string, number>();
  const groups = await client.professional_review.groupBy({
    by: ["psychologist_id"],
    where: visibleTestimonialsWhere({ in: psychologistIds }),
    _count: { _all: true },
  });
  return new Map(groups.map((row) => [row.psychologist_id, row._count._all]));
};

export const refreshTestimonialCount = async (
  tx: Prisma.TransactionClient,
  psychologistId: string,
) => {
  const rating_count = await tx.professional_review.count({
    where: visibleTestimonialsWhere(psychologistId),
  });
  // Retain the legacy field for older clients, but never calculate an average.
  await tx.psychologist_profile.update({
    where: { user_id: psychologistId },
    data: { rating_avg: 0, rating_count },
  });
  return { rating_avg: 0, rating_count };
};
