"use client";

import { Info, PlayCircle } from "lucide-react";
import { type MouseEvent as ReactMouseEvent, useCallback, useRef, useState } from "react";
import type { PsychologistAnalyticsPresentationVideo } from "@/api/generator/types/psychologist-analytics";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { resolvePublicMediaUrl } from "@/utils/media";

import {
  buildRetentionAxisTicks,
  buildRetentionCurvePoints,
  buildSmoothRetentionPath,
  clampPercent,
  formatSeconds,
  getPresentationVideoDashboardMetrics,
  getPresentationVideoSearchTermsSummary,
  type PresentationVideoDashboardMetric,
  type PresentationVideoSearchTermsSummary,
  RETENTION_CHART_AXIS_LABEL_Y,
  RETENTION_CHART_BOTTOM,
  RETENTION_CHART_LEFT_PADDING,
  RETENTION_CHART_RIGHT_PADDING,
  RETENTION_CHART_WIDTH,
  type RetentionChartProps,
  SEARCH_TERMS_TOOLTIP,
  toChartPoint,
  toCount,
} from "../modules/support";

export const PresentationVideoDashboardMetricCard = ({
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

export const PresentationVideoMetricsPanel = ({
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

export const PresentationVideoSearchTermsPanel = ({
  locked,
  summary,
}: {
  locked?: boolean;
  summary: PresentationVideoSearchTermsSummary;
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const hasTerms = summary.terms.length > 0;
  const emptyDescription =
    summary.searchResultImpressions > 0
      ? "Há exibições vindas de buscas filtradas, mas os filtros não foram identificados neste período."
      : "Nenhuma exibição vinda de buscas filtradas neste período.";
  const closeTooltip = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);
  const toggleTooltip = useCallback(() => {
    setIsTooltipVisible((current) => !current);
  }, []);

  return (
    <div className="rounded-[22px] border border-primary/10 bg-surface px-3 py-3 text-sm leading-6 text-muted">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary">
            Filtros pesquisados
          </p>
          <button
            aria-controls="presentation-video-search-terms-tooltip"
            aria-describedby={
              isTooltipVisible ? "presentation-video-search-terms-tooltip" : undefined
            }
            aria-expanded={isTooltipVisible}
            aria-label={SEARCH_TERMS_TOOLTIP}
            className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-primary transition hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            onBlur={closeTooltip}
            onClick={toggleTooltip}
            type="button"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            <span
              aria-hidden={!isTooltipVisible}
              className={cn(
                "pointer-events-none absolute right-0 top-full z-20 mt-2 w-60 rounded-2xl border border-border bg-surface px-3 py-2 text-left text-xs font-semibold leading-5 text-foreground shadow-[var(--lectum-shadow-soft)]",
                isTooltipVisible ? "block" : "hidden",
              )}
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
                  {Math.round(clampPercent(term.percentage))}% das exibições em buscas filtradas
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-black tracking-[-0.04em] text-foreground",
                  locked && "select-none blur-[5px]",
                )}
              >
                {toCount(term.impressions)}
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

export const RetentionChart = ({
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
              <stop offset="0%" stopColor="var(--lectum-primary)" />
              <stop offset="100%" stopColor="var(--lectum-primary-hover)" />
            </linearGradient>
            <linearGradient id="presentation-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--lectum-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--lectum-primary)" stopOpacity="0" />
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
                floodColor="var(--lectum-primary)"
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
              stroke="var(--lectum-primary)"
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
            stroke="var(--lectum-border)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={RETENTION_CHART_LEFT_PADDING}
            x2={RETENTION_CHART_WIDTH - RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="var(--foreground)"
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
            stroke="var(--lectum-border)"
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

export const PresentationVideoAnalyticsSection = ({
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
  const averageWatchSeconds = video?.metrics.average_watch_seconds ?? 0;
  const durationSeconds = playerDurationSeconds ?? video?.duration_seconds ?? null;
  const presentationVideoMetrics = getPresentationVideoDashboardMetrics(video);
  const searchTermsSummary = getPresentationVideoSearchTermsSummary(video);

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
