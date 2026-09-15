import type { IPsychologistAnalyticsRepository } from "./interfaces/IAnalyticsRepository";
import { PsychologistAnalyticsCommunityRepository } from "./queries/PsychologistAnalyticsCommunityRepository";
import { PsychologistAnalyticsSummaryRepository } from "./queries/PsychologistAnalyticsSummaryRepository";

export class PsychologistAnalyticsRepository implements IPsychologistAnalyticsRepository {
  private readonly communityRepository = new PsychologistAnalyticsCommunityRepository();

  private readonly summaryRepository = new PsychologistAnalyticsSummaryRepository(
    this.communityRepository,
  );

  hasProfessionalEntitlement(
    ...args: Parameters<PsychologistAnalyticsCommunityRepository["hasProfessionalEntitlement"]>
  ): ReturnType<PsychologistAnalyticsCommunityRepository["hasProfessionalEntitlement"]> {
    return this.communityRepository.hasProfessionalEntitlement(...args);
  }

  index(
    ...args: Parameters<PsychologistAnalyticsSummaryRepository["index"]>
  ): ReturnType<PsychologistAnalyticsSummaryRepository["index"]> {
    return this.summaryRepository.index(...args);
  }
}
