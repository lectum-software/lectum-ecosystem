"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  Heart,
  Info,
  Lightbulb,
  type LucideIcon,
  MessageSquare,
  PlayCircle,
  Repeat2,
  Search,
  Sparkles,
  Star,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistAnalytics } from "@/api/callers/psychologist-analytics";
import type {
  PsychologistAnalyticsMetric,
  PsychologistAnalyticsPeriodKey,
  PsychologistAnalyticsPresentationVideo,
  PsychologistAnalyticsPresentationVideoMetric,
  PsychologistAnalyticsResponse,
} from "@/api/generator/types/psychologist-analytics";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { useAppSelector } from "@/hooks/redux";
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

type AnalyticsCardView = {
  description: string;
  icon: LucideIcon;
  id: string;
  isUnavailable?: boolean;
  label: string;
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

const formatVideoMetricValue = (metric: PsychologistAnalyticsPresentationVideoMetric) => {
  if (metric.unit === "seconds") return formatSeconds(metric.value);
  if (metric.unit === "percent") return `${Math.round(metric.value)}%`;

  return toCount(metric.value);
};

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return "Aguardando primeiras visualizações";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Aguardando primeiras visualizações";

  return `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)}`;
};

const videoMetricIcons: Record<PsychologistAnalyticsPresentationVideoMetric["id"], LucideIcon> = {
  abandonment_rate: TrendingDown,
  average_watch_seconds: Clock3,
  completion_rate: CheckCircle2,
  replay_rate: Repeat2,
  views: PlayCircle,
};

const hasAnyRealEvent = (data?: PsychologistAnalyticsResponse) => {
  if (!data) return false;

  return (
    data.metrics.whatsapp_clicks > 0 ||
    data.metrics.reviews_received > 0 ||
    data.metrics.posts_published > 0 ||
    data.metrics.post_engagement > 0 ||
    data.metrics.rating_count_total > 0 ||
    data.presentation_video.metrics.views > 0
  );
};

const metricCards = (data?: PsychologistAnalyticsResponse): AnalyticsCardView[] => [
  {
    id: "search_results",
    icon: Search,
    label: "Resultados de busca",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Quando houver rastreio de busca, o desempenho aparecerá aqui.",
  },
  {
    id: "profile_views",
    icon: Eye,
    label: "Aberturas de perfil",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Visualizações reais do perfil serão exibidas após o evento persistido.",
  },
  {
    id: "video_views",
    icon: PlayCircle,
    label: "Video views",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Engajamento do vídeo profissional quando a captura estiver disponível.",
  },
  {
    id: "whatsapp_clicks",
    icon: MessageSquare,
    label: "Conversões WhatsApp",
    value: toCount(data?.metrics.whatsapp_clicks),
    source: "contact_request",
    description: "Cliques reais no contato profissional dentro do período.",
  },
  {
    id: "reviews_received",
    icon: Star,
    label: "Avaliações",
    value: toCount(data?.metrics.reviews_received),
    source: "professional_review",
    description: "Avaliações publicadas que fortalecem sua reputação.",
  },
  {
    id: "favorited",
    icon: Heart,
    label: "Favoritado",
    value: "—",
    source: "untracked",
    isUnavailable: true,
    description: "Sinais de interesse serão conectados a fontes reais futuras.",
  },
];

const PeriodTabs = ({
  current,
  disabled,
  onChange,
}: {
  current: PsychologistAnalyticsPeriodKey;
  disabled?: boolean;
  onChange: (period: PsychologistAnalyticsPeriodKey) => void;
}) => (
  <div
    className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="tablist"
  >
    <div className="flex min-w-max gap-1 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-1 shadow-[var(--lectum-shadow-soft)] sm:gap-2 md:min-w-0 md:justify-between">
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === current;

        return (
          <button
            aria-selected={active}
            className={cn(
              "h-9 whitespace-nowrap rounded-full px-2 text-[0.78rem] font-extrabold transition disabled:opacity-60 sm:h-10 sm:px-3 sm:text-sm md:flex-1",
              active
                ? "bg-primary text-surface shadow-[var(--lectum-shadow-soft)]"
                : "text-muted hover:bg-primary-soft/70 hover:text-primary",
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

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
        <Link href="/app/professional/billing/subscription">
          Fazer upgrade
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

const CustomPeriodFields = ({
  disabled,
  endAt,
  onChange,
  startAt,
}: {
  disabled?: boolean;
  endAt: string;
  onChange: (range: { end_at: string; start_at: string }) => void;
  startAt: string;
}) => (
  <div className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-3 shadow-[var(--lectum-shadow-soft)] sm:grid-cols-2">
    <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
      Início
      <input
        className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
        disabled={disabled}
        max={endAt || undefined}
        onChange={(event) => onChange({ start_at: event.target.value, end_at: endAt })}
        type="date"
        value={startAt}
      />
    </label>
    <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
      Fim
      <input
        className="h-11 min-w-0 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary disabled:opacity-60"
        disabled={disabled}
        min={startAt || undefined}
        onChange={(event) => onChange({ start_at: startAt, end_at: event.target.value })}
        type="date"
        value={endAt}
      />
    </label>
  </div>
);

const MetricCard = ({ locked, metric }: { locked?: boolean; metric: AnalyticsCardView }) => {
  const Icon = metric.icon;

  return (
    <article className="min-w-0 overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/10 bg-primary-soft px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Prévia
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 text-base font-extrabold leading-6 text-foreground">{metric.label}</h2>
      <p className="mt-1 min-h-10 text-sm leading-5 text-muted">{metric.description}</p>

      <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-2">
        <span
          className={cn(
            "min-w-0 text-2xl font-extrabold leading-none tracking-[-0.04em] text-foreground",
            locked && "select-none blur-[5px]",
          )}
        >
          {metric.value}
        </span>
        {metric.isUnavailable ? (
          <span className={cn("text-xs font-bold text-muted", locked && "select-none blur-[4px]")}>
            sem evento
          </span>
        ) : null}
      </div>
    </article>
  );
};

const PresentationVideoMetricCard = ({
  locked,
  metric,
}: {
  locked?: boolean;
  metric: PsychologistAnalyticsPresentationVideoMetric;
}) => {
  const Icon = videoMetricIcons[metric.id];

  return (
    <article className="min-w-0 rounded-[22px] border border-primary/10 bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-3 text-sm font-extrabold leading-5 text-foreground">{metric.label}</h3>
      <p
        className={cn(
          "mt-2 text-2xl font-black tracking-[-0.04em] text-foreground",
          locked && "select-none blur-[5px]",
        )}
      >
        {formatVideoMetricValue(metric)}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{metric.description}</p>
    </article>
  );
};

const RetentionChart = ({
  locked,
  points,
}: {
  locked?: boolean;
  points: PsychologistAnalyticsPresentationVideo["retention"]["points"];
}) => {
  const safePoints = points.length
    ? points
    : ([
        { milestone: 25, rate: 0, viewers: 0 },
        { milestone: 50, rate: 0, viewers: 0 },
        { milestone: 75, rate: 0, viewers: 0 },
        { milestone: 100, rate: 0, viewers: 0 },
      ] satisfies PsychologistAnalyticsPresentationVideo["retention"]["points"]);
  const svgPoints = safePoints
    .map((point, index) => {
      const x = 18 + index * 84;
      const y = 108 - Math.min(100, Math.max(0, point.rate));

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="min-w-0 rounded-[22px] border border-border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-foreground">Retenção por marcos</h3>
          <p className="mt-1 text-sm leading-5 text-muted">
            Percentual de pessoas que alcançaram 25%, 50%, 75% e 100% do vídeo.
          </p>
        </div>
        <Info className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
      </div>

      <div
        className={cn("mt-4 overflow-hidden rounded-2xl bg-surface p-3", locked && "blur-[4px]")}
      >
        <svg
          aria-label="Gráfico de retenção por marcos do vídeo"
          className="h-40 w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox="0 0 300 130"
        >
          <title>Retenção do vídeo por marcos</title>
          <line stroke="currentColor" strokeDasharray="4 5" x1="0" x2="300" y1="8" y2="8" />
          <line stroke="currentColor" strokeDasharray="4 5" x1="0" x2="300" y1="58" y2="58" />
          <polyline
            fill="none"
            points={svgPoints}
            stroke="rgb(46, 143, 230)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          {safePoints.map((point, index) => {
            const x = 18 + index * 84;
            const y = 108 - Math.min(100, Math.max(0, point.rate));

            return (
              <circle
                cx={x}
                cy={y}
                fill="white"
                key={point.milestone}
                r="5"
                stroke="rgb(46, 143, 230)"
                strokeWidth="3"
              />
            );
          })}
          <text fill="currentColor" fontSize="10" x="268" y="12">
            100%
          </text>
          <text fill="currentColor" fontSize="10" x="274" y="62">
            50%
          </text>
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {safePoints.map((point) => (
          <div
            className="rounded-2xl border border-border bg-surface px-2 py-2 text-center"
            key={point.milestone}
          >
            <p className="text-[0.68rem] font-black text-subtle">{point.milestone}%</p>
            <p
              className={cn(
                "mt-1 text-sm font-extrabold text-foreground",
                locked && "select-none blur-[4px]",
              )}
            >
              {point.rate}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PresentationVideoAnalyticsSection = ({
  locked,
  video,
}: {
  locked?: boolean;
  video?: PsychologistAnalyticsPresentationVideo;
}) => {
  const videoSrc = resolvePublicMediaUrl(video?.video_url ?? null);
  const videoCoverSrc = resolvePublicMediaUrl(video?.video_cover_url ?? null);
  const averageRetention = video?.retention.average_retention_rate ?? 0;

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
              Métricas principais do vídeo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Acompanhe como visitantes assistem seu vídeo e identifique pontos de retenção antes de
              ajustar sua apresentação profissional.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/10 bg-primary-soft px-3 py-2 text-xs font-extrabold text-primary">
          {formatUpdatedAt(video?.updated_at)}
        </span>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(video?.cards ?? []).map((metric) => (
          <PresentationVideoMetricCard key={metric.id} locked={locked} metric={metric} />
        ))}
      </div>

      <article className="grid min-w-0 gap-4 rounded-[26px] border border-primary/10 bg-primary-soft/55 p-4 md:grid-cols-[minmax(160px,220px)_1fr] md:items-center md:p-5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            Retenção do vídeo
          </p>
          <h3 className="mt-2 text-lg font-extrabold text-foreground">
            Onde seu público permanece
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Em média, visitantes assistiram{" "}
            <span className={cn("font-extrabold text-foreground", locked && "blur-[4px]")}>
              {averageRetention}%
            </span>{" "}
            dos marcos do seu vídeo.
          </p>
          {!videoSrc ? (
            <p className="mt-3 rounded-2xl border border-primary/10 bg-surface px-3 py-2 text-xs font-semibold leading-5 text-muted">
              Envie um vídeo de apresentação para ativar a análise de retenção.
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(130px,190px)_1fr] md:items-center">
          {videoSrc ? (
            <VerticalVideoPlayer
              className="mx-auto w-full max-w-[190px] rounded-[22px] border-0 shadow-[var(--lectum-shadow-soft)]"
              poster={videoCoverSrc}
              src={videoSrc}
              title="Vídeo de apresentação"
            />
          ) : (
            <div className="mx-auto grid aspect-[9/16] w-full max-w-[190px] place-items-center rounded-[22px] border border-dashed border-primary/20 bg-surface text-center text-sm font-bold text-muted">
              Sem vídeo
            </div>
          )}
          <RetentionChart locked={locked} points={video?.retention.points ?? []} />
        </div>
      </article>
    </section>
  );
};

const ReviewsLinkCard = ({ link, locked }: { link: string; locked?: boolean }) => {
  const copyLink = async () => {
    if (locked) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link agora.");
    }
  };

  return (
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Star className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-6 text-foreground">
            Link da minha página de avaliações
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Compartilhe com pacientes e fortaleça sua autoridade com depoimentos reais.
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-12 min-w-0 items-center gap-3 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-3">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold text-muted",
            locked && "select-none blur-[5px]",
          )}
        >
          {link}
        </p>
        <button
          aria-label="Copiar link de avaliações"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/10 bg-surface text-primary transition hover:bg-primary-soft disabled:opacity-50"
          disabled={locked}
          onClick={copyLink}
          type="button"
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {locked
          ? "O link e a coleta de avaliações ficam totalmente liberados após o upgrade."
          : "Incentive os pacientes a te avaliarem para aparecer nos primeiros resultados de busca."}
      </p>
    </section>
  );
};

const SpecialtySearchCard = () => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Search className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-foreground">
          Busca por especialidades
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Entenda como sua presença aparece nas buscas por temas e especialidades.
        </p>
      </div>
      <Info className="ml-auto h-5 w-5 shrink-0 text-subtle" aria-hidden />
    </div>
    <div className="mt-4 rounded-[var(--lectum-control-radius)] border border-dashed border-primary/20 bg-primary-soft/40 p-4 text-sm leading-6 text-muted">
      Esta seção seguirá o layout do protótipo quando houver evento persistido de busca por
      especialidade. Nenhum percentual é simulado.
    </div>
  </section>
);

const ProTipCard = () => (
  <section className="flex gap-3 rounded-[var(--lectum-card-radius)] border border-primary/20 bg-primary-soft p-5 text-muted shadow-[var(--lectum-shadow-soft)]">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary">
      <Lightbulb className="h-5 w-5" aria-hidden />
    </span>
    <div className="min-w-0">
      <h2 className="text-base font-extrabold text-foreground">Dica Pro</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Vídeos de apresentação com alto engajamento geram até 3x mais conversões para o WhatsApp.
        Faça testes e descubra o que funciona melhor para você!
      </p>
    </div>
  </section>
);

export const ProfessionalAnalyticsLogic = () => {
  const [period, setPeriod] = useState<PsychologistAnalyticsPeriodKey>("30d");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);
  const user = useAppSelector((state) => state.user);
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
  const hasEvents = hasAnyRealEvent(data);
  const reviewLink =
    typeof window === "undefined"
      ? "lectum.com.br/app/reviews/new"
      : `${window.location.origin}/app/reviews/new${user?.id ? `?psychologist_id=${user.id}` : ""}`;

  return (
    <PrivateTemplate showNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Meus Analytics" />

        <PeriodTabs current={period} disabled={analytics.isFetching} onChange={setPeriod} />
        {period === "custom" ? (
          <CustomPeriodFields
            disabled={analytics.isFetching}
            endAt={customRange.end_at}
            onChange={setCustomRange}
            startAt={customRange.start_at}
          />
        ) : null}

        {analytics.isLoading ? <LoadingState label="Carregando analytics reais" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar dados" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {isAnalyticsPreview ? <PremiumAnalyticsBanner /> : null}

        {!shouldShowError ? (
          <section
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Cards de analytics"
          >
            {metricCards(data).map((metric) => (
              <MetricCard key={metric.id} locked={isAnalyticsPreview} metric={metric} />
            ))}
          </section>
        ) : null}

        {data && !isAnalyticsPreview && !analytics.isError && !hasEvents ? (
          <EmptyState
            className="rounded-[var(--lectum-card-radius)] bg-surface"
            icon={BarChart3}
            title="Ainda não há eventos reais neste período"
            description="Contatos por WhatsApp, avaliações e posts aparecerão aqui sem dados simulados."
          />
        ) : null}

        {!shouldShowError ? (
          <PresentationVideoAnalyticsSection
            locked={isAnalyticsPreview}
            video={data?.presentation_video}
          />
        ) : null}

        {!shouldShowError ? (
          <ReviewsLinkCard link={reviewLink} locked={isAnalyticsPreview} />
        ) : null}
        {!shouldShowError ? <SpecialtySearchCard /> : null}
        {!shouldShowError ? <ProTipCard /> : null}
      </section>
    </PrivateTemplate>
  );
};
