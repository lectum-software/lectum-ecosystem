import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import { refreshTestimonialCount } from "@/utils/testimonial-summary";
import type {
  IPsychologistReviewIndexDTO,
  IPsychologistReviewRespondDTO,
  PsychologistReviewAuthor,
  PsychologistReviewItem,
  PsychologistReviewResponseResult,
  PsychologistReviewSummary,
  PsychologistReviewsResponse,
} from "../DTOs/IReviewDTO";
import type { IPsychologistReviewRepository } from "./interfaces/IReviewRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const normalizePagination = (query: IPsychologistReviewIndexDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const toSafeAuthor = (name: string): PsychologistReviewAuthor => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      initials: "P",
      name: "Paciente",
    };
  }

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : "";
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : firstName.slice(0, 2).toUpperCase();

  return {
    initials,
    name: [firstName, lastInitial].filter(Boolean).join(" "),
  };
};

const resolvePeriodStart = (period?: string) => {
  if (!period || period === "all") return null;

  const daysByPeriod: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const days = daysByPeriod[period];

  if (!days) return null;

  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const emptyDistribution = () =>
  ({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }) satisfies Record<1 | 2 | 3 | 4 | 5, number>;

const toDistribution = (rows: Array<{ rating: number; _count: { rating: number } }>) => {
  const distribution = emptyDistribution();

  for (const row of rows) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
    }
  }

  return distribution;
};

const toReviewItem = (item: {
  status: string;
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: Date | null;
  createdAt: Date;
  author: { name: string };
}): PsychologistReviewItem => ({
  status: item.status,
  id: item.id,
  rating: item.rating,
  comment: item.comment,
  response: item.response,
  responded_at: item.responded_at,
  created_at: item.createdAt,
  author: toSafeAuthor(item.author.name),
});

const summaryWhere = (psychologistId: string): Prisma.professional_reviewWhereInput => ({
  psychologist_id: psychologistId,
  deleted: false,
  status: "publicada",
  author: {
    active: true,
    deleted: false,
  },
});

const getSummary = async (
  client: Prisma.TransactionClient,
  psychologistId: string,
): Promise<PsychologistReviewSummary> => {
  const [aggregate, distributionRows] = await Promise.all([
    client.professional_review.aggregate({
      where: summaryWhere(psychologistId),
      _count: { _all: true },
    }),
    client.professional_review.groupBy({
      by: ["rating"],
      where: summaryWhere(psychologistId),
      _count: { rating: true },
    }),
  ]);

  return {
    rating_avg: 0,
    rating_count: aggregate._count._all,
    distribution: toDistribution(distributionRows),
  };
};

export class PsychologistReviewRepository implements IPsychologistReviewRepository {
  async hasProfessionalEntitlement(userId: string): Promise<boolean> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
        subscriptions: {
          some: activeProfessionalEntitlementWhere(),
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async index(
    data: IPsychologistReviewIndexDTO,
    options: { canReceiveReviews?: boolean } = {},
  ): Promise<PsychologistReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const periodStart = resolvePeriodStart(data.q.period);
    const visibilityWhere: Prisma.professional_reviewWhereInput = {
      ...summaryWhere(data.auth.id!),
      status: undefined,
      ...(data.q.rating ? { rating: data.q.rating } : {}),
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    };
    const where: Prisma.professional_reviewWhereInput = {
      ...visibilityWhere,
      status:
        data.q.visibility === "all"
          ? undefined
          : data.q.visibility === "hidden"
            ? { in: ["oculta_profissional", "oculta"] }
            : "publicada",
    };

    const [items, count, totals, distributionRows, visibilityRows] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          rating: true,
          comment: true,
          response: true,
          responded_at: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      }),
      prisma.professional_review.count({ where }),
      getSummary(prisma, data.auth.id!),
      prisma.professional_review.groupBy({
        by: ["rating"],
        where: summaryWhere(data.auth.id!),
        _count: { rating: true },
      }),
      prisma.professional_review.groupBy({
        by: ["status"],
        where: visibilityWhere,
        _count: { _all: true },
      }),
    ]);

    const visibilityCounts = { visible: 0, hidden: 0, all: 0 };
    for (const row of visibilityRows) {
      visibilityCounts.all += row._count._all;
      if (row.status === "publicada") visibilityCounts.visible += row._count._all;
      if (row.status === "oculta_profissional" || row.status === "oculta")
        visibilityCounts.hidden += row._count._all;
    }

    return {
      visibility_counts: visibilityCounts,
      access: {
        can_receive_reviews: options.canReceiveReviews ?? true,
        mode: "full",
      },
      data: items.map(toReviewItem),
      summary: {
        rating_avg: 0,
        rating_count: totals.rating_count,
        distribution: toDistribution(distributionRows),
      },
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async respond(
    data: IPsychologistReviewRespondDTO,
  ): Promise<PsychologistReviewResponseResult | null> {
    const response = data.b.response.trim();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.professional_review.findFirst({
        where: {
          id: data.p.id,
          psychologist_id: data.auth.id!,
          deleted: false,
        },
        select: { id: true },
      });

      if (!existing) return null;

      const review = await tx.professional_review.update({
        where: { id: existing.id },
        data: {
          response,
          responded_at: new Date(),
        },
        select: {
          id: true,
          status: true,
          rating: true,
          comment: true,
          response: true,
          responded_at: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      });

      const summary = await getSummary(tx, data.auth.id!);

      await tx.psychologist_profile.update({
        where: { user_id: data.auth.id! },
        data: {
          rating_avg: summary.rating_avg,
          rating_count: summary.rating_count,
        },
      });

      return {
        psychologist_id: data.auth.id!,
        review: toReviewItem(review),
        summary,
      };
    });
  }

  async setVisibility(userId: string, reviewId: string, hidden: boolean) {
    return withSerializableTransaction(async (tx) => {
      const result = await tx.professional_review.updateMany({
        where: {
          id: reviewId,
          psychologist_id: userId,
          deleted: false,
          status: { in: ["publicada", "oculta_profissional"] },
        },
        data: { status: hidden ? "oculta_profissional" : "publicada" },
      });
      if (!result.count) return null;
      return { psychologist_id: userId, ...(await refreshTestimonialCount(tx, userId)) };
    });
  }

  async removeResponse(userId: string, reviewId: string) {
    const result = await prisma.professional_review.updateMany({
      where: { id: reviewId, psychologist_id: userId, deleted: false },
      data: { response: null, responded_at: null },
    });
    return result.count ? { psychologist_id: userId } : null;
  }
}
