import { createVideoPreparationInactivityWatchdog } from "./inactivity-watchdog";
import { cleanupVideoPreparationTemporaryFile } from "./opfs-output";
import { resolveVideoOutputFileName, shouldUseOptimizedVideo } from "./policy";
import {
  isVideoOptimizationWorkerResponse,
  type PreparedVideo,
  throwIfVideoUploadCanceled,
  type VideoOptimizationWorkerRequest,
  type VideoPreparationProgress,
  type VideoPreparationPurpose,
  VideoUploadCanceledError,
} from "./types";

export type PrepareVideoOptions = {
  inactivityTimeoutMs?: number;
  onProgress?: (progress: VideoPreparationProgress) => void;
  purpose: VideoPreparationPurpose;
  signal?: AbortSignal;
};

const VIDEO_CANCELLATION_CLEANUP_TIMEOUT_MS = 5_000;
const noopCleanup = async () => undefined;

const createOriginalResult = (file: File): PreparedVideo => ({
  cleanup: noopCleanup,
  file,
  optimized: false,
  originalSize: file.size,
  preparedSize: file.size,
});

const createTemporaryFileCleanup = (fileName: string) => {
  let cleanupPromise: Promise<void> | null = null;
  return () => {
    cleanupPromise ??= cleanupVideoPreparationTemporaryFile(fileName);
    return cleanupPromise;
  };
};

export const prepareVideo = (
  file: File,
  { inactivityTimeoutMs, onProgress, purpose, signal }: PrepareVideoOptions,
): Promise<PreparedVideo> => {
  throwIfVideoUploadCanceled(signal);

  if (typeof Worker === "undefined") return Promise.resolve(createOriginalResult(file));

  return new Promise((resolve, reject) => {
    let abortRequested = false;
    let cancellationCleanupTimeout: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    let temporaryFileName: string | null = null;
    let terminated = false;
    let worker: Worker;

    const detachAbortListener = () => {
      signal?.removeEventListener("abort", handleAbort);
    };
    let inactivityWatchdog: ReturnType<typeof createVideoPreparationInactivityWatchdog> | null =
      null;
    const terminateWorker = () => {
      if (terminated) return;
      terminated = true;
      inactivityWatchdog?.clear();
      if (cancellationCleanupTimeout) {
        clearTimeout(cancellationCleanupTimeout);
        cancellationCleanupTimeout = null;
      }
      try {
        worker.terminate();
      } catch {
        // Cleanup is best effort and must not change the upload result.
      }
    };
    const cleanupRecordedTemporaryFile = async () => {
      const fileName = temporaryFileName;
      temporaryFileName = null;
      if (fileName) await cleanupVideoPreparationTemporaryFile(fileName);
    };
    const terminateAndCleanupRecordedFile = () => {
      terminateWorker();
      void cleanupRecordedTemporaryFile();
    };
    const finish = (result: PreparedVideo) => {
      if (settled) return;
      settled = true;
      detachAbortListener();
      terminateWorker();
      resolve(result);
    };
    const finishWithOriginal = () => {
      const cleanupPromise = cleanupRecordedTemporaryFile();
      finish(createOriginalResult(file));
      void cleanupPromise;
    };
    const resetInactivityWatchdog = () => {
      if (settled || terminated || abortRequested) return;
      inactivityWatchdog?.reset();
    };
    const failCanceledWithoutTerminating = () => {
      if (settled) return;
      settled = true;
      inactivityWatchdog?.clear();
      detachAbortListener();
      reject(new VideoUploadCanceledError());
      cancellationCleanupTimeout = setTimeout(() => {
        terminateAndCleanupRecordedFile();
      }, VIDEO_CANCELLATION_CLEANUP_TIMEOUT_MS);
    };
    const handleAbort = () => {
      abortRequested = true;
      try {
        const message: VideoOptimizationWorkerRequest = { type: "cancel" };
        worker.postMessage(message);
        failCanceledWithoutTerminating();
      } finally {
        if (!settled) {
          failCanceledWithoutTerminating();
          terminateAndCleanupRecordedFile();
        }
      }
    };

    inactivityWatchdog = createVideoPreparationInactivityWatchdog(
      finishWithOriginal,
      inactivityTimeoutMs,
    );

    try {
      worker = new Worker(new URL("./video-preparation.worker.ts", import.meta.url), {
        name: "lectum-video-preparation",
        type: "module",
      });
    } catch {
      resolve(createOriginalResult(file));
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    worker.onerror = (event) => {
      event.preventDefault();
      if (abortRequested) {
        terminateAndCleanupRecordedFile();
        return;
      }
      finishWithOriginal();
    };
    worker.onmessageerror = () => {
      if (abortRequested) {
        terminateAndCleanupRecordedFile();
        return;
      }
      finishWithOriginal();
    };
    worker.onmessage = (event: MessageEvent<unknown>) => {
      resetInactivityWatchdog();
      if (!isVideoOptimizationWorkerResponse(event.data)) return;
      const message = event.data;

      if (message.type === "temporary-file-created") {
        temporaryFileName = message.temporaryFileName;
        if (terminated) void cleanupRecordedTemporaryFile();
        return;
      }
      if (abortRequested) {
        if (message.type === "optimized-file") {
          temporaryFileName = message.temporaryFileName;
        }
        if (message.type !== "progress") terminateAndCleanupRecordedFile();
        return;
      }
      if (settled || terminated) {
        if (message.type === "optimized-file") {
          temporaryFileName = message.temporaryFileName;
        }
        if (message.type !== "progress") void cleanupRecordedTemporaryFile();
        return;
      }
      if (message.type === "progress") {
        try {
          onProgress?.({ percentage: message.percentage, stage: message.stage });
        } catch {
          // Observers cannot interrupt media preparation.
        }
        return;
      }
      if (message.type === "canceled") {
        failCanceledWithoutTerminating();
        terminateAndCleanupRecordedFile();
        return;
      }
      if (message.type === "use-original") {
        finishWithOriginal();
        return;
      }

      try {
        const optimizedFile =
          message.type === "optimized-buffer"
            ? new File([message.buffer], resolveVideoOutputFileName(purpose), {
                lastModified: Date.now(),
                type: "video/mp4",
              })
            : new File([message.file], resolveVideoOutputFileName(purpose), {
                lastModified: Date.now(),
                type: "video/mp4",
              });
        if (!shouldUseOptimizedVideo(file.size, optimizedFile.size, purpose)) {
          if (message.type === "optimized-file") {
            temporaryFileName = message.temporaryFileName;
          }
          finishWithOriginal();
          return;
        }

        const cleanup =
          message.type === "optimized-file"
            ? createTemporaryFileCleanup(message.temporaryFileName)
            : noopCleanup;
        temporaryFileName = null;
        finish({
          cleanup,
          file: optimizedFile,
          optimized: true,
          originalSize: file.size,
          preparedSize: message.outputSize,
        });
      } catch {
        if (message.type === "optimized-file") {
          temporaryFileName = message.temporaryFileName;
        }
        finishWithOriginal();
      }
    };

    const request: VideoOptimizationWorkerRequest = { file, purpose, type: "start" };
    try {
      worker.postMessage(request);
      resetInactivityWatchdog();
    } catch {
      finishWithOriginal();
    }
  });
};
