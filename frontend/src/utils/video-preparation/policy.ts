import type { VideoPreparationPurpose } from "./types";

const MEBIBYTE = 1024 * 1024;

export const VIDEO_MAX_OUTPUT_BYTES = 80 * MEBIBYTE;
export const VIDEO_MAX_EDGE_PX = 1920;
export const VIDEO_MAX_FRAME_RATE = 30;
export const VIDEO_AUDIO_BITRATE = 128_000;

const VIDEO_MIN_VIDEO_BITRATE = 1_000_000;
const VIDEO_OUTPUT_SAFETY_FACTOR = 0.88;
const VIDEO_CONTAINER_OVERHEAD_FACTOR = 1.12;
const VIDEO_UNKNOWN_DURATION_BYPASS_BYTES = 24 * MEBIBYTE;

export type VideoPreparationPurposePolicy = {
  audioBitrate: number;
  maxEdgePx: number;
  maxFrameRate: number;
  maxOutputBytes: number;
  minVideoBitrate: number;
  outputFileName: string;
  unknownDurationBypassBytes: number;
};

const BASE_VIDEO_PREPARATION_POLICY = {
  audioBitrate: VIDEO_AUDIO_BITRATE,
  maxEdgePx: VIDEO_MAX_EDGE_PX,
  maxFrameRate: VIDEO_MAX_FRAME_RATE,
  maxOutputBytes: VIDEO_MAX_OUTPUT_BYTES,
  minVideoBitrate: VIDEO_MIN_VIDEO_BITRATE,
  unknownDurationBypassBytes: VIDEO_UNKNOWN_DURATION_BYPASS_BYTES,
} as const;

export const VIDEO_PREPARATION_POLICIES = {
  "community-post": {
    ...BASE_VIDEO_PREPARATION_POLICY,
    outputFileName: "video-post.mp4",
  },
  "community-reply": {
    ...BASE_VIDEO_PREPARATION_POLICY,
    outputFileName: "video-resposta.mp4",
  },
  "profile-presentation": {
    ...BASE_VIDEO_PREPARATION_POLICY,
    outputFileName: "video-apresentacao.mp4",
  },
} as const satisfies Record<VideoPreparationPurpose, VideoPreparationPurposePolicy>;

export const getVideoPreparationPurposePolicy = (
  purpose: VideoPreparationPurpose,
): VideoPreparationPurposePolicy => VIDEO_PREPARATION_POLICIES[purpose];

export type VideoContainer = "mp4" | "other" | "webm";

export type VideoAnalysis = {
  audioCodec: string | null;
  container: VideoContainer;
  durationSeconds: number | null;
  fileSize: number;
  frameRate: number;
  height: number;
  videoCodec: string | null;
  width: number;
};

export type VideoEncodingPolicy = {
  estimatedOutputBytes: number;
  frameRate: number;
  height: number;
  videoBitrate: number;
  width: number;
};

const toEvenDimension = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const resolveVideoContainer = (mimeType: string): VideoContainer => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.startsWith("video/mp4")) return "mp4";
  if (normalized.startsWith("video/webm")) return "webm";
  return "other";
};

export const resolveVideoDimensions = (
  width: number,
  height: number,
  purpose: VideoPreparationPurpose,
) => {
  const purposePolicy = getVideoPreparationPurposePolicy(purpose);
  const safeWidth = Math.max(2, Math.round(width));
  const safeHeight = Math.max(2, Math.round(height));
  const scale = Math.min(1, purposePolicy.maxEdgePx / Math.max(safeWidth, safeHeight));

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

export const resolveVideoEncodingPolicy = (
  analysis: VideoAnalysis,
  purpose: VideoPreparationPurpose,
): VideoEncodingPolicy | null => {
  const purposePolicy = getVideoPreparationPurposePolicy(purpose);
  const { height, width } = resolveVideoDimensions(analysis.width, analysis.height, purpose);
  const frameRate = Math.min(
    purposePolicy.maxFrameRate,
    Math.max(1, analysis.frameRate || purposePolicy.maxFrameRate),
  );
  let videoBitrate = resolveBaseVideoBitrate(width, height);

  if (analysis.durationSeconds && analysis.durationSeconds > 0) {
    const totalBudgetBitrate =
      (purposePolicy.maxOutputBytes * 8 * VIDEO_OUTPUT_SAFETY_FACTOR) / analysis.durationSeconds;
    videoBitrate = Math.min(
      videoBitrate,
      Math.floor(totalBudgetBitrate - purposePolicy.audioBitrate),
    );
  }

  if (videoBitrate < purposePolicy.minVideoBitrate) return null;

  const estimatedOutputBytes = analysis.durationSeconds
    ? Math.ceil(
        ((videoBitrate + purposePolicy.audioBitrate) *
          analysis.durationSeconds *
          VIDEO_CONTAINER_OVERHEAD_FACTOR) /
          8,
      )
    : purposePolicy.maxOutputBytes;

  if (estimatedOutputBytes > purposePolicy.maxOutputBytes) return null;
  return { estimatedOutputBytes, frameRate, height, videoBitrate, width };
};

const hasWebCompatibleCodecs = (analysis: VideoAnalysis) => {
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

export const shouldOptimizeVideo = (
  analysis: VideoAnalysis,
  encodingPolicy: VideoEncodingPolicy,
  purpose: VideoPreparationPurpose,
) => {
  const purposePolicy = getVideoPreparationPurposePolicy(purpose);
  if (!hasWebCompatibleCodecs(analysis)) return true;
  if (
    Math.max(analysis.width, analysis.height) > purposePolicy.maxEdgePx ||
    analysis.frameRate > purposePolicy.maxFrameRate + 0.5 ||
    analysis.fileSize > purposePolicy.maxOutputBytes
  ) {
    return true;
  }

  if (!analysis.durationSeconds) {
    return analysis.fileSize > purposePolicy.unknownDurationBypassBytes;
  }

  const inputBitrate = (analysis.fileSize * 8) / analysis.durationSeconds;
  const efficientBitrateCeiling =
    (encodingPolicy.videoBitrate + purposePolicy.audioBitrate) * VIDEO_CONTAINER_OVERHEAD_FACTOR;
  return inputBitrate > efficientBitrateCeiling;
};

export const shouldUseOptimizedVideo = (
  originalSize: number,
  outputSize: number,
  purpose: VideoPreparationPurpose,
) =>
  Number.isInteger(outputSize) &&
  outputSize > 0 &&
  outputSize < originalSize &&
  outputSize <= getVideoPreparationPurposePolicy(purpose).maxOutputBytes;

export const resolveVideoOutputFileName = (purpose: VideoPreparationPurpose) =>
  getVideoPreparationPurposePolicy(purpose).outputFileName;

export const formatVideoSize = (bytes: number) => {
  const megabytes = bytes / MEBIBYTE;
  return `${megabytes.toLocaleString("pt-BR", {
    maximumFractionDigits: megabytes >= 10 ? 0 : 1,
    minimumFractionDigits: 0,
  })} MB`;
};
