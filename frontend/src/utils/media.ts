const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PUBLIC_MEDIA_PATH_PREFIXES = ["/public/files/", "/community/icons/"];

const isPublicMediaPath = (pathname: string) =>
  PUBLIC_MEDIA_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export const resolvePublicMediaUrl = (value?: string | null) => {
  if (!value) return null;

  const apiBase = API_URL.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);

    if (isPublicMediaPath(parsed.pathname)) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }

    if (value.startsWith("http")) return value;
    return `${apiBase}${value.startsWith("/") ? value : `/${value}`}`;
  } catch {
    if (PUBLIC_MEDIA_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      return `${apiBase}${value}`;
    }
    return value.startsWith("http") ? value : null;
  }
};

export const isPublicMediaUrl = (value?: string | null) => {
  const resolved = resolvePublicMediaUrl(value);
  if (!resolved) return false;

  try {
    return isPublicMediaPath(new URL(resolved).pathname);
  } catch {
    return PUBLIC_MEDIA_PATH_PREFIXES.some(
      (prefix) => resolved.startsWith(prefix) || resolved.includes(prefix),
    );
  }
};
