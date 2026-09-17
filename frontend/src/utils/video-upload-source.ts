export type VideoSourceFailureCode =
  | "unreadable"
  | "permission"
  | "missing"
  | "changed"
  | "invalid_range"
  | "unknown";

export class VideoSourceFailure extends Error {
  readonly code: VideoSourceFailureCode;

  constructor(code: VideoSourceFailureCode) {
    super("Não foi possível ler o vídeo selecionado. Selecione-o novamente e tente enviar.");
    this.name = "VideoSourceFailure";
    this.code = code;
  }
}

const sourceFailure = (error: unknown) => {
  if (error instanceof VideoSourceFailure) return error;
  const name = error instanceof Error ? error.name : "";
  return new VideoSourceFailure(
    name === "NotReadableError"
      ? "unreadable"
      : name === "SecurityError" || name === "NotAllowedError"
        ? "permission"
        : name === "NotFoundError"
          ? "missing"
          : "unknown",
  );
};

const canceled = () => new DOMException("Envio cancelado.", "AbortError");

// Não entregar ao XHR um Blob que ainda referencia o provider da galeria Android.
// Copiar somente a parte atual: bytes idênticos, sem transcodificar ou ler o vídeo inteiro.
export const createBufferedVideoSource = (file: Blob, chunkSize: number) => {
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new VideoSourceFailure("invalid_range");
  }
  const size = file.size;
  let source: Blob | null = file;
  let cache: { start: number; end: number; value: Blob } | null = null;
  const controller = new AbortController();
  const { signal } = controller;

  const read = (blob: Blob) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      if (signal.aborted) return reject(canceled());
      const abort = () => reject(canceled());
      signal.addEventListener("abort", abort, { once: true });
      blob.arrayBuffer().then(
        (bytes) => {
          signal.removeEventListener("abort", abort);
          if (signal.aborted) reject(canceled());
          else resolve(bytes);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", abort);
          reject(signal.aborted ? canceled() : sourceFailure(error));
        },
      );
    });

  return {
    size,
    async slice(start: number, end: number): Promise<{ value: Blob | null; done: boolean }> {
      if (!source || signal.aborted) throw canceled();
      const until = Math.min(end, size);
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(until) ||
        start < 0 ||
        start > size ||
        until < start ||
        until - start > chunkSize
      ) {
        throw new VideoSourceFailure("invalid_range");
      }
      if (start === size) return { value: null, done: true };
      if (cache && start >= cache.start && until <= cache.end) {
        return {
          value: cache.value.slice(start - cache.start, until - cache.start),
          done: until === size,
        };
      }
      cache = null;
      try {
        const bytes = await read(source.slice(start, until));
        if (!source || signal.aborted) throw canceled();
        if (bytes.byteLength !== until - start) throw new VideoSourceFailure("changed");
        const value = new Blob([bytes]);
        cache = { start, end: until, value };
        return { value, done: until === size };
      } catch (error) {
        if (signal.aborted) throw canceled();
        throw sourceFailure(error);
      }
    },
    close() {
      source = null;
      cache = null;
      controller.abort();
    },
  };
};
