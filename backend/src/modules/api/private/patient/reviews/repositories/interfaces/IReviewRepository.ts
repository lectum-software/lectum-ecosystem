import type {
  CreateReviewResponse,
  IReviewIndexDTO,
  IReviewStoreDTO,
  PatientReviewsResponse,
  ReviewEligibilityResponse,
} from "../../DTOs/IReviewDTO";

export interface IReviewRepository {
  index(data: IReviewIndexDTO): Promise<PatientReviewsResponse>;
  eligibility(authorId: string, psychologistId: string): Promise<ReviewEligibilityResponse>;
  create(data: IReviewStoreDTO): Promise<CreateReviewResponse | ReviewEligibilityResponse>;
}
