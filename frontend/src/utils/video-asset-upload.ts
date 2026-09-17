import { getApiErrorHttpStatus } from "@/api/errors";
import type {
  VideoAssetPurpose,
  VideoAssetStatusResponse,
  VideoAssetUploadEvent,
} from "@/api/generator/types/video-assets";
import {
  cancelVideoAssetUpload,
  createVideoAssetUpload,
  getVideoAssetStatus,
  reportVideoAssetUploadEvent,
} from "@/api/req/video-assets";
import { shouldCleanupVideoAssetAfterFailure } from "@/utils/video-stream";
import {
  boundedUploadNumber,
  isRetryableVideoUploadStatus,
  VIDEO_UPLOAD_RETRY_DELAYS_MS,
  VideoUploadFailure,
} from "@/utils/video-upload-diagnostics";
import { uploadBasicDirect, uploadTus } from "@/utils/video-upload-transport";

const PROCESSING_POLL_INTERVAL_MS = 2_500;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1_000;

const canceledError = () => new DOMException("Envio cancelado.", "AbortError");

export class VideoAssetUploadProvisionError extends Error {
  public readonly data: unknown;
  public readonly originalError: unknown;
  public readonly response: unknown;

  constructor(error: unknown) {
    super(error instanceof Error ? error.message : "Não foi possível iniciar o envio do vídeo.");
    this.name = "VideoAssetUploadProvisionError";
    Object.setPrototypeOf(this, VideoAssetUploadProvisionError.prototype);
    this.originalError = error;
    this.data =
      error && typeof error === "object" && "data" in error
        ? (error as { data?: unknown }).data
        : undefined;
    this.response =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: unknown }).response
        : undefined;
  }
}

const wait = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(canceledError());
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(canceledError());
    };
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

type ReadyVideoAsset = VideoAssetStatusResponse & {
  media_url: string;
  status: "ready";
};

const waitUntilReady = async (
  assetId: string,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
  onRetry?: () => void,
): Promise<ReadyVideoAsset> => {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  let failures = 0;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw canceledError();

    const status = await getVideoAssetStatus(assetId, signal).catch(async (error) => {
      if (signal?.aborted) throw canceledError();
      const httpStatus = getApiErrorHttpStatus(error);
      if (
        isRetryableVideoUploadStatus(httpStatus) &&
        failures < VIDEO_UPLOAD_RETRY_DELAYS_MS.length
      ) {
        onRetry?.();
        await wait(VIDEO_UPLOAD_RETRY_DELAYS_MS[failures++], signal);
        return null;
      }
      throw new VideoUploadFailure(httpStatus);
    });
    if (!status) continue;
    failures = 0;
    if (status.status === "ready" && status.media_url) {
      onProgress?.(100);
      return { ...status, media_url: status.media_url, status: "ready" };
    }
    if (status.status === "error" || status.status === "canceled") {
      throw new VideoUploadFailure(0, "processing");
    }

    onProgress?.(98);
    await wait(PROCESSING_POLL_INTERVAL_MS, signal);
  }

  throw new VideoUploadFailure(0, "processing_timeout");
};

export const uploadVideoAsset = async ({
  contextId,
  file,
  onProgress,
  purpose,
  signal,
}: {
  contextId?: string;
  file: File;
  onProgress?: (percentage: number) => void;
  purpose: VideoAssetPurpose;
  signal?: AbortSignal;
}): Promise<ReadyVideoAsset> => {
  if (signal?.aborted) throw canceledError();

  const provisioned = await createVideoAssetUpload(
    {
      contextId,
      mimeType: file.type,
      purpose,
      size: file.size,
    },
    signal,
  ).catch((error) => {
    throw new VideoAssetUploadProvisionError(error);
  });

  let uploadCompleted = false;
  let progress = 0;
  let retryCount = 0;
  let wasHidden = document.visibilityState === "hidden";
  const startedAt = Date.now();
  const method = provisioned.upload_method === "basic" ? "basic" : "tus";
  const onVisibilityChange = () => {
    wasHidden ||= document.visibilityState === "hidden";
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const trackProgress = (percentage: number) => {
    progress = boundedUploadNumber(percentage, 100);
    onProgress?.(percentage);
  };
  const onRetry = () => {
    retryCount = Math.min(100, retryCount + 1);
  };
  const report = (event: VideoAssetUploadEvent["event"], error?: unknown) => {
    const canceled = error instanceof DOMException && error.name === "AbortError";
    return reportVideoAssetUploadEvent(provisioned.asset_id, {
      event,
      phase: uploadCompleted ? "processing" : "transfer",
      method,
      reason: canceled
        ? "canceled"
        : error instanceof VideoUploadFailure
          ? error.reason
          : error
            ? "unknown"
            : "none",
      httpStatus: error instanceof VideoUploadFailure ? error.httpStatus : 0,
      progress,
      retryCount,
      elapsedMs: boundedUploadNumber(Date.now() - startedAt, 86_400_000),
      online: navigator.onLine,
      visibility: document.visibilityState === "hidden" ? "hidden" : "visible",
      wasHidden,
      ...(error instanceof VideoUploadFailure && error.transport
        ? { transport: error.transport }
        : {}),
    });
  };
  void report("transfer_start");
  try {
    if (provisioned.upload_method === "basic") {
      await uploadBasicDirect({
        file,
        onProgress: trackProgress,
        signal,
        uploadUrl: provisioned.upload_url,
      });
    } else {
      await uploadTus({
        file,
        onProgress: trackProgress,
        onRetry,
        signal,
        uploadUrl: provisioned.upload_url,
      });
    }
    void report("transfer_complete");
    uploadCompleted = true;
    const ready = await waitUntilReady(provisioned.asset_id, trackProgress, signal, onRetry);
    void report("ready");
    return ready;
  } catch (error) {
    await report(
      error instanceof DOMException && error.name === "AbortError" ? "canceled" : "failed",
      error,
    );
    if (shouldCleanupVideoAssetAfterFailure(uploadCompleted, error)) {
      await cancelVideoAssetUpload(provisioned.asset_id).catch(() => undefined);
    }
    throw error;
  } finally {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
};
