const startsWithBytes = (buffer: Buffer, signature: readonly number[]) =>
  signature.every((byte, index) => buffer[index] === byte);

const isJpeg = (buffer: Buffer) => startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer: Buffer) =>
  startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isWebp = (buffer: Buffer) =>
  buffer.length >= 12 &&
  buffer.toString("ascii", 0, 4) === "RIFF" &&
  buffer.toString("ascii", 8, 12) === "WEBP";
const MP4_VIDEO_BRANDS = new Set([
  "3gp4",
  "3gp5",
  "M4V ",
  "MSNV",
  "avc1",
  "dash",
  "iso2",
  "iso5",
  "iso6",
  "isom",
  "mp41",
  "mp42",
]);

const isIsoVideo = (buffer: Buffer, mimeType: string) => {
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;

  const majorBrand = buffer.toString("ascii", 8, 12);
  return mimeType === "video/quicktime"
    ? majorBrand === "qt  " || MP4_VIDEO_BRANDS.has(majorBrand)
    : MP4_VIDEO_BRANDS.has(majorBrand);
};

const isWebm = (buffer: Buffer) =>
  startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]) &&
  buffer.subarray(0, Math.min(buffer.length, 4096)).includes(Buffer.from("webm"));

export const matchesDeclaredFileType = (buffer: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return isJpeg(buffer);
  if (mimeType === "image/png") return isPng(buffer);
  if (mimeType === "image/webp") return isWebp(buffer);
  if (mimeType === "video/webm") return isWebm(buffer);
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    return isIsoVideo(buffer, mimeType);
  }

  return false;
};
