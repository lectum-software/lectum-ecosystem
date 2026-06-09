import { error, msg } from "@/helpers/translate";
import type {
  IReviewEligibilityDTO,
  IReviewIndexDTO,
  IReviewStoreDTO,
  ReviewEligibilityResponse,
} from "../DTOs/IReviewDTO";
import { ReviewRepository } from "../repositories/ReviewRepository";

const ensurePatient = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "paciente") return null;
  return { status: 403, ...error("role_not_authorized", {}) };
};

const eligibilityError = (result: ReviewEligibilityResponse) => {
  if (result.reason === "not_found")
    return { status: 404, ...error("not_found", { model: "psychologist_profile" }), data: result };
  if (result.reason === "contact_required")
    return { status: 403, ...error("review_contact_required", {}), data: result };
  if (result.reason === "already_reviewed")
    return { status: 409, ...error("review_already_exists", {}), data: result };
  if (result.reason === "own_profile")
    return { status: 403, ...error("review_own_profile", {}), data: result };
  if (result.reason === "professional_plan_required")
    return { status: 403, ...error("professional_reviews_professional_plan", {}), data: result };
  return { status: 403, ...error("review_contact_required", {}), data: result };
};

export const index = async (data: IReviewIndexDTO) => {
  const unauthorized = ensurePatient(data);
  if (unauthorized) return unauthorized;
  const repository = new ReviewRepository();
  const res = await repository.index(data);
  return { status: 200, ...msg("index", {}), data: res };
};

export const eligibility = async (data: IReviewEligibilityDTO) => {
  const unauthorized = ensurePatient(data);
  if (unauthorized) return unauthorized;
  const repository = new ReviewRepository();
  const res = await repository.eligibility(data.auth.id!, data.p.id);
  return { status: 200, ...msg("show", {}), data: res };
};

export const store = async (data: IReviewStoreDTO) => {
  const unauthorized = ensurePatient(data);
  if (unauthorized) return unauthorized;
  const repository = new ReviewRepository();
  const res = await repository.create(data);
  if ("eligible" in res && !res.eligible) return eligibilityError(res);
  return { status: 201, ...msg("review_success", {}), data: res };
};
