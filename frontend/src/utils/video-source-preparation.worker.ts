import { copyVideoSource } from "./video-source-copy";
import {
  isExpiredVideoStagingFile,
  VIDEO_STAGING_DIRECTORY,
  VideoPreparationFailure,
  type VideoPreparationWorkerEvent,
  videoStagingLock,
} from "./video-source-preparation-types";
import { VideoSourceFailure } from "./video-upload-source";

// Interfaces mínimas da API nativa: lib.dom não declara os métodos exclusivos de worker.
type SyncAccess = {
  write: (bytes: Uint8Array, options: { at: number }) => number;
  flush: () => void;
  close: () => void;
};
type SyncFile = FileSystemFileHandle & { createSyncAccessHandle: () => Promise<SyncAccess> };
type DirectoryEntries = FileSystemDirectoryHandle & {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};
const scope = self as unknown as {
  postMessage: (event: VideoPreparationWorkerEvent) => void;
  onmessage:
    | ((
        event: MessageEvent<{ type: "prepare"; file: File; id: string } | { type: "dispose" }>,
      ) => void)
    | null;
};
const controller = new AbortController();
let dispose: (() => void) | null = null;
const disposed = new Promise<void>((resolve) => {
  dispose = resolve;
});
let started = false;

const storageFailure = (error: unknown) =>
  new VideoPreparationFailure(
    error instanceof Error && error.name === "QuotaExceededError"
      ? "storage_full"
      : "storage_unavailable",
  );

const prepare = async (file: File, id: string) => {
  let directory: FileSystemDirectoryHandle | undefined;
  let access: SyncAccess | undefined;
  let handle: FileSystemFileHandle | undefined;
  let position = 0;
  const prepareStorage = async () => {
    try {
      const root = await navigator.storage.getDirectory().catch((error: unknown) => {
        if (error instanceof Error && error.name === "QuotaExceededError")
          throw storageFailure(error);
        throw new VideoPreparationFailure("storage_unsupported");
      });
      directory = await root.getDirectoryHandle(VIDEO_STAGING_DIRECTORY, { create: true });
      if (controller.signal.aborted) throw new DOMException("", "AbortError");
      handle = await directory.getFileHandle(id, { create: true });
      const syncFile = handle as SyncFile;
      if (typeof syncFile.createSyncAccessHandle !== "function")
        throw new VideoPreparationFailure("storage_unsupported");
      access = await syncFile.createSyncAccessHandle().catch((error: unknown) => {
        // Somente indisponibilidade da capacidade, antes de qualquer escrita.
        if (error instanceof Error && ["NotSupportedError", "SecurityError"].includes(error.name))
          throw new VideoPreparationFailure("storage_unsupported");
        throw storageFailure(error);
      });
      return {
        write(bytes: Uint8Array) {
          if (controller.signal.aborted) throw new DOMException("", "AbortError");
          try {
            // Native write pode ser parcial; nunca aceitar arquivo truncado.
            let written = 0;
            while (written < bytes.byteLength) {
              const count = access?.write(bytes.subarray(written), { at: position + written }) ?? 0;
              if (count <= 0) throw new Error();
              written += count;
            }
            position += written;
          } catch (error) {
            throw storageFailure(error);
          }
        },
      };
    } catch (error) {
      if (controller.signal.aborted) throw new DOMException("", "AbortError");
      throw error instanceof VideoPreparationFailure ? error : storageFailure(error);
    }
  };
  // Observar até a inicialização tardia antes do finally: cancelamento não vaza handle.
  const storage = prepareStorage();
  try {
    await copyVideoSource(file, storage, controller.signal, (percentage) =>
      scope.postMessage({ type: "progress", percentage }),
    );
    try {
      access?.flush();
      access?.close();
    } catch (error) {
      throw storageFailure(error);
    }
    access = undefined;
    if (controller.signal.aborted) return;
    const snapshot = await handle?.getFile();
    if (!snapshot || snapshot.size !== file.size) throw new VideoSourceFailure("changed");
    const ownedFile = new File([snapshot], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    scope.postMessage({ type: "ready", file: ownedFile });
    await disposed;
  } catch (error) {
    if (!controller.signal.aborted) {
      const failure =
        error instanceof VideoPreparationFailure
          ? error
          : new VideoPreparationFailure(
              "read_failed",
              error instanceof VideoSourceFailure
                ? error.code
                : error instanceof Error && error.name === "NotAllowedError"
                  ? "permission"
                  : "unreadable",
            );
      scope.postMessage({
        type: "failed",
        code: failure.code,
        sourceFailure: failure.sourceFailure,
      });
    }
  } finally {
    await storage.catch(() => undefined);
    try {
      access?.close();
    } catch {
      /* Já fechado ou volume indisponível. */
    }
    await directory?.removeEntry(id).catch(() => undefined);
  }
};

const collectAbandoned = async () => {
  // Não tocar em outros namespaces nem em preparações de outra aba/worker ativo.
  if (!navigator.locks) return;
  try {
    const root = await navigator.storage.getDirectory();
    const directory = (await root.getDirectoryHandle(VIDEO_STAGING_DIRECTORY)) as DirectoryEntries;
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind !== "file" || !isExpiredVideoStagingFile(name, Date.now())) continue;
      await navigator.locks.request(videoStagingLock(name), { ifAvailable: true }, async (lock) => {
        if (lock) await directory.removeEntry(name).catch(() => undefined);
      });
    }
  } catch {
    /* Manutenção local best-effort, sem bloquear a aquisição. */
  }
};

scope.onmessage = (event) => {
  if (event.data.type === "dispose") {
    controller.abort();
    dispose?.();
    return;
  }
  if (started) return;
  started = true;
  const { file, id } = event.data;
  const run = async () => {
    // A limpeza acontece em paralelo, nunca antes da primeira leitura.
    void collectAbandoned();
    await prepare(file, id);
  };
  const result = navigator.locks ? navigator.locks.request(videoStagingLock(id), run) : run();
  void result
    .catch(() => {
      if (!controller.signal.aborted)
        scope.postMessage({ type: "failed", code: "storage_unavailable" });
    })
    .finally(() => scope.postMessage({ type: "disposed" }));
};
