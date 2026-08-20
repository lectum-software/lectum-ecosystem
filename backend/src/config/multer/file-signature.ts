const startsWithBytes = (buffer: Buffer, signature: readonly number[]) =>
  signature.every((byte, index) => buffer[index] === byte);

const isJpeg = (buffer: Buffer) => startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer: Buffer) =>
  startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isWebp = (buffer: Buffer) =>
  buffer.length >= 12 &&
  buffer.toString("ascii", 0, 4) === "RIFF" &&
  buffer.toString("ascii", 8, 12) === "WEBP";

const ISO_BOX_HEADER_BYTES = 8;
const FILE_TYPE_FIXED_PAYLOAD_BYTES = 8;
const QUICKTIME_BRAND = "qt  ";
const ISO_FILE_TYPE_PREFIX_ATOMS = new Set(["free", "skip", "wide"]);
const MP4_VIDEO_BRANDS = new Set([
  "3gp4",
  "3gp5",
  "3gp6",
  "3ge6",
  "3gg6",
  "M4V ",
  "MSNV",
  "XAVC",
  "avc1",
  "cmfc",
  "cmfs",
  "dash",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "iso7",
  "iso8",
  "iso9",
  "isom",
  "mp41",
  "mp42",
]);

const ISO_IMAGE_MAJOR_BRANDS = new Set([
  "MA1A",
  "MA1B",
  "avif",
  "avis",
  "heic",
  "heim",
  "heis",
  "heix",
  "hevc",
  "hevm",
  "hevs",
  "hevx",
  "mif1",
  "mif2",
  "msf1",
]);

const QUICKTIME_LEGACY_TOP_LEVEL_ATOMS = new Set(["mdat", "moov", "pnot", "wide"]);

type IsoBox = {
  headerSize: number;
  size: number;
  start: number;
  type: string;
};

const readIsoBox = (buffer: Buffer, start: number): IsoBox | null => {
  if (start < 0 || start + ISO_BOX_HEADER_BYTES > buffer.length) return null;

  const compactSize = buffer.readUInt32BE(start);
  const type = buffer.toString("ascii", start + 4, start + 8);
  let headerSize = ISO_BOX_HEADER_BYTES;
  let size = compactSize;

  if (compactSize === 1) {
    if (start + 16 > buffer.length) return null;
    const extendedSize = buffer.readBigUInt64BE(start + 8);
    if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    headerSize = 16;
    size = Number(extendedSize);
  } else if (compactSize === 0) {
    size = buffer.length - start;
  }

  if (size < headerSize || start + size > buffer.length) return null;
  return { headerSize, size, start, type };
};

const findFileTypeBox = (buffer: Buffer) => {
  let start = 0;

  for (let inspected = 0; inspected < 8 && start < 4096; inspected += 1) {
    const box = readIsoBox(buffer, start);
    if (!box) return null;
    if (box.type === "ftyp") return box;
    if (!ISO_FILE_TYPE_PREFIX_ATOMS.has(box.type)) return null;
    start += box.size;
  }

  return null;
};

const readFileTypeBrands = (buffer: Buffer, box: IsoBox) => {
  const payloadStart = box.start + box.headerSize;
  const payloadSize = box.size - box.headerSize;
  if (payloadSize < FILE_TYPE_FIXED_PAYLOAD_BYTES || payloadSize % 4 !== 0) return null;

  const brands = [buffer.toString("ascii", payloadStart, payloadStart + 4)];
  for (
    let offset = payloadStart + FILE_TYPE_FIXED_PAYLOAD_BYTES;
    offset + 4 <= box.start + box.size;
    offset += 4
  ) {
    brands.push(buffer.toString("ascii", offset, offset + 4));
  }

  return brands;
};

const hasLegacyQuickTimeAtom = (buffer: Buffer) => {
  let start = 0;

  for (let inspected = 0; inspected < 8 && start < 4096; inspected += 1) {
    if (start + ISO_BOX_HEADER_BYTES > buffer.length) return false;

    const compactSize = buffer.readUInt32BE(start);
    const type = buffer.toString("ascii", start + 4, start + 8);
    if (QUICKTIME_LEGACY_TOP_LEVEL_ATOMS.has(type)) {
      if (compactSize === 0) return true;
      if (compactSize === 1) {
        if (start + 16 > buffer.length) return false;
        return buffer.readBigUInt64BE(start + 8) >= 16n;
      }
      return compactSize >= ISO_BOX_HEADER_BYTES;
    }

    if (!ISO_FILE_TYPE_PREFIX_ATOMS.has(type)) return false;
    const prefixBox = readIsoBox(buffer, start);
    if (!prefixBox) return false;
    start += prefixBox.size;
  }

  return false;
};

const isIsoVideo = (buffer: Buffer, mimeType: string) => {
  const fileTypeBox = findFileTypeBox(buffer);
  if (!fileTypeBox) {
    return mimeType === "video/quicktime" && hasLegacyQuickTimeAtom(buffer);
  }

  const brands = readFileTypeBrands(buffer, fileTypeBox);
  if (!brands) return false;
  if (ISO_IMAGE_MAJOR_BRANDS.has(brands[0])) return false;

  return mimeType === "video/quicktime"
    ? brands.some((brand) => brand === QUICKTIME_BRAND || MP4_VIDEO_BRANDS.has(brand))
    : brands.some((brand) => MP4_VIDEO_BRANDS.has(brand));
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
