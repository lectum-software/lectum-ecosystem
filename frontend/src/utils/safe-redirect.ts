const INTERNAL_ORIGIN = "https://lectum.local";
const MAX_REDIRECT_LENGTH = 2048;

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export const normalizeSafeInternalRedirect = (
  value: string | null | undefined,
  fallback: string | null = null,
) => {
  const raw = value?.trim();

  if (
    !raw ||
    raw.length > MAX_REDIRECT_LENGTH ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(raw)
  ) {
    return fallback;
  }

  try {
    const url = new URL(raw, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return fallback;

    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.startsWith("//") || decodedPath.includes("\\")) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};
