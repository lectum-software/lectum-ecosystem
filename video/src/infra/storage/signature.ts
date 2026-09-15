import { open } from "node:fs/promises";

export type SupportedVideoContainer = "iso-bmff" | "webm";

const ISO_BMFF_ATOMS = new Set(["ftyp", "free", "mdat", "moov", "skip", "wide"]);

export const detectSupportedVideoSignature = (
  bytes: Uint8Array,
): SupportedVideoContainer | null => {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }

  if (bytes.length < 12) return null;
  const atom = Buffer.from(bytes.subarray(4, 8)).toString("ascii");
  if (!ISO_BMFF_ATOMS.has(atom)) return null;

  const declaredSize = Buffer.from(bytes.subarray(0, 4)).readUInt32BE(0);
  return declaredSize === 0 || declaredSize === 1 || declaredSize >= 8 ? "iso-bmff" : null;
};

export const readSupportedVideoSignature = async (filePath: string) => {
  const handle = await open(filePath, "r");
  try {
    const bytes = Buffer.alloc(64);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    return detectSupportedVideoSignature(bytes.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
};
