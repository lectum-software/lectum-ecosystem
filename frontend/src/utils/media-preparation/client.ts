import {
  isImagePreparationCanceled,
  type PreparedImage,
  prepareImageUpload,
  resolveImageFileMimeType,
  withCanonicalImageFileType,
} from "../image-preparation";
import { isVideoUploadCanceled, type PreparedVideo, prepareVideo } from "../video-preparation";
import {
  isVideoUploadPurpose,
  type MediaPreparationPurpose,
  requireMediaPreparationFileKind,
  resolveMediaPreparationAdapter,
  resolveVideoPreparationPurpose,
  UnsupportedPublicMediaTypeError,
} from "./policy";

export type MediaPreparationProgress = {
  percentage: number | null;
  stage: "analyzing" | "optimizing";
};

export type MediaUploadProgress =
  | (MediaPreparationProgress & { phase: "preparing" })
  | { percentage: number; phase: "uploading"; stage: "uploading" };

export type PreparedUpload = {
  file: File;
  kind: "image" | "video";
  optimized: boolean;
  originalSize: number;
  preparedSize: number;
  purpose: MediaPreparationPurpose;
};

export type PrepareUploadInput = {
  file: File;
  onProgress?: (progress: MediaPreparationProgress) => void;
  purpose: MediaPreparationPurpose;
  signal?: AbortSignal;
};

const toPreparedUpload = (
  prepared: PreparedImage | PreparedVideo,
  purpose: MediaPreparationPurpose,
  kind: PreparedUpload["kind"],
): PreparedUpload => ({
  file: prepared.file,
  kind,
  optimized: prepared.optimized,
  originalSize: prepared.originalSize,
  preparedSize: prepared.preparedSize,
  purpose,
});

export const prepareUpload = async ({
  file,
  onProgress,
  purpose,
  signal,
}: PrepareUploadInput): Promise<PreparedUpload> => {
  const adapter = resolveMediaPreparationAdapter(purpose);
  requireMediaPreparationFileKind(file, purpose);

  if (adapter === "passthrough") {
    const mimeType = resolveImageFileMimeType(file);
    if (!mimeType) throw new UnsupportedPublicMediaTypeError();
    const preparedFile = withCanonicalImageFileType(file, mimeType);

    return {
      file: preparedFile,
      kind: "image",
      optimized: false,
      originalSize: file.size,
      preparedSize: preparedFile.size,
      purpose,
    };
  }

  if (isVideoUploadPurpose(purpose)) {
    const prepared = await prepareVideo(file, {
      onProgress,
      purpose: resolveVideoPreparationPurpose(purpose),
      signal,
    });

    return toPreparedUpload(prepared, purpose, "video");
  }

  const prepared = await prepareImageUpload(file, {
    onProgress,
    purpose,
    signal,
  });
  return toPreparedUpload(prepared, purpose, "image");
};

export const isUploadPreparationCanceled = (error: unknown) =>
  isImagePreparationCanceled(error) || isVideoUploadCanceled(error);
