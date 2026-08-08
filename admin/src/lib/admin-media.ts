import { adminApiUrl } from "./api-url";

const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
const defaultRemoteImageHosts = ["localhost", "127.0.0.1", "lh3.googleusercontent.com"];

export const isPublicMediaPath = (pathname: string) =>
  publicMediaPathPrefixes.some((prefix) => pathname.startsWith(prefix));

export const resolveAdminMediaUrl = (src?: string | null) => {
  const value = src?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value, adminApiUrl);
    if (isPublicMediaPath(parsed.pathname)) {
      return `${adminApiUrl}${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (value.startsWith("/")) return value;

    return parsed.toString();
  } catch {
    return null;
  }
};

const allowedRemoteImageHosts = () => {
  const hosts = new Set(defaultRemoteImageHosts);

  for (const candidate of [
    adminApiUrl,
    ...(process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",") ?? []),
  ]) {
    const normalized = candidate.trim();
    if (!normalized) continue;

    try {
      const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
      if (url.hostname) hosts.add(url.hostname);
    } catch {
      // Uma env inválida não deve interromper a renderização do painel.
    }
  }

  return hosts;
};

export const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    return allowedRemoteImageHosts().has(new URL(resolved).hostname);
  } catch {
    return false;
  }
};

export const renderableImageSrc = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  return resolved && canRenderImage(resolved) ? resolved : null;
};

export const isAdminPublicMediaUrl = (src?: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;

  try {
    return isPublicMediaPath(new URL(resolved, adminApiUrl).pathname);
  } catch {
    return false;
  }
};
