import type { StreamTargetChunk } from "mediabunny";

const MEBIBYTE = 1024 * 1024;

export const VIDEO_PREPARATION_OPFS_DIRECTORY = "lectum-video-preparation";
export const VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_INPUT_BYTES = 64 * MEBIBYTE;
export const VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_OUTPUT_BYTES = 16 * MEBIBYTE;

const VIDEO_PREPARATION_TEMPORARY_FILE_PREFIX = "lectum-video-";
const VIDEO_PREPARATION_TEMPORARY_FILE_TTL_MS = 24 * 60 * 60 * 1000;
const VIDEO_PREPARATION_CLEANUP_RETRY_DELAYS_MS = [0, 50, 150] as const;

type SyncAccessHandle = {
  close: () => void;
  flush: () => void;
  truncate: (size: number) => void;
  write: (buffer: ArrayBufferView, options: { at: number }) => number;
};

type VideoOutputFileHandle = Pick<FileSystemFileHandle, "getFile"> & {
  createSyncAccessHandle?: () => Promise<SyncAccessHandle>;
  createWritable?: () => Promise<FileSystemWritableFileStream>;
};

export type BoundedVideoOutputWritable = {
  close: () => Promise<void>;
  writable: WritableStream<StreamTargetChunk>;
};

export type VideoPreparationTemporaryOutput = BoundedVideoOutputWritable & {
  directory: FileSystemDirectoryHandle;
  fileHandle: FileSystemFileHandle;
  fileName: string;
};

export class VideoOutputLimitExceededError extends Error {
  constructor() {
    super("video_output_limit_exceeded");
    this.name = "VideoOutputLimitExceededError";
  }
}

const isNotFoundError = (error: unknown) =>
  typeof DOMException !== "undefined" &&
  error instanceof DOMException &&
  error.name === "NotFoundError";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const assertWriteWithinLimit = (chunk: StreamTargetChunk, maxOutputBytes: number) => {
  const end = chunk.position + chunk.data.byteLength;
  if (
    chunk.type !== "write" ||
    !Number.isSafeInteger(chunk.position) ||
    chunk.position < 0 ||
    !Number.isSafeInteger(end) ||
    end > maxOutputBytes
  ) {
    throw new VideoOutputLimitExceededError();
  }
};

export const shouldUseMemoryVideoOutputFallback = (
  inputSize: number,
  estimatedOutputSize: number,
) =>
  inputSize > 0 &&
  inputSize <= VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_INPUT_BYTES &&
  estimatedOutputSize > 0 &&
  estimatedOutputSize <= VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_OUTPUT_BYTES;

const isVideoPreparationTemporaryFileName = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  const match = /^lectum-video-(\d{13})-([0-9a-f]{8}-[0-9a-f-]{27})\.mp4$/i.exec(value);
  if (!match) return false;

  const createdAt = Number(match[1]);
  return Number.isSafeInteger(createdAt) && createdAt > 0;
};

const getVideoPreparationTemporaryFileCreatedAt = (fileName: string) => {
  const match = /^lectum-video-(\d{13})-/.exec(fileName);
  return match ? Number(match[1]) : Number.NaN;
};

const closeSyncAccessHandle = (accessHandleRef: { current: SyncAccessHandle | null }) => {
  const accessHandle = accessHandleRef.current;
  if (!accessHandle) return;

  accessHandleRef.current = null;
  try {
    accessHandle.flush();
  } finally {
    accessHandle.close();
  }
};

const createSyncAccessWritable = async (
  fileHandle: VideoOutputFileHandle,
  maxOutputBytes: number,
): Promise<BoundedVideoOutputWritable | null> => {
  if (typeof fileHandle.createSyncAccessHandle !== "function") return null;

  const accessHandleRef = { current: await fileHandle.createSyncAccessHandle() };
  try {
    accessHandleRef.current.truncate(0);
  } catch (error) {
    closeSyncAccessHandle(accessHandleRef);
    throw error;
  }

  return {
    close: async () => {
      closeSyncAccessHandle(accessHandleRef);
    },
    writable: new WritableStream<StreamTargetChunk>({
      abort: () => {
        closeSyncAccessHandle(accessHandleRef);
      },
      close: () => {
        closeSyncAccessHandle(accessHandleRef);
      },
      write: (chunk) => {
        assertWriteWithinLimit(chunk, maxOutputBytes);

        const accessHandle = accessHandleRef.current;
        if (!accessHandle) throw new Error("video_output_closed");

        let writtenBytes = 0;
        while (writtenBytes < chunk.data.byteLength) {
          const written = accessHandle.write(chunk.data.subarray(writtenBytes), {
            at: chunk.position + writtenBytes,
          });
          if (
            !Number.isSafeInteger(written) ||
            written <= 0 ||
            written > chunk.data.byteLength - writtenBytes
          ) {
            throw new Error("video_output_short_write");
          }
          writtenBytes += written;
        }
      },
    }),
  };
};

const createAsyncAccessWritable = async (
  fileHandle: VideoOutputFileHandle,
  maxOutputBytes: number,
): Promise<BoundedVideoOutputWritable | null> => {
  if (typeof fileHandle.createWritable !== "function") return null;

  const fileStream = await fileHandle.createWritable();
  let closed = false;

  const closeFileStream = async (abort = false) => {
    if (closed) return;
    closed = true;

    if (abort) {
      await fileStream.abort().catch(() => undefined);
      return;
    }
    await fileStream.close();
  };

  return {
    close: () => closeFileStream(true),
    writable: new WritableStream<StreamTargetChunk>({
      abort: () => closeFileStream(true),
      close: () => closeFileStream(false),
      write: async (chunk) => {
        assertWriteWithinLimit(chunk, maxOutputBytes);
        await fileStream.write(chunk);
      },
    }),
  };
};

export const createBoundedVideoOutputWritable = async (
  fileHandle: VideoOutputFileHandle,
  maxOutputBytes: number,
): Promise<BoundedVideoOutputWritable> => {
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) {
    throw new TypeError("maxOutputBytes must be a positive safe integer");
  }

  try {
    const syncWritable = await createSyncAccessWritable(fileHandle, maxOutputBytes);
    if (syncWritable) return syncWritable;
  } catch {
    // Some WebKit versions expose sync handles but reject their creation or truncation.
    // Releasing the failed handle and trying the async API keeps OPFS usable there.
  }

  const asyncWritable = await createAsyncAccessWritable(fileHandle, maxOutputBytes);
  if (asyncWritable) return asyncWritable;

  throw new Error("video_output_storage_unavailable");
};

const createTemporaryFileName = (now = Date.now()) =>
  `${VIDEO_PREPARATION_TEMPORARY_FILE_PREFIX}${now}-${crypto.randomUUID()}.mp4`;

const removeDirectoryEntry = async (directory: FileSystemDirectoryHandle, fileName: string) => {
  for (const delay of VIDEO_PREPARATION_CLEANUP_RETRY_DELAYS_MS) {
    if (delay > 0) await wait(delay);

    try {
      await directory.removeEntry(fileName);
      return;
    } catch (error) {
      if (isNotFoundError(error)) return;
      if (delay === VIDEO_PREPARATION_CLEANUP_RETRY_DELAYS_MS.at(-1)) throw error;
    }
  }
};

const cleanupStaleVideoPreparationFiles = async (
  directory: FileSystemDirectoryHandle,
  now = Date.now(),
) => {
  try {
    const entries = (
      directory as FileSystemDirectoryHandle & {
        entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
      }
    ).entries;
    if (typeof entries !== "function") return;

    for await (const [fileName] of entries.call(directory)) {
      if (!isVideoPreparationTemporaryFileName(fileName)) continue;

      const createdAt = getVideoPreparationTemporaryFileCreatedAt(fileName);
      if (now - createdAt < VIDEO_PREPARATION_TEMPORARY_FILE_TTL_MS) continue;

      await removeDirectoryEntry(directory, fileName).catch(() => undefined);
    }
  } catch {
    // Stale cleanup is best effort and cannot block a new preparation.
  }
};

export const createVideoPreparationTemporaryOutput = async (
  maxOutputBytes: number,
): Promise<VideoPreparationTemporaryOutput> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.getDirectory !== "function"
  ) {
    throw new Error("video_output_storage_unavailable");
  }

  const root = await navigator.storage.getDirectory();
  const directory = await root.getDirectoryHandle(VIDEO_PREPARATION_OPFS_DIRECTORY, {
    create: true,
  });
  void cleanupStaleVideoPreparationFiles(directory);

  const fileName = createTemporaryFileName();
  const fileHandle = await directory.getFileHandle(fileName, { create: true });

  try {
    const boundedWritable = await createBoundedVideoOutputWritable(fileHandle, maxOutputBytes);
    return { ...boundedWritable, directory, fileHandle, fileName };
  } catch (error) {
    await removeDirectoryEntry(directory, fileName).catch(() => undefined);
    throw error;
  }
};

export const cleanupVideoPreparationTemporaryOutput = async (
  temporaryOutput: VideoPreparationTemporaryOutput,
) => {
  await temporaryOutput.close().catch(() => undefined);
  await removeDirectoryEntry(temporaryOutput.directory, temporaryOutput.fileName).catch(
    () => undefined,
  );
};

export const cleanupVideoPreparationTemporaryFile = async (fileName: string) => {
  if (!isVideoPreparationTemporaryFileName(fileName) || typeof navigator === "undefined") return;

  try {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(VIDEO_PREPARATION_OPFS_DIRECTORY);
    await removeDirectoryEntry(directory, fileName);
  } catch {
    // Cleanup is best effort; a stale, scoped entry is retried by the next preparation.
  }
};

export const readVideoPreparationTemporaryFile = async (
  temporaryOutput: VideoPreparationTemporaryOutput,
  outputFileName: string,
) => {
  const storedFile = await temporaryOutput.fileHandle.getFile();
  return new File([storedFile], outputFileName, {
    lastModified: Date.now(),
    type: "video/mp4",
  });
};
