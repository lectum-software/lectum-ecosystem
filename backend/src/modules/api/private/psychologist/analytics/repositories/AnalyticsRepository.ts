import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  extractSearchTermsFromTrafficPath,
  hasSearchFilterTrafficParams,
} from "@/utils/analytics-traffic-path";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  IPsychologistAnalyticsIndexDTO,
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsCommunityActivityDiagnosis,
  PsychologistAnalyticsCommunityContentBreakdownId,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriod,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsPresentationVideoMetric,
  PsychologistAnalyticsPresentationVideoRetentionPoint,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSource,
  PsychologistAnalyticsTrafficSourceBreakdownItem,
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
const PROFILE_VIDEO_WHATSAPP_ACTION = "psychologist_video_whatsapp_click";
const COMMUNITY_ANALYTICS_SOURCE =
  "community_member+community_post+post_reply+important_action_event" as const;
const COMMUNITY_WHATSAPP_POST_TARGET_TYPES = ["community_post", "post"] as const;
const COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES = ["post_reply", "reply"] as const;
const TOP_VIDEO_SEARCH_TERMS_LIMIT = 5;

type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];
type PresentationVideoActionEvent = {
  action_type: string;
  occurred_at: Date;
  path: string | null;
};
type PsychologistWhatsappActionEvent = {
  occurred_at: Date;
  page_kind: string;
  path: string | null;
};
type FavoriteReceivedEvent = {
  createdAt: Date;
};

const trafficSourceDefinitions: Array<
  Pick<PsychologistAnalyticsTrafficSource, "description" | "id" | "label">
> = [
  {
    id: "presentation_video",
    label: "Vídeo de apresentação",
    description: "Cliques no WhatsApp a partir do vídeo de apresentação.",
  },
  {
    id: "communities",
    label: "Comunidades",
    description: "Cliques no WhatsApp a partir de posts e respostas nas comunidades.",
  },
  {
    id: "profile",
    label: "Perfil",
    description: "Cliques no WhatsApp a partir do perfil público.",
  },
  {
    id: "favorites",
    label: "Favoritos",
    description: "Cliques no WhatsApp a partir da lista de favoritos.",
  },
];

const presentationVideoTrafficBreakdownDefinitions: Array<
  Pick<PsychologistAnalyticsTrafficSourceBreakdownItem, "description" | "id" | "label">
> = [
  {
    id: "explore",
    label: "Explorar",
    description: "Cliques no WhatsApp feitos a partir da navegação de descoberta.",
  },
  {
    id: "search_results",
    label: "Resultados de busca",
    description: "Cliques no WhatsApp feitos a partir de pesquisa no filtro de busca",
  },
];

const normalizeSearchTermKey = (term: string) =>
  term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const buildPresentationVideoTrafficBreakdown = (
  actions: PresentationVideoActionEvent[],
): PsychologistAnalyticsTrafficSourceBreakdownItem[] => {
  const groups = new Map(
    presentationVideoTrafficBreakdownDefinitions.map((definition) => [
      definition.id,
      { whatsappClicks: 0 },
    ]),
  );
  const searchTerms = new Map<string, { term: string; whatsappClicks: number }>();

  for (const action of actions) {
    if (action.action_type !== PROFILE_VIDEO_WHATSAPP_ACTION) continue;

    const sourceId = hasSearchFilterTrafficParams(action.path) ? "search_results" : "explore";
    const group = groups.get(sourceId);
    if (!group) continue;

    group.whatsappClicks += 1;

    if (sourceId !== "search_results") continue;

    for (const term of extractSearchTermsFromTrafficPath(action.path)) {
      const key = normalizeSearchTermKey(term);
      if (!key) continue;

      const current = searchTerms.get(key);
      searchTerms.set(key, {
        term: current?.term ?? term,
        whatsappClicks: (current?.whatsappClicks ?? 0) + 1,
      });
    }
  }

  const totalWhatsappClicks = [...groups.values()].reduce(
    (total, group) => total + group.whatsappClicks,
    0,
  );
  const searchResultClicks = groups.get("search_results")?.whatsappClicks ?? 0;
  const topSearchTerms = [...searchTerms.values()]
    .sort((left, right) => {
      if (right.whatsappClicks !== left.whatsappClicks) {
        return right.whatsappClicks - left.whatsappClicks;
      }

      return left.term.localeCompare(right.term, "pt-BR");
    })
    .slice(0, TOP_VIDEO_SEARCH_TERMS_LIMIT)
    .map((term) => ({
      term: term.term,
      whatsapp_clicks: term.whatsappClicks,
      percentage: percentage(term.whatsappClicks, searchResultClicks),
    }));

  return presentationVideoTrafficBreakdownDefinitions.map((definition) => {
    const whatsappClicks = groups.get(definition.id)?.whatsappClicks ?? 0;

    return {
      ...definition,
      metric: "whatsapp_clicks",
      percentage: percentage(whatsappClicks, totalWhatsappClicks),
      top_search_terms: definition.id === "search_results" ? topSearchTerms : [],
      value: whatsappClicks,
      whatsapp_clicks: whatsappClicks,
    };
  });
};

const buildTrafficBreakdownItem = (input: {
  description: string;
  id: PsychologistAnalyticsTrafficSourceBreakdownItem["id"];
  label: string;
  metric: PsychologistAnalyticsTrafficSourceBreakdownItem["metric"];
  total?: number;
  value: number;
}): PsychologistAnalyticsTrafficSourceBreakdownItem => ({
  id: input.id,
  label: input.label,
  description: input.description,
  metric: input.metric,
  percentage: input.metric === "whatsapp_clicks" ? percentage(input.value, input.total ?? 0) : 0,
  top_search_terms: [],
  value: input.value,
  whatsapp_clicks: input.metric === "whatsapp_clicks" ? input.value : 0,
});

const buildCommunityTrafficBreakdown = (
  communities: PsychologistAnalyticsCommunities,
): PsychologistAnalyticsTrafficSourceBreakdownItem[] => {
  const totalWhatsappClicks = communities.content.whatsapp_clicks_by_content.reduce(
    (total, item) => total + item.whatsapp_clicks,
    0,
  );
  const labels: Record<PsychologistAnalyticsCommunityContentBreakdownId, string> = {
    post_with_video: "Post com vídeo",
    post_without_video: "Post sem vídeo",
    reply_with_video: "Resposta com vídeo",
    reply_without_video: "Resposta sem vídeo",
  };
  const descriptions: Record<PsychologistAnalyticsCommunityContentBreakdownId, string> = {
    post_with_video: "Cliques no WhatsApp vindos de posts com vídeo nas comunidades.",
    post_without_video: "Cliques no WhatsApp vindos de posts sem vídeo nas comunidades.",
    reply_with_video: "Cliques no WhatsApp vindos de respostas com vídeo nas comunidades.",
    reply_without_video: "Cliques no WhatsApp vindos de respostas sem vídeo nas comunidades.",
  };

  return communities.content.whatsapp_clicks_by_content.map((item) =>
    buildTrafficBreakdownItem({
      id: item.id,
      label: labels[item.id],
      description: descriptions[item.id],
      metric: "whatsapp_clicks",
      total: totalWhatsappClicks,
      value: item.whatsapp_clicks,
    }),
  );
};

const isFavoritesTrafficPath = (path: string | null) => {
  const normalized = (path ?? "").toLowerCase();

  return normalized.includes("/favorites") || normalized.includes("/favoritos");
};

const toTrafficSources = (input: {
  communities: PsychologistAnalyticsCommunities;
  favoriteEvents: FavoriteReceivedEvent[];
  presentationVideoActions?: PresentationVideoActionEvent[];
  profileViews: number;
  psychologistWhatsappActions: PsychologistWhatsappActionEvent[];
}): PsychologistAnalyticsTrafficSources => {
  const presentationVideoActions = input.presentationVideoActions ?? [];
  const presentationVideoBreakdown =
    buildPresentationVideoTrafficBreakdown(presentationVideoActions);
  const presentationVideoWhatsappClicks = presentationVideoBreakdown.reduce(
    (total, item) => total + item.whatsapp_clicks,
    0,
  );
  const communityBreakdown = buildCommunityTrafficBreakdown(input.communities);
  const communityWhatsappClicks = input.communities.diagnosis.total_whatsapp_clicks;
  const favoritesWhatsappClicks = input.psychologistWhatsappActions.filter((action) =>
    isFavoritesTrafficPath(action.path),
  ).length;
  const profileWhatsappClicks = input.psychologistWhatsappActions.filter(
    (action) => action.page_kind === "psychologist_profile" && !isFavoritesTrafficPath(action.path),
  ).length;
  const favoritesFromVideo = presentationVideoActions.filter(
    (action) => action.action_type === "psychologist_video_favorite",
  ).length;
  const favoritesFromProfile = Math.max(0, input.favoriteEvents.length - favoritesFromVideo);
  const favoriteBreakdown = [
    buildTrafficBreakdownItem({
      id: "favorites_from_profile",
      label: "Pelo perfil",
      description: "Favoritos persistidos no perfil ou sem origem de vídeo registrada.",
      metric: "favorites",
      value: favoritesFromProfile,
    }),
    buildTrafficBreakdownItem({
      id: "favorites_from_video",
      label: "Pelo vídeo de apresentação",
      description: "Favoritos registrados a partir do vídeo de apresentação.",
      metric: "favorites",
      value: favoritesFromVideo,
    }),
  ];
  const profileBreakdown = [
    buildTrafficBreakdownItem({
      id: "profile_accesses",
      label: "Acessos ao perfil",
      description: "Aberturas reais do perfil público registradas no período.",
      metric: "profile_views",
      value: input.profileViews,
    }),
  ];
  const sources = trafficSourceDefinitions.map((source) => {
    const sourceMetrics = {
      communities: {
        breakdown: communityBreakdown,
        profile_views: 0,
        whatsapp_clicks: communityWhatsappClicks,
      },
      favorites: {
        breakdown: favoriteBreakdown,
        profile_views: 0,
        whatsapp_clicks: favoritesWhatsappClicks,
      },
      presentation_video: {
        breakdown: presentationVideoBreakdown,
        profile_views: 0,
        whatsapp_clicks: presentationVideoWhatsappClicks,
      },
      profile: {
        breakdown: profileBreakdown,
        profile_views: input.profileViews,
        whatsapp_clicks: profileWhatsappClicks,
      },
    } satisfies Record<
      PsychologistAnalyticsTrafficSource["id"],
      {
        breakdown: PsychologistAnalyticsTrafficSourceBreakdownItem[];
        profile_views: number;
        whatsapp_clicks: number;
      }
    >;
    const metrics = sourceMetrics[source.id];

    return {
      ...source,
      breakdown: metrics.breakdown,
      profile_views: metrics.profile_views,
      whatsapp_clicks: metrics.whatsapp_clicks,
      conversion_rate: 0,
      badge: null,
    };
  });
  const updatedAt =
    [
      ...presentationVideoActions
        .filter((action) => action.action_type === PROFILE_VIDEO_WHATSAPP_ACTION)
        .map((action) => action.occurred_at),
      ...input.psychologistWhatsappActions.map((action) => action.occurred_at),
      ...input.favoriteEvents.map((event) => event.createdAt),
      input.communities.updated_at,
    ]
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    updated_at: updatedAt,
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
    id: "favorites_received",
    label: "Favoritos recebidos",
    value: metrics.favorites_received,
    source: "psychologist_favorite",
    unit: "count",
    description: "Pacientes que favoritaram seu perfil no período selecionado.",
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
  actions: PresentationVideoActionEvent[],
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

const COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS: Array<
  Pick<
    PsychologistAnalyticsCommunities["content"]["whatsapp_clicks_by_content"][number],
    "content_type" | "id" | "label" | "media_scope"
  >
> = [
  {
    id: "post_with_video",
    label: "Posts com vídeo",
    content_type: "post",
    media_scope: "with_video",
  },
  {
    id: "post_without_video",
    label: "Posts sem vídeo",
    content_type: "post",
    media_scope: "without_video",
  },
  {
    id: "reply_with_video",
    label: "Respostas com vídeo",
    content_type: "reply",
    media_scope: "with_video",
  },
  {
    id: "reply_without_video",
    label: "Respostas sem vídeo",
    content_type: "reply",
    media_scope: "without_video",
  },
];

const emptyCommunityContentTotals = () => ({
  total: 0,
  with_video: 0,
  without_video: 0,
});

const emptyCommunityContentSummary = (): PsychologistAnalyticsCommunities["content"] => ({
  posts: emptyCommunityContentTotals(),
  replies: emptyCommunityContentTotals(),
  whatsapp_clicks_by_content: COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => ({
    ...item,
    content_count: 0,
    whatsapp_clicks: 0,
  })),
});

const isVideoCommunityContent = (mediaType: string | null) => mediaType === "video";

const toCommunityContentBreakdownId = (
  contentType: "post" | "reply",
  mediaType: string | null,
): PsychologistAnalyticsCommunityContentBreakdownId => {
  const mediaSuffix = isVideoCommunityContent(mediaType) ? "with_video" : "without_video";

  return `${contentType}_${mediaSuffix}`;
};

const toCommunityActivityDiagnosis = (
  totals: Pick<
    PsychologistAnalyticsCommunityActivityDiagnosis,
    "active_communities" | "total_posts" | "total_replies" | "total_whatsapp_clicks"
  >,
  participatingCommunities: number,
): PsychologistAnalyticsCommunityActivityDiagnosis => {
  const participationEvents = totals.total_posts + totals.total_replies;
  const score =
    totals.total_posts * 2 +
    totals.total_replies +
    totals.total_whatsapp_clicks * 3 +
    totals.active_communities * 2;

  if (participationEvents === 0 && totals.total_whatsapp_clicks === 0) {
    return {
      ...totals,
      description:
        participatingCommunities > 0
          ? "Você participa de comunidades, mas ainda não teve posts, respostas ou cliques de WhatsApp registrados neste período."
          : "Você ainda não segue comunidades nem tem participação comunitária registrada.",
      label: "Sem atividade recente",
      level: "none",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  if (score >= 18 || (totals.active_communities >= 3 && participationEvents >= 8)) {
    return {
      ...totals,
      description:
        "Sua presença nas comunidades está alta: há participação distribuída e sinais reais de interesse chegando ao WhatsApp.",
      label: "Alta atividade",
      level: "high",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  if (score >= 8 || totals.active_communities >= 2 || participationEvents >= 4) {
    return {
      ...totals,
      description:
        "Você mantém uma participação consistente. Responder com frequência e acompanhar comunidades com demanda pode ampliar seus contatos.",
      label: "Atividade consistente",
      level: "moderate",
      score,
      source: COMMUNITY_ANALYTICS_SOURCE,
    };
  }

  return {
    ...totals,
    description:
      "Sua presença comunitária ainda está inicial neste período. Priorize responder dúvidas recentes nas comunidades que você já acompanha.",
    label: "Atividade inicial",
    level: "low",
    score,
    source: COMMUNITY_ANALYTICS_SOURCE,
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

  private async buildCommunities(
    userId: string,
    createdAtWindow: Prisma.DateTimeFilter,
  ): Promise<PsychologistAnalyticsCommunities> {
    const communities = await prisma.community.findMany({
      where: {
        active: true,
        deleted: false,
        OR: [
          {
            members: {
              some: {
                deleted: false,
                user_id: userId,
              },
            },
          },
          {
            posts: {
              some: {
                author_id: userId,
                deleted: false,
                status: "publicado",
              },
            },
          },
          {
            posts: {
              some: {
                deleted: false,
                replies: {
                  some: {
                    author_id: userId,
                    deleted: false,
                  },
                },
                status: "publicado",
              },
            },
          },
        ],
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        members: {
          where: {
            deleted: false,
            user_id: userId,
          },
          select: {
            createdAt: true,
          },
          take: 1,
        },
      },
    });
    const communityIds = communities.map((community) => community.id);
    const followingCommunities = communities.filter(
      (community) => community.members.length > 0,
    ).length;
    const emptyActivityTotals = {
      active_communities: 0,
      total_posts: 0,
      total_replies: 0,
      total_whatsapp_clicks: 0,
    };

    if (communityIds.length === 0) {
      return {
        content: emptyCommunityContentSummary(),
        description:
          "Compare seus posts e respostas com e sem vídeo e veja quais formatos levam pacientes ao WhatsApp.",
        diagnosis: toCommunityActivityDiagnosis(emptyActivityTotals, 0),
        following_communities: 0,
        participating_communities: 0,
        source: COMMUNITY_ANALYTICS_SOURCE,
        updated_at: null,
      };
    }

    const [postItems, replyItems, authoredPosts, authoredReplies] = await Promise.all([
      prisma.community_post.findMany({
        where: {
          author_id: userId,
          community_id: {
            in: communityIds,
          },
          createdAt: createdAtWindow,
          deleted: false,
          status: "publicado",
        },
        select: {
          community_id: true,
          createdAt: true,
          id: true,
          media_type: true,
        },
      }),
      prisma.post_reply.findMany({
        where: {
          author_id: userId,
          createdAt: createdAtWindow,
          deleted: false,
          post: {
            community: {
              active: true,
              deleted: false,
            },
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
        },
        select: {
          createdAt: true,
          id: true,
          media_type: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
      prisma.community_post.findMany({
        where: {
          author_id: userId,
          community_id: {
            in: communityIds,
          },
          deleted: false,
          status: "publicado",
        },
        select: {
          community_id: true,
          id: true,
          media_type: true,
        },
      }),
      prisma.post_reply.findMany({
        where: {
          author_id: userId,
          deleted: false,
          post: {
            community: {
              active: true,
              deleted: false,
            },
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
        },
        select: {
          id: true,
          media_type: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
    ]);

    const postIdToCommunityId = new Map(
      authoredPosts.map((post) => [post.id, post.community_id] as const),
    );
    const postIdToContentBreakdownId = new Map(
      authoredPosts.map(
        (post) => [post.id, toCommunityContentBreakdownId("post", post.media_type)] as const,
      ),
    );
    const replyIdToCommunityId = new Map(
      authoredReplies.map((reply) => [reply.id, reply.post.community_id] as const),
    );
    const replyIdToContentBreakdownId = new Map(
      authoredReplies.map(
        (reply) => [reply.id, toCommunityContentBreakdownId("reply", reply.media_type)] as const,
      ),
    );
    const authoredPostIds = [...postIdToCommunityId.keys()];
    const authoredReplyIds = [...replyIdToCommunityId.keys()];
    const targetFilters: Prisma.important_action_eventWhereInput[] = [];

    if (authoredPostIds.length > 0) {
      targetFilters.push({
        target_id: {
          in: authoredPostIds,
        },
        target_type: {
          in: [...COMMUNITY_WHATSAPP_POST_TARGET_TYPES],
        },
      });
    }

    if (authoredReplyIds.length > 0) {
      targetFilters.push({
        target_id: {
          in: authoredReplyIds,
        },
        target_type: {
          in: [...COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES],
        },
      });
    }

    const whatsappActions =
      targetFilters.length > 0
        ? await prisma.important_action_event.findMany({
            where: {
              action_type: "whatsapp_click",
              deleted: false,
              occurred_at: createdAtWindow,
              AND: [
                {
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
                {
                  OR: targetFilters,
                },
              ],
            },
            select: {
              occurred_at: true,
              target_id: true,
              target_type: true,
            },
          })
        : [];

    const metricsByCommunityId = new Map<
      string,
      { posts_published: number; replies_published: number; whatsapp_clicks: number }
    >();
    const getCommunityMetrics = (communityId: string) => {
      const existing = metricsByCommunityId.get(communityId);
      if (existing) return existing;

      const metrics = {
        posts_published: 0,
        replies_published: 0,
        whatsapp_clicks: 0,
      };
      metricsByCommunityId.set(communityId, metrics);

      return metrics;
    };
    const content = emptyCommunityContentSummary();
    const incrementContent = (contentType: "post" | "reply", mediaType: string | null) => {
      const totals = contentType === "post" ? content.posts : content.replies;
      totals.total += 1;

      if (isVideoCommunityContent(mediaType)) {
        totals.with_video += 1;
        return;
      }

      totals.without_video += 1;
    };

    for (const item of postItems) {
      getCommunityMetrics(item.community_id).posts_published += 1;
      incrementContent("post", item.media_type);
    }

    for (const reply of replyItems) {
      getCommunityMetrics(reply.post.community_id).replies_published += 1;
      incrementContent("reply", reply.media_type);
    }

    const whatsappClicksByContentId = new Map<
      PsychologistAnalyticsCommunityContentBreakdownId,
      number
    >(COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => [item.id, 0]));

    for (const action of whatsappActions) {
      if (!action.target_id) continue;

      const isPostTarget =
        action.target_type &&
        (COMMUNITY_WHATSAPP_POST_TARGET_TYPES as readonly string[]).includes(action.target_type);
      const communityId = isPostTarget
        ? postIdToCommunityId.get(action.target_id)
        : replyIdToCommunityId.get(action.target_id);
      const breakdownId = isPostTarget
        ? postIdToContentBreakdownId.get(action.target_id)
        : replyIdToContentBreakdownId.get(action.target_id);

      if (communityId) {
        getCommunityMetrics(communityId).whatsapp_clicks += 1;
      }

      if (breakdownId) {
        whatsappClicksByContentId.set(
          breakdownId,
          (whatsappClicksByContentId.get(breakdownId) ?? 0) + 1,
        );
      }
    }

    const contentCountByBreakdownId = new Map<
      PsychologistAnalyticsCommunityContentBreakdownId,
      number
    >([
      ["post_with_video", content.posts.with_video],
      ["post_without_video", content.posts.without_video],
      ["reply_with_video", content.replies.with_video],
      ["reply_without_video", content.replies.without_video],
    ]);
    content.whatsapp_clicks_by_content = COMMUNITY_CONTENT_BREAKDOWN_DEFINITIONS.map((item) => ({
      ...item,
      content_count: contentCountByBreakdownId.get(item.id) ?? 0,
      whatsapp_clicks: whatsappClicksByContentId.get(item.id) ?? 0,
    }));
    const activityTotals = [...metricsByCommunityId.values()].reduce(
      (acc, metrics) => ({
        active_communities:
          acc.active_communities +
          (metrics.posts_published > 0 ||
          metrics.replies_published > 0 ||
          metrics.whatsapp_clicks > 0
            ? 1
            : 0),
        total_posts: acc.total_posts + metrics.posts_published,
        total_replies: acc.total_replies + metrics.replies_published,
        total_whatsapp_clicks: acc.total_whatsapp_clicks + metrics.whatsapp_clicks,
      }),
      emptyActivityTotals,
    );
    const updatedAt =
      [
        ...postItems.map((post) => post.createdAt),
        ...replyItems.map((reply) => reply.createdAt),
        ...whatsappActions.map((action) => action.occurred_at),
      ]
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      content,
      description:
        "Compare seus posts e respostas com e sem vídeo e veja quais formatos levam pacientes ao WhatsApp.",
      diagnosis: toCommunityActivityDiagnosis(activityTotals, communities.length),
      following_communities: followingCommunities,
      participating_communities: communities.length,
      source: COMMUNITY_ANALYTICS_SOURCE,
      updated_at: updatedAt,
    };
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
      psychologistWhatsappActionEvents,
      favoriteEvents,
      communities,
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
          path: true,
        },
      }),
      prisma.important_action_event.findMany({
        where: {
          action_type: "whatsapp_click",
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
          occurred_at: true,
          page_kind: true,
          path: true,
        },
      }),
      prisma.psychologist_favorite.findMany({
        where: {
          psychologist_id: userId,
          deleted: false,
          createdAt: createdAtWindow,
          user_id: {
            not: userId,
          },
        },
        select: {
          createdAt: true,
        },
      }),
      this.buildCommunities(userId, createdAtWindow),
    ]);
    const currentPresentationVideoSessions = profile?.video_url
      ? presentationVideoSessions.filter((session) => session.video_url === profile.video_url)
      : [];

    const postUpvotes = postsAggregate._sum.upvotes_count || 0;
    const postReplies = postsAggregate._sum.replies_count || 0;
    const metrics = {
      search_results: searchResults,
      profile_views: profileViews,
      favorites_received: favoriteEvents.length,
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
      communities,
      traffic_sources: toTrafficSources({
        communities,
        favoriteEvents,
        presentationVideoActions: presentationVideoActionEvents,
        profileViews,
        psychologistWhatsappActions: psychologistWhatsappActionEvents,
      }),
      unavailable: [],
    };
  }
}
