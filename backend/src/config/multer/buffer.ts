type StatefulReadableStream = NodeJS.ReadableStream & {
  destroyed?: boolean;
  readableEnded?: boolean;
};

const unavailableStreamError = () => {
  const error = new Error("UPLOAD_STREAM_UNAVAILABLE");
  error.name = "AbortError";
  return error;
};

export async function streamToBuffer(
  stream: NodeJS.ReadableStream,
  signal?: AbortSignal,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const statefulStream = stream as StatefulReadableStream;
    if (signal?.aborted || statefulStream.destroyed || statefulStream.readableEnded) {
      reject(unavailableStreamError());
      return;
    }

    const chunks: Buffer[] = [];
    let settled = false;
    const cleanup = () => {
      stream.removeListener("data", handleData);
      stream.removeListener("error", handleError);
      stream.removeListener("end", handleEnd);
      signal?.removeEventListener("abort", handleAbort);
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const handleAbort = () => settle(() => reject(unavailableStreamError()));
    const handleData = (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };
    const handleError = (streamError: Error) => settle(() => reject(streamError));
    const handleEnd = () => settle(() => resolve(Buffer.concat(chunks)));

    stream.on("data", handleData);
    stream.once("error", handleError);
    stream.once("end", handleEnd);
    signal?.addEventListener("abort", handleAbort, { once: true });

    if (signal?.aborted || statefulStream.destroyed) handleAbort();
  });
}
