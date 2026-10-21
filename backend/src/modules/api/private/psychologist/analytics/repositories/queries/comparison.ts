import prisma from "@/infra/database/prisma";
import { acquiredPatientsSummary, whatsappPeopleCounts } from "@/modules/whatsapp-reports/counts";
import type { AnalyticsComparison, PsychologistAnalyticsPeriod } from "../../DTOs/IAnalyticsDTO";
import { previousAnalyticsPeriod } from "../support/comparison";

export async function buildAnalyticsComparison(
  userId: string,
  period: PsychologistAnalyticsPeriod,
  videoUrl: string | null,
): Promise<AnalyticsComparison | null> {
  const previous = previousAnalyticsPeriod(period);
  if (!previous) return null;
  const createdAt = { gte: previous.start_at, lte: previous.end_at };
  const viewers = [{ viewer_id: null }, { viewer_id: { not: userId } }];
  const [contacts, views, favorites, reviews, videoViews, acquired] = await Promise.all([
    whatsappPeopleCounts(previous.start_at, new Date(previous.end_at.getTime() + 1), userId),
    prisma.profile_view_event.count({
      where: {
        psychologist_id: userId,
        deleted: false,
        createdAt,
        source: "profile_page",
        OR: viewers,
      },
    }),
    prisma.psychologist_favorite.count({
      where: {
        psychologist_id: userId,
        deleted: false,
        createdAt,
        user_id: { not: userId },
      },
    }),
    prisma.professional_review.count({
      where: {
        psychologist_id: userId,
        deleted: false,
        createdAt,
        status: "publicada",
      },
    }),
    videoUrl
      ? prisma.profile_video_watch_session.count({
          where: {
            psychologist_id: userId,
            deleted: false,
            createdAt,
            video_url: videoUrl,
            AND: [
              { OR: viewers },
              { OR: [{ watched_seconds: { gt: 0 } }, { max_position_seconds: { gt: 0 } }] },
            ],
          },
        })
      : Promise.resolve(0),
    acquiredPatientsSummary(userId, previous.start_at, previous.end_at),
  ]);
  return {
    previous_period: previous,
    previous_values: {
      whatsapp_clicks: contacts[0]?.people_count ?? 0,
      profile_views: views,
      favorites_received: favorites,
      reviews_received: reviews,
      video_views: videoViews,
      acquired_patients: acquired.unanswered_weeks ? null : acquired.acquired_patients,
    },
  };
}
