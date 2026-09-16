import { Upload } from "tus-js-client";
import { TUS_CHUNK_SIZE_BYTES } from "@/utils/video-stream";
import {
  isRetryableVideoUploadStatus,
  tusHttpStatus,
  tusRequestMethod,
  VIDEO_UPLOAD_RETRY_DELAYS_MS,
  VideoUploadFailure,
  type VideoUploadTransportDiagnostic,
} from "@/utils/video-upload-diagnostics";
import { createBufferedVideoSource, VideoSourceFailure } from "@/utils/video-upload-source";

const canceledError = () => new DOMException("Envio cancelado.", "AbortError");

export const uploadTus = ({
  file,
  onProgress,
  onRetry,
  signal,
  uploadUrl,
}: {
  file: File;
  onProgress?: (percentage: number) => void;
  onRetry?: () => void;
  signal?: AbortSignal;
  uploadUrl: string;
}) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    const source = createBufferedVideoSource(file, TUS_CHUNK_SIZE_BYTES);
    const diagnostic: VideoUploadTransportDiagnostic = {
      request: "unknown",
      source: "not_read",
      sourceFailure: "none",
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      source.close();
      callback();
    };
    const upload = new Upload(file, {
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      parallelUploads: 1,
      fileReader: {
        async openFile() {
          if (settled || signal?.aborted) throw canceledError();
          return {
            size: source.size,
            close: source.close,
            async slice(start, end) {
              diagnostic.source = "reading";
              try {
                const result = await source.slice(start, end);
                diagnostic.source = "ready";
                return result;
              } catch (error) {
                if (error instanceof VideoSourceFailure) {
                  diagnostic.source = "failed";
                  diagnostic.sourceFailure = error.code;
                }
                throw error;
              }
            },
          };
        },
      },
      onBeforeRequest: () => {
        if (settled || signal?.aborted) throw canceledError();
      },
      onError: (error) =>
        settle(() => {
          const status = tusHttpStatus(error);
          reject(
            new VideoUploadFailure(status, status === 0 ? "transport" : undefined, {
              ...diagnostic,
              request: tusRequestMethod(error),
            }),
          );
        }),
      onShouldRetry: (error) => {
        const retry =
          !settled &&
          !signal?.aborted &&
          diagnostic.source !== "failed" &&
          isRetryableVideoUploadStatus(tusHttpStatus(error));
        if (retry) onRetry?.();
        return retry;
      },
      onProgress: (uploaded, total) => {
        if (total <= 0) return;
        onProgress?.(Math.min(95, Math.round((uploaded / total) * 95)));
      },
      onSuccess: () => settle(resolve),
      removeFingerprintOnSuccess: true,
      retryDelays: VIDEO_UPLOAD_RETRY_DELAYS_MS,
      storeFingerprintForResuming: false,
      uploadSize: file.size,
      uploadUrl,
    });

    function abort() {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      source.close();
      // Interromper transporte não autoriza apagar mídia que o backend já associou.
      // O cleanup abaixo decide a exclusão pelo endpoint autenticado, não por TUS DELETE.
      void upload
        .abort(false)
        .catch(() => undefined)
        .then(() => reject(canceledError()));
    }

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
    upload.start();
  });

export const uploadBasicDirect = ({
  file,
  onProgress,
  signal,
  uploadUrl,
}: {
  file: File;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
  uploadUrl: string;
}) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    const request = new XMLHttpRequest();
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      callback();
    };

    function abort() {
      if (settled) return;
      request.abort();
      settle(() => reject(canceledError()));
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress?.(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };
    request.onerror = () => settle(() => reject(new VideoUploadFailure(request.status)));
    request.ontimeout = () => settle(() => reject(new VideoUploadFailure(0)));
    request.onabort = () => settle(() => reject(canceledError()));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        settle(resolve);
        return;
      }
      settle(() => reject(new VideoUploadFailure(request.status)));
    };

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
    const body = new FormData();
    body.append("file", file, file.name || "video");
    request.open("POST", uploadUrl);
    request.send(body);
  });
