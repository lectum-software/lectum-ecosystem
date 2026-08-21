import type { ImageMimeType } from "./policy";

const ANIMATION_PROBE_LIMIT_BYTES = 1024 * 1024;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

export type ImageAnimationStatus = "animated" | "static" | "unknown";

const throwIfCanceled = (signal?: AbortSignal) => {
  if (!signal?.aborted) return;

  const error = new Error("image_preparation_canceled");
  error.name = "AbortError";
  throw error;
};

const matchesBytes = (bytes: Uint8Array, offset: number, expected: readonly number[]) =>
  expected.every((value, index) => bytes[offset + index] === value);

const readAscii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

const probePngAnimation = (bytes: Uint8Array): ImageAnimationStatus => {
  if (bytes.length < PNG_SIGNATURE.length || !matchesBytes(bytes, 0, PNG_SIGNATURE)) {
    return "unknown";
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset: number = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const chunkLength = view.getUint32(offset, false);
    const chunkEnd = offset + 12 + chunkLength;
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.length) return "unknown";

    const chunkType = readAscii(bytes, offset + 4, 4);
    if (chunkType === "acTL") return "animated";
    if (chunkType === "IDAT" || chunkType === "IEND") return "static";
    offset = chunkEnd;
  }

  return "unknown";
};

const probeWebpAnimation = (bytes: Uint8Array): ImageAnimationStatus => {
  if (bytes.length < 20 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return "unknown";
  }

  const firstChunk = readAscii(bytes, 12, 4);
  if (firstChunk === "ANIM") return "animated";
  if (firstChunk === "VP8 " || firstChunk === "VP8L") return "static";
  if (firstChunk !== "VP8X" || bytes.length < 21) return "unknown";

  return (bytes[20] & 0x02) !== 0 ? "animated" : "static";
};

export const probeImageAnimation = (
  bytes: Uint8Array,
  mimeType: ImageMimeType,
): ImageAnimationStatus => {
  if (mimeType === "image/jpeg") return "static";
  if (mimeType === "image/png") return probePngAnimation(bytes);

  return probeWebpAnimation(bytes);
};

export const detectImageAnimation = async (
  file: File,
  mimeType: ImageMimeType,
  signal?: AbortSignal,
): Promise<ImageAnimationStatus> => {
  if (mimeType === "image/jpeg") return "static";

  throwIfCanceled(signal);
  const probeSize = Math.min(file.size, ANIMATION_PROBE_LIMIT_BYTES);
  const bytes = new Uint8Array(await file.slice(0, probeSize).arrayBuffer());
  throwIfCanceled(signal);

  return probeImageAnimation(bytes, mimeType);
};
