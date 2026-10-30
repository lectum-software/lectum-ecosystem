import type {
  IPsychologistReviewIndexDTO,
  IPsychologistReviewRespondDTO,
  PsychologistReviewResponseResult,
  PsychologistReviewsResponse,
} from "../../DTOs/IReviewDTO";

export interface IPsychologistReviewRepository {
  setVisibility(
    userId: string,
    reviewId: string,
    hidden: boolean,
  ): Promise<{ psychologist_id: string; rating_avg: number; rating_count: number } | null>;
  removeResponse(userId: string, reviewId: string): Promise<{ psychologist_id: string } | null>;
  hasProfessionalEntitlement(userId: string): Promise<boolean>;
  index(
    data: IPsychologistReviewIndexDTO,
    options?: { canReceiveReviews?: boolean },
  ): Promise<PsychologistReviewsResponse>;
  respond(data: IPsychologistReviewRespondDTO): Promise<PsychologistReviewResponseResult | null>;
}
