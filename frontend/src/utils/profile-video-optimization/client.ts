import { shouldUseOptimizedProfileVideo } from "./policy";
import {
  isProfileVideoOptimizationWorkerResponse,
  type PreparedProfileVideo,
  type ProfileVideoOptimizationWorkerRequest,
  type ProfileVideoPreparationProgress,
  ProfileVideoUploadCanceledError,
  throwIfProfileVideoUploadCanceled,
} from "./types";

type PrepareProfileVideoOptions = {
  onProgress?: (progress: ProfileVideoPreparationProgress) => void;
  signal?: AbortSignal;
};

const createOriginalResult = (file: File): PreparedProfileVideo => ({
  file,
  optimized: false,
  originalSize: file.size,
  preparedSize: file.size,
});

export const prepareProfileVideo = (
  file: File,
  { onProgress, signal }: PrepareProfileVideoOptions = {},
): Promise<PreparedProfileVideo> => {
  throwIfProfileVideoUploadCanceled(signal);

  if (typeof Worker === "undefined") return Promise.resolve(createOriginalResult(file));

  return new Promise((resolve, reject) => {
    let settled = false;
    let worker: Worker;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      worker.terminate();
    };
    const finish = (result: PreparedProfileVideo) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const failCanceled = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new ProfileVideoUploadCanceledError());
    };
    const handleAbort = () => {
      const message: ProfileVideoOptimizationWorkerRequest = { type: "cancel" };
      worker.postMessage(message);
      failCanceled();
    };

    try {
      worker = new Worker(new URL("./profile-video-optimization.worker.ts", import.meta.url), {
        name: "lectum-profile-video-optimization",
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
      if (!isProfileVideoOptimizationWorkerResponse(event.data)) return;
      const message = event.data;

      if (message.type === "progress") {
        onProgress?.({ percentage: message.percentage, stage: message.stage });
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

      const optimizedFile = new File([message.buffer], "video-apresentacao.mp4", {
        lastModified: Date.now(),
        type: "video/mp4",
      });
      if (!shouldUseOptimizedProfileVideo(file.size, optimizedFile.size)) {
        finish(createOriginalResult(file));
        return;
      }
      finish({
        file: optimizedFile,
        optimized: true,
        originalSize: file.size,
        preparedSize: message.outputSize,
      });
    };

    const request: ProfileVideoOptimizationWorkerRequest = { file, type: "start" };
    worker.postMessage(request);
  });
};
