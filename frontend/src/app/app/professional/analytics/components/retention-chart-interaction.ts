import {
  clampPercent,
  RETENTION_CHART_LEFT_PADDING,
  RETENTION_CHART_RIGHT_PADDING,
  RETENTION_CHART_WIDTH,
} from "../modules/support";

type ScreenTransform = Pick<DOMMatrixReadOnly, "a" | "b" | "c" | "d" | "e" | "f">;

export const getRetentionSeekPercent = (
  clientX: number,
  clientY: number,
  screenTransform: ScreenTransform | null | undefined,
) => {
  if (!screenTransform) return null;

  const { a, b, c, d, e, f } = screenTransform;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || determinant === 0) return null;

  // Invert the SVG's actual screen CTM, including centering/letterboxing and CSS
  // transforms. Only the local x coordinate is needed; no DOM geometry fallback.
  const chartX = (d * (clientX - e) - c * (clientY - f)) / determinant;
  if (!Number.isFinite(chartX)) return null;

  return clampPercent(
    ((chartX - RETENTION_CHART_LEFT_PADDING) /
      (RETENTION_CHART_WIDTH - RETENTION_CHART_LEFT_PADDING - RETENTION_CHART_RIGHT_PADDING)) *
      100,
  );
};

export const getRetentionKeyboardSeekPercent = (
  key: string,
  currentTimeSeconds: number,
  durationSeconds: number | null | undefined,
) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  // Match the existing VerticalVideoPlayer persistent media controls (1–5s).
  const step = Math.min(5, Math.max(1, durationSeconds * 0.05));
  let nextTime: number;

  if (key === "ArrowLeft" || key === "ArrowDown") {
    nextTime = currentTimeSeconds - step;
  } else if (key === "ArrowRight" || key === "ArrowUp") {
    nextTime = currentTimeSeconds + step;
  } else if (key === "Home") {
    nextTime = 0;
  } else if (key === "End") {
    nextTime = durationSeconds;
  } else {
    return null;
  }

  return Number.isFinite(nextTime) ? clampPercent((nextTime / durationSeconds) * 100) : null;
};
