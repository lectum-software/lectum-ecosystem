import type { FrontendImagePreparationPurpose, ImageMimeType } from "./policy";

export type ImagePreparationStage = "analyzing" | "optimizing";

export type ImagePreparationProgress = {
  percentage: number | null;
  stage: ImagePreparationStage;
};

export type ImagePreparationReason =
  | "already-efficient"
  | "animated"
  | "candidate-not-smaller"
  | "failed"
  | "optimized"
  | "unsupported";

export type PreparedImage = {
  file: File;
  hasTransparency: boolean | null;
  height: number | null;
  mimeType: ImageMimeType | null;
  optimized: boolean;
  originalSize: number;
  preparedSize: number;
  purpose: FrontendImagePreparationPurpose;
  reason: ImagePreparationReason;
  width: number | null;
};

export type PrepareImageOptions = {
  onProgress?: (progress: ImagePreparationProgress) => void;
  purpose: FrontendImagePreparationPurpose;
  signal?: AbortSignal;
};

export class ImagePreparationCanceledError extends Error {
  constructor() {
    super("image_preparation_canceled");
    this.name = "AbortError";
  }
}

export class UnsupportedImageUploadTypeError extends Error {
  constructor() {
    super("unsupported_image_upload_type");
    this.name = "UnsupportedImageUploadTypeError";
  }
}

export const isImagePreparationCanceled = (error: unknown) =>
  error instanceof ImagePreparationCanceledError ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && error.name === "AbortError");

export const throwIfImagePreparationCanceled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ImagePreparationCanceledError();
};
