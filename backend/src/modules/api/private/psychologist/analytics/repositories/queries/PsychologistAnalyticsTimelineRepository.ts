import prisma from "@/infra/database/prisma";
import { acquiredWeeksWhere } from "@/modules/whatsapp-reports/counts";
import type { PersonAction } from "@/modules/whatsapp-reports/people";
import {
  extractSearchFiltersFromTrafficPath,
  extractSearchTermsFromTrafficPath,
  type TrafficFilterLabelLookup,
} from "@/utils/analytics-traffic-path";
import type {
  AnalyticsChartData,
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "../../DTOs/IAnalyticsDTO";
import { dailyPoints, originGroup, presentationVideoOrigin } from "../support/timeline";

import { whatsappOriginGroups } from "../support/whatsapp-origins";
import { whatsappTimeline } from "../support/whatsapp-timeline";

type VideoSession = { createdAt: Date; origin_path: string | null };
export async function buildAnalyticsChartData(
  userId: string,
  period: PsychologistAnalyticsPeriod,
  sessions: VideoSession[],
  labels: TrafficFilterLabelLookup,
  actions: {
    allWhatsapp: Array<
      PersonAction & {
        action_type: string;
        target_type: string | null;
        page_kind: string;
        path: string | null;
      }
    >;
  },
): Promise<AnalyticsChartData> {
  const createdAt = { gte: period.start_at, lte: period.end_at };
  const [profiles, favorites, reviews, weeks] = await Promise.all([
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
    extra: { id: "favorites" | "profile"; label: string },
  ): AnalyticsTimeline => ({
    granularity: "day",
    series: [
      { id: "presentation_video", label: "Vídeo de apresentação" },
      { id: "communities", label: "Comunidades" },
      extra,
      { id: "unknown", label: "Outras / não identificadas" },
    ].map((series) => ({
      ...series,
      points: dailyPoints(
        events
          .filter((event) => {
            const origin = originGroup(event.origin_path);
            const assigned = ["presentation_video", "communities", extra.id].includes(origin)
              ? origin
              : "unknown";
            return assigned === series.id;
          })
          .map((event) => ({ date: event.createdAt })),
      ),
    })),
  });
  const terms = new Map<string, { term: string; views: number }>();
  for (const session of sessions) {
    if (presentationVideoOrigin(session.origin_path) !== "search") continue;
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
          { id: "profile", label: "Perfil" },
          { id: "unknown", label: "Origem não identificada" },
        ].map((series) => ({
          ...series,
          points: dailyPoints(
            sessions
              .filter((session) => presentationVideoOrigin(session.origin_path) === series.id)
              .map((session) => ({ date: session.createdAt })),
          ),
        })),
      },
      profile_views: origins(
        profiles.map((event) => ({ ...event, origin_path: event.search_context_path })),
        { id: "favorites", label: "Página de favoritos" },
      ),
      favorites_received: origins(favorites, { id: "profile", label: "Perfil" }),
      whatsapp_clicks: whatsappTimeline(whatsappOriginGroups(actions.allWhatsapp)),
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
