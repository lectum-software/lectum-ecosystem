const FALLBACK_VIDEO_EXPORT_SECONDS = 15;
const UNKNOWN_VIDEO_EXPORT_SAFETY_TIMEOUT_MS = 10 * 60_000;
const VIDEO_EXPORT_SAFETY_GRACE_MS = 60_000;
const VIDEO_EXPORT_SAFETY_FACTOR = 3;
const VIDEO_EXPORT_STALL_TIMEOUT_MS = 45_000;

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
    return UNKNOWN_VIDEO_EXPORT_SAFETY_TIMEOUT_MS;
  }

  return durationSeconds * 1000 * VIDEO_EXPORT_SAFETY_FACTOR + VIDEO_EXPORT_SAFETY_GRACE_MS;
};

export const resolveVideoExportStallTimeoutMs = () => VIDEO_EXPORT_STALL_TIMEOUT_MS;
