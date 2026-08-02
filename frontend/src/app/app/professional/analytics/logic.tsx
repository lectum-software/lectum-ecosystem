"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  Heart,
  Info,
  type LucideIcon,
  MessageCircle,
  PlayCircle,
  Repeat2,
  Search,
  Share2,
  Star,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type {
  PsychologistAnalyticsCommunities,
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsResponse,
  PsychologistAnalyticsTrafficSearchTerm,
  PsychologistAnalyticsTrafficSource,
  PsychologistAnalyticsTrafficSources,
} from "@/api/generator/types/psychologist-analytics";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { resolvePublicMediaUrl } from "@/utils/media";

const PERIOD_OPTIONS: Array<{ label: string; value: PsychologistAnalyticsPeriodKey }> = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "Anual", value: "365d" },
  { label: "Período", value: "custom" },
];

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultCustomRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  return {
    end_at: toInputDate(end),
    start_at: toInputDate(start),
  };
};

type AnalyticsCardIcon = LucideIcon | typeof WhatsAppIcon;

type AnalyticsCardView = {
  description?: string;
  icon: AnalyticsCardIcon;
  id: string;
  label: string;
  layout?: "default" | "wide";
  source?: PsychologistAnalyticsMetric["source"] | "untracked";
  value: string;
};

const resolveApiError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Não foi possível conectar à API agora. Tente novamente em instantes.";
};

const toCount = (value?: number) => (value ?? 0).toLocaleString("pt-BR");

const formatSeconds = (value?: number) => {
  const totalSeconds = Math.max(0, Math.round(value ?? 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const metricCards = (data?: PsychologistAnalyticsResponse): AnalyticsCardView[] => [
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

const trafficSourceIcons: Record<PsychologistAnalyticsTrafficSource["id"], LucideIcon> = {
  communities: UsersRound,
  favorites: Heart,
  profile: Eye,
  presentation_video: PlayCircle,
};

const fallbackTrafficSources: PsychologistAnalyticsTrafficSources = {
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

const fallbackCommunitiesAnalytics: PsychologistAnalyticsCommunities = {
  updated_at: null,
  description:
    "Compare seus posts e respostas com e sem vídeo e veja quais formatos levam pacientes ao WhatsApp.",
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
};

const getTrafficSources = (data?: PsychologistAnalyticsResponse) =>
  data?.traffic_sources ?? fallbackTrafficSources;

const getCommunitiesAnalytics = (data?: PsychologistAnalyticsResponse) =>
  data?.communities ?? fallbackCommunitiesAnalytics;

const PeriodTabs = ({
  customPopoverOpen,
  customRange,
  current,
  disabled,
  onChange,
  onCustomPopoverOpenChange,
  onCustomRangeApply,
}: {
  customPopoverOpen: boolean;
  customRange: { end_at: string; start_at: string };
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
  onCustomPopoverOpenChange: (open: boolean) => void;
  onCustomRangeApply: (range: { end_at: string; start_at: string }) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draftRange, setDraftRange] = useState(customRange);

  useEffect(() => {
    if (!customPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;

      onCustomPopoverOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [customPopoverOpen, onCustomPopoverOpenChange]);

  const handlePeriodClick = (nextPeriod: PsychologistAnalyticsPeriodKey) => {
    if (nextPeriod === "custom") {
      setDraftRange(customRange);
      onChange(nextPeriod);
      onCustomPopoverOpenChange(true);
      return;
    }

    onCustomPopoverOpenChange(false);
    onChange(nextPeriod);
  };

  const applyCustomRange = () => {
    onCustomRangeApply(draftRange);
    onCustomPopoverOpenChange(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        <div className="flex min-w-max gap-1 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-1 shadow-[var(--lectum-shadow-soft)] sm:gap-2 md:min-w-0 md:justify-between">
          {PERIOD_OPTIONS.map((option) => {
            const active = option.value === current;
            const customActive = option.value === "custom" && customPopoverOpen;

            return (
              <button
                aria-expanded={option.value === "custom" ? customPopoverOpen : undefined}
                aria-haspopup={option.value === "custom" ? "dialog" : undefined}
                aria-selected={active || customActive}
                className={cn(
                  "h-9 whitespace-nowrap rounded-full px-2 text-[0.78rem] font-extrabold transition disabled:opacity-60 sm:h-10 sm:px-3 sm:text-sm md:flex-1",
                  active || customActive
                    ? "bg-primary text-surface shadow-[var(--lectum-shadow-soft)]"
                    : "text-muted hover:bg-primary-soft/70 hover:text-primary",
                )}
                disabled={disabled}
                key={option.value}
                onClick={() => handlePeriodClick(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {customPopoverOpen ? (
        <div
          aria-label="Selecionar período personalizado"
          className="absolute top-[calc(100%+0.65rem)] right-1 left-1 z-30 rounded-[24px] border border-primary/10 bg-surface p-4 shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:left-auto sm:w-[22rem]"
          role="dialog"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                Período personalizado
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Escolha o intervalo para recalcular seus analytics.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
              Início
              <input
                className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
                disabled={disabled}
                max={draftRange.end_at || undefined}
                onChange={(event) =>
                  setDraftRange((currentRange) => ({
                    ...currentRange,
                    start_at: event.target.value,
                  }))
                }
                type="date"
                value={draftRange.start_at}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
              Fim
              <input
                className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
                disabled={disabled}
                min={draftRange.start_at || undefined}
                onChange={(event) =>
                  setDraftRange((currentRange) => ({
                    ...currentRange,
                    end_at: event.target.value,
                  }))
                }
                type="date"
                value={draftRange.end_at}
              />
            </label>
          </div>

          <Button
            className="mt-4 h-11 w-full rounded-full text-sm font-extrabold"
            disabled={disabled}
            onClick={applyCustomRange}
            type="button"
          >
            Aplicar período
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const PremiumAnalyticsBanner = () => (
  <section className="relative overflow-hidden rounded-[var(--lectum-card-radius)] border border-primary/20 bg-primary-soft p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
    <div
      aria-hidden
      className="-right-10 -top-12 absolute h-32 w-32 rounded-full bg-surface/70 blur-3xl"
    />
    <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)] md:h-16 md:w-16">
        <BarChart3 className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          Recurso profissional
        </p>
        <h2 className="mt-2 text-xl font-extrabold leading-7 text-foreground">
          Desbloqueie seus Analytics
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
          Assine o plano profissional para acompanhar visualizações, cliques, desempenho do perfil e
          evolução dos seus resultados na Lectum.
        </p>
      </div>
      <Button asChild className="h-12 w-full rounded-full px-6 text-base md:w-auto">
        <Link href="/app/professional/billing">
          Fazer upgrade
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

const MetricCard = ({ locked, metric }: { locked?: boolean; metric: AnalyticsCardView }) => {
  const Icon = metric.icon;

  if (metric.layout === "wide") {
    return (
      <article className="col-span-2 flex min-h-[124px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-primary/10 bg-surface p-4 shadow-[var(--lectum-shadow-soft)] sm:min-h-[136px] sm:rounded-[22px]">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <p
            className={cn(
              "shrink-0 text-[2rem] font-black leading-none tracking-[-0.06em] text-foreground sm:text-[2.25rem]",
              locked && "select-none blur-[5px]",
            )}
          >
            {metric.value}
          </p>
        </div>

        <div className="mt-3 min-w-0">
          <h2 className="break-words text-[0.84rem] font-extrabold leading-5 text-muted sm:text-sm">
            {metric.label}
          </h2>
          {metric.description ? (
            <p className="mt-1.5 max-w-[18rem] text-xs font-semibold leading-5 text-subtle sm:text-sm">
              {metric.description}
            </p>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="flex min-h-[132px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-primary/10 bg-surface p-3 shadow-[var(--lectum-shadow-soft)] sm:min-h-[150px] sm:rounded-[22px] sm:p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:h-10 sm:w-10">
        <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
      </span>

      <h2 className="mt-3 min-h-10 break-words text-[0.78rem] font-extrabold leading-5 text-muted sm:mt-4 sm:text-sm">
        {metric.label}
      </h2>

      <p
        className={cn(
          "mt-auto pt-2 text-2xl font-black leading-none tracking-[-0.05em] text-foreground sm:text-[1.75rem]",
          locked && "select-none blur-[5px]",
        )}
      >
        {metric.value}
      </p>
    </article>
  );
};

type PresentationVideoDashboardMetric = {
  icon: AnalyticsCardIcon;
  id: string;
  label: string;
  value: string;
};

const getPresentationVideoDashboardMetrics = (
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

const PresentationVideoDashboardMetricCard = ({
  locked,
  metric,
}: {
  locked?: boolean;
  metric: PresentationVideoDashboardMetric;
}) => {
  const Icon = metric.icon;

  return (
    <article className="grid min-h-[68px] min-w-0 gap-1 rounded-[16px] bg-surface-muted/55 px-2.5 py-2 sm:min-h-[76px] sm:px-3 sm:py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:h-7 sm:w-7">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="min-w-0 break-words text-[0.66rem] font-semibold leading-4 text-muted sm:text-[0.72rem]">
          {metric.label}
        </p>
      </div>

      <p
        className={cn(
          "pl-[1.875rem] text-lg font-black leading-none tracking-[-0.05em] text-foreground sm:pl-[2.125rem] sm:text-xl",
          locked && "select-none blur-[5px]",
        )}
      >
        {metric.value}
      </p>
    </article>
  );
};

const PresentationVideoMetricsPanel = ({
  locked,
  metrics,
}: {
  locked?: boolean;
  metrics: PresentationVideoDashboardMetric[];
}) => (
  <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2">
    {metrics.map((metric) => (
      <PresentationVideoDashboardMetricCard key={metric.id} locked={locked} metric={metric} />
    ))}
  </div>
);

const SEARCH_TERMS_TOOLTIP = "Principais filtros de busca que geraram cliques para o seu WhatsApp.";

type PresentationVideoSearchTermsSummary = {
  terms: PsychologistAnalyticsTrafficSearchTerm[];
  whatsappClicks: number;
};

const getPresentationVideoSearchTermsSummary = (
  traffic?: PsychologistAnalyticsTrafficSources,
): PresentationVideoSearchTermsSummary => {
  const presentationVideoSource = (traffic?.sources ?? fallbackTrafficSources.sources).find(
    (source) => source.id === "presentation_video",
  );
  const searchResultsBreakdown = presentationVideoSource?.breakdown?.find(
    (item) => item.id === "search_results",
  );

  return {
    terms: [...(searchResultsBreakdown?.top_search_terms ?? [])]
      .sort((left, right) => {
        if (right.whatsapp_clicks !== left.whatsapp_clicks) {
          return right.whatsapp_clicks - left.whatsapp_clicks;
        }

        return left.term.localeCompare(right.term, "pt-BR");
      })
      .slice(0, 5),
    whatsappClicks: searchResultsBreakdown?.whatsapp_clicks ?? searchResultsBreakdown?.value ?? 0,
  };
};

const PresentationVideoSearchTermsPanel = ({
  locked,
  summary,
}: {
  locked?: boolean;
  summary: PresentationVideoSearchTermsSummary;
}) => {
  const hasTerms = summary.terms.length > 0;
  const emptyDescription =
    summary.whatsappClicks > 0
      ? "Há cliques vindos de busca ou filtros, mas nenhum filtro textual foi registrado neste período."
      : "Nenhum filtro pesquisado gerou clique para WhatsApp neste período.";

  return (
    <div className="rounded-[22px] border border-primary/10 bg-surface px-3 py-3 text-sm leading-6 text-muted">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary">
            Termos pesquisados
          </p>
          <button
            aria-describedby="presentation-video-search-terms-tooltip"
            aria-label={SEARCH_TERMS_TOOLTIP}
            className="group relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-primary transition hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            title={SEARCH_TERMS_TOOLTIP}
            type="button"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            <span
              className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-60 rounded-2xl border border-border bg-surface px-3 py-2 text-left text-xs font-semibold leading-5 text-foreground shadow-[var(--lectum-shadow-soft)] group-focus:block group-hover:block"
              id="presentation-video-search-terms-tooltip"
              role="tooltip"
            >
              {SEARCH_TERMS_TOOLTIP}
            </span>
          </button>
        </div>
      </div>

      {hasTerms ? (
        <ul className="mt-3 grid gap-2">
          {summary.terms.map((term) => (
            <li
              className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-surface-muted/70 px-3 py-2.5"
              key={term.term}
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-sm font-extrabold tracking-[-0.03em] text-foreground",
                    locked && "select-none blur-[4px]",
                  )}
                >
                  {term.term}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs font-semibold leading-5 text-muted",
                    locked && "select-none blur-[4px]",
                  )}
                >
                  {Math.round(clampPercent(term.percentage))}% dos cliques em resultados de busca
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-black tracking-[-0.04em] text-foreground",
                  locked && "select-none blur-[5px]",
                )}
              >
                {toCount(term.whatsapp_clicks)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-surface-muted/70 px-3 py-2.5 text-xs font-semibold leading-5 text-muted">
          {emptyDescription}
        </p>
      )}
    </div>
  );
};

type RetentionChartProps = {
  currentTimeSeconds?: number;
  durationSeconds?: number | null;
  locked?: boolean;
  onSeek?: (milestone: number) => void;
  points: PsychologistAnalyticsPresentationVideo["retention"]["points"];
  dropoff?: PsychologistAnalyticsPresentationVideo["retention"]["dropoff"];
  views?: number;
};

const RETENTION_CHART_WIDTH = 300;
const RETENTION_CHART_TOP = 12;
const RETENTION_CHART_BOTTOM = 116;
const RETENTION_CHART_LEFT_PADDING = 18;
const RETENTION_CHART_RIGHT_PADDING = 58;
const RETENTION_CHART_AXIS_LABEL_Y = 144;

const toChartPoint = (milestone: number, rate: number) => {
  const x =
    RETENTION_CHART_LEFT_PADDING +
    (clampPercent(milestone) / 100) *
      (RETENTION_CHART_WIDTH - RETENTION_CHART_LEFT_PADDING - RETENTION_CHART_RIGHT_PADDING);
  const y =
    RETENTION_CHART_TOP +
    ((100 - clampPercent(rate)) / 100) * (RETENTION_CHART_BOTTOM - RETENTION_CHART_TOP);

  return { x, y };
};

const buildRetentionAxisTicks = (durationSeconds?: number | null) => {
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

type RetentionCurvePoint = {
  milestone: number;
  rate: number;
};

const buildRetentionCurvePoints = ({
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

const buildSmoothRetentionPath = (points: RetentionCurvePoint[]) => {
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

const RetentionChart = ({
  currentTimeSeconds = 0,
  dropoff,
  durationSeconds,
  locked,
  onSeek,
  points,
  views = 0,
}: RetentionChartProps) => {
  const chartPoints = buildRetentionCurvePoints({ points, views });
  const smoothPath = buildSmoothRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { milestone: 0, rate: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? { milestone: 100, rate: 0 };
  const firstAreaPoint = toChartPoint(firstChartPoint.milestone, firstChartPoint.rate);
  const lastAreaPoint = toChartPoint(lastChartPoint.milestone, lastChartPoint.rate);
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(
        2,
      )} ${RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(2)} ${RETENTION_CHART_BOTTOM} Z`
    : "";
  const currentPercent = durationSeconds
    ? clampPercent((Math.max(0, currentTimeSeconds) / durationSeconds) * 100)
    : 0;
  const currentPoint = toChartPoint(currentPercent, 0);
  const axisTicks = buildRetentionAxisTicks(durationSeconds);
  const canSeek = Boolean(onSeek && !locked && durationSeconds && durationSeconds > 0);

  const handleSeekFromChart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!canSeek) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = clampPercent(((event.clientX - rect.left) / rect.width) * 100);

    onSeek?.(relativeX);
  };

  return (
    <div className="min-w-0">
      <button
        aria-label="Selecionar trecho no gráfico de retenção"
        className={cn(
          "relative w-full overflow-hidden rounded-[22px] bg-transparent px-1 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          canSeek && "cursor-pointer",
          locked && "blur-[4px]",
        )}
        disabled={!canSeek}
        onClick={handleSeekFromChart}
        type="button"
      >
        <svg
          aria-label="Curva estimada de retenção do vídeo"
          className="mx-auto h-40 w-full max-w-[320px] overflow-visible text-subtle md:h-56 md:max-w-none"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 150"
        >
          <title>Curva contínua estimada de retenção por minuto do vídeo</title>
          <defs>
            <linearGradient id="presentation-video-retention-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgb(46, 143, 230)" />
              <stop offset="100%" stopColor="rgb(14, 116, 211)" />
            </linearGradient>
            <linearGradient id="presentation-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(46, 143, 230)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="rgb(46, 143, 230)" stopOpacity="0" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="presentation-video-retention-shadow"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                floodColor="rgb(46, 143, 230)"
                floodOpacity="0.14"
                stdDeviation="1.4"
              />
            </filter>
          </defs>
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={RETENTION_CHART_LEFT_PADDING}
            x2={RETENTION_CHART_WIDTH - RETENTION_CHART_RIGHT_PADDING + 4}
            y1="12"
            y2="12"
          />
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={RETENTION_CHART_LEFT_PADDING}
            x2={RETENTION_CHART_WIDTH - RETENTION_CHART_RIGHT_PADDING + 4}
            y1="64"
            y2="64"
          />
          {areaPath ? <path d={areaPath} fill="url(#presentation-video-retention-fill)" /> : null}
          <path
            d={smoothPath}
            fill="none"
            filter="url(#presentation-video-retention-shadow)"
            stroke="url(#presentation-video-retention-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
          />
          {durationSeconds && durationSeconds > 0 ? (
            <line
              stroke="rgb(46, 143, 230)"
              strokeOpacity="0.45"
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
              x1={currentPoint.x}
              x2={currentPoint.x}
              y1="12"
              y2="122"
            />
          ) : null}
          <line
            stroke="rgb(226, 232, 240)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={RETENTION_CHART_LEFT_PADDING}
            x2={RETENTION_CHART_WIDTH - RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="rgb(15, 23, 42)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={RETENTION_CHART_LEFT_PADDING}
            x2={
              durationSeconds && durationSeconds > 0 ? currentPoint.x : RETENTION_CHART_LEFT_PADDING
            }
            y1="122"
            y2="122"
          />
          <circle
            cx={
              durationSeconds && durationSeconds > 0 ? currentPoint.x : RETENTION_CHART_LEFT_PADDING
            }
            cy="122"
            fill="white"
            r="6.5"
            stroke="rgb(226, 232, 240)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {axisTicks.map((tick) => {
            const tickPoint = toChartPoint(tick.milestone, 0);
            const textAnchor =
              tick.milestone <= 0 ? "start" : tick.milestone >= 100 ? "end" : "middle";

            return (
              <g key={tick.milestone}>
                <line
                  stroke="currentColor"
                  strokeOpacity="0.45"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                  x1={tickPoint.x}
                  x2={tickPoint.x}
                  y1="125"
                  y2="130"
                />
                <text
                  fill="currentColor"
                  fontSize="9"
                  fontWeight="800"
                  textAnchor={textAnchor}
                  x={tickPoint.x}
                  y={RETENTION_CHART_AXIS_LABEL_Y}
                >
                  {tick.label}
                </text>
              </g>
            );
          })}
        </svg>
        <span className="pointer-events-none absolute right-5 top-4 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          100%
        </span>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          50%
        </span>
      </button>

      {dropoff ? (
        <div className="mt-3 w-full rounded-2xl border border-primary/10 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted">
          <span className="block font-extrabold text-foreground">Maior queda estimada</span>
          <span
            className={cn(locked && "select-none blur-[4px]")}
          >{`Entre ${dropoff.from_milestone}% e ${
            dropoff.to_milestone
          }% do vídeo (${formatSeconds(dropoff.from_seconds)} - ${formatSeconds(
            dropoff.to_seconds,
          )}).`}</span>
        </div>
      ) : null}
    </div>
  );
};

const PresentationVideoAnalyticsSection = ({
  locked,
  traffic,
  video,
}: {
  locked?: boolean;
  traffic: PsychologistAnalyticsTrafficSources;
  video?: PsychologistAnalyticsPresentationVideo;
}) => {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const cleanupVideoListenersRef = useRef<(() => void) | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [playerDurationSeconds, setPlayerDurationSeconds] = useState<number | null>(null);
  const videoSrc = resolvePublicMediaUrl(video?.video_url ?? null);
  const videoCoverSrc = resolvePublicMediaUrl(video?.video_cover_url ?? null);
  const averageRetention = video?.retention.average_retention_rate ?? 0;
  const averageWatchSeconds = video?.metrics.average_watch_seconds ?? 0;
  const durationSeconds = playerDurationSeconds ?? video?.duration_seconds ?? null;
  const presentationVideoMetrics = getPresentationVideoDashboardMetrics(video);
  const searchTermsSummary = getPresentationVideoSearchTermsSummary(traffic);

  const handleVideoElementReady = useCallback((element: HTMLVideoElement | null) => {
    cleanupVideoListenersRef.current?.();
    cleanupVideoListenersRef.current = null;
    videoElementRef.current = element;

    if (!element) return;

    const syncVideoState = () => {
      setCurrentVideoTime(element.currentTime || 0);
      if (Number.isFinite(element.duration) && element.duration > 0) {
        setPlayerDurationSeconds(Math.round(element.duration));
      }
    };

    syncVideoState();
    element.addEventListener("loadedmetadata", syncVideoState);
    element.addEventListener("durationchange", syncVideoState);
    element.addEventListener("timeupdate", syncVideoState);
    element.addEventListener("seeked", syncVideoState);

    cleanupVideoListenersRef.current = () => {
      element.removeEventListener("loadedmetadata", syncVideoState);
      element.removeEventListener("durationchange", syncVideoState);
      element.removeEventListener("timeupdate", syncVideoState);
      element.removeEventListener("seeked", syncVideoState);
    };
  }, []);

  const handleSeekRetention = useCallback(
    (milestone: number) => {
      const videoElement = videoElementRef.current;
      if (!videoElement || !durationSeconds || durationSeconds <= 0) return;

      const performSeek = () => {
        const actualDuration =
          Number.isFinite(videoElement.duration) && videoElement.duration > 0
            ? videoElement.duration
            : durationSeconds;
        const seekPercent = clampPercent(milestone);
        const targetTime =
          seekPercent >= 99
            ? Math.max(0, actualDuration - 0.2)
            : (actualDuration * seekPercent) / 100;
        const nextTime = Math.min(actualDuration, Math.max(0, targetTime));
        const shouldResume = !videoElement.paused && !videoElement.ended;
        const seekableVideo = videoElement as HTMLVideoElement & {
          fastSeek?: (time: number) => void;
        };

        if (typeof seekableVideo.fastSeek === "function") {
          seekableVideo.fastSeek(nextTime);
        } else {
          videoElement.currentTime = nextTime;
        }

        setCurrentVideoTime(nextTime);

        if (shouldResume) {
          void videoElement.play().catch(() => undefined);
        }
      };

      if (!Number.isFinite(videoElement.duration) || videoElement.duration <= 0) {
        videoElement.addEventListener("loadedmetadata", performSeek, { once: true });
        videoElement.load();
        return;
      }

      performSeek();
    },
    [durationSeconds],
  );

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <PlayCircle className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Vídeo de apresentação
            </p>
            <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
              Métricas principais
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Acompanhe como os visitantes assistem seu vídeo de apresentação.
            </p>
          </div>
        </div>
      </div>

      <PresentationVideoMetricsPanel locked={locked} metrics={presentationVideoMetrics} />

      <article className="grid min-w-0 gap-4 rounded-[26px] border border-primary/10 bg-primary-soft/55 p-4 md:p-5">
        <div className="min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Retenção do vídeo
            </p>
            <h3 className="mt-2 text-lg font-extrabold text-foreground">
              Onde seu público permanece
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Em média, os visitantes assistiram{" "}
              <span className={cn("font-extrabold text-foreground", locked && "blur-[4px]")}>
                {averageRetention}% do vídeo
              </span>
              {", cerca de "}
              <span className={cn("font-extrabold text-foreground", locked && "blur-[4px]")}>
                {formatSeconds(averageWatchSeconds)}
              </span>
              .
            </p>
            {!videoSrc ? (
              <p className="mt-3 rounded-2xl border border-primary/10 bg-surface px-3 py-2 text-xs font-semibold leading-5 text-muted">
                Envie um vídeo de apresentação para ativar a análise de retenção.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 rounded-[26px] border border-primary/10 bg-surface/90 p-3 shadow-[var(--lectum-shadow-soft)] md:p-4">
          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(150px,220px)_minmax(0,1fr)] md:items-center">
            {videoSrc ? (
              <VerticalVideoPlayer
                className="mx-auto w-full max-w-[190px] rounded-[22px] border-0 shadow-[var(--lectum-shadow-soft)] md:max-w-[220px]"
                controlsVariant="minimal"
                onVideoElementReady={handleVideoElementReady}
                poster={videoCoverSrc}
                src={videoSrc}
                title="Vídeo de apresentação"
              />
            ) : (
              <div className="mx-auto grid aspect-[9/16] w-full max-w-[190px] place-items-center rounded-[22px] border border-dashed border-primary/20 bg-surface text-center text-sm font-bold text-muted md:max-w-[220px]">
                Sem vídeo
              </div>
            )}
            <RetentionChart
              currentTimeSeconds={currentVideoTime}
              dropoff={video?.retention.dropoff}
              durationSeconds={durationSeconds}
              locked={locked}
              onSeek={handleSeekRetention}
              points={video?.retention.points ?? []}
              views={video?.metrics.views ?? 0}
            />
          </div>
        </div>
      </article>
      <PresentationVideoSearchTermsPanel locked={locked} summary={searchTermsSummary} />
    </section>
  );
};

const CommunityContentDonut = ({
  icon: Icon,
  label,
  locked,
  totals,
}: {
  icon: AnalyticsCardIcon;
  label: string;
  locked?: boolean;
  totals: PsychologistAnalyticsCommunities["content"]["posts"];
}) => {
  const withVideoRate =
    totals.total > 0 ? clampPercent((totals.with_video / totals.total) * 100) : 0;
  const roundedWithVideoRate = Math.round(withVideoRate);
  const donutBackground =
    totals.total > 0
      ? `conic-gradient(var(--lectum-primary) 0 ${withVideoRate}%, var(--lectum-border-strong) ${withVideoRate}% 100%)`
      : "conic-gradient(var(--lectum-border) 0 100%)";

  return (
    <article className="grid min-w-0 gap-3 rounded-[24px] border border-primary/10 bg-surface p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="truncate text-sm font-black tracking-[-0.03em] text-foreground">{label}</p>
      </div>

      <div className="grid justify-items-center gap-3">
        <div
          aria-label={`${label}: ${toCount(totals.with_video)} com vídeo e ${toCount(
            totals.without_video,
          )} sem vídeo`}
          className="grid h-28 w-28 place-items-center rounded-full p-3"
          role="img"
          style={{ background: donutBackground }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-surface text-center">
            <div>
              <p
                className={cn(
                  "text-2xl font-black leading-none tracking-[-0.06em] text-foreground",
                  locked && "select-none blur-[5px]",
                )}
              >
                {toCount(totals.total)}
              </p>
              <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-subtle">
                total
              </p>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 font-extrabold text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              Com vídeo
            </span>
            <span className={cn("font-black text-foreground", locked && "select-none blur-[5px]")}>
              {toCount(totals.with_video)} ({roundedWithVideoRate}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 font-extrabold text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-border-strong" />
              Sem vídeo
            </span>
            <span className={cn("font-black text-foreground", locked && "select-none blur-[5px]")}>
              {toCount(totals.without_video)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

const CommunityWhatsappContentTable = ({
  items,
  locked,
}: {
  items: PsychologistAnalyticsCommunities["content"]["whatsapp_clicks_by_content"];
  locked?: boolean;
}) => (
  <article className="overflow-hidden rounded-[24px] border border-primary/10 bg-surface">
    <div className="flex min-w-0 items-center gap-2 border-border border-b bg-surface-muted/70 px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <WhatsAppIcon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black tracking-[-0.03em] text-foreground">
          Cliques por conteúdo
        </p>
        <p className="text-xs font-semibold text-muted">
          WhatsApp atribuído aos formatos rastreados
        </p>
      </div>
    </div>

    <table className="w-full border-separate border-spacing-0 text-left">
      <thead>
        <tr className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-subtle">
          <th className="px-4 py-3">Conteúdo</th>
          <th className="px-4 py-3 text-right">WhatsApp</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr className="border-border border-t" key={item.id}>
            <td className="border-border border-t px-4 py-3 text-sm font-extrabold text-foreground">
              {item.label}
            </td>
            <td
              className={cn(
                "border-border border-t px-4 py-3 text-right text-lg font-black tracking-[-0.04em] text-foreground",
                locked && "select-none blur-[5px]",
              )}
            >
              {toCount(item.whatsapp_clicks)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </article>
);

const CommunityActivitySection = ({
  communities,
  locked,
}: {
  communities: PsychologistAnalyticsCommunities;
  locked?: boolean;
}) => {
  const diagnosis = communities.diagnosis;
  const content = communities.content;

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <UsersRound className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Comunidade</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
            Participação nas comunidades
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{communities.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CommunityContentDonut
          icon={BarChart3}
          label="Posts"
          locked={locked}
          totals={content.posts}
        />
        <CommunityContentDonut
          icon={MessageCircle}
          label="Respostas"
          locked={locked}
          totals={content.replies}
        />
      </div>

      <CommunityWhatsappContentTable items={content.whatsapp_clicks_by_content} locked={locked} />

      <article className="rounded-[24px] border border-primary/10 bg-primary-soft/45 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface text-primary">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary">
              Diagnóstico
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-black tracking-[-0.04em] text-foreground",
                locked && "select-none blur-[5px]",
              )}
            >
              {diagnosis.label}
            </p>
            <p
              className={cn(
                "mt-2 text-sm font-semibold leading-6 text-muted",
                locked && "select-none blur-[4px]",
              )}
            >
              {diagnosis.description}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
};

type TrafficSourceWithDisplay = PsychologistAnalyticsTrafficSource & {
  displayBadge: "primary_source" | null;
};

const TRAFFIC_SOURCE_ORDER: Record<PsychologistAnalyticsTrafficSource["id"], number> = {
  presentation_video: 0,
  communities: 1,
  profile: 2,
  favorites: 3,
};

const toTrafficSourceDisplay = (
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

const TrafficBadge = ({ type }: { type: TrafficSourceWithDisplay["displayBadge"] }) => {
  if (!type) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary-soft px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-primary">
      Principal origem
    </span>
  );
};

const TrafficSourceSection = ({
  locked,
  traffic,
}: {
  locked?: boolean;
  traffic: PsychologistAnalyticsTrafficSources;
}) => {
  const sources = useMemo(() => toTrafficSourceDisplay(traffic.sources), [traffic.sources]);

  return (
    <section className="grid min-w-0 gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <BarChart3 className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Origem do tráfego
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-foreground">
            Canais que levam pacientes até você
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{traffic.description}</p>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-[22px] border border-primary/10 bg-surface md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(92px,0.28fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {sources.map((source) => {
            const Icon = trafficSourceIcons[source.id];

            return (
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(92px,0.28fr)] items-center gap-3 px-4 py-4"
                key={source.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {source.label}
                      </p>
                      <TrafficBadge type={source.displayBadge} />
                    </div>
                    {source.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {source.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "text-center text-lg font-black tracking-[-0.04em] text-foreground",
                    locked && "select-none blur-[5px]",
                  )}
                >
                  {toCount(source.whatsapp_clicks)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {sources.map((source) => {
          const Icon = trafficSourceIcons[source.id];

          return (
            <article
              className={cn(
                "overflow-hidden rounded-[22px] border border-primary/10 bg-surface-muted",
                source.displayBadge && "border-primary/25 bg-primary-soft/35",
              )}
              key={source.id}
            >
              <div className="flex min-w-0 items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {source.label}
                      </p>
                      {source.description ? (
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                          {source.description}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <TrafficBadge type={source.displayBadge} />
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-black leading-none tracking-[-0.04em] text-foreground",
                        locked && "select-none blur-[5px]",
                      )}
                    >
                      {toCount(source.whatsapp_clicks)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const query = useMemo(
    () => (period === "custom" ? { period, ...customRange } : { period }),
    [customRange, period],
  );
  const analytics = usePsychologistAnalytics(query);
  const data = analytics.data;
  const errorMessage = analytics.isError ? resolveApiError(analytics.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const shouldShowError = Boolean(errorMessage && !isProfessionalPlanError);
  const isAnalyticsPreview = data?.access.mode === "preview" || isProfessionalPlanError;

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Meus Analytics" />

        <PeriodTabs
          current={period}
          customPopoverOpen={customPopoverOpen}
          customRange={customRange}
          disabled={analytics.isFetching}
          onChange={setPeriod}
          onCustomPopoverOpenChange={setCustomPopoverOpen}
          onCustomRangeApply={setCustomRange}
        />

        {analytics.isLoading ? <LoadingState label="Carregando analytics reais" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar dados" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {isAnalyticsPreview ? <PremiumAnalyticsBanner /> : null}

        {!shouldShowError ? (
          <section
            className="grid min-w-0 grid-cols-2 items-stretch gap-3"
            aria-label="Cards de analytics"
          >
            {metricCards(data).map((metric) => (
              <MetricCard key={metric.id} locked={isAnalyticsPreview} metric={metric} />
            ))}
          </section>
        ) : null}

        {!analytics.isLoading && !shouldShowError ? (
          <TrafficSourceSection locked={isAnalyticsPreview} traffic={getTrafficSources(data)} />
        ) : null}

        {!shouldShowError ? (
          <PresentationVideoAnalyticsSection
            locked={isAnalyticsPreview}
            traffic={getTrafficSources(data)}
            video={data?.presentation_video}
          />
        ) : null}

        {!shouldShowError ? (
          <CommunityActivitySection
            communities={getCommunitiesAnalytics(data)}
            locked={isAnalyticsPreview}
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
