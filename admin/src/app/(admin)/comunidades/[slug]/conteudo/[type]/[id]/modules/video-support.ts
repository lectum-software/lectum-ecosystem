import type { AdminCommunityContentAnalyticsDetail } from "@/api/req/communities";

export type ContentVideoAnalytics = NonNullable<AdminCommunityContentAnalyticsDetail["video"]>;

export type ContentVideoRetentionCurvePoint = ContentVideoAnalytics["retention"][number];

export const CONTENT_RETENTION_CHART_WIDTH = 300;

export const CONTENT_RETENTION_CHART_TOP = 12;

export const CONTENT_RETENTION_CHART_BOTTOM = 116;

export const CONTENT_RETENTION_CHART_AXIS_LABEL_Y = 144;

export const CONTENT_RETENTION_CHART_LEFT_PADDING = 18;

export const CONTENT_RETENTION_CHART_RIGHT_PADDING = 58;

export const clampVideoPercent = (value: number) => Math.min(100, Math.max(0, value));

export const formatVideoAxisTime = (positionPercent: number, durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return positionPercent === 0 ? "0:00" : "Fim";
  }

  const clampedPosition = clampVideoPercent(positionPercent);
  const totalSeconds = Math.round((clampedPosition / 100) * durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const buildContentVideoRetentionAxisTicks = (durationSeconds?: number | null) => {
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

export const toContentVideoRetentionChartPoint = (positionPercent: number, percentage: number) => {
  const x =
    CONTENT_RETENTION_CHART_LEFT_PADDING +
    (clampVideoPercent(positionPercent) / 100) *
      (CONTENT_RETENTION_CHART_WIDTH -
        CONTENT_RETENTION_CHART_LEFT_PADDING -
        CONTENT_RETENTION_CHART_RIGHT_PADDING);
  const y =
    CONTENT_RETENTION_CHART_TOP +
    ((100 - clampVideoPercent(percentage)) / 100) *
      (CONTENT_RETENTION_CHART_BOTTOM - CONTENT_RETENTION_CHART_TOP);

  return { x, y };
};

export const buildContentVideoRetentionCurvePoints = (
  video: ContentVideoAnalytics,
): ContentVideoRetentionCurvePoint[] => {
  if (video.metrics.plays_count <= 0) {
    return [
      { label: "0%", percentage: 0, position_percent: 0 },
      { label: "100%", percentage: 0, position_percent: 100 },
    ];
  }

  const points = video.retention
    .map((point) => ({
      label: point.label,
      percentage: clampVideoPercent(point.percentage),
      position_percent: clampVideoPercent(point.position_percent),
    }))
    .sort((left, right) => left.position_percent - right.position_percent);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || firstPoint.position_percent > 0) {
    points.unshift({ label: "0%", percentage: 100, position_percent: 0 });
  }

  if (!lastPoint || lastPoint.position_percent < 100) {
    points.push({
      label: "100%",
      percentage: clampVideoPercent(video.metrics.completion_rate),
      position_percent: 100,
    });
  }

  return points;
};

export const buildSmoothContentVideoRetentionPath = (points: ContentVideoRetentionCurvePoint[]) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) =>
    toContentVideoRetentionChartPoint(point.position_percent, point.percentage),
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
