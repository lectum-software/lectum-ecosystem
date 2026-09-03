import { Upload } from "tus-js-client";
import type {
  VideoAssetPurpose,
  VideoAssetStatusResponse,
} from "@/api/generator/types/video-assets";
import {
  createVideoAssetUpload,
  deleteVideoAsset,
  getVideoAssetStatus,
} from "@/api/req/video-assets";
import { shouldCleanupVideoAssetAfterFailure, TUS_CHUNK_SIZE_BYTES } from "@/utils/video-stream";

const PROCESSING_POLL_INTERVAL_MS = 2_500;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1_000;
const RETRY_DELAYS_MS = [0, 1_000, 3_000, 5_000, 10_000];

const canceledError = () => new DOMException("Envio cancelado.", "AbortError");

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

const uploadTus = ({
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
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const upload = new Upload(file, {
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      onError: () =>
        settle(() => reject(new Error("Não foi possível enviar o vídeo. Tente novamente."))),
      onProgress: (uploaded, total) => {
        if (total <= 0) return;
        onProgress?.(Math.min(95, Math.round((uploaded / total) * 95)));
      },
      onSuccess: () => settle(resolve),
      removeFingerprintOnSuccess: true,
      retryDelays: RETRY_DELAYS_MS,
      storeFingerprintForResuming: false,
      uploadSize: file.size,
      uploadUrl,
    });

    function abort() {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      void upload.abort(true).finally(() => reject(canceledError()));
    }

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener("abort", abort, { once: true });
    upload.start();
  });

type ReadyVideoAsset = VideoAssetStatusResponse & {
  media_url: string;
  status: "ready";
};

const waitUntilReady = async (
  assetId: string,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
): Promise<ReadyVideoAsset> => {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw canceledError();

    const status = await getVideoAssetStatus(assetId, signal);
    if (status.status === "ready" && status.media_url) {
      onProgress?.(100);
      return { ...status, media_url: status.media_url, status: "ready" };
    }
    if (status.status === "error" || status.status === "canceled") {
      throw new Error("Não foi possível processar o vídeo. Selecione o arquivo novamente.");
    }

    onProgress?.(98);
    await wait(PROCESSING_POLL_INTERVAL_MS, signal);
  }

  throw new Error("O vídeo ainda está sendo processado. Tente novamente em instantes.");
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
  );

  let uploadCompleted = false;
  try {
    await uploadTus({ file, onProgress, signal, uploadUrl: provisioned.upload_url });
    uploadCompleted = true;
    return await waitUntilReady(provisioned.asset_id, onProgress, signal);
  } catch (error) {
    if (shouldCleanupVideoAssetAfterFailure(uploadCompleted, error)) {
      await deleteVideoAsset(provisioned.asset_id).catch(() => undefined);
    }
    throw error;
  }
};
