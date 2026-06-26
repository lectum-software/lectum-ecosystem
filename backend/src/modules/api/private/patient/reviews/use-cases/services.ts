import { error, msg } from "@/helpers/translate";
import { notifyNewProfessionalReview } from "@/main/notification/domain-events";
import type {
  IReviewEligibilityDTO,
  IReviewIndexDTO,
  IReviewStoreDTO,
  ReviewEligibilityResponse,
} from "../DTOs/IReviewDTO";
import { ReviewRepository } from "../repositories/ReviewRepository";

const eligibilityError = (result: ReviewEligibilityResponse) => {
  if (result.reason === "not_found")
    return { status: 404, ...error("not_found", { model: "psychologist_profile" }), data: result };
  if (result.reason === "already_reviewed")
    return { status: 409, ...error("review_already_exists", {}), data: result };
  if (result.reason === "own_profile")
    return { status: 403, ...error("review_own_profile", {}), data: result };
  return { status: 403, ...error("review_own_profile", {}), data: result };
};

export const index = async (data: IReviewIndexDTO) => {
  const repository = new ReviewRepository();
  const res = await repository.index(data);
  return { status: 200, ...msg("index", {}), data: res };
};

export const eligibility = async (data: IReviewEligibilityDTO) => {
  const repository = new ReviewRepository();
  const res = await repository.eligibility(data.auth.id!, data.p.id);
  return { status: 200, ...msg("show", {}), data: res };
};

export const store = async (data: IReviewStoreDTO) => {
  const repository = new ReviewRepository();
  const res = await repository.create(data);
  if ("eligible" in res) return eligibilityError(res);
  await notifyNewProfessionalReview({
    actorId: data.auth.id!,
    psychologistId: res.psychologist_id,
    reviewId: res.review_id,
  });
  return { status: 201, ...msg("review_success", {}), data: res };
};
