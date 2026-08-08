import {
  CheckCircle2,
  Clock3,
  Eye,
  Heart,
  type LucideIcon,
  PlayCircle,
  Repeat2,
  Search,
  Share2,
  Star,
  UsersRound,
} from "lucide-react";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSource,
  PsychologistAnalyticsTrafficSources,
} from "@/api/generator/types/psychologist-analytics";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export const PERIOD_OPTIONS: Array<{ label: string; value: PsychologistAnalyticsPeriodKey }> = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Este ano", value: "year" },
  { label: "Todo o período", value: "all" },
  { label: "Personalizado", value: "custom" },
];

export const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getDefaultCustomRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  return {
    end_at: toInputDate(end),
    start_at: toInputDate(start),
  };
};

export type AnalyticsCardIcon = LucideIcon | typeof WhatsAppIcon;

export type AnalyticsCardView = {
  description?: string;
  icon: AnalyticsCardIcon;
  id: string;
  label: string;
  layout?: "default" | "wide";
  source?: PsychologistAnalyticsMetric["source"] | "untracked";
  value: string;
};

export const resolveApiError = (error: unknown) =>
  getSafeApiErrorMessage(
    error,
    "Não foi possível conectar ao serviço agora. Tente novamente em instantes.",
  );

export const toCount = (value?: number) => (value ?? 0).toLocaleString("pt-BR");

export const formatSeconds = (value?: number) => {
  const totalSeconds = Math.max(0, Math.round(value ?? 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

export const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export const metricCards = (data?: PsychologistAnalyticsResponse): AnalyticsCardView[] => [
  {
    id: "search_results",
    icon: Search,
    label: "Resultados de busca",
    value: toCount(data?.metrics.search_results),
    source: "profile_view_event",
  },
  {
    id: "profile_views",
    icon: Eye,
    label: "Acesso ao perfil",
    value: toCount(data?.metrics.profile_views),
    source: "profile_view_event",
  },
  {
    id: "favorites_received",
    icon: Heart,
    label: "Favoritado",
    value: toCount(data?.metrics.favorites_received),
    source: "psychologist_favorite",
  },
  {
    id: "reviews_received",
    icon: Star,
    label: "Avaliações",
    value: toCount(data?.metrics.reviews_received),
    source: "professional_review",
  },
  {
    description: "Pessoas que tocaram para conversar com você.",
    id: "whatsapp_clicks",
    icon: WhatsAppIcon,
    label: "Conversões WhatsApp",
    layout: "wide",
    value: toCount(data?.metrics.whatsapp_clicks),
    source: "contact_request",
  },
];

export const trafficSourceIcons: Record<PsychologistAnalyticsTrafficSource["id"], LucideIcon> = {
  communities: UsersRound,
  favorites: Heart,
  profile: Eye,
  presentation_video: PlayCircle,
};

export const fallbackTrafficSources: PsychologistAnalyticsTrafficSources = {
  updated_at: null,
  description: "Entenda quais canais mais levam pacientes ao seu WhatsApp.",
  source: "traffic_origin_events",
  sources: [
    {
      id: "presentation_video",
      label: "Vídeo de apresentação",
      description: "Cliques no WhatsApp a partir do seu vídeo no explorar e resultados de busca.",
      profile_views: 0,
      whatsapp_clicks: 0,
      conversion_rate: 0,
      badge: null,
      breakdown: [
        {
          id: "explore",
          label: "Explorar",
          description: "Cliques no WhatsApp feitos a partir da navegação de descoberta.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "search_results",
          label: "Resultados de busca",
          description: "Cliques no WhatsApp feitos a partir de pesquisa no filtro de busca",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
      ],
    },
    {
      id: "communities",
      label: "Comunidades",
      description: "Cliques no WhatsApp a partir dos seus posts e respostas nas comunidades.",
      profile_views: 0,
      whatsapp_clicks: 0,
      conversion_rate: 0,
      badge: null,
      breakdown: [
        {
          id: "post_with_video",
          label: "Post com vídeo",
          description: "Cliques no WhatsApp vindos de posts com vídeo nas comunidades.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "post_without_video",
          label: "Post sem vídeo",
          description: "Cliques no WhatsApp vindos de posts sem vídeo nas comunidades.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "reply_with_video",
          label: "Resposta com vídeo",
          description: "Cliques no WhatsApp vindos de respostas com vídeo nas comunidades.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "reply_without_video",
          label: "Resposta sem vídeo",
          description: "Cliques no WhatsApp vindos de respostas sem vídeo nas comunidades.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "community_top_mentors",
          label: "Top Mentores",
          description: "Cliques no WhatsApp originados pela navegação no Ranking Top Mentores.",
          metric: "whatsapp_clicks",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
      ],
    },
    {
      id: "profile",
      label: "Perfil",
      description: "Cliques no WhatsApp a partir do seu perfil público.",
      profile_views: 0,
      whatsapp_clicks: 0,
      conversion_rate: 0,
      badge: null,
      breakdown: [
        {
          id: "profile_accesses",
          label: "Acessos ao perfil",
          description: "Aberturas reais do perfil público registradas no período.",
          metric: "profile_views",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
      ],
    },
    {
      id: "favorites",
      label: "Favoritos",
      description: "Cliques no WhatsApp a partir da página de favoritos.",
      profile_views: 0,
      whatsapp_clicks: 0,
      conversion_rate: 0,
      badge: null,
      breakdown: [
        {
          id: "favorites_from_profile",
          label: "Pelo perfil",
          description: "Favoritos persistidos no perfil ou sem origem de vídeo registrada.",
          metric: "favorites",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
        {
          id: "favorites_from_video",
          label: "Pelo vídeo de apresentação",
          description: "Favoritos registrados a partir do vídeo de apresentação.",
          metric: "favorites",
          value: 0,
          whatsapp_clicks: 0,
          percentage: 0,
          top_search_terms: [],
        },
      ],
    },
  ],
};

export const fallbackCommunitiesAnalytics: PsychologistAnalyticsCommunities = {
  updated_at: null,
  description: "Compare seus posts e respostas e veja quais formatos levam pacientes ao WhatsApp.",
  source: "community_member+community_post+post_reply+important_action_event",
  diagnosis: {
    active_communities: 0,
    description: "Você ainda não segue comunidades nem tem participação comunitária registrada.",
    label: "Sem atividade recente",
    level: "none",
    score: 0,
    source: "community_member+community_post+post_reply+important_action_event",
    total_posts: 0,
    total_replies: 0,
    total_whatsapp_clicks: 0,
  },
  following_communities: 0,
  participating_communities: 0,
  content: {
    posts: {
      total: 0,
      with_video: 0,
      without_video: 0,
    },
    replies: {
      total: 0,
      with_video: 0,
      without_video: 0,
    },
    whatsapp_clicks_by_content: [
      {
        id: "post_with_video",
        label: "Posts com vídeo",
        content_type: "post",
        media_scope: "with_video",
        content_count: 0,
        whatsapp_clicks: 0,
      },
      {
        id: "post_without_video",
        label: "Posts sem vídeo",
        content_type: "post",
        media_scope: "without_video",
        content_count: 0,
        whatsapp_clicks: 0,
      },
      {
        id: "reply_with_video",
        label: "Respostas com vídeo",
        content_type: "reply",
        media_scope: "with_video",
        content_count: 0,
        whatsapp_clicks: 0,
      },
      {
        id: "reply_without_video",
        label: "Respostas sem vídeo",
        content_type: "reply",
        media_scope: "without_video",
        content_count: 0,
        whatsapp_clicks: 0,
      },
    ],
  },
  top_mentors: {
    communities: [],
    message: "Você ainda não está no Top 5 de nenhuma comunidade.",
    source: "community_mentor_ranking+important_action_event",
    status: "not_in_top_5",
    whatsapp_clicks: 0,
  },
};

export const getTrafficSources = (data?: PsychologistAnalyticsResponse) =>
  data?.traffic_sources ?? fallbackTrafficSources;

export const getCommunitiesAnalytics = (data?: PsychologistAnalyticsResponse) =>
  data?.communities ?? fallbackCommunitiesAnalytics;

export type PresentationVideoDashboardMetric = {
  icon: AnalyticsCardIcon;
  id: string;
  label: string;
  value: string;
};

export const getPresentationVideoDashboardMetrics = (
  video?: PsychologistAnalyticsPresentationVideo,
): PresentationVideoDashboardMetric[] => [
  {
    id: "views",
    icon: PlayCircle,
    label: "Visualizações",
    value: toCount(video?.metrics.views),
  },
  {
    id: "total_watch_seconds",
    icon: Clock3,
    label: "Tempo total assistido",
    value: formatSeconds(video?.metrics.total_watch_seconds),
  },
  {
    id: "completed_views",
    icon: CheckCircle2,
    label: "Assistiram completo",
    value: toCount(video?.metrics.completed_views),
  },
  {
    id: "replay_rate",
    icon: Repeat2,
    label: "Taxa de replays",
    value: `${Math.round(video?.metrics.replay_rate ?? 0)}%`,
  },
  {
    id: "shares_from_video",
    icon: Share2,
    label: "Compartilhamento",
    value: toCount(video?.metrics.shares_from_video),
  },
  {
    id: "profile_accesses_from_video",
    icon: Eye,
    label: "Acesso ao perfil",
    value: toCount(video?.metrics.profile_accesses_from_video),
  },
  {
    id: "favorites_from_video",
    icon: Heart,
    label: "Favoritado",
    value: toCount(video?.metrics.favorites_from_video),
  },
  {
    id: "whatsapp_clicks_from_video",
    icon: WhatsAppIcon,
    label: "Cliques WhatsApp",
    value: toCount(video?.metrics.whatsapp_clicks_from_video),
  },
];

export const SEARCH_TERMS_TOOLTIP =
  "Filtros selecionados em Minha Busca que exibiram seu vídeo nos resultados.";

export type PresentationVideoSearchTermsSummary = {
  searchResultImpressions: number;
  terms: PsychologistAnalyticsPresentationVideo["search_terms"];
};

export const getPresentationVideoSearchTermsSummary = (
  video?: PsychologistAnalyticsPresentationVideo,
): PresentationVideoSearchTermsSummary => {
  return {
    searchResultImpressions: video?.metrics.search_results_from_video ?? 0,
    terms: [...(video?.search_terms ?? [])]
      .sort((left, right) => {
        if (right.impressions !== left.impressions) {
          return right.impressions - left.impressions;
        }

        return left.term.localeCompare(right.term, "pt-BR");
      })
      .slice(0, 5),
  };
};

export type RetentionChartProps = {
  currentTimeSeconds?: number;
  durationSeconds?: number | null;
  locked?: boolean;
  onSeek?: (milestone: number) => void;
  points: PsychologistAnalyticsPresentationVideo["retention"]["points"];
  dropoff?: PsychologistAnalyticsPresentationVideo["retention"]["dropoff"];
  views?: number;
};

export const RETENTION_CHART_WIDTH = 300;

export const RETENTION_CHART_TOP = 12;

export const RETENTION_CHART_BOTTOM = 116;

export const RETENTION_CHART_LEFT_PADDING = 18;

export const RETENTION_CHART_RIGHT_PADDING = 58;

export const RETENTION_CHART_AXIS_LABEL_Y = 144;

export const toChartPoint = (milestone: number, rate: number) => {
  const x =
    RETENTION_CHART_LEFT_PADDING +
    (clampPercent(milestone) / 100) *
      (RETENTION_CHART_WIDTH - RETENTION_CHART_LEFT_PADDING - RETENTION_CHART_RIGHT_PADDING);
  const y =
    RETENTION_CHART_TOP +
    ((100 - clampPercent(rate)) / 100) * (RETENTION_CHART_BOTTOM - RETENTION_CHART_TOP);

  return { x, y };
};

export const buildRetentionAxisTicks = (durationSeconds?: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) {
    return [
      { label: "0:00", milestone: 0 },
      { label: "Fim", milestone: 100 },
    ];
  }

  return [0, 50, 100].map((milestone) => ({
    label: formatSeconds((durationSeconds * milestone) / 100),
    milestone,
  }));
};

export type RetentionCurvePoint = {
  milestone: number;
  rate: number;
};

export const buildRetentionCurvePoints = ({
  points,
  views,
}: {
  points: PsychologistAnalyticsPresentationVideo["retention"]["points"];
  views: number;
}): RetentionCurvePoint[] => {
  if (views <= 0) {
    return [
      { milestone: 0, rate: 0 },
      { milestone: 100, rate: 0 },
    ];
  }

  const intermediatePoints = points
    .filter((point) => point.milestone > 0 && point.milestone < 100)
    .sort((a, b) => a.milestone - b.milestone)
    .map((point) => ({
      milestone: clampPercent(point.milestone),
      rate: clampPercent(point.rate),
    }));

  return [{ milestone: 0, rate: 100 }, ...intermediatePoints, { milestone: 100, rate: 0 }];
};

export const buildSmoothRetentionPath = (points: RetentionCurvePoint[]) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) => toChartPoint(point.milestone, point.rate));
  const firstPoint = chartPoints[0];
  if (!firstPoint) return "";
  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  if (chartPoints.length === 1) return path;

  if (chartPoints.length === 2) {
    const lastPoint = chartPoints[1];
    if (!lastPoint) return path;

    const control1X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.42;
    const control2X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.78;

    return `${path} C ${control1X.toFixed(2)} ${firstPoint.y.toFixed(
      2,
    )}, ${control2X.toFixed(2)} ${lastPoint.y.toFixed(2)}, ${lastPoint.x.toFixed(
      2,
    )} ${lastPoint.y.toFixed(2)}`;
  }

  for (let index = 1; index < chartPoints.length - 1; index += 1) {
    const point = chartPoints[index];
    const nextPoint = chartPoints[index + 1];

    if (!point || !nextPoint) continue;

    const midX = (point.x + nextPoint.x) / 2;
    const midY = (point.y + nextPoint.y) / 2;

    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const penultimatePoint = chartPoints[chartPoints.length - 2];
  const lastPoint = chartPoints[chartPoints.length - 1];

  if (penultimatePoint && lastPoint) {
    path += ` Q ${penultimatePoint.x.toFixed(2)} ${penultimatePoint.y.toFixed(
      2,
    )}, ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
  }

  return path;
};

export type TrafficSourceWithDisplay = PsychologistAnalyticsTrafficSource & {
  displayBadge: "primary_source" | null;
};

export const TRAFFIC_SOURCE_ORDER: Record<PsychologistAnalyticsTrafficSource["id"], number> = {
  presentation_video: 0,
  communities: 1,
  profile: 2,
  favorites: 3,
};

export const toTrafficSourceDisplay = (
  sources: PsychologistAnalyticsTrafficSource[],
): TrafficSourceWithDisplay[] => {
  const baseSources = sources.length ? sources : fallbackTrafficSources.sources;
  const orderedSources = [...baseSources].sort(
    (a, b) =>
      b.whatsapp_clicks - a.whatsapp_clicks ||
      TRAFFIC_SOURCE_ORDER[a.id] - TRAFFIC_SOURCE_ORDER[b.id],
  );
  const highestWhatsAppClicks = Math.max(...orderedSources.map((source) => source.whatsapp_clicks));
  const primarySource = orderedSources.find(
    (source) => source.whatsapp_clicks > 0 && source.whatsapp_clicks === highestWhatsAppClicks,
  );

  return orderedSources.map((source) => ({
    ...source,
    displayBadge: primarySource && source.id === primarySource.id ? "primary_source" : null,
  }));
};
