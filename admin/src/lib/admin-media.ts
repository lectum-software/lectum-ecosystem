import { adminApiUrl } from "./api-url";

export {
  isAdminVideoAssetReference,
  videoAssetIdFromAdminReference,
} from "./admin-video-stream-reference";

import { isLoopbackHostname, parseConfiguredHttpOrigin } from "./http-origin-policy";

const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
const INTERNAL_ORIGIN = "https://lectum-admin.invalid";
const mediaParsingOrigin = adminApiUrl || INTERNAL_ORIGIN;

type RemoteAssetPattern = {
  hostname: string;
  port: string | null;
  protocol: "http:" | "https:";
};

const remoteAssetPatterns = new Map<string, RemoteAssetPattern>();
const addRemoteAssetPattern = (pattern: RemoteAssetPattern) => {
  const key = `${pattern.protocol}//${pattern.hostname}:${pattern.port ?? "*"}`;
  remoteAssetPatterns.set(key, pattern);
};

const addConfiguredRemoteAsset = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return;

  const explicitUrl = normalized.includes("://");
  const url = parseConfiguredHttpOrigin(normalized, { allowHostname: true });
  if (!url) return;

  addRemoteAssetPattern({
    hostname: url.hostname,
    port: url.port,
    protocol: url.protocol,
  });

  if (!explicitUrl && process.env.NODE_ENV === "development" && isLoopbackHostname(url.hostname)) {
    addRemoteAssetPattern({ hostname: url.hostname, port: url.port, protocol: "http:" });
  }
};

addRemoteAssetPattern({
  hostname: "lh3.googleusercontent.com",
  port: "",
  protocol: "https:",
});
addConfiguredRemoteAsset(adminApiUrl);

if (process.env.NODE_ENV === "development") {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    addRemoteAssetPattern({ hostname, port: null, protocol: "http:" });
    addRemoteAssetPattern({ hostname, port: null, protocol: "https:" });
  }
}

process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",").forEach(addConfiguredRemoteAsset);

const isAllowedRemoteAssetUrl = (url: URL) =>
  Array.from(remoteAssetPatterns.values()).some(
    (pattern) =>
      url.protocol === pattern.protocol &&
      url.hostname === pattern.hostname &&
      (pattern.port === null || url.port === pattern.port),
  );

export const isPublicMediaPath = (pathname: string) =>
  publicMediaPathPrefixes.some((prefix) => pathname.startsWith(prefix));

export const resolveAdminMediaUrl = (src?: string | null) => {
  const value = src?.trim();
  if (!value) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;

  try {
    const parsed = new URL(value, mediaParsingOrigin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (
      isPublicMediaPath(parsed.pathname) &&
      (value.startsWith("/") || (Boolean(adminApiUrl) && parsed.origin === adminApiUrl))
    ) {
      return `${adminApiUrl}${parsed.pathname}${parsed.search}`;
    }
    if (value.startsWith("/")) return value;
    if (!isAllowedRemoteAssetUrl(parsed)) return null;

    return parsed.toString();
  } catch {
    return null;
  }
};

export const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    return isAllowedRemoteAssetUrl(new URL(resolved));
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
    return isPublicMediaPath(new URL(resolved, mediaParsingOrigin).pathname);
  } catch {
    return false;
  }
};

export const isAdminApiMediaUrl = (src?: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;
  if (!adminApiUrl) return false;

  try {
    return new URL(resolved).origin === adminApiUrl;
  } catch {
    return false;
  }
};
