const CSV_EXTENSION = ".csv";
const DOWNLOAD_URL_LIFETIME_MS = 1_000;
const MAX_FILENAME_LENGTH = 160;

const normalizeExtension = (extension: string) => {
  const normalized = extension.trim().toLowerCase();
  if (!normalized) return "";

  return normalized.startsWith(".") ? normalized : `.${normalized}`;
};

const sanitizeFilename = (value: string, fallback: string, extension = CSV_EXTENSION) => {
  const expectedExtension = normalizeExtension(extension);
  const lastPathSegment = value.split(/[\\/]/).at(-1) ?? "";
  const withoutControlCharacters = Array.from(lastPathSegment)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;

      return codePoint > 31 && (codePoint < 127 || codePoint > 159);
    })
    .join("");
  const normalized = withoutControlCharacters
    .normalize("NFC")
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);
  const safeValue = normalized || fallback;

  return !expectedExtension || safeValue.toLowerCase().endsWith(expectedExtension)
    ? safeValue
    : `${safeValue}${expectedExtension}`;
};

const decodeHeaderFilename = (value: string) => {
  const normalized = value.trim().replace(/^"|"$/g, "");

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

export const resolveSafeCsvFilename = (header: string | undefined, fallback: string) => {
  const safeFallback = sanitizeFilename(fallback, "relatorio.csv", CSV_EXTENSION);
  if (!header) return safeFallback;

  return resolveSafeDownloadFilename(header, safeFallback, CSV_EXTENSION);
};

export const resolveSafeDownloadFilename = (
  header: string | undefined,
  fallback: string,
  extension: string,
) => {
  const safeFallback = sanitizeFilename(
    fallback,
    `arquivo${normalizeExtension(extension)}`,
    extension,
  );
  if (!header) return safeFallback;

  const encodedMatch = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  const plainMatch = header.match(/filename\s*=\s*(?:"([^"]*)"|([^;]+))/i);
  const candidate = encodedMatch?.[1] ?? plainMatch?.[1] ?? plainMatch?.[2];

  return candidate
    ? sanitizeFilename(decodeHeaderFilename(candidate), safeFallback, extension)
    : safeFallback;
};

export const downloadFileBlob = (blob: Blob, filename: string, extension = "") => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitizeFilename(filename, "arquivo", extension);
  link.rel = "noopener";
  link.hidden = true;
  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
  }
};

export const downloadBlob = (blob: Blob, filename: string) => {
  downloadFileBlob(blob, filename, CSV_EXTENSION);
};
