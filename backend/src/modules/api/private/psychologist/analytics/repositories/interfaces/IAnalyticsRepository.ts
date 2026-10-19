import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsResponse,
} from "../../DTOs/IAnalyticsDTO";

export interface IPsychologistAnalyticsRepository {
  hasProfessionalEntitlement(userId: string): Promise<boolean>;
  presentationVideoPreview(userId: string): Promise<{
    video_url: string | null;
    video_cover_url: string | null;
  } | null>;
  index(
    data: IPsychologistAnalyticsIndexDTO,
    period: PsychologistAnalyticsPeriod,
    hasProfessionalEntitlement: boolean,
  ): Promise<PsychologistAnalyticsResponse>;
}
