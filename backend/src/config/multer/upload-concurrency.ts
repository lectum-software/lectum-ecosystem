import type { NextFunction, Request, RequestHandler, Response } from "express";
import { parsePositiveInteger } from "@/utils/runtime-config";
import { UploadInfrastructureError } from "./errors";

type UploadConcurrencyGate = {
  acquire: (signal?: AbortSignal) => Promise<void>;
  release: () => void;
};

type UploadQueueEntry = {
  reject: (error: Error) => void;
  resolve: () => void;
  signal?: AbortSignal;
  stopWaiting: () => void;
};

class UploadSlotCanceledError extends Error {
  constructor() {
    super("R2_UPLOAD_WAIT_CANCELED");
    this.name = "AbortError";
  }
}

export const createUploadConcurrencyGate = (
  maxConcurrentUploads: number,
  maxQueuedUploads: number,
): UploadConcurrencyGate => {
  let activeUploads = 0;
  const uploadQueue: UploadQueueEntry[] = [];

  return {
    acquire: async (signal) => {
      if (signal?.aborted) throw new UploadSlotCanceledError();
      if (activeUploads < maxConcurrentUploads) {
        activeUploads += 1;
        return;
      }
      if (uploadQueue.length >= maxQueuedUploads) {
        throw new UploadInfrastructureError("R2_UPLOAD_QUEUE_FULL");
      }

      await new Promise<void>((resolve, reject) => {
        const entry: UploadQueueEntry = {
          reject,
          resolve,
          signal,
          stopWaiting: () => undefined,
        };
        const stopWaiting = () => {
          const index = uploadQueue.indexOf(entry);
          if (index >= 0) uploadQueue.splice(index, 1);
          signal?.removeEventListener("abort", stopWaiting);
          reject(new UploadSlotCanceledError());
        };
        entry.stopWaiting = stopWaiting;
        signal?.addEventListener("abort", stopWaiting, { once: true });
        uploadQueue.push(entry);
      });
    },
    release: () => {
      while (uploadQueue.length > 0) {
        const next = uploadQueue.shift();
        if (!next) break;
        next.signal?.removeEventListener("abort", next.stopWaiting);
        if (next.signal?.aborted) {
          next.reject(new UploadSlotCanceledError());
          continue;
        }

        // The active slot transfers directly to the queued upload. Keeping
        // the count stable avoids a race with a new immediate acquisition.
        next.resolve();
        return;
      }

      activeUploads = Math.max(0, activeUploads - 1);
    },
  };
};

const uploadConcurrencyGate = createUploadConcurrencyGate(
  parsePositiveInteger(process.env.UPLOAD_MAX_CONCURRENCY, 2, { max: 16 }),
  parsePositiveInteger(process.env.UPLOAD_MAX_QUEUE_SIZE, 100, { max: 1000 }),
);

export const acquireUploadSlot = (signal?: AbortSignal) => uploadConcurrencyGate.acquire(signal);
export const releaseUploadSlot = () => uploadConcurrencyGate.release();

export const uploadConcurrencyMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const waiting = new AbortController();
  const stopWaiting = () => waiting.abort();
  req.once("aborted", stopWaiting);
  res.once("close", stopWaiting);

  try {
    await acquireUploadSlot(waiting.signal);
  } catch {
    req.removeListener("aborted", stopWaiting);
    res.removeListener("close", stopWaiting);
    if (waiting.signal.aborted) return;

    return res.status(503).json({
      code: "upload_unavailable",
      error: "Não foi possível enviar o arquivo agora. Tente novamente.",
      status: 503,
      success: false,
    });
  }

  req.removeListener("aborted", stopWaiting);
  res.removeListener("close", stopWaiting);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseUploadSlot();
  };

  res.once("finish", release);
  res.once("close", release);
  req.once("aborted", release);
  if (waiting.signal.aborted || req.aborted || res.destroyed) {
    release();
    return;
  }

  next();
};
