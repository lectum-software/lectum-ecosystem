const INTERNAL_ORIGIN = "https://lectum-admin.local";
const INTERNAL_NAVIGATION_KEYS = new Set([
  "action_href",
  "admin_content_url",
  "admin_statistics_url",
  "detail_url",
  "href",
  "path",
  "start_path",
]);

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const resolveSafeInternalNavigationPath = (value: string | null | undefined) => {
  const raw = value?.trim();

  if (
    !raw ||
    raw.length > 2048 ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(raw)
  ) {
    return null;
  }

  try {
    const url = new URL(raw, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.username || url.password) return null;

    const decodedPath = decodeURIComponent(url.pathname);
    if (
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      hasControlCharacters(decodedPath)
    ) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

export const isSafeInternalNavigationPath = (value: string | null | undefined) =>
  resolveSafeInternalNavigationPath(value) !== null;

export const normalizeSafeAdminRedirect = (
  value: string | null | undefined,
  fallback = "/dashboard",
) => resolveSafeInternalNavigationPath(value) ?? fallback;

export const sanitizeAdminNavigationData = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAdminNavigationData(item)) as T;
  }

  if (!value || typeof value !== "object") return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (INTERNAL_NAVIGATION_KEYS.has(key) && typeof entryValue === "string") {
      sanitized[key] = normalizeSafeAdminRedirect(entryValue);
      continue;
    }

    sanitized[key] = sanitizeAdminNavigationData(entryValue);
  }

  return sanitized as T;
};
