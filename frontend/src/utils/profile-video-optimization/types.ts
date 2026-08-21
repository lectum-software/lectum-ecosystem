export type ProfileVideoPreparationStage = "analyzing" | "optimizing";

export type ProfileVideoPreparationProgress = {
  percentage: number | null;
  stage: ProfileVideoPreparationStage;
};

export type PreparedProfileVideo = {
  file: File;
  optimized: boolean;
  originalSize: number;
  preparedSize: number;
};

export type ProfileVideoOptimizationWorkerRequest =
  | { file: File; type: "start" }
  | { type: "cancel" };

export type ProfileVideoOptimizationWorkerResponse =
  | { percentage: number | null; stage: ProfileVideoPreparationStage; type: "progress" }
  | { reason: "already-efficient" | "failed" | "unsupported"; type: "use-original" }
  | { buffer: ArrayBuffer; outputSize: number; type: "optimized" }
  | { type: "canceled" };

export class ProfileVideoUploadCanceledError extends Error {
  constructor() {
    super("profile_video_upload_canceled");
    this.name = "AbortError";
  }
}

export const isProfileVideoUploadCanceled = (error: unknown) =>
  error instanceof ProfileVideoUploadCanceledError ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError"));

export const throwIfProfileVideoUploadCanceled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ProfileVideoUploadCanceledError();
};

export const isProfileVideoOptimizationWorkerResponse = (
  value: unknown,
): value is ProfileVideoOptimizationWorkerResponse => {
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
