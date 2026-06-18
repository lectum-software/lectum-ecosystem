import { z } from "zod";
import { error, msg } from "@/helpers/translate";
import type {
  IPsychologistReviewIndexDTO,
  IPsychologistReviewRespondDTO,
} from "../DTOs/IReviewDTO";
import { PsychologistReviewRepository } from "../repositories/ReviewRepository";

const ensurePsychologist = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "psicologo") return null;
  return { status: 403, ...error("role_not_authorized", {}) };
};

const responseSchema = z.object({
  response: z.string().trim().min(3).max(1000),
});

const ensureProfessionalEntitlement = async (
  repository: PsychologistReviewRepository,
  userId?: string | null,
) => {
  if (!userId) return false;
  return repository.hasProfessionalEntitlement(userId);
};

const emptyDistribution = () =>
  ({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }) satisfies Record<1 | 2 | 3 | 4 | 5, number>;

const buildPreviewResponse = (query: IPsychologistReviewIndexDTO["q"]) => ({
  access: {
    can_receive_reviews: false,
    mode: "preview" as const,
  },
  data: [],
  summary: {
    rating_avg: 0,
    rating_count: 0,
    distribution: emptyDistribution(),
  },
  page: Math.max(1, Number(query.page || 1)),
  pages: 0,
  count: 0,
});

export const index = async (data: IPsychologistReviewIndexDTO) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;

  const repository = new PsychologistReviewRepository();
  const canReceiveReviews = await ensureProfessionalEntitlement(repository, data.auth.id);

  if (!canReceiveReviews) {
    return { status: 200, ...msg("index", {}), data: buildPreviewResponse(data.q) };
  }

  const res = await repository.index(data);
  return { status: 200, ...msg("index", {}), data: res };
};

export const respond = async (data: IPsychologistReviewRespondDTO) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;

  const parsed = responseSchema.safeParse(data.b || {});
  if (!parsed.success) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
      data: parsed.error.flatten(),
    };
  }

  const repository = new PsychologistReviewRepository();
  const canReceiveReviews = await ensureProfessionalEntitlement(repository, data.auth.id);

  if (!canReceiveReviews) {
    return {
      status: 403,
      ...error("professional_reviews_professional_plan", {}),
    };
  }

  const res = await repository.respond({
    ...data,
    b: parsed.data,
  });

  if (!res) {
    return {
      status: 404,
      ...error("not_found", { model: "professional_review" }),
    };
  }

  return { status: 200, ...msg("professional_review_response_saved", {}), data: res };
};
