import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
} from "@/utils/subscription-entitlement";
import type {
  CreateReviewResponse,
  IReviewIndexDTO,
  IReviewStoreDTO,
  PatientReviewsResponse,
  ReviewEligibilityResponse,
} from "../DTOs/IReviewDTO";
import type { IReviewRepository } from "./interfaces/IReviewRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const normalizePagination = (query: IReviewIndexDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));
  return { page, limit, skip: (page - 1) * limit };
};

export class ReviewRepository implements IReviewRepository {
  async index(data: IReviewIndexDTO): Promise<PatientReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.professional_reviewWhereInput = {
      author_id: data.auth.id!,
      deleted: false,
      psychologist: { deleted: false, role: "psicologo" },
    };

    const [items, count] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          psychologist_id: true,
          rating: true,
          comment: true,
          response: true,
          responded_at: true,
          status: true,
          createdAt: true,
          psychologist: {
            select: {
              name: true,
              avatar: true,
              psychologist_profile: {
                select: {
                  headline: true,
                  crp: true,
                  gender: true,
                  cfp_verified_at: true,
                  subscriptions: {
                    where: activeProfessionalEntitlementWhere(),
                    select: { id: true, source: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      prisma.professional_review.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        psychologist_id: item.psychologist_id,
        psychologist_name:
          normalizeProfessionalDisplayName(item.psychologist.name) || item.psychologist.name,
        psychologist_avatar: item.psychologist.avatar,
        psychologist_headline: item.psychologist.psychologist_profile?.headline ?? null,
        psychologist_crp: item.psychologist.psychologist_profile?.crp ?? null,
        psychologist_gender: item.psychologist.psychologist_profile?.gender ?? null,
        psychologist_verified: isVerifiedProfessionalEntitlement(
          item.psychologist.psychologist_profile,
        ),
        rating: item.rating,
        comment: item.comment,
        response: item.response,
        responded_at: item.responded_at,
        status: item.status,
        created_at: item.createdAt,
      })),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async eligibility(authorId: string, psychologistId: string): Promise<ReviewEligibilityResponse> {
    const psychologist = await prisma.user.findFirst({
      where: {
        id: psychologistId,
        role: "psicologo",
        active: true,
        deleted: false,
        psychologist_profile: {
          is: {
            published: true,
            deleted: false,
            video_url: {
              not: null,
            },
            NOT: [
              {
                video_url: "",
              },
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        psychologist_profile: {
          select: {
            headline: true,
            crp: true,
            gender: true,
            cfp_verified_at: true,
            subscriptions: {
              where: activeProfessionalEntitlementWhere(),
              select: { id: true, source: true },
              take: 1,
            },
          },
        },
      },
    });

    const base = {
      psychologist_id: psychologistId,
      psychologist_name:
        normalizeProfessionalDisplayName(psychologist?.name) ||
        psychologist?.name ||
        "Psic\u00f3logo",
      psychologist_avatar: psychologist?.avatar ?? null,
      psychologist_headline: psychologist?.psychologist_profile?.headline ?? null,
      psychologist_crp: psychologist?.psychologist_profile?.crp ?? null,
      psychologist_gender: psychologist?.psychologist_profile?.gender ?? null,
      psychologist_verified: isVerifiedProfessionalEntitlement(psychologist?.psychologist_profile),
      contact_request_id: null,
      existing_review_id: null,
    };

    if (!psychologist) return { ...base, eligible: false, reason: "not_found" };
    if (authorId === psychologistId) return { ...base, eligible: false, reason: "own_profile" };

    const existing = await prisma.professional_review.findUnique({
      where: {
        psychologist_id_author_id: { psychologist_id: psychologistId, author_id: authorId },
      },
      select: { id: true, deleted: true },
    });

    if (existing && !existing.deleted) {
      return {
        ...base,
        eligible: false,
        reason: "already_reviewed",
        existing_review_id: existing.id,
      };
    }

    return { ...base, eligible: true, reason: "eligible", contact_request_id: null };
  }

  async create(data: IReviewStoreDTO): Promise<CreateReviewResponse | ReviewEligibilityResponse> {
    const authorId = data.auth.id!;
    const psychologistId = data.b.psychologist_id;
    const eligible = await this.eligibility(authorId, psychologistId);

    if (!eligible.eligible) return eligible;

    return prisma.$transaction(async (tx) => {
      const review = await tx.professional_review.create({
        data: {
          author_id: authorId,
          psychologist_id: psychologistId,
          rating: data.b.rating,
          comment: data.b.comment.trim(),
          status: "publicada",
        },
        select: { id: true },
      });

      const aggregate = await tx.professional_review.aggregate({
        where: { psychologist_id: psychologistId, deleted: false, status: "publicada" },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const ratingCount = aggregate._count._all;
      const ratingAvg = Math.round((aggregate._avg.rating || 0) * 100);

      await tx.psychologist_profile.update({
        where: { user_id: psychologistId },
        data: { rating_avg: ratingAvg, rating_count: ratingCount },
      });

      return {
        review_id: review.id,
        psychologist_id: psychologistId,
        rating_avg: ratingAvg,
        rating_count: ratingCount,
      };
    });
  }
}
