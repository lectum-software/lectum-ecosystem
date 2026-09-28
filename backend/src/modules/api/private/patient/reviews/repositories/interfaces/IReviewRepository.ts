import type {
  CreateReviewResponse,
  IReviewIndexDTO,
  IReviewStoreDTO,
  PatientReviewsResponse,
  ReviewEligibilityResponse,
} from "../../DTOs/IReviewDTO";

export interface IReviewRepository {
  remove(authorId: string, reviewId: string): Promise<CreateReviewResponse | null>;
  index(data: IReviewIndexDTO): Promise<PatientReviewsResponse>;
  eligibility(authorId: string, psychologistId: string): Promise<ReviewEligibilityResponse>;
  create(data: IReviewStoreDTO): Promise<CreateReviewResponse | ReviewEligibilityResponse>;
}
