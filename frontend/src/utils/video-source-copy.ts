import { isMediaUploadCanceled, throwIfMediaUploadCanceled } from "./upload-lifecycle";
import { VideoSourceFailure } from "./video-upload-source";

export const VIDEO_COPY_CHUNK_BYTES = 1024 * 1024;

export type VideoCopySink = {
  write: (bytes: Uint8Array) => Promise<void> | void;
};

// Limitar também a origem, não apenas write: alguns engines antecipam todo o Blob.stream.
// Cada stream cobre no máximo 1 MiB e só é aberto após persistir a parte anterior.
export const copyVideoSource = async (
  file: Blob,
  sink: Promise<VideoCopySink>,
  signal: AbortSignal,
  onProgress?: (percentage: number) => void,
) => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const abort = () => {
    void reader?.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  let bytesCopied = 0;
  let lastProgress = -1;
  try {
    throwIfMediaUploadCanceled(signal);
    if (!file.size) throw new VideoSourceFailure("changed");
    reader = file.slice(0, VIDEO_COPY_CHUNK_BYTES).stream().getReader();
    // Começar a ler no início da aquisição; não esperar storage/preview/contrato HTTP.
    const [destination, first] = await Promise.all([sink, reader.read()]);
    let firstResult: ReadableStreamReadResult<Uint8Array> | undefined = first;
    for (let start = 0; start < file.size; start += VIDEO_COPY_CHUNK_BYTES) {
      throwIfMediaUploadCanceled(signal);
      const end = Math.min(start + VIDEO_COPY_CHUNK_BYTES, file.size);
      reader ??= file.slice(start, end).stream().getReader();
      let result = firstResult ?? (await reader.read());
      firstResult = undefined;
      while (!result.done) {
        throwIfMediaUploadCanceled(signal);
        if (bytesCopied + result.value.byteLength > end) throw new VideoSourceFailure("changed");
        await destination.write(result.value);
        bytesCopied += result.value.byteLength;
        result = await reader.read();
      }
      reader.releaseLock();
      reader = undefined;
      if (bytesCopied !== end) throw new VideoSourceFailure("changed");
      const percentage = Math.floor((bytesCopied / file.size) * 100);
      if (percentage !== lastProgress) {
        lastProgress = percentage;
        onProgress?.(percentage);
      }
      // Ceder uma task real: mensagens de cancelamento não rodam só com microtasks.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      throwIfMediaUploadCanceled(signal);
    }
    return bytesCopied;
  } catch (error) {
    if (signal.aborted) throwIfMediaUploadCanceled(signal);
    if (isMediaUploadCanceled(error) || error instanceof VideoSourceFailure) throw error;
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    if (reader) {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
};
