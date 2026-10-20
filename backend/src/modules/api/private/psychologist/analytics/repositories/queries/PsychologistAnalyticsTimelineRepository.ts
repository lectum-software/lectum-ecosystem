import prisma from "@/infra/database/prisma";
import { acquiredWeeksWhere } from "@/modules/whatsapp-reports/counts";
import {
  extractSearchFiltersFromTrafficPath,
  extractSearchTermsFromTrafficPath,
  hasDirectorySelectedFilterParams,
  type TrafficFilterLabelLookup,
} from "@/utils/analytics-traffic-path";
import type {
  AnalyticsChartData,
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "../../DTOs/IAnalyticsDTO";
import { dailyPoints, originGroup, uniqueDailyContacts } from "../support/timeline";

type VideoSession = { createdAt: Date; origin_path: string | null };
export async function buildAnalyticsChartData(
  userId: string,
  period: PsychologistAnalyticsPeriod,
  sessions: VideoSession[],
  labels: TrafficFilterLabelLookup,
): Promise<AnalyticsChartData> {
  const createdAt = { gte: period.start_at, lte: period.end_at };
  const [profiles, favorites, contacts, reviews, weeks] = await Promise.all([
    prisma.profile_view_event.findMany({
      where: {
        psychologist_id: userId,
        deleted: false,
        source: "profile_page",
        createdAt,
        OR: [{ viewer_id: null }, { viewer_id: { not: userId } }],
      },
      select: { createdAt: true, search_context_path: true },
    }),
    prisma.psychologist_favorite.findMany({
      where: { psychologist_id: userId, deleted: false, createdAt, user_id: { not: userId } },
      select: { createdAt: true, origin_path: true },
    }),
    prisma.contact_request.findMany({
      where: {
        psychologist_id: userId,
        deleted: false,
        channel: "whatsapp",
        createdAt,
        OR: [{ user_id: null }, { user_id: { not: userId } }],
      },
      select: { id: true, user_id: true, visitor_key: true, createdAt: true },
    }),
    prisma.professional_review.findMany({
      where: { psychologist_id: userId, deleted: false, status: "publicada", createdAt },
      select: { createdAt: true },
    }),
    prisma.professional_whatsapp_week.findMany({
      where: acquiredWeeksWhere(userId, period.start_at, period.end_at),
      select: { week_start: true, week_end: true, acquired_count: true },
    }),
  ]);
  const origins = (
    events: Array<{ createdAt: Date; origin_path: string | null }>,
  ): AnalyticsTimeline => ({
    granularity: "day",
    series: [
      { id: "presentation_video", label: "Vídeo de apresentação" },
      { id: "communities", label: "Comunidades" },
      { id: "unknown", label: "Outras / não identificadas" },
    ].map((series) => ({
      ...series,
      points: dailyPoints(
        events
          .filter((event) => originGroup(event.origin_path) === series.id)
          .map((event) => ({ date: event.createdAt })),
      ),
    })),
  });
  const videoOrigin = (session: VideoSession) =>
    originGroup(session.origin_path) === "presentation_video"
      ? hasDirectorySelectedFilterParams(session.origin_path) ||
        extractSearchTermsFromTrafficPath(session.origin_path).length > 0
        ? "search"
        : "explore"
      : "unknown";
  const terms = new Map<string, { term: string; views: number }>();
  for (const session of sessions) {
    if (videoOrigin(session) !== "search") continue;
    const labelsForSession = new Set([
      ...extractSearchFiltersFromTrafficPath(session.origin_path, labels),
      ...extractSearchTermsFromTrafficPath(session.origin_path),
    ]);
    for (const term of labelsForSession) {
      const key = term.toLocaleLowerCase("pt-BR");
      const existing = terms.get(key);
      terms.set(key, { term: existing?.term ?? term, views: (existing?.views ?? 0) + 1 });
    }
  }
  return {
    timelines: {
      video_views: {
        granularity: "day",
        series: [
          { id: "explore", label: "Explorar" },
          { id: "search", label: "Minha Busca" },
          { id: "unknown", label: "Outras / não identificadas" },
        ].map((series) => ({
          ...series,
          points: dailyPoints(
            sessions
              .filter((session) => videoOrigin(session) === series.id)
              .map((session) => ({ date: session.createdAt })),
          ),
        })),
      },
      profile_views: origins(
        profiles.map((event) => ({ ...event, origin_path: event.search_context_path })),
      ),
      favorites_received: origins(favorites),
      whatsapp_clicks: {
        granularity: "day",
        series: [
          {
            id: "total",
            label: "Pessoas únicas no dia",
            points: dailyPoints(
              uniqueDailyContacts(contacts).map((event) => ({ date: event.createdAt })),
            ),
          },
        ],
      },
      reviews_received: {
        granularity: "day",
        series: [
          {
            id: "total",
            label: "Avaliações",
            points: dailyPoints(reviews.map((event) => ({ date: event.createdAt }))),
          },
        ],
      },
      acquired_patients: {
        granularity: "week",
        series: [
          {
            id: "total",
            label: "Pacientes na semana",
            points: dailyPoints(
              weeks
                .filter((week) => week.acquired_count !== null)
                .map((week) => ({ date: week.week_start, value: week.acquired_count! })),
            ),
          },
        ],
      },
    },
    video_search_terms: [...terms.values()]
      .sort((a, b) => b.views - a.views || a.term.localeCompare(b.term, "pt-BR"))
      .slice(0, 10),
  };
}
