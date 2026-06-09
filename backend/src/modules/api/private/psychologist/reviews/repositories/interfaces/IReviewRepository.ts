import type {
  IPsychologistReviewIndexDTO,
  IPsychologistReviewRespondDTO,
  PsychologistReviewResponseResult,
  PsychologistReviewsResponse,
} from "../../DTOs/IReviewDTO";

export interface IPsychologistReviewRepository {
  hasProfessionalEntitlement(userId: string): Promise<boolean>;
  index(data: IPsychologistReviewIndexDTO): Promise<PsychologistReviewsResponse>;
  respond(data: IPsychologistReviewRespondDTO): Promise<PsychologistReviewResponseResult | null>;
}
