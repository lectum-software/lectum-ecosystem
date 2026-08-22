const FALLBACK_VIDEO_EXPORT_SECONDS = 15;
const VIDEO_EXPORT_SAFETY_GRACE_MS = 15_000;
const VIDEO_EXPORT_SAFETY_FACTOR = 1.25;

export const resolveVideoExportDurationSeconds = (duration: number) => {
  if (Number.isFinite(duration) && duration > 0) {
    return Math.max(duration, 1);
  }

  return FALLBACK_VIDEO_EXPORT_SECONDS;
};

export const resolveVideoExportSafetyTimeoutMs = (
  durationSeconds: number,
  hasKnownDuration: boolean,
) => {
  if (!hasKnownDuration) {
    return durationSeconds * 1000;
  }

  return durationSeconds * 1000 * VIDEO_EXPORT_SAFETY_FACTOR + VIDEO_EXPORT_SAFETY_GRACE_MS;
};
