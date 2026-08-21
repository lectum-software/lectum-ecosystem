export const VIDEO_PREPARATION_PURPOSES = [
  "profile-presentation",
  "community-post",
  "community-reply",
] as const;

export type VideoPreparationPurpose = (typeof VIDEO_PREPARATION_PURPOSES)[number];

export const isVideoPreparationPurpose = (value: unknown): value is VideoPreparationPurpose =>
  VIDEO_PREPARATION_PURPOSES.includes(value as VideoPreparationPurpose);

export type VideoPreparationStage = "analyzing" | "optimizing";

export type VideoPreparationProgress = {
  percentage: number | null;
  stage: VideoPreparationStage;
};

export type PreparedVideo = {
  file: File;
  optimized: boolean;
  originalSize: number;
  preparedSize: number;
};

export type VideoOptimizationWorkerRequest =
  | { file: File; purpose: VideoPreparationPurpose; type: "start" }
  | { type: "cancel" };

export type VideoOptimizationWorkerResponse =
  | { percentage: number | null; stage: VideoPreparationStage; type: "progress" }
  | { reason: "already-efficient" | "failed" | "unsupported"; type: "use-original" }
  | { buffer: ArrayBuffer; outputSize: number; type: "optimized" }
  | { type: "canceled" };

export class VideoUploadCanceledError extends Error {
  constructor() {
    super("video_upload_canceled");
    this.name = "AbortError";
  }
}

export const isVideoUploadCanceled = (error: unknown) =>
  error instanceof VideoUploadCanceledError ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError"));

export const throwIfVideoUploadCanceled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new VideoUploadCanceledError();
};

export const isVideoOptimizationWorkerResponse = (
  value: unknown,
): value is VideoOptimizationWorkerResponse => {
  if (!value || typeof value !== "object" || !("type" in value)) return false;

  const message = value as Record<string, unknown>;
  if (message.type === "canceled") return true;
  if (message.type === "optimized") {
    return (
      message.buffer instanceof ArrayBuffer &&
      Number.isInteger(message.outputSize) &&
      message.outputSize === message.buffer.byteLength
    );
  }
  if (message.type === "progress") {
    return (
      (message.stage === "analyzing" || message.stage === "optimizing") &&
      (message.percentage === null ||
        (typeof message.percentage === "number" &&
          Number.isFinite(message.percentage) &&
          message.percentage >= 0 &&
          message.percentage <= 100))
    );
  }
  if (message.type === "use-original") {
    return ["already-efficient", "failed", "unsupported"].includes(String(message.reason));
  }

  return false;
};
