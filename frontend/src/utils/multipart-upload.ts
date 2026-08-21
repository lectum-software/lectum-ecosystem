import { isRetryableApiError } from "@/api/errors";

export const MULTIPART_DEFAULT_CHUNK_BYTES = 5 * 1024 * 1024;

type MultipartSession = {
  chunk_size: number;
  upload_session_id: string;
};

type MultipartPart = {
  part_id?: string;
  part_number: number;
  part_token?: string;
};

type MultipartPartInput = {
  chunk: Blob;
  fileName: string;
  onProgress: (loadedBytes: number) => void;
  partNumber: number;
  sessionId: string;
};

type MultipartCompleteInput = {
  parts: Array<{ partId: string; partNumber: number }>;
  sessionId: string;
};

type MultipartUploadInput<T> = {
  abort: (sessionId: string) => Promise<unknown>;
  complete: (input: MultipartCompleteInput) => Promise<T>;
  file: File;
  initiate: () => Promise<MultipartSession>;
  maxPartAttempts?: number;
  mimeType: string;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
  uploadPart: (input: MultipartPartInput) => Promise<MultipartPart>;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);
    const handleAbort = () => {
      globalThis.clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) handleAbort();
  });

const retryMultipartPart = async <T>(
  upload: () => Promise<T>,
  maxAttempts: number,
  signal?: AbortSignal,
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    signal?.throwIfAborted();
    try {
      return await upload();
    } catch (uploadError) {
      lastError = uploadError;
      if (attempt >= maxAttempts || !isRetryableApiError(uploadError)) throw uploadError;
      await sleep(600 * attempt, signal);
    }
  }

  throw lastError;
};

const toPercentage = (loadedBytes: number, totalBytes: number) =>
  Math.max(0, Math.min(100, Math.round((loadedBytes / totalBytes) * 100)));

export const uploadFileMultipart = async <T>({
  abort,
  complete,
  file,
  initiate,
  maxPartAttempts = 3,
  mimeType,
  onProgress,
  signal,
  uploadPart,
}: MultipartUploadInput<T>) => {
  let sessionId: string | null = null;
  signal?.throwIfAborted();
  onProgress?.(0);

  try {
    const session = await initiate();
    sessionId = session.upload_session_id;
    const chunkSize =
      Number.isInteger(session.chunk_size) && session.chunk_size > 0
        ? session.chunk_size
        : MULTIPART_DEFAULT_CHUNK_BYTES;
    const parts: MultipartCompleteInput["parts"] = [];
    let completedBytes = 0;
    let partNumber = 1;

    for (let offset = 0; offset < file.size; offset += chunkSize) {
      signal?.throwIfAborted();
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size), mimeType);
      const currentPartNumber = partNumber;
      let reportedChunkBytes = 0;
      const uploadedPart = await retryMultipartPart(
        () =>
          uploadPart({
            chunk,
            fileName: file.name || "media",
            onProgress: (loadedBytes) => {
              reportedChunkBytes = Math.max(
                reportedChunkBytes,
                Math.min(chunk.size, Math.max(0, loadedBytes)),
              );
              onProgress?.(toPercentage(completedBytes + reportedChunkBytes, file.size));
            },
            partNumber: currentPartNumber,
            sessionId: session.upload_session_id,
          }),
        maxPartAttempts,
        signal,
      );
      const partId = uploadedPart.part_id || uploadedPart.part_token;
      if (!partId) throw new Error("multipart_part_missing");

      completedBytes += chunk.size;
      onProgress?.(toPercentage(completedBytes, file.size));
      parts.push({ partId, partNumber: uploadedPart.part_number });
      partNumber += 1;
    }

    signal?.throwIfAborted();
    const result = await complete({ parts, sessionId: session.upload_session_id });
    onProgress?.(100);
    return result;
  } catch (uploadError) {
    if (sessionId) await abort(sessionId).catch(() => undefined);
    throw uploadError;
  }
};
