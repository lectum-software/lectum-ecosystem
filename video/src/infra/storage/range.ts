export type ByteRange = { end: number; start: number };

export const parseSingleByteRange = (
  header: string | undefined,
  size: number,
): ByteRange | null | "invalid" => {
  if (!header) return null;
  if (!Number.isSafeInteger(size) || size <= 0) return "invalid";

  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return { end: size - 1, start: Math.max(0, size - suffixLength) };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return "invalid";
  }

  return { end: Math.min(requestedEnd, size - 1), start };
};
