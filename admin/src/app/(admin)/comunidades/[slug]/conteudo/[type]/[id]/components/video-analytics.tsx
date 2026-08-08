"use client";

import type { AdminCommunityContentAnalyticsDetail } from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { cardClass, formatPercent, videoAnalyticsCounters } from "../modules/content-support";
import {
  buildContentVideoRetentionAxisTicks,
  buildContentVideoRetentionCurvePoints,
  buildSmoothContentVideoRetentionPath,
  CONTENT_RETENTION_CHART_AXIS_LABEL_Y,
  CONTENT_RETENTION_CHART_BOTTOM,
  CONTENT_RETENTION_CHART_LEFT_PADDING,
  CONTENT_RETENTION_CHART_RIGHT_PADDING,
  CONTENT_RETENTION_CHART_WIDTH,
  type ContentVideoAnalytics,
  toContentVideoRetentionChartPoint,
} from "../modules/video-support";

export const ContentVideoRetentionChart = ({ video }: { video: ContentVideoAnalytics }) => {
  const chartPoints = buildContentVideoRetentionCurvePoints(video);
  const smoothPath = buildSmoothContentVideoRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { label: "0%", percentage: 0, position_percent: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? {
    label: "100%",
    percentage: 0,
    position_percent: 100,
  };
  const firstAreaPoint = toContentVideoRetentionChartPoint(
    firstChartPoint.position_percent,
    firstChartPoint.percentage,
  );
  const lastAreaPoint = toContentVideoRetentionChartPoint(
    lastChartPoint.position_percent,
    lastChartPoint.percentage,
  );
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(
        2,
      )} ${CONTENT_RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(
        2,
      )} ${CONTENT_RETENTION_CHART_BOTTOM} Z`
    : "";
  const axisTicks = buildContentVideoRetentionAxisTicks(video.metrics.duration_seconds);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative w-full overflow-hidden rounded-[22px] bg-transparent px-1 py-2 text-left">
        <svg
          aria-label="Curva de retenção do vídeo do conteúdo"
          className="mx-auto h-[clamp(185px,24vw,245px)] w-full max-w-[620px] overflow-visible text-subtle"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 150"
        >
          <title>Curva de retenção por trecho assistido do vídeo</title>
          <defs>
            <linearGradient id="content-video-retention-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--admin-primary)" />
              <stop offset="100%" stopColor="var(--admin-primary-hover)" />
            </linearGradient>
            <linearGradient id="content-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="content-video-retention-shadow"
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
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="12"
            y2="12"
          />
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="64"
            y2="64"
          />
          {areaPath ? <path d={areaPath} fill="url(#content-video-retention-fill)" /> : null}
          {smoothPath ? (
            <path
              d={smoothPath}
              fill="none"
              filter="url(#content-video-retention-shadow)"
              stroke="url(#content-video-retention-gradient)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <line
            className="stroke-border"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_LEFT_PADDING}
            y1="122"
            y2="122"
          />
          <circle
            className="fill-surface stroke-border"
            cx={CONTENT_RETENTION_CHART_LEFT_PADDING}
            cy="122"
            r="6.5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {axisTicks.map((tick) => {
            const tickPoint = toContentVideoRetentionChartPoint(tick.positionPercent, 0);

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
                  y={CONTENT_RETENTION_CHART_AXIS_LABEL_Y}
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

      {video.retention_dropoff ? (
        <div className="rounded-2xl border border-border/70 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted">
          <span className="block font-black text-foreground">Maior queda</span>
          <span>
            {video.retention_dropoff.from_label} → {video.retention_dropoff.to_label} (
            {formatPercent(video.retention_dropoff.rate_drop)} de queda).
          </span>
        </div>
      ) : null}
    </div>
  );
};

export const VideoAnalyticsSection = ({
  detail,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
}) => {
  const video = detail.video;
  if (!video) return null;

  return (
    <section
      className={cn(cardClass, "p-5")}
      aria-labelledby="content-detail-video-analytics-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-xl font-black text-foreground"
            id="content-detail-video-analytics-title"
          >
            Análises do vídeo
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">
            Retenção e interações atribuídas ao conteúdo no período selecionado.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-stretch">
        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/40 p-3 sm:p-4">
          {!video.available ? (
            <p className="rounded-2xl border border-border/70 bg-surface px-4 py-5 text-sm font-bold leading-6 text-muted">
              {video.unavailable_reason ||
                "Retenção indisponível - a coleta começa a partir dos próximos acessos ao vídeo."}
            </p>
          ) : (
            <ContentVideoRetentionChart video={video} />
          )}
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {videoAnalyticsCounters(detail, video).map((metric) => (
            <article
              className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/40 p-4"
              key={metric.id}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[16px] bg-primary-soft text-primary">
                <metric.icon aria-hidden className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-muted">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black text-foreground">{metric.value}</p>
              {"caption" in metric && metric.caption ? (
                <p className="mt-1 text-xs font-bold leading-5 text-muted">{metric.caption}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
