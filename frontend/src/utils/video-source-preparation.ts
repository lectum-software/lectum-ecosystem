import { isMediaUploadCanceled, throwIfMediaUploadCanceled } from "./upload-lifecycle";
import {
  VideoPreparationFailure,
  type VideoPreparationWorkerEvent,
} from "./video-source-preparation-types";
import { createBufferedVideoSource, VideoSourceFailure } from "./video-upload-source";

export { VideoPreparationFailure } from "./video-source-preparation-types";
export type PreparedVideoSource = {
  file: File;
  storage: "private" | "direct";
  cleanup: () => Promise<void>;
};
const preparedFiles = new WeakSet<File>();

const validateDirectSource = async (file: File, signal?: AbortSignal) => {
  const source = createBufferedVideoSource(file, 1024 * 1024);
  const abort = () => source.close();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    throwIfMediaUploadCanceled(signal);
    if (!file.size) throw new VideoSourceFailure("changed");
    await source.slice(0, Math.min(source.size, 1024 * 1024));
    if (source.size > 1024 * 1024) await source.slice(source.size - 1024 * 1024, source.size);
  } catch (error) {
    if (isMediaUploadCanceled(error)) throw error;
    throw new VideoPreparationFailure(
      "read_failed",
      error instanceof VideoSourceFailure ? error.code : "unknown",
    );
  } finally {
    signal?.removeEventListener("abort", abort);
    source.close();
  }
  return { file, storage: "direct" as const, cleanup: async () => undefined };
};

export const prepareVideoSource = async (
  file: File,
  options: { signal?: AbortSignal; onProgress?: (percentage: number) => void } = {},
): Promise<PreparedVideoSource> => {
  throwIfMediaUploadCanceled(options.signal);
  if (preparedFiles.has(file)) {
    // O dono da seleção mantém a cópia para retry; submit não pode apagá-la.
    return { file, storage: "private", cleanup: async () => undefined };
  }
  if (typeof Worker === "undefined" || typeof navigator.storage?.getDirectory !== "function") {
    return validateDirectSource(file, options.signal);
  }

  return new Promise<PreparedVideoSource>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./video-source-preparation.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      if (error instanceof Error && ["SecurityError", "NotSupportedError"].includes(error.name)) {
        void validateDirectSource(file, options.signal).then(resolve, reject);
        return;
      }
      reject(new VideoPreparationFailure("storage_unavailable"));
      return;
    }
    let settled = false;
    let released = false;
    let ownedFile: File | undefined;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    let finishDisposal: () => void = () => undefined;
    const disposal = new Promise<void>((done) => {
      finishDisposal = done;
    });
    const terminate = () => {
      if (releaseTimer) clearTimeout(releaseTimer);
      worker.terminate();
      finishDisposal();
    };
    const cleanup = () => {
      if (!released) {
        released = true;
        options.signal?.removeEventListener("abort", abort);
        if (ownedFile) preparedFiles.delete(ownedFile);
        try {
          worker.postMessage({ type: "dispose" });
        } catch {
          terminate();
          return disposal;
        }
        // Suspensão/falha do browser não pode impedir o cancelamento da UI.
        // Arquivo órfão fica sob retenção/lock no namespace privado do worker.
        releaseTimer = setTimeout(terminate, 5000);
      }
      return disposal;
    };
    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
      void cleanup();
    };
    const abort = () => fail(new DOMException("Envio cancelado.", "AbortError"));
    options.signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new VideoPreparationFailure("storage_unavailable"));
    };
    worker.onmessage = ({ data }: MessageEvent<VideoPreparationWorkerEvent>) => {
      if (data.type === "disposed") {
        terminate();
        return;
      }
      if (released || options.signal?.aborted) return;
      if (data.type === "progress") {
        options.onProgress?.(data.percentage);
        return;
      }
      if (data.type === "failed") {
        if (data.code === "storage_unsupported" && !settled) {
          settled = true;
          // Compatibilidade por capacidade, nunca por marca/Android nem por falha de leitura.
          void cleanup()
            .then(() => validateDirectSource(file, options.signal))
            .then(resolve, reject);
        } else fail(new VideoPreparationFailure(data.code, data.sourceFailure));
        return;
      }
      if (data.type === "ready" && !settled) {
        ownedFile = data.file;
        preparedFiles.add(ownedFile);
        settled = true;
        resolve({ file: ownedFile, storage: "private", cleanup });
      }
    };
    if (options.signal?.aborted) {
      abort();
      return;
    }
    try {
      worker.postMessage({
        type: "prepare",
        file,
        id: `${Date.now()}-${crypto.randomUUID()}.video`,
      });
    } catch {
      fail(new VideoPreparationFailure("storage_unavailable"));
    }
  });
};
