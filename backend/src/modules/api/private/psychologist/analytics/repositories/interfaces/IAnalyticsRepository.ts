import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsResponse,
} from "../../DTOs/IAnalyticsDTO";

export interface IPsychologistAnalyticsRepository {
  hasProfessionalEntitlement(userId: string): Promise<boolean>;
  index(
    data: IPsychologistAnalyticsIndexDTO,
    period: PsychologistAnalyticsPeriod,
  ): Promise<PsychologistAnalyticsResponse>;
}
