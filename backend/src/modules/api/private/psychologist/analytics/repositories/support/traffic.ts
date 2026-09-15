import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  extractSearchFiltersFromTrafficPath,
  hasDirectorySelectedFilterParams,
  type TrafficFilterLabelLookup,
} from "@/utils/analytics-traffic-path";
import type {
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsCommunityContentBreakdownId,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPresentationVideoSearchTerm,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSource,
  PsychologistAnalyticsTrafficSourceBreakdownItem,
  PsychologistAnalyticsTrafficSources,
} from "../../DTOs/IAnalyticsDTO";

import { percentage } from "./math";

export const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

export const PROFILE_VIDEO_ACTION_TYPES = [
  "psychologist_video_favorite",
  "psychologist_video_profile_access",
  "psychologist_video_share",
  "psychologist_video_whatsapp_click",
] as const;

export const PROFILE_VIDEO_WHATSAPP_ACTION = "psychologist_video_whatsapp_click";

export const COMMUNITY_ANALYTICS_SOURCE =
  "community_member+community_post+post_reply+important_action_event" as const;

export const COMMUNITY_WHATSAPP_POST_TARGET_TYPES = ["community_post", "post"] as const;

export const COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES = ["post_reply", "reply"] as const;

export const TOP_MENTOR_COMMUNITIES_LIMIT = 5;

export const TOP_VIDEO_SEARCH_TERMS_LIMIT = 5;

export type ProfileVideoActionType = (typeof PROFILE_VIDEO_ACTION_TYPES)[number];

export type PresentationVideoActionEvent = {
  action_type: string;
  occurred_at: Date;
  path: string | null;
};

export type ProfileSearchImpressionEvent = {
  search_context_path: string | null;
};

export type PsychologistWhatsappActionEvent = {
  occurred_at: Date;
  page_kind: string;
  path: string | null;
};

export type FavoriteReceivedEvent = {
  createdAt: Date;
};

export type PsychologistCommunityReference = {
  id: string;
  name: string;
  slug: string;
};

export const trafficSourceDefinitions: Array<
  Pick<PsychologistAnalyticsTrafficSource, "description" | "id" | "label">
> = [
  {
    id: "presentation_video",
    label: "Vídeo de apresentação",
    description: "Cliques no WhatsApp a partir do seu vídeo no explorar e resultados de busca.",
  },
  {
    id: "communities",
    label: "Comunidades",
    description: "Cliques no WhatsApp a partir dos seus posts e respostas nas comunidades.",
  },
  {
    id: "profile",
    label: "Perfil",
    description: "Cliques no WhatsApp a partir do seu perfil público.",
  },
  {
    id: "favorites",
    label: "Favoritos",
    description: "Cliques no WhatsApp a partir da página de favoritos.",
  },
];

export const presentationVideoTrafficBreakdownDefinitions: Array<
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

export const normalizeSearchTermKey = (term: string) =>
  term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type CatalogLabelItem = {
  name: string;
  slug: string;
};

export const catalogLabelSelect = {
  name: true,
  slug: true,
} satisfies Prisma.profile_catalog_optionSelect;

export const toFilterLabelDictionary = (items: CatalogLabelItem[]) => {
  const labels = new Map<string, string>();

  for (const item of items) {
    labels.set(normalizeSearchTermKey(item.slug), item.name);
    labels.set(normalizeSearchTermKey(item.name), item.name);
  }

  return labels;
};

export const buildSearchFilterLabelLookup = async (): Promise<TrafficFilterLabelLookup> => {
  const [
    specialties,
    services,
    approaches,
    targetAudiences,
    genders,
    raceColors,
    religions,
    languages,
  ] = await Promise.all([
    prisma.specialty.findMany({
      where: {
        active: true,
        deleted: false,
      },
      select: catalogLabelSelect,
    }),
    prisma.service.findMany({
      where: {
        active: true,
        deleted: false,
      },
      select: catalogLabelSelect,
    }),
    prisma.approach.findMany({
      where: {
        active: true,
        deleted: false,
      },
      select: catalogLabelSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: {
        active: true,
        deleted: false,
        type: "target_audience",
      },
      select: catalogLabelSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: {
        active: true,
        deleted: false,
        type: "gender",
      },
      select: catalogLabelSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: {
        active: true,
        deleted: false,
        type: "race_color",
      },
      select: catalogLabelSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: {
        active: true,
        deleted: false,
        type: "religion",
      },
      select: catalogLabelSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: {
        active: true,
        deleted: false,
        type: "language",
      },
      select: catalogLabelSelect,
    }),
  ]);

  return {
    approach: toFilterLabelDictionary(approaches),
    gender: toFilterLabelDictionary(genders),
    language: toFilterLabelDictionary(languages),
    race_color: toFilterLabelDictionary(raceColors),
    religion: toFilterLabelDictionary(religions),
    service: toFilterLabelDictionary(services),
    specialty: toFilterLabelDictionary(specialties),
    target_audience: toFilterLabelDictionary(targetAudiences),
  };
};

export const buildPresentationVideoTrafficBreakdown = (
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

    const sourceId = hasDirectorySelectedFilterParams(action.path) ? "search_results" : "explore";
    const group = groups.get(sourceId);
    if (!group) continue;

    group.whatsappClicks += 1;

    if (sourceId !== "search_results") continue;

    for (const term of extractSearchFiltersFromTrafficPath(action.path)) {
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

export const buildPresentationVideoSearchTerms = (
  impressions: ProfileSearchImpressionEvent[],
  labelLookup: TrafficFilterLabelLookup,
): PsychologistAnalyticsPresentationVideoSearchTerm[] => {
  const searchTerms = new Map<string, { impressions: number; term: string }>();

  for (const impression of impressions) {
    const terms = extractSearchFiltersFromTrafficPath(impression.search_context_path, labelLookup);

    for (const term of terms) {
      const key = normalizeSearchTermKey(term);
      if (!key) continue;

      const current = searchTerms.get(key);
      searchTerms.set(key, {
        impressions: (current?.impressions ?? 0) + 1,
        term: current?.term ?? term,
      });
    }
  }

  const totalSearchResultImpressions = impressions.length;

  return [...searchTerms.values()]
    .sort((left, right) => {
      if (right.impressions !== left.impressions) {
        return right.impressions - left.impressions;
      }

      return left.term.localeCompare(right.term, "pt-BR");
    })
    .slice(0, TOP_VIDEO_SEARCH_TERMS_LIMIT)
    .map((term) => ({
      term: term.term,
      impressions: term.impressions,
      percentage: percentage(term.impressions, totalSearchResultImpressions),
    }));
};

export const buildTrafficBreakdownItem = (input: {
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

export const isCommunityTopMentorsTrafficPath = (path: string | null, pageKind?: string | null) => {
  const normalized = (path ?? "").toLowerCase();
  const normalizedPageKind = (pageKind ?? "").toLowerCase();

  return (
    normalizedPageKind === "community_top_mentors" ||
    normalized.includes("/comunidades/top-mentores") ||
    normalized.includes("/community/top-mentors") ||
    normalized.includes("traffic_origin=community_top_mentors")
  );
};

export const buildCommunityTrafficBreakdown = (
  communities: PsychologistAnalyticsCommunities,
): PsychologistAnalyticsTrafficSourceBreakdownItem[] => {
  const contentWhatsappClicks = communities.content.whatsapp_clicks_by_content.reduce(
    (total, item) => total + item.whatsapp_clicks,
    0,
  );
  const totalWhatsappClicks = contentWhatsappClicks + communities.top_mentors.whatsapp_clicks;
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

  return [
    ...communities.content.whatsapp_clicks_by_content.map((item) =>
      buildTrafficBreakdownItem({
        id: item.id,
        label: labels[item.id],
        description: descriptions[item.id],
        metric: "whatsapp_clicks",
        total: totalWhatsappClicks,
        value: item.whatsapp_clicks,
      }),
    ),
    buildTrafficBreakdownItem({
      id: "community_top_mentors",
      label: "Top Mentores",
      description: "Cliques no WhatsApp originados pela navegação no Ranking Top Mentores.",
      metric: "whatsapp_clicks",
      total: totalWhatsappClicks,
      value: communities.top_mentors.whatsapp_clicks,
    }),
  ];
};

export const isFavoritesTrafficPath = (path: string | null) => {
  const normalized = (path ?? "").toLowerCase();

  return normalized.includes("/favorites") || normalized.includes("/favoritos");
};

export const toTrafficSources = (input: {
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
    (action) =>
      action.page_kind === "psychologist_profile" &&
      !isFavoritesTrafficPath(action.path) &&
      !isCommunityTopMentorsTrafficPath(action.path, action.page_kind),
  ).length;
  const favoritesFromVideo = presentationVideoActions.filter(
    (action) => action.action_type === "psychologist_video_favorite",
  ).length;
  const favoritesFromProfile = Math.max(0, input.favoriteEvents.length - favoritesFromVideo);
  const favoriteBreakdown = [
    buildTrafficBreakdownItem({
      id: "favorites_from_profile",
      label: "Pelo perfil",
      description: "Favoritos recebidos no perfil ou sem origem de vídeo identificada.",
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
      description: "Aberturas do perfil público registradas no período.",
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

export const toCards = (
  metrics: PsychologistAnalyticsResponse["metrics"],
): PsychologistAnalyticsMetric[] => [
  {
    id: "search_results",
    label: "Resultados de busca",
    value: metrics.search_results,
    source: "profile_view_event",
    unit: "count",
    description: "Impressões do seu card ou vídeo nos resultados de busca.",
  },
  {
    id: "profile_views",
    label: "Visualizações de perfil",
    value: metrics.profile_views,
    source: "profile_view_event",
    unit: "count",
    description: "Aberturas do perfil profissional registradas no período selecionado.",
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
