import type { FileHandle } from "node:fs/promises";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { VideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { fetchRemoteVideo } from "./remote-fetch.js";
import { remoteVideoRequestHeaderEntries } from "./source-url.js";

type RemoteVideoSourceFetcher = typeof fetch;

const MAX_REMOTE_VIDEO_CONTENT_TYPE_LENGTH = 128;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);

const isRetryableHttpStatus = (status: number) =>
  RETRYABLE_HTTP_STATUSES.has(status) || (status >= 500 && status <= 599);

const parseContentLength = (value: string | null) => {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/u.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const isAllowedVideoContentType = (value: string | null) => {
  if (!value) return true;
  if (value.length > MAX_REMOTE_VIDEO_CONTENT_TYPE_LENGTH) return false;

  const contentType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return (
    contentType.startsWith("video/") ||
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream"
  );
};

const abortableFetch = async (input: {
  cancellationSignal?: AbortSignal | undefined;
  fetcher: RemoteVideoSourceFetcher;
  requestOrigin?: string | null | undefined;
  signal?: AbortSignal | undefined;
  sourceUrl: string;
}) => {
  try {
    const init: RequestInit = {
      headers: new Headers(remoteVideoRequestHeaderEntries(input.requestOrigin)),
      redirect: "error",
    };
    if (input.signal) init.signal = input.signal;

    return await input.fetcher(input.sourceUrl, init);
  } catch (error) {
    if (input.cancellationSignal?.aborted) {
      throw new VideoProcessingError("canceled", { cause: error });
    }
    throw new VideoProcessingError("processing_failed", { cause: error, retryable: true });
  }
};

const remoteResponseError = async (response: Response) => {
  await response.body?.cancel().catch(() => undefined);

  if (isRetryableHttpStatus(response.status)) {
    throw new VideoProcessingError("processing_failed", { retryable: true });
  }

  throw new VideoProcessingError("invalid_video");
};

export const downloadRemoteVideoSourceFile = async (input: {
  config: VideoServiceConfig;
  fetcher?: RemoteVideoSourceFetcher;
  outputPath: string;
  requestOrigin?: string | null | undefined;
  signal?: AbortSignal | undefined;
  sourceUrl: string;
}) => {
  const deadline = AbortSignal.timeout(input.config.jobTimeoutMs);
  const signal = input.signal ? AbortSignal.any([input.signal, deadline]) : deadline;
  const response = await abortableFetch({
    cancellationSignal: input.signal,
    fetcher: input.fetcher ?? fetchRemoteVideo,
    requestOrigin: input.requestOrigin,
    signal,
    sourceUrl: input.sourceUrl,
  });

  if (!response.ok) await remoteResponseError(response);

  const contentLength = parseContentLength(response.headers.get("content-length"));
  if (
    contentLength !== null &&
    (contentLength <= 0 || contentLength > input.config.maxInputBytes)
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw new VideoProcessingError("invalid_video");
  }

  if (!isAllowedVideoContentType(response.headers.get("content-type"))) {
    await response.body?.cancel().catch(() => undefined);
    throw new VideoProcessingError("invalid_video");
  }

  if (!response.body) {
    throw new VideoProcessingError("invalid_video");
  }

  const temporaryPath = `${input.outputPath}.download-${process.pid}-${Date.now()}`;
  const reader = response.body.getReader();
  let file: FileHandle | null = null;
  let createdTemporaryFile = false;
  let writtenBytes = 0;

  try {
    await mkdir(path.dirname(input.outputPath), { mode: 0o700, recursive: true });
    file = await open(temporaryPath, "wx", 0o600);
    createdTemporaryFile = true;
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      writtenBytes += value.byteLength;
      if (writtenBytes > input.config.maxInputBytes) {
        await reader.cancel().catch(() => undefined);
        throw new VideoProcessingError("invalid_video");
      }
      // write() is allowed to write fewer bytes than requested.
      await file.writeFile(value);
    }

    await file.sync();
    await file.close();
    file = null;

    if (writtenBytes <= 0) {
      throw new VideoProcessingError("invalid_video");
    }

    signal.throwIfAborted();
    await rename(temporaryPath, input.outputPath);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    await file?.close().catch(() => undefined);
    if (createdTemporaryFile) await rm(temporaryPath, { force: true }).catch(() => undefined);

    if (error instanceof VideoProcessingError) throw error;
    if (input.signal?.aborted) {
      throw new VideoProcessingError("canceled", { cause: error });
    }
    throw new VideoProcessingError("processing_failed", { cause: error, retryable: true });
  } finally {
    reader.releaseLock();
  }
};
