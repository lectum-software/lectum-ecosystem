import { getApiErrorCode, getApiErrorStatus, isRetryableApiError } from "@/api/errors";
import {
  downloadPostShareVideoArtifactRenderJobFile,
  getPostShareVideoArtifactRenderJob,
  startPostShareVideoArtifactRenderJob,
} from "@/api/req/posts";
import type { LectumShareLinkTarget, LectumShareSocialTarget } from "@/utils/lectum-share-target";
import {
  isNativeShareAbortError,
  resolveLectumLinkShareData,
  type ShareNavigator,
} from "./lectum-share-media/native-share";

export type ShareExportResult = {
  channel: "clipboard" | "web_share" | null;
  file?: File;
  mode: "clipboard" | "download" | "link" | "prepared";
};

type PreparedShareFileCacheValue = File | Promise<File>;
type PreparedShareRenderJob = Awaited<ReturnType<typeof startPostShareVideoArtifactRenderJob>>;

export type LectumShareRenderErrorStage =
  | "download"
  | "processing"
  | "start"
  | "status"
  | "timeout";

export type LectumShareRenderErrorDiagnostic = {
  code: string;
  jobStatus?: PreparedShareRenderJob["status"];
  progress?: number;
  stage: LectumShareRenderErrorStage;
  status?: number;
};

export class LectumShareRenderError extends Error {
  readonly cause?: unknown;
  readonly diagnostic: LectumShareRenderErrorDiagnostic;

  constructor(diagnostic: LectumShareRenderErrorDiagnostic, cause?: unknown) {
    super("Não foi possível gerar o vídeo com arte.");
    this.name = "LectumShareRenderError";
    this.diagnostic = diagnostic;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const DOWNLOAD_OBJECT_URL_REVOKE_DELAY_MS = 60_000;
const SAFE_SHARE_RENDER_ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]{1,80}$/u;
const SERVER_SHARE_RENDER_QUALITY_TIMEOUT_MS = 900_000;
const SERVER_SHARE_RENDER_JOB_CACHE_TTL_MS = 30 * 60_000;
const SERVER_SHARE_RENDER_JOB_FILE_TIMEOUT_MS = 120_000;
const SERVER_SHARE_RENDER_JOB_POLL_INITIAL_INTERVAL_MS = 2_500;
const SERVER_SHARE_RENDER_JOB_POLL_MAX_INTERVAL_MS = 6_000;
const SERVER_SHARE_RENDER_JOB_START_TIMEOUT_MS = 45_000;
const SERVER_SHARE_RENDER_JOB_STATUS_TIMEOUT_MS = 30_000;
const SERVER_SHARE_RENDER_TRANSIENT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const preparedShareFileCache = new Map<string, PreparedShareFileCacheValue>();
const preparedShareRenderJobCache = new Map<
  string,
  { cachedAt: number; job: PreparedShareRenderJob }
>();

const copyShareUrl = async (url: string) => {
  if (!navigator.clipboard?.writeText) return false;

  await navigator.clipboard.writeText(url);
  return true;
};

const normalizeFileSegment = (value: string, fallback: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return normalized || fallback;
};

const safeFileName = (target: LectumShareSocialTarget, extension: "mp4") => {
  const professional = normalizeFileSegment(target.professional.name, "Profissional");
  const source = normalizeFileSegment(target.sourceText, "Video");

  return `${professional}-${source}-Lectum.${extension}`;
};

const createPreparedShareFileCacheKey = (target: LectumShareSocialTarget) =>
  [target.kind, target.postId, target.replyId ?? "post", target.mediaUrl, target.sourceText].join(
    "::",
  );

const isReusableShareRenderJobStatus = (status: PreparedShareRenderJob["status"]) =>
  status === "queued" ||
  status === "processing" ||
  status === "cancel_requested" ||
  status === "completed";

const getCachedShareRenderJob = (cacheKey: string) => {
  const cached = preparedShareRenderJobCache.get(cacheKey);
  if (!cached) return null;
  if (
    Date.now() - cached.cachedAt > SERVER_SHARE_RENDER_JOB_CACHE_TTL_MS ||
    !isReusableShareRenderJobStatus(cached.job.status)
  ) {
    preparedShareRenderJobCache.delete(cacheKey);
    return null;
  }

  return cached.job;
};

const cacheShareRenderJob = (cacheKey: string, job: PreparedShareRenderJob) => {
  if (isReusableShareRenderJobStatus(job.status)) {
    preparedShareRenderJobCache.set(cacheKey, { cachedAt: Date.now(), job });
    return;
  }

  preparedShareRenderJobCache.delete(cacheKey);
};

export const getPreparedLectumShareFile = (target: LectumShareSocialTarget) => {
  const cached = preparedShareFileCache.get(createPreparedShareFileCacheKey(target));
  return cached instanceof File ? cached : null;
};

const cachePreparedLectumShareFile = (target: LectumShareSocialTarget, file: File) => {
  preparedShareFileCache.set(createPreparedShareFileCacheKey(target), file);
};

const waitForShareRenderPoll = (durationMs: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Operação cancelada.", "AbortError"));
      return;
    }

    let timeout = 0;
    const cleanup = () => signal.removeEventListener("abort", abort);
    function abort() {
      window.clearTimeout(timeout);
      cleanup();
      reject(new DOMException("Operação cancelada.", "AbortError"));
    }
    timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, durationMs);

    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });

const isShareRenderAbortError = (error: unknown, signal: AbortSignal) =>
  signal.aborted ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError");

const normalizeShareRenderDiagnosticCode = (code: string | null | undefined, fallback: string) => {
  const normalized = code?.trim();

  return normalized && SAFE_SHARE_RENDER_ERROR_CODE_PATTERN.test(normalized)
    ? normalized
    : fallback;
};

const normalizeShareRenderDiagnosticStatus = (error: unknown) => {
  const status = getApiErrorStatus(error);

  return typeof status === "number" && status >= 100 && status <= 599 ? status : undefined;
};

const normalizeShareRenderDiagnosticProgress = (progress: number) => {
  if (!Number.isFinite(progress)) return undefined;

  return Math.min(100, Math.max(0, Math.round(progress)));
};

const createShareRenderRequestError = (
  stage: Exclude<LectumShareRenderErrorStage, "processing">,
  error: unknown,
  signal: AbortSignal,
  fallbackCode = "request_failed",
) => {
  if (isShareRenderAbortError(error, signal)) {
    return new LectumShareRenderError({ code: "render_timeout", stage: "timeout" }, error);
  }

  return new LectumShareRenderError(
    {
      code: normalizeShareRenderDiagnosticCode(getApiErrorCode(error), fallbackCode),
      stage,
      status: normalizeShareRenderDiagnosticStatus(error),
    },
    error,
  );
};

const retryTransientShareRenderRequest = async <Result>(
  request: () => Promise<Result>,
  signal: AbortSignal,
  deadlineAt: number,
): Promise<Result> => {
  let attempt = 0;

  while (true) {
    try {
      return await request();
    } catch (error) {
      if (isShareRenderAbortError(error, signal) || !isRetryableApiError(error)) throw error;

      const delayMs = SERVER_SHARE_RENDER_TRANSIENT_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined || Date.now() + delayMs >= deadlineAt) throw error;

      attempt += 1;
      await waitForShareRenderPoll(delayMs, signal);
    }
  }
};

const prepareLectumShareFileWithServerRenderJob = async (
  target: LectumShareSocialTarget,
  signal: AbortSignal,
) => {
  const deadlineAt = Date.now() + SERVER_SHARE_RENDER_QUALITY_TIMEOUT_MS;
  const cacheKey = createPreparedShareFileCacheKey(target);
  let job = getCachedShareRenderJob(cacheKey);

  if (!job) {
    try {
      job = await retryTransientShareRenderRequest(
        () =>
          startPostShareVideoArtifactRenderJob({
            postId: target.postId,
            replyId: target.replyId,
            signal,
            timeoutMs: SERVER_SHARE_RENDER_JOB_START_TIMEOUT_MS,
          }),
        signal,
        deadlineAt,
      );
    } catch (error) {
      throw createShareRenderRequestError("start", error, signal);
    }
  }

  cacheShareRenderJob(cacheKey, job);
  let status = job;
  let pollIntervalMs = SERVER_SHARE_RENDER_JOB_POLL_INITIAL_INTERVAL_MS;

  while (
    !status.ready &&
    (status.status === "queued" ||
      status.status === "processing" ||
      status.status === "cancel_requested") &&
    Date.now() < deadlineAt
  ) {
    const retryAfterMs =
      status.retry_after_ms > 0
        ? Math.min(status.retry_after_ms, SERVER_SHARE_RENDER_JOB_POLL_MAX_INTERVAL_MS)
        : pollIntervalMs;

    await waitForShareRenderPoll(retryAfterMs, signal);

    try {
      status = await retryTransientShareRenderRequest(
        () =>
          getPostShareVideoArtifactRenderJob({
            jobId: status.job_id,
            postId: target.postId,
            replyId: target.replyId,
            signal,
            timeoutMs: SERVER_SHARE_RENDER_JOB_STATUS_TIMEOUT_MS,
          }),
        signal,
        deadlineAt,
      );
    } catch (error) {
      throw createShareRenderRequestError("status", error, signal);
    }

    cacheShareRenderJob(cacheKey, status);
    pollIntervalMs = Math.min(pollIntervalMs + 500, SERVER_SHARE_RENDER_JOB_POLL_MAX_INTERVAL_MS);
  }

  if (!status.ready || status.status !== "completed") {
    const terminalFailed = status.status === "failed" || status.status === "canceled";

    throw new LectumShareRenderError({
      code: terminalFailed
        ? normalizeShareRenderDiagnosticCode(status.failure_code, "processing_failed")
        : "render_timeout",
      jobStatus: status.status,
      progress: normalizeShareRenderDiagnosticProgress(status.progress),
      stage: terminalFailed ? "processing" : "timeout",
    });
  }

  try {
    const file = await retryTransientShareRenderRequest(
      () =>
        downloadPostShareVideoArtifactRenderJobFile({
          fileName: safeFileName(target, "mp4"),
          jobId: status.job_id,
          postId: target.postId,
          replyId: target.replyId,
          signal,
          timeoutMs: SERVER_SHARE_RENDER_JOB_FILE_TIMEOUT_MS,
        }),
      signal,
      deadlineAt,
    );
    preparedShareRenderJobCache.delete(cacheKey);
    return file;
  } catch (error) {
    preparedShareRenderJobCache.delete(cacheKey);
    throw createShareRenderRequestError("download", error, signal);
  }
};
export const prepareLectumShareFileWithServerRender = async (target: LectumShareSocialTarget) => {
  if (target.mediaType !== "video") {
    throw new Error("Somente vídeos podem ser preparados para download social.");
  }

  const cached = getPreparedLectumShareFile(target);
  if (cached) return cached;

  const cacheKey = createPreparedShareFileCacheKey(target);
  const cachedPromise = preparedShareFileCache.get(cacheKey);
  if (cachedPromise) {
    return Promise.resolve(cachedPromise).catch((error) => {
      preparedShareFileCache.delete(cacheKey);
      throw error;
    });
  }

  const controller = new AbortController();
  const fallbackTimeout = window.setTimeout(
    () => controller.abort(),
    SERVER_SHARE_RENDER_QUALITY_TIMEOUT_MS,
  );
  const pendingFile = prepareLectumShareFileWithServerRenderJob(target, controller.signal).then(
    (file) => {
      cachePreparedLectumShareFile(target, file);
      return file;
    },
    (error) => {
      preparedShareFileCache.delete(cacheKey);
      if (isShareRenderAbortError(error, controller.signal)) {
        throw new LectumShareRenderError({ code: "render_timeout", stage: "timeout" }, error);
      }
      throw error;
    },
  );

  preparedShareFileCache.set(cacheKey, pendingFile);

  try {
    return await pendingFile;
  } catch (error) {
    if (error instanceof LectumShareRenderError) {
      throw error;
    }

    if (isShareRenderAbortError(error, controller.signal)) {
      throw new LectumShareRenderError({ code: "render_timeout", stage: "timeout" }, error);
    }

    throw error;
  } finally {
    window.clearTimeout(fallbackTimeout);
  }
};

const downloadFile = (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.name;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), DOWNLOAD_OBJECT_URL_REVOKE_DELAY_MS);
};

export const downloadPreparedLectumShareFile = async (
  _target: LectumShareSocialTarget,
  file: File,
): Promise<ShareExportResult> => {
  downloadFile(file);

  return { channel: null, file, mode: "download" };
};

export const copyLectumShareTargetUrl = async (
  target: Pick<LectumShareLinkTarget | LectumShareSocialTarget, "shareUrl">,
): Promise<ShareExportResult> => {
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  if (!copied) {
    throw new Error("Compartilhamento indisponível.");
  }

  return { channel: "clipboard", mode: "clipboard" };
};

export const shareLectumLinkTarget = async (
  target: LectumShareLinkTarget,
): Promise<ShareExportResult> => {
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    text: target.text ?? undefined,
    title: target.title,
    url: target.shareUrl,
  };
  const nativeShareData = resolveLectumLinkShareData(nav, shareData);

  if (nativeShareData) {
    try {
      await nav.share?.(nativeShareData);
      return { channel: "web_share", mode: "link" };
    } catch (error) {
      if (isNativeShareAbortError(error)) throw error;
    }
  }

  return copyLectumShareTargetUrl(target);
};

export { isNativeShareAbortError } from "./lectum-share-media/native-share";
