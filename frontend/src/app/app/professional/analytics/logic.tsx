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
import { type MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef, useState } from "react";
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

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

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
  },
  {
    id: "profile_views",
    icon: Eye,
    label: "Aberturas de perfil",
    value: "—",
    source: "untracked",
    isUnavailable: true,
  },
  {
    id: "whatsapp_clicks",
    icon: MessageSquare,
    label: "Conversões WhatsApp",
    value: toCount(data?.metrics.whatsapp_clicks),
    source: "contact_request",
  },
  {
    id: "reviews_received",
    icon: Star,
    label: "Avaliações",
    value: toCount(data?.metrics.reviews_received),
    source: "professional_review",
  },
  {
    id: "favorited",
    icon: Heart,
    label: "Favoritado",
    value: "—",
    source: "untracked",
    isUnavailable: true,
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

      <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-2">
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
    <article className="flex min-h-[150px] min-w-0 flex-col rounded-[22px] border border-primary/10 bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 min-h-10 text-sm font-extrabold leading-5 text-muted">{metric.label}</h3>
      <p
        className={cn(
          "mt-3 text-[1.75rem] font-black leading-none tracking-[-0.05em] text-foreground",
          locked && "select-none blur-[5px]",
        )}
      >
        {formatVideoMetricValue(metric)}
      </p>
    </article>
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

const buildSmoothRetentionPath = (points: Array<{ milestone: number; rate: number }>) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) => toChartPoint(point.milestone, point.rate));
  const firstPoint = chartPoints[0];
  if (!firstPoint) return "";
  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  for (let index = 1; index < chartPoints.length; index += 1) {
    const point = chartPoints[index];
    const previous = chartPoints[index - 1];

    if (!point || !previous) continue;

    const midX = (previous.x + point.x) / 2;

    path += ` C ${midX.toFixed(2)} ${previous.y.toFixed(2)}, ${midX.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
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
  const fallbackPoints = Array.from({ length: 20 }, (_, index) => {
    const milestone = (index + 1) * 5;

    return {
      milestone,
      rate: 0,
      viewers: 0,
    };
  });
  const safePoints = points.length ? points : fallbackPoints;
  const chartPoints = [
    {
      milestone: 0,
      rate: views > 0 ? 100 : 0,
      viewers: views,
    },
    ...safePoints,
  ];
  const smoothPath = buildSmoothRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { milestone: 0, rate: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? { milestone: 100, rate: 0 };
  const firstAreaPoint = toChartPoint(firstChartPoint.milestone, firstChartPoint.rate);
  const lastAreaPoint = toChartPoint(lastChartPoint.milestone, lastChartPoint.rate);
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(2)} ${RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(2)} ${RETENTION_CHART_BOTTOM} Z`
    : "";
  const currentPercent = durationSeconds
    ? clampPercent((Math.max(0, currentTimeSeconds) / durationSeconds) * 100)
    : 0;
  const currentPoint = toChartPoint(currentPercent, 0);
  const canSeek = Boolean(onSeek && !locked && durationSeconds && durationSeconds > 0);

  const handleSeekFromChart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!canSeek) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = clampPercent(((event.clientX - rect.left) / rect.width) * 100);

    onSeek?.(relativeX);
  };

  const handleSummarySeek = (milestone: number) => {
    if (!canSeek) return;

    onSeek?.(milestone);
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
          className="mx-auto h-36 w-full max-w-[320px] overflow-visible text-subtle"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 130"
        >
          <title>Curva estimada de retenção por marcos de 5%</title>
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
        </svg>
        <span className="pointer-events-none absolute right-5 top-4 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          100%
        </span>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          50%
        </span>
      </button>

      {dropoff ? (
        <button
          className="mt-3 w-full rounded-2xl border border-primary/10 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted transition hover:bg-primary-soft/25 disabled:hover:bg-surface"
          disabled={!canSeek}
          onClick={() => handleSummarySeek(dropoff.from_milestone)}
          type="button"
        >
          <span className="block font-extrabold text-foreground">Maior abandono estimado</span>
          <span
            className={cn(locked && "select-none blur-[4px]")}
          >{`Entre ${dropoff.from_milestone}% e ${dropoff.to_milestone}% do vídeo (${formatSeconds(dropoff.from_seconds)}–${formatSeconds(dropoff.to_seconds)}), queda de ${dropoff.rate_drop} p.p.`}</span>
          {canSeek ? (
            <span className="mt-1 block font-extrabold text-primary">Ver trecho</span>
          ) : null}
        </button>
      ) : null}
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
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const cleanupVideoListenersRef = useRef<(() => void) | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [playerDurationSeconds, setPlayerDurationSeconds] = useState<number | null>(null);
  const videoSrc = resolvePublicMediaUrl(video?.video_url ?? null);
  const videoCoverSrc = resolvePublicMediaUrl(video?.video_cover_url ?? null);
  const averageRetention = video?.retention.average_retention_rate ?? 0;
  const durationSeconds = playerDurationSeconds ?? video?.duration_seconds ?? null;

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
              Métricas principais do vídeo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Acompanhe como os visitantes assistem seu vídeo de apresentação e identifique pontos
              de aprimoramento.
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
            Em média, os visitantes assistiram{" "}
            <span className={cn("font-extrabold text-foreground", locked && "blur-[4px]")}>
              {averageRetention}%
            </span>{" "}
            do seu vídeo.
          </p>
          {!videoSrc ? (
            <p className="mt-3 rounded-2xl border border-primary/10 bg-surface px-3 py-2 text-xs font-semibold leading-5 text-muted">
              Envie um vídeo de apresentação para ativar a análise de retenção.
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-4 rounded-[26px] border border-primary/10 bg-surface/90 p-3 shadow-[var(--lectum-shadow-soft)] md:grid-cols-[minmax(130px,190px)_1fr] md:items-center md:p-4">
          {videoSrc ? (
            <VerticalVideoPlayer
              className="mx-auto w-full max-w-[190px] rounded-[22px] border-0 shadow-[var(--lectum-shadow-soft)]"
              onVideoElementReady={handleVideoElementReady}
              poster={videoCoverSrc}
              src={videoSrc}
              title="Vídeo de apresentação"
            />
          ) : (
            <div className="mx-auto grid aspect-[9/16] w-full max-w-[190px] place-items-center rounded-[22px] border border-dashed border-primary/20 bg-surface text-center text-sm font-bold text-muted">
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
