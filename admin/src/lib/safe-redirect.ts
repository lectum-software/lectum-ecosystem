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

export const normalizeSafeAdminRedirect = (
  value: string | null | undefined,
  fallback = "/dashboard",
) => {
  const raw = value?.trim();

  if (
    !raw ||
    raw.length > 2048 ||
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
