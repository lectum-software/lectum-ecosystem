export const MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS = 10_000;

export class MediaUploadCanceledError extends Error {
  constructor() {
    super("media_upload_canceled");
    this.name = "AbortError";
  }
}

export const throwIfMediaUploadCanceled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new MediaUploadCanceledError();
};

export const isMediaUploadCanceled = (error: unknown) =>
  error instanceof MediaUploadCanceledError ||
  (typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError") ||
  (error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError"));

export const scheduleBestEffortCleanup = (cleanup: () => PromiseLike<unknown> | unknown) => {
  void Promise.resolve()
    .then(cleanup)
    .catch(() => undefined);
};
