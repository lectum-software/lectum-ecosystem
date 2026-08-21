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
  onProgress?: (progress: VideoPreparationProgress) => void;
  purpose: VideoPreparationPurpose;
  signal?: AbortSignal;
};

const createOriginalResult = (file: File): PreparedVideo => ({
  file,
  optimized: false,
  originalSize: file.size,
  preparedSize: file.size,
});

export const prepareVideo = (
  file: File,
  { onProgress, purpose, signal }: PrepareVideoOptions,
): Promise<PreparedVideo> => {
  throwIfVideoUploadCanceled(signal);

  if (typeof Worker === "undefined") return Promise.resolve(createOriginalResult(file));

  return new Promise((resolve, reject) => {
    let settled = false;
    let worker: Worker;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      try {
        worker.terminate();
      } catch {
        // Cleanup is best effort and must not change the upload result.
      }
    };
    const finish = (result: PreparedVideo) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const failCanceled = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new VideoUploadCanceledError());
    };
    const handleAbort = () => {
      try {
        const message: VideoOptimizationWorkerRequest = { type: "cancel" };
        worker.postMessage(message);
      } finally {
        failCanceled();
      }
    };

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
      finish(createOriginalResult(file));
    };
    worker.onmessageerror = () => finish(createOriginalResult(file));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isVideoOptimizationWorkerResponse(event.data)) return;
      const message = event.data;

      if (message.type === "progress") {
        try {
          onProgress?.({ percentage: message.percentage, stage: message.stage });
        } catch {
          // Observers cannot interrupt media preparation.
        }
        return;
      }
      if (message.type === "canceled") {
        failCanceled();
        return;
      }
      if (message.type === "use-original") {
        finish(createOriginalResult(file));
        return;
      }

      try {
        const optimizedFile = new File([message.buffer], resolveVideoOutputFileName(purpose), {
          lastModified: Date.now(),
          type: "video/mp4",
        });
        if (!shouldUseOptimizedVideo(file.size, optimizedFile.size, purpose)) {
          finish(createOriginalResult(file));
          return;
        }
        finish({
          file: optimizedFile,
          optimized: true,
          originalSize: file.size,
          preparedSize: message.outputSize,
        });
      } catch {
        finish(createOriginalResult(file));
      }
    };

    const request: VideoOptimizationWorkerRequest = { file, purpose, type: "start" };
    try {
      worker.postMessage(request);
    } catch {
      finish(createOriginalResult(file));
    }
  });
};
