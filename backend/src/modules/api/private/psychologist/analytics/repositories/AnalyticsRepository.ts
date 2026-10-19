import prisma from "@/infra/database/prisma";
import type { IPsychologistAnalyticsRepository } from "./interfaces/IAnalyticsRepository";
import { PsychologistAnalyticsCommunityRepository } from "./queries/PsychologistAnalyticsCommunityRepository";
import { PsychologistAnalyticsSummaryRepository } from "./queries/PsychologistAnalyticsSummaryRepository";

export class PsychologistAnalyticsRepository implements IPsychologistAnalyticsRepository {
  async presentationVideoPreview(userId: string) {
    return prisma.psychologist_profile.findFirst({
      where: { user_id: userId, deleted: false },
      select: { video_url: true, video_cover_url: true },
    });
  }

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
