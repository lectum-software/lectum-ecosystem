import { detectImageAnimation } from "./animation";
import {
  normalizeImageMimeType,
  resolveImageFileMimeType,
  resolveImageOutputMimeType,
  resolveImagePreparationPolicy,
  resolveImageTargetDimensions,
  shouldAttemptImagePreparation,
  shouldUseImageCandidate,
  withCanonicalImageFileType,
  withImageFileExtension,
} from "./policy";
import {
  ImagePreparationCanceledError,
  isImagePreparationCanceled,
  type PreparedImage,
  type PrepareImageOptions,
  throwIfImagePreparationCanceled,
  UnsupportedImageUploadTypeError,
} from "./types";

const originalResult = (
  file: File,
  options: PrepareImageOptions,
  reason: PreparedImage["reason"],
  details: Partial<Pick<PreparedImage, "hasTransparency" | "height" | "mimeType" | "width">> = {},
): PreparedImage => {
  const mimeType = details.mimeType ?? resolveImageFileMimeType(file);

  return {
    file: mimeType ? withCanonicalImageFileType(file, mimeType) : file,
    hasTransparency: details.hasTransparency ?? null,
    height: details.height ?? null,
    mimeType,
    optimized: false,
    originalSize: file.size,
    preparedSize: file.size,
    purpose: options.purpose,
    reason,
    width: details.width ?? null,
  };
};

const reportProgress = (
  options: PrepareImageOptions,
  stage: "analyzing" | "optimizing",
  percentage: number | null,
) => {
  try {
    options.onProgress?.({ percentage, stage });
  } catch {
    // Observers cannot interrupt media preparation.
  }
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
  signal?: AbortSignal,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (signal?.aborted) {
          reject(new ImagePreparationCanceledError());
          return;
        }
        if (!blob) {
          reject(new Error("image_encode_failed"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });

const loadImageElement = (file: File, signal?: AbortSignal) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    throwIfImagePreparationCanceled(signal);
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      signal?.removeEventListener("abort", handleAbort);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleAbort = () => finish(() => reject(new ImagePreparationCanceledError()));

    image.decoding = "async";
    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new Error("image_decode_failed")));
    signal?.addEventListener("abort", handleAbort, { once: true });
    image.src = objectUrl;
  });

export const prepareImageUpload = async (
  file: File,
  options: PrepareImageOptions,
): Promise<PreparedImage> => {
  throwIfImagePreparationCanceled(options.signal);
  const mimeType = resolveImageFileMimeType(file);

  if (!mimeType) throw new UnsupportedImageUploadTypeError();

  if (
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return originalResult(file, options, "unsupported", { mimeType });
  }

  const policy = resolveImagePreparationPolicy(options.purpose);
  if (policy.bypass) return originalResult(file, options, "already-efficient", { mimeType });

  let image: HTMLImageElement | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    reportProgress(options, "analyzing", null);
    const animationStatus = await detectImageAnimation(file, mimeType, options.signal);
    if (animationStatus !== "static") {
      return originalResult(
        file,
        options,
        animationStatus === "animated" ? "animated" : "unsupported",
        {
          mimeType,
        },
      );
    }

    // HTMLImageElement preserves EXIF orientation on Safari/iOS, unlike
    // createImageBitmap(Blob) in affected WebKit releases.
    image = await loadImageElement(file, options.signal);
    throwIfImagePreparationCanceled(options.signal);

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (
      !shouldAttemptImagePreparation({
        fileSize: file.size,
        height: sourceHeight,
        policy,
        width: sourceWidth,
      })
    ) {
      return originalResult(file, options, "already-efficient", {
        height: sourceHeight,
        mimeType,
        width: sourceWidth,
      });
    }

    const target = resolveImageTargetDimensions(sourceWidth, sourceHeight, policy);
    if (!target.width || !target.height) {
      return originalResult(file, options, "failed", { mimeType });
    }

    reportProgress(options, "optimizing", 0);
    canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return originalResult(file, options, "failed", { mimeType });

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, target.width, target.height);
    throwIfImagePreparationCanceled(options.signal);
    reportProgress(options, "optimizing", 60);

    // Keep alpha-capable inputs in their original MIME. This avoids an
    // expensive full-canvas getImageData scan on the main thread.
    const hasTransparency = mimeType !== "image/jpeg";
    const outputMimeType = resolveImageOutputMimeType(mimeType, hasTransparency);
    if (!outputMimeType) {
      return originalResult(file, options, "unsupported", {
        hasTransparency,
        height: sourceHeight,
        mimeType,
        width: sourceWidth,
      });
    }

    const blob = await canvasToBlob(canvas, outputMimeType, policy.quality, options.signal);
    throwIfImagePreparationCanceled(options.signal);
    reportProgress(options, "optimizing", 100);

    if (normalizeImageMimeType(blob.type) !== outputMimeType) {
      return originalResult(file, options, "unsupported", {
        hasTransparency,
        height: sourceHeight,
        mimeType,
        width: sourceWidth,
      });
    }
    if (!shouldUseImageCandidate(file.size, blob.size, target.resized)) {
      return originalResult(file, options, "candidate-not-smaller", {
        hasTransparency,
        height: sourceHeight,
        mimeType,
        width: sourceWidth,
      });
    }

    const preparedFile = new File([blob], withImageFileExtension(file.name, outputMimeType), {
      lastModified: Date.now(),
      type: outputMimeType,
    });

    return {
      file: preparedFile,
      hasTransparency,
      height: target.height,
      mimeType: outputMimeType,
      optimized: true,
      originalSize: file.size,
      preparedSize: preparedFile.size,
      purpose: options.purpose,
      reason: "optimized",
      width: target.width,
    };
  } catch (error) {
    if (isImagePreparationCanceled(error)) throw error;

    return originalResult(file, options, "failed", { mimeType });
  } finally {
    if (image) image.src = "";
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
};
