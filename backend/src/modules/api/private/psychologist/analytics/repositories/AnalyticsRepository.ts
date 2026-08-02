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
  PsychologistAnalyticsTrafficSource,
  PsychologistAnalyticsTrafficSources,
} from "../DTOs/IAnalyticsDTO";
import type { IPsychologistAnalyticsRepository } from "./interfaces/IAnalyticsRepository";

const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);
const PROFILE_VIDEO_ACTION_TYPES = [
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
] as const;

type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];

const trafficSourceDefinitions: Array<
  Pick<PsychologistAnalyticsTrafficSource, "description" | "id" | "label">
> = [
  {
    id: "presentation_video",
    label: "Vídeo de apresentação",
    description: "Acessos originados a partir do vídeo de apresentação do seu perfil.",
  },
  {
    id: "communities",
    label: "Comunidades",
    description:
      "Acessos originados por posts, comentários, respostas, ranking Top Mentor e demais interações dentro das comunidades.",
  },
  {
    id: "direct_link",
    label: "Perfil",
    description: "Acessos originados pelo link do perfil compartilhado externamente.",
  },
  {
    id: "favorites",
    label: "Favoritos",
    description:
      "Acessos originados a partir da área de psicólogos favoritos, retorno de usuários que já favoritaram seu perfil antes.",
  },
];

const toTrafficSources = (): PsychologistAnalyticsTrafficSources => {
  const sources = trafficSourceDefinitions.map((source) => ({
    ...source,
    profile_views: 0,
    whatsapp_clicks: 0,
    conversion_rate: 0,
    badge: null,
  }));

  return {
    updated_at: null,
    description: "Entenda quais canais mais levam pacientes ao seu WhatsApp.",
    source: "traffic_origin_events",
    sources,
  };
};

const toCards = (
  metrics: PsychologistAnalyticsResponse["metrics"],
): PsychologistAnalyticsMetric[] => [
  {
    id: "search_results",
    label: "Resultados de busca",
    value: metrics.search_results,
    source: "profile_view_event",
    unit: "count",
    description: "Impressões reais do seu card ou vídeo nos resultados de busca.",
  },
  {
    id: "profile_views",
    label: "Visualizações de perfil",
    value: metrics.profile_views,
    source: "profile_view_event",
    unit: "count",
    description: "Aberturas reais do perfil profissional registradas no período selecionado.",
  },
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

const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

const deriveRetentionBucketsFromPosition = (
  maxPositionSeconds: number,
  durationSeconds: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (durationSeconds <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPositionSeconds / durationSeconds) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
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

const countVideoActionEvents = (
  actions: Array<{ action_type: string; occurred_at: Date }>,
): Pick<
  PsychologistAnalyticsPresentationVideo["metrics"],
  | "favorites_from_video"
  | "profile_accesses_from_video"
  | "shares_from_video"
  | "whatsapp_clicks_from_video"
> => {
  const counts = new Map<ProfileVideoActionType, number>(
    PROFILE_VIDEO_ACTION_TYPES.map((actionType) => [actionType, 0]),
  );

  for (const action of actions) {
    const actionType = action.action_type as ProfileVideoActionType;
    if (!counts.has(actionType)) continue;
    counts.set(actionType, (counts.get(actionType) ?? 0) + 1);
  }

  return {
    favorites_from_video: counts.get("psychologist_video_favorite") ?? 0,
    profile_accesses_from_video: counts.get("psychologist_video_profile_access") ?? 0,
    shares_from_video: counts.get("psychologist_video_share") ?? 0,
    whatsapp_clicks_from_video: counts.get("psychologist_video_whatsapp_click") ?? 0,
  };
};

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

    const [
      profileViews,
      searchResults,
      whatsappClicks,
      reviewsReceived,
      profile,
      postsAggregate,
      presentationVideoSessions,
      presentationVideoActionEvents,
    ] = await Promise.all([
      prisma.profile_view_event.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          source: "profile_page",
          OR: [
            {
              viewer_id: null,
            },
            {
              viewer_id: {
                not: userId,
              },
            },
          ],
        },
      }),
      prisma.profile_view_event.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          source: "search_result",
          OR: [
            {
              viewer_id: null,
            },
            {
              viewer_id: {
                not: userId,
              },
            },
          ],
        },
      }),
      prisma.contact_request.count({
        where: {
          psychologist_id: userId,
          deleted: false,
          channel: "whatsapp",
          createdAt: createdAtWindow,
          OR: [
            {
              user_id: null,
            },
            {
              user_id: {
                not: userId,
              },
            },
          ],
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
          AND: [
            {
              OR: [
                {
                  viewer_id: null,
                },
                {
                  viewer_id: {
                    not: userId,
                  },
                },
              ],
            },
            {
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
          ],
        },
        select: {
          video_url: true,
          watched_seconds: true,
          duration_seconds: true,
          max_position_seconds: true,
          completed: true,
          replay_count: true,
          milestone_25: true,
          milestone_50: true,
          milestone_75: true,
          milestone_100: true,
          retention_buckets: true,
          last_event_at: true,
        },
      }),
      prisma.important_action_event.findMany({
        where: {
          action_type: { in: [...PROFILE_VIDEO_ACTION_TYPES] },
          deleted: false,
          occurred_at: createdAtWindow,
          target_id: userId,
          target_type: "psychologist",
          OR: [
            {
              user_id: null,
            },
            {
              user_id: {
                not: userId,
              },
            },
          ],
        },
        select: {
          action_type: true,
          occurred_at: true,
        },
      }),
    ]);
    const currentPresentationVideoSessions = profile?.video_url
      ? presentationVideoSessions.filter((session) => session.video_url === profile.video_url)
      : [];

    const postUpvotes = postsAggregate._sum.upvotes_count || 0;
    const postReplies = postsAggregate._sum.replies_count || 0;
    const metrics = {
      search_results: searchResults,
      profile_views: profileViews,
      whatsapp_clicks: whatsappClicks,
      reviews_received: reviewsReceived,
      rating_average: profile?.rating_avg || 0,
      rating_count_total: profile?.rating_count || 0,
      posts_published: postsAggregate._count._all,
      post_engagement: postUpvotes + postReplies,
      post_upvotes: postUpvotes,
      post_replies: postReplies,
    };
    const videoViews = currentPresentationVideoSessions.length;
    const totalWatchedSeconds = currentPresentationVideoSessions.reduce(
      (sum, session) => sum + session.watched_seconds,
      0,
    );
    const sessionRetentionBuckets = currentPresentationVideoSessions.map((session) => {
      const persistedBuckets = normalizeRetentionBuckets(session.retention_buckets);
      const derivedBuckets = deriveRetentionBucketsFromPosition(
        session.max_position_seconds,
        session.duration_seconds,
        session.completed || session.milestone_100,
      );
      const legacyMilestones = [
        session.milestone_25 ? 25 : null,
        session.milestone_50 ? 50 : null,
        session.milestone_75 ? 75 : null,
        session.milestone_100 ? 100 : null,
      ].filter((bucket): bucket is number => typeof bucket === "number");

      return new Set([...persistedBuckets, ...derivedBuckets, ...legacyMilestones]);
    });
    const completedViews = sessionRetentionBuckets.filter((buckets) => buckets.has(100)).length;
    const replayedViews = currentPresentationVideoSessions.filter(
      (session) => session.replay_count > 0,
    ).length;
    const durationSeconds =
      currentPresentationVideoSessions.reduce(
        (max, session) => Math.max(max, session.duration_seconds),
        0,
      ) || null;
    const actionMetrics = countVideoActionEvents(presentationVideoActionEvents);
    const latestVideoEventAt =
      [
        ...currentPresentationVideoSessions.map((session) => session.last_event_at),
        ...presentationVideoActionEvents.map((action) => action.occurred_at),
      ].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const retentionPoints: PsychologistAnalyticsPresentationVideoRetentionPoint[] =
      RETENTION_BUCKETS.map((bucket) => {
        const viewers = sessionRetentionBuckets.filter((buckets) => buckets.has(bucket)).length;

        return {
          milestone: bucket,
          viewers,
          rate: percentage(viewers, videoViews),
        };
      });
    const retentionTimeline: PsychologistAnalyticsPresentationVideoRetentionPoint[] = [
      {
        milestone: 0,
        viewers: videoViews,
        rate: videoViews > 0 ? 100 : 0,
      },
      ...retentionPoints,
    ];
    let retentionDropoff: PsychologistAnalyticsPresentationVideo["retention"]["dropoff"] = null;

    for (let index = 1; index < retentionTimeline.length; index += 1) {
      const previous = retentionTimeline[index - 1]!;
      const current = retentionTimeline[index]!;
      const rateDrop = Math.max(0, previous.rate - current.rate);

      if (rateDrop > (retentionDropoff?.rate_drop ?? 0)) {
        retentionDropoff = {
          from_milestone: previous.milestone,
          to_milestone: current.milestone,
          rate_drop: rateDrop,
          from_seconds: durationSeconds
            ? Math.round((durationSeconds * previous.milestone) / 100)
            : 0,
          to_seconds: durationSeconds ? Math.round((durationSeconds * current.milestone) / 100) : 0,
        };
      }
    }

    if (!retentionDropoff || retentionDropoff.rate_drop <= 0) {
      retentionDropoff = null;
    }

    const averageWatchSeconds = videoViews > 0 ? Math.round(totalWatchedSeconds / videoViews) : 0;
    const averageWatchPercent =
      videoViews > 0 && durationSeconds
        ? percentage(Math.min(averageWatchSeconds, durationSeconds), durationSeconds)
        : 0;
    const presentationVideoMetrics = {
      views: videoViews,
      total_watch_seconds: totalWatchedSeconds,
      average_watch_seconds: averageWatchSeconds,
      completed_views: completedViews,
      completion_rate: percentage(completedViews, videoViews),
      replay_rate: percentage(replayedViews, videoViews),
      abandonment_rate: videoViews > 0 ? percentage(videoViews - completedViews, videoViews) : 0,
      search_results_from_video: searchResults,
      ...actionMetrics,
    };
    const presentationVideo: PsychologistAnalyticsPresentationVideo = {
      updated_at: latestVideoEventAt,
      video_url: profile?.video_url ?? null,
      video_cover_url: profile?.video_cover_url ?? null,
      duration_seconds: durationSeconds,
      metrics: presentationVideoMetrics,
      cards: toPresentationVideoCards(presentationVideoMetrics),
      retention: {
        average_retention_rate: averageWatchPercent,
        dropoff: retentionDropoff,
        points: retentionPoints,
        source: "bucket_5_percent",
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
      traffic_sources: toTrafficSources(),
      unavailable: [],
    };
  }
}
