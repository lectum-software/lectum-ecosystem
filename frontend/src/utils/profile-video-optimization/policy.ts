const MEBIBYTE = 1024 * 1024;

export const PROFILE_VIDEO_MAX_OUTPUT_BYTES = 80 * MEBIBYTE;
export const PROFILE_VIDEO_MAX_EDGE_PX = 1920;
export const PROFILE_VIDEO_MAX_FRAME_RATE = 30;
export const PROFILE_VIDEO_AUDIO_BITRATE = 128_000;

const PROFILE_VIDEO_MIN_VIDEO_BITRATE = 1_000_000;
const PROFILE_VIDEO_OUTPUT_SAFETY_FACTOR = 0.88;
const PROFILE_VIDEO_CONTAINER_OVERHEAD_FACTOR = 1.12;
const PROFILE_VIDEO_UNKNOWN_DURATION_BYPASS_BYTES = 24 * MEBIBYTE;

export type ProfileVideoContainer = "mp4" | "other" | "webm";

export type ProfileVideoAnalysis = {
  audioCodec: string | null;
  container: ProfileVideoContainer;
  durationSeconds: number | null;
  fileSize: number;
  frameRate: number;
  height: number;
  videoCodec: string | null;
  width: number;
};

export type ProfileVideoEncodingPolicy = {
  estimatedOutputBytes: number;
  frameRate: number;
  height: number;
  videoBitrate: number;
  width: number;
};

const toEvenDimension = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const resolveProfileVideoContainer = (mimeType: string): ProfileVideoContainer => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.startsWith("video/mp4")) return "mp4";
  if (normalized.startsWith("video/webm")) return "webm";
  return "other";
};

export const resolveProfileVideoDimensions = (width: number, height: number) => {
  const safeWidth = Math.max(2, Math.round(width));
  const safeHeight = Math.max(2, Math.round(height));
  const scale = Math.min(1, PROFILE_VIDEO_MAX_EDGE_PX / Math.max(safeWidth, safeHeight));

  return {
    height: toEvenDimension(safeHeight * scale),
    width: toEvenDimension(safeWidth * scale),
  };
};

const resolveBaseVideoBitrate = (width: number, height: number) => {
  const pixels = width * height;
  if (pixels >= 1920 * 1080) return 5_000_000;
  if (pixels >= 1280 * 720) return 3_200_000;
  return 1_800_000;
};

export const resolveProfileVideoEncodingPolicy = (
  analysis: ProfileVideoAnalysis,
): ProfileVideoEncodingPolicy | null => {
  const { height, width } = resolveProfileVideoDimensions(analysis.width, analysis.height);
  const frameRate = Math.min(PROFILE_VIDEO_MAX_FRAME_RATE, Math.max(1, analysis.frameRate || 30));
  let videoBitrate = resolveBaseVideoBitrate(width, height);

  if (analysis.durationSeconds && analysis.durationSeconds > 0) {
    const totalBudgetBitrate =
      (PROFILE_VIDEO_MAX_OUTPUT_BYTES * 8 * PROFILE_VIDEO_OUTPUT_SAFETY_FACTOR) /
      analysis.durationSeconds;
    videoBitrate = Math.min(
      videoBitrate,
      Math.floor(totalBudgetBitrate - PROFILE_VIDEO_AUDIO_BITRATE),
    );
  }

  if (videoBitrate < PROFILE_VIDEO_MIN_VIDEO_BITRATE) return null;

  const estimatedOutputBytes = analysis.durationSeconds
    ? Math.ceil(
        ((videoBitrate + PROFILE_VIDEO_AUDIO_BITRATE) *
          analysis.durationSeconds *
          PROFILE_VIDEO_CONTAINER_OVERHEAD_FACTOR) /
          8,
      )
    : PROFILE_VIDEO_MAX_OUTPUT_BYTES;

  if (estimatedOutputBytes > PROFILE_VIDEO_MAX_OUTPUT_BYTES) return null;
  return { estimatedOutputBytes, frameRate, height, videoBitrate, width };
};

const hasWebCompatibleCodecs = (analysis: ProfileVideoAnalysis) => {
  if (analysis.container === "mp4") {
    return analysis.videoCodec === "avc" && (!analysis.audioCodec || analysis.audioCodec === "aac");
  }
  if (analysis.container === "webm") {
    return (
      ["av1", "vp8", "vp9"].includes(analysis.videoCodec ?? "") &&
      (!analysis.audioCodec || ["opus", "vorbis"].includes(analysis.audioCodec))
    );
  }
  return false;
};

export const shouldOptimizeProfileVideo = (
  analysis: ProfileVideoAnalysis,
  policy: ProfileVideoEncodingPolicy,
) => {
  if (!hasWebCompatibleCodecs(analysis)) return true;
  if (
    Math.max(analysis.width, analysis.height) > PROFILE_VIDEO_MAX_EDGE_PX ||
    analysis.frameRate > PROFILE_VIDEO_MAX_FRAME_RATE + 0.5 ||
    analysis.fileSize > PROFILE_VIDEO_MAX_OUTPUT_BYTES
  ) {
    return true;
  }

  if (!analysis.durationSeconds) {
    return analysis.fileSize > PROFILE_VIDEO_UNKNOWN_DURATION_BYPASS_BYTES;
  }

  const inputBitrate = (analysis.fileSize * 8) / analysis.durationSeconds;
  const efficientBitrateCeiling =
    (policy.videoBitrate + PROFILE_VIDEO_AUDIO_BITRATE) * PROFILE_VIDEO_CONTAINER_OVERHEAD_FACTOR;
  return inputBitrate > efficientBitrateCeiling;
};

export const shouldUseOptimizedProfileVideo = (originalSize: number, outputSize: number) =>
  Number.isInteger(outputSize) &&
  outputSize > 0 &&
  outputSize < originalSize &&
  outputSize <= PROFILE_VIDEO_MAX_OUTPUT_BYTES;

export const formatProfileVideoSize = (bytes: number) => {
  const megabytes = bytes / MEBIBYTE;
  return `${megabytes.toLocaleString("pt-BR", {
    maximumFractionDigits: megabytes >= 10 ? 0 : 1,
    minimumFractionDigits: 0,
  })} MB`;
};
