import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsPresentationVideoMetric,
  PsychologistAnalyticsPresentationVideoRetentionPoint,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsUnavailableMetric,
} from "../DTOs/IAnalyticsDTO";
import type { IPsychologistAnalyticsRepository } from "./interfaces/IAnalyticsRepository";

const unavailableProfileViews: PsychologistAnalyticsUnavailableMetric = {
  id: "profile_views",
  label: "Visualizações de perfil",
  source: "profile_view_event",
  reason: "source_not_available",
  description:
    "Visualizações de perfil ainda não possuem evento persistido. A métrica fica ausente para evitar simulação.",
};

const toCards = (
  metrics: PsychologistAnalyticsResponse["metrics"],
): PsychologistAnalyticsMetric[] => [
  {
    id: "whatsapp_clicks",
    label: "Conversões WhatsApp",
    value: metrics.whatsapp_clicks,
    source: "contact_request",
    unit: "count",
    description: "Contatos pelo WhatsApp registrados no período selecionado.",
  },
  {
    id: "reviews_received",
    label: "Avaliações recebidas",
    value: metrics.reviews_received,
    source: "professional_review",
    unit: "count",
    description: "Avaliações públicas recebidas no período selecionado.",
  },
  {
    id: "rating_average",
    label: "Nota média",
    value: metrics.rating_average,
    source: "psychologist_profile",
    unit: "rating",
    description: "Média materializada no perfil profissional com avaliações publicadas.",
  },
  {
    id: "posts_published",
    label: "Posts publicados",
    value: metrics.posts_published,
    source: "community_post",
    unit: "count",
    description: "Publicações de comunidade feitas por você no período selecionado.",
  },
  {
    id: "post_engagement",
    label: "Engajamento em posts",
    value: metrics.post_engagement,
    source: "community_post",
    unit: "count",
    description: "Soma de votos positivos e respostas dos seus posts no período.",
  },
];

const percentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
};

const toPresentationVideoCards = (
  metrics: PsychologistAnalyticsPresentationVideo["metrics"],
): PsychologistAnalyticsPresentationVideoMetric[] => [
  {
    id: "views",
    label: "Visualizações",
    value: metrics.views,
    unit: "count",
    description: "Sessões reais em que o vídeo de apresentação foi reproduzido.",
  },
  {
    id: "average_watch_seconds",
    label: "Tempo médio assistido",
    value: metrics.average_watch_seconds,
    unit: "seconds",
    description: "Média do tempo único assistido por visualização.",
  },
  {
    id: "completion_rate",
    label: "Taxa de conclusão",
    value: metrics.completion_rate,
    unit: "percent",
    description: "Percentual de visualizações que chegaram ao fim do vídeo.",
  },
  {
    id: "replay_rate",
    label: "Taxa de replays",
    value: metrics.replay_rate,
    unit: "percent",
    description: "Percentual de visualizações com reprodução repetida.",
  },
  {
    id: "abandonment_rate",
    label: "Taxa de abandono",
    value: metrics.abandonment_rate,
    unit: "percent",
    description: "Visualizações que não chegaram ao fim do vídeo.",
  },
];

export class PsychologistAnalyticsRepository implements IPsychologistAnalyticsRepository {
  async hasProfessionalEntitlement(userId: string): Promise<boolean> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
        subscriptions: {
          some: activeProfessionalEntitlementWhere(),
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async index(
    data: IPsychologistAnalyticsIndexDTO,
    period: PsychologistAnalyticsPeriod,
    hasProfessionalEntitlement: boolean,
  ): Promise<PsychologistAnalyticsResponse> {
    const userId = data.auth.id!;
    const createdAtWindow = {
      gte: period.start_at,
      lte: period.end_at,
    };

    const [whatsappClicks, reviewsReceived, profile, postsAggregate, presentationVideoSessions] =
      await Promise.all([
        prisma.contact_request.count({
          where: {
            psychologist_id: userId,
            deleted: false,
            channel: "whatsapp",
            createdAt: createdAtWindow,
          },
        }),
        prisma.professional_review.count({
          where: {
            psychologist_id: userId,
            deleted: false,
            status: "publicada",
            createdAt: createdAtWindow,
          },
        }),
        prisma.psychologist_profile.findFirst({
          where: {
            user_id: userId,
            deleted: false,
          },
          select: {
            rating_avg: true,
            rating_count: true,
            video_cover_url: true,
            video_url: true,
          },
        }),
        prisma.community_post.aggregate({
          where: {
            author_id: userId,
            deleted: false,
            status: "publicado",
            createdAt: createdAtWindow,
          },
          _count: { _all: true },
          _sum: {
            upvotes_count: true,
            replies_count: true,
          },
        }),
        prisma.profile_video_watch_session.findMany({
          where: {
            psychologist_id: userId,
            deleted: false,
            createdAt: createdAtWindow,
            OR: [
              {
                watched_seconds: {
                  gt: 0,
                },
              },
              {
                max_position_seconds: {
                  gt: 0,
                },
              },
            ],
          },
          select: {
            watched_seconds: true,
            completed: true,
            replay_count: true,
            milestone_25: true,
            milestone_50: true,
            milestone_75: true,
            milestone_100: true,
            last_event_at: true,
          },
        }),
      ]);

    const postUpvotes = postsAggregate._sum.upvotes_count || 0;
    const postReplies = postsAggregate._sum.replies_count || 0;
    const metrics = {
      whatsapp_clicks: whatsappClicks,
      reviews_received: reviewsReceived,
      rating_average: profile?.rating_avg || 0,
      rating_count_total: profile?.rating_count || 0,
      posts_published: postsAggregate._count._all,
      post_engagement: postUpvotes + postReplies,
      post_upvotes: postUpvotes,
      post_replies: postReplies,
    };
    const videoViews = presentationVideoSessions.length;
    const totalWatchedSeconds = presentationVideoSessions.reduce(
      (sum, session) => sum + session.watched_seconds,
      0,
    );
    const completedViews = presentationVideoSessions.filter(
      (session) => session.completed || session.milestone_100,
    ).length;
    const replayedViews = presentationVideoSessions.filter(
      (session) => session.replay_count > 0,
    ).length;
    const latestVideoEventAt =
      presentationVideoSessions
        .map((session) => session.last_event_at)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const retentionPoints: PsychologistAnalyticsPresentationVideoRetentionPoint[] = [
      {
        milestone: 25,
        viewers: presentationVideoSessions.filter((session) => session.milestone_25).length,
        rate: percentage(
          presentationVideoSessions.filter((session) => session.milestone_25).length,
          videoViews,
        ),
      },
      {
        milestone: 50,
        viewers: presentationVideoSessions.filter((session) => session.milestone_50).length,
        rate: percentage(
          presentationVideoSessions.filter((session) => session.milestone_50).length,
          videoViews,
        ),
      },
      {
        milestone: 75,
        viewers: presentationVideoSessions.filter((session) => session.milestone_75).length,
        rate: percentage(
          presentationVideoSessions.filter((session) => session.milestone_75).length,
          videoViews,
        ),
      },
      {
        milestone: 100,
        viewers: completedViews,
        rate: percentage(completedViews, videoViews),
      },
    ];
    const presentationVideoMetrics = {
      views: videoViews,
      average_watch_seconds: videoViews > 0 ? Math.round(totalWatchedSeconds / videoViews) : 0,
      completion_rate: percentage(completedViews, videoViews),
      replay_rate: percentage(replayedViews, videoViews),
      abandonment_rate: videoViews > 0 ? percentage(videoViews - completedViews, videoViews) : 0,
    };
    const presentationVideo: PsychologistAnalyticsPresentationVideo = {
      updated_at: latestVideoEventAt,
      video_url: profile?.video_url ?? null,
      video_cover_url: profile?.video_cover_url ?? null,
      metrics: presentationVideoMetrics,
      cards: toPresentationVideoCards(presentationVideoMetrics),
      retention: {
        average_retention_rate:
          retentionPoints.length > 0
            ? Math.round(
                retentionPoints.reduce((sum, point) => sum + point.rate, 0) /
                  retentionPoints.length,
              )
            : 0,
        points: retentionPoints,
      },
    };

    return {
      access: {
        has_professional_entitlement: hasProfessionalEntitlement,
        mode: hasProfessionalEntitlement ? "full" : "preview",
      },
      period,
      metrics,
      cards: toCards(metrics),
      presentation_video: presentationVideo,
      unavailable: [unavailableProfileViews],
    };
  }
}
