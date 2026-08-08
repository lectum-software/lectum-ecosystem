"use client";

import { ArrowDown, ArrowUp, Loader2, Video } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import type {
  AdminPsychologistDetail,
  AdminPsychologistEngagementMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { CardShell } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { formatPreviousPeriod } from "../../support/formatters";
import { isPublicAdminMediaSrc } from "../../support/media";
import { MetricComparisonLine } from "./common";

const formatVideoAxisTime = (positionPercent: number, durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return positionPercent === 0 ? "0:00" : "—";
  }

  const clampedPosition = Math.min(100, Math.max(0, positionPercent));
  const totalSeconds = Math.round((clampedPosition / 100) * durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const clampVideoPercent = (value: number) => Math.min(100, Math.max(0, value));

type VideoRetentionCurvePoint = {
  percentage: number;
  position_percent: number;
};

const ADMIN_RETENTION_CHART_WIDTH = 300;

const ADMIN_RETENTION_CHART_TOP = 12;

const ADMIN_RETENTION_CHART_BOTTOM = 116;

const ADMIN_RETENTION_CHART_AXIS_LABEL_Y = 144;

const ADMIN_RETENTION_CHART_LEFT_PADDING = 18;

const ADMIN_RETENTION_CHART_RIGHT_PADDING = 58;

const buildVideoRetentionAxisTicks = (durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [
      { id: "start", label: "0:00", positionPercent: 0 },
      { id: "end", label: "Fim", positionPercent: 100 },
    ];
  }

  const totalSeconds = Math.max(1, Math.round(durationSeconds));
  const tickCount = totalSeconds <= 60 ? 3 : totalSeconds <= 300 ? 4 : 5;

  return Array.from({ length: tickCount }, (_, index) => {
    const positionPercent = (index / (tickCount - 1)) * 100;

    return {
      id: String(index),
      label: formatVideoAxisTime(positionPercent, durationSeconds),
      positionPercent,
    };
  });
};

const toVideoRetentionChartPoint = (positionPercent: number, percentage: number) => {
  const x =
    ADMIN_RETENTION_CHART_LEFT_PADDING +
    (clampVideoPercent(positionPercent) / 100) *
      (ADMIN_RETENTION_CHART_WIDTH -
        ADMIN_RETENTION_CHART_LEFT_PADDING -
        ADMIN_RETENTION_CHART_RIGHT_PADDING);
  const y =
    ADMIN_RETENTION_CHART_TOP +
    ((100 - clampVideoPercent(percentage)) / 100) *
      (ADMIN_RETENTION_CHART_BOTTOM - ADMIN_RETENTION_CHART_TOP);

  return { x, y };
};

const buildVideoRetentionCurvePoints = ({
  retention,
  views,
}: {
  retention: AdminPsychologistStatistics["video"]["retention"];
  views: number;
}): VideoRetentionCurvePoint[] => {
  if (views <= 0) {
    return [
      { percentage: 0, position_percent: 0 },
      { percentage: 0, position_percent: 100 },
    ];
  }

  const intermediatePoints = retention
    .filter((point) => point.position_percent > 0 && point.position_percent < 100)
    .sort((left, right) => left.position_percent - right.position_percent)
    .map((point) => ({
      percentage: clampVideoPercent(point.percentage),
      position_percent: clampVideoPercent(point.position_percent),
    }));

  return [
    { percentage: 100, position_percent: 0 },
    ...intermediatePoints,
    { percentage: 0, position_percent: 100 },
  ];
};

const buildSmoothVideoRetentionPath = (points: VideoRetentionCurvePoint[]) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) =>
    toVideoRetentionChartPoint(point.position_percent, point.percentage),
  );
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

const VideoRetentionLineChart = ({
  currentTimeSeconds,
  durationSeconds,
  dropoff,
  retention,
  views,
}: {
  currentTimeSeconds?: number | null;
  durationSeconds?: number | null;
  dropoff?: AdminPsychologistStatistics["video"]["retention_dropoff"];
  retention: AdminPsychologistStatistics["video"]["retention"];
  views: number;
}) => {
  const chartPoints = buildVideoRetentionCurvePoints({ retention, views });
  const smoothPath = buildSmoothVideoRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { percentage: 0, position_percent: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? {
    percentage: 0,
    position_percent: 100,
  };
  const firstAreaPoint = toVideoRetentionChartPoint(
    firstChartPoint.position_percent,
    firstChartPoint.percentage,
  );
  const lastAreaPoint = toVideoRetentionChartPoint(
    lastChartPoint.position_percent,
    lastChartPoint.percentage,
  );
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(
        2,
      )} ${ADMIN_RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(
        2,
      )} ${ADMIN_RETENTION_CHART_BOTTOM} Z`
    : "";
  const playbackPositionPercent =
    durationSeconds && durationSeconds > 0 && Number.isFinite(durationSeconds)
      ? clampVideoPercent((((currentTimeSeconds ?? 0) || 0) / durationSeconds) * 100)
      : 0;
  const playbackPoint = toVideoRetentionChartPoint(playbackPositionPercent, 0);
  const progressX =
    durationSeconds && durationSeconds > 0 ? playbackPoint.x : ADMIN_RETENTION_CHART_LEFT_PADDING;
  const axisTicks = buildVideoRetentionAxisTicks(durationSeconds);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative w-full overflow-hidden rounded-[22px] bg-transparent px-1 py-2 text-left">
        <svg
          aria-label="Curva estimada de retenção do vídeo de apresentação"
          className="mx-auto h-[clamp(185px,19vw,245px)] w-full max-w-[620px] overflow-visible text-subtle"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 150"
        >
          <title>Curva contínua estimada de retenção por minuto do vídeo</title>
          <defs>
            <linearGradient id="admin-video-retention-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--admin-primary)" />
              <stop offset="100%" stopColor="var(--admin-primary-hover)" />
            </linearGradient>
            <linearGradient id="admin-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="admin-video-retention-shadow"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                floodColor="var(--admin-primary)"
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
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="12"
            y2="12"
          />
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="64"
            y2="64"
          />
          {areaPath ? <path d={areaPath} fill="url(#admin-video-retention-fill)" /> : null}
          <path
            d={smoothPath}
            fill="none"
            filter="url(#admin-video-retention-shadow)"
            stroke="url(#admin-video-retention-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
          />
          {durationSeconds && durationSeconds > 0 ? (
            <line
              stroke="var(--admin-primary)"
              strokeOpacity="0.45"
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
              x1={playbackPoint.x}
              x2={playbackPoint.x}
              y1="12"
              y2="122"
            />
          ) : null}
          <line
            className="stroke-border"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={ADMIN_RETENTION_CHART_WIDTH - ADMIN_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={ADMIN_RETENTION_CHART_LEFT_PADDING}
            x2={progressX}
            y1="122"
            y2="122"
          />
          <circle
            className="fill-surface stroke-border"
            cx={progressX}
            cy="122"
            r="6.5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {axisTicks.map((tick) => {
            const tickPoint = toVideoRetentionChartPoint(tick.positionPercent, 0);

            return (
              <g key={tick.id}>
                <line
                  className="stroke-border"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  x1={tickPoint.x}
                  x2={tickPoint.x}
                  y1="122"
                  y2="128"
                />
                <text
                  className="fill-subtle text-[8px] font-black"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  x={tickPoint.x}
                  y={ADMIN_RETENTION_CHART_AXIS_LABEL_Y}
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
      </div>

      {dropoff ? (
        <div className="rounded-2xl border border-border/70 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted">
          <span className="block font-black text-foreground">Maior queda estimada</span>
          <span>{`Entre ${dropoff.from_milestone}% e ${
            dropoff.to_milestone
          }% do vídeo (${formatVideoAxisTime(
            dropoff.from_milestone,
            durationSeconds,
          )} - ${formatVideoAxisTime(dropoff.to_milestone, durationSeconds)}).`}</span>
        </div>
      ) : null}
    </div>
  );
};

const VideoSummaryMetric = ({
  compact = false,
  comparison,
  label,
  value,
}: {
  compact?: boolean;
  comparison: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/50 p-3">
    <p className="text-xs font-black text-muted">{label}</p>
    <p
      className={cn(
        "mt-1 font-black leading-none text-foreground",
        compact ? "text-xl" : "text-2xl",
      )}
    >
      {value}
    </p>
    <MetricComparisonLine className={compact ? "mt-1.5" : "mt-2"} comparison={comparison} />
  </div>
);

const formatExplorePositionValue = (metric: AdminPsychologistEngagementMetric) => {
  if (!metric.available || metric.value === null) return "Sem base";

  return `#${metric.value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: metric.value % 1 === 0 ? 0 : 1,
  })}`;
};

const formatExplorePositionMovement = (metric: AdminPsychologistEngagementMetric) => {
  if (!metric.available || metric.value === null) return "Sem posição confiável no período";

  const comparison = metric.comparison;
  if (!comparison || comparison.trend === "unavailable") {
    return `Sem base anterior vs. ${formatPreviousPeriod(comparison)}`;
  }
  if (comparison.trend === "flat") return `Estável vs. ${formatPreviousPeriod(comparison)}`;

  const delta = Math.abs(metric.value - comparison.previous_value);
  const deltaLabel = delta.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: delta % 1 === 0 ? 0 : 1,
  });
  const noun = delta === 1 ? "posição" : "posições";
  const verb = comparison.trend === "up" ? "Subiu" : "Desceu";

  return `${verb} ${deltaLabel} ${noun} vs. ${formatPreviousPeriod(comparison)}`;
};

const VideoExplorePositionIndicator = ({
  metric,
}: {
  metric: AdminPsychologistEngagementMetric;
}) => {
  const trend = metric.comparison?.trend ?? "unavailable";
  const hasArrow = trend === "up" || trend === "down";
  const TrendIcon = trend === "down" ? ArrowDown : ArrowUp;

  return (
    <div className="shrink-0 rounded-2xl border border-border/70 bg-surface-muted/40 px-3 py-2.5 text-left sm:min-w-[230px] sm:text-right">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-muted">
        Posição média no Explorar
      </p>
      <div className="mt-1 flex items-center gap-2 sm:justify-end">
        {hasArrow ? (
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              trend === "up" && "bg-success/10 text-success",
              trend === "down" && "bg-danger/10 text-danger",
            )}
          >
            <TrendIcon aria-hidden className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <span className="text-xl font-black leading-none text-foreground">
          {formatExplorePositionValue(metric)}
        </span>
      </div>
      <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
        {formatExplorePositionMovement(metric)}
      </p>
    </div>
  );
};

export const StatisticsVideoCard = ({
  className,
  detail,
  isRefreshing = false,
  periodControls,
  statistics,
}: {
  className?: string;
  detail: AdminPsychologistDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
  statistics: AdminPsychologistStatistics;
}) => {
  const video = statistics.video;
  const cover = renderableImageSrc(
    video.cover_url ||
      detail.profile.content.video_cover_url ||
      detail.profile.content.cover_image_url,
  );
  const videoSrc = resolveAdminMediaUrl(video.video_url || detail.profile.content.video_url);
  const [videoCurrentTimeSeconds, setVideoCurrentTimeSeconds] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);

  const updateVideoCurrentTime = (currentTime: number) => {
    setVideoCurrentTimeSeconds(Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0);
  };

  const updateVideoDuration = (duration: number) => {
    setVideoDurationSeconds(Number.isFinite(duration) && duration > 0 ? duration : null);
  };

  return (
    <CardShell className={cn("flex flex-col p-4 sm:p-5", className)}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold leading-tight text-foreground">
                  Análises do vídeo de apresentação
                </h2>
                {isRefreshing ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                    Atualizando
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                Consumo, retenção e interações atribuídas ao vídeo de apresentação no período.
              </p>
            </div>
            <VideoExplorePositionIndicator metric={video.explore_position} />
          </div>
        </div>
        {periodControls}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(150px,190px)_minmax(0,1fr)_minmax(220px,280px)] xl:items-stretch">
        <div className="order-1 min-w-0">
          <div className="mx-auto aspect-[9/16] w-full max-w-[176px] overflow-hidden rounded-[1.35rem] border border-border bg-black shadow-sm xl:mx-0 xl:max-w-[190px]">
            {videoSrc ? (
              <>
                {/* biome-ignore lint/a11y/useMediaCaption: o backend ainda não expõe arquivo de legenda para o vídeo do perfil. */}
                <video
                  aria-label={`Miniplayer do vídeo de apresentação de ${detail.header.name}`}
                  className="h-full w-full bg-black object-cover"
                  controls
                  onDurationChange={(event) => updateVideoDuration(event.currentTarget.duration)}
                  onLoadedMetadata={(event) => {
                    updateVideoDuration(event.currentTarget.duration);
                    updateVideoCurrentTime(event.currentTarget.currentTime);
                  }}
                  onSeeked={(event) => updateVideoCurrentTime(event.currentTarget.currentTime)}
                  onTimeUpdate={(event) => updateVideoCurrentTime(event.currentTarget.currentTime)}
                  playsInline
                  poster={cover || undefined}
                  preload="metadata"
                  src={videoSrc}
                />
              </>
            ) : (
              <div className="grid h-full place-items-center bg-surface-muted p-4 text-center">
                {cover ? (
                  <div className="relative h-full w-full overflow-hidden rounded-2xl">
                    <Image
                      alt={`Capa do vídeo de apresentação de ${detail.header.name}`}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1280px) 190px, 176px"
                      src={cover}
                      unoptimized={isPublicAdminMediaSrc(cover)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2 text-primary">
                    <Video aria-hidden className="mx-auto h-10 w-10" />
                    <span className="text-xs font-black text-muted">Nenhum vídeo cadastrado</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="order-3 min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/40 p-3 sm:p-4 xl:order-2">
          <VideoRetentionLineChart
            currentTimeSeconds={videoCurrentTimeSeconds}
            dropoff={video.retention_dropoff}
            durationSeconds={videoDurationSeconds ?? video.duration_seconds}
            retention={video.retention}
            views={video.metrics.sessions}
          />
        </div>

        <div className="order-2 min-w-0 xl:order-3">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <VideoSummaryMetric
              comparison={video.comparisons.sessions}
              label="Visualizações"
              value={numberFormatter.format(video.metrics.sessions)}
            />
            <VideoSummaryMetric
              comparison={video.comparisons.replay_rate_percent}
              label="Taxa de replays"
              value={`${video.metrics.replay_rate_percent.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}%`}
            />
            <VideoSummaryMetric
              comparison={video.comparisons.average_retention_percent}
              label="Retenção média"
              value={`${video.metrics.average_retention_percent.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}%`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-surface-muted/30 p-3 sm:p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Ações geradas pelo vídeo
          </p>
          <p className="mt-1 text-sm font-bold text-muted">
            Interações atribuídas ao vídeo de apresentação no período selecionado.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.favorites_from_video}
            label="Favoritados pelo vídeo"
            value={numberFormatter.format(video.metrics.favorites_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.profile_accesses_from_video}
            label="Acessos ao perfil"
            value={numberFormatter.format(video.metrics.profile_accesses_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.whatsapp_clicks_from_video}
            label="Cliques no WhatsApp"
            value={numberFormatter.format(video.metrics.whatsapp_clicks_from_video)}
          />
          <VideoSummaryMetric
            compact
            comparison={video.comparisons.shares_from_video}
            label="Compartilhamentos"
            value={numberFormatter.format(video.metrics.shares_from_video)}
          />
        </div>
      </div>
    </CardShell>
  );
};
