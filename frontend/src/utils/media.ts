import { getPublicApiSource, isTrustedPublicAssetUrl } from "@/utils/public-asset-sources";

const COMMUNITY_ICON_MEDIA_PATH_PREFIX = "/community/icons/";
const COMMUNITY_ICON_FRONTEND_PATH_PREFIX = "/images/community/explore/";
const PUBLIC_MEDIA_PATH_PREFIXES = ["/public/files/", COMMUNITY_ICON_MEDIA_PATH_PREFIX];
const MAX_MEDIA_URL_LENGTH = 8192;

const apiBaseUrl = () => {
  return getPublicApiSource()?.origin ?? null;
};

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const isPublicMediaPath = (pathname: string) =>
  PUBLIC_MEDIA_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const resolveCommunityIconAssetPath = (pathname: string, search = "") => {
  if (!pathname.startsWith(COMMUNITY_ICON_MEDIA_PATH_PREFIX)) return null;

  const filename = pathname.slice(COMMUNITY_ICON_MEDIA_PATH_PREFIX.length);
  if (!filename || filename.includes("/")) return null;

  return `${COMMUNITY_ICON_FRONTEND_PATH_PREFIX}${filename}${search}`;
};

export const resolvePublicMediaUrl = (value?: string | null) => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > MAX_MEDIA_URL_LENGTH ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(value ?? "")
  ) {
    return null;
  }

  const apiBase = apiBaseUrl();
  const parsingBase = apiBase ?? "https://lectum.invalid";

  try {
    const parsed = new URL(raw, `${parsingBase}/`);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    const communityIconPath = resolveCommunityIconAssetPath(parsed.pathname, parsed.search);

    if (communityIconPath) {
      return communityIconPath;
    }

    if (isPublicMediaPath(parsed.pathname)) {
      if (!apiBase) return null;
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }

    if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
      return isTrustedPublicAssetUrl(parsed) ? parsed.toString() : null;
    }
    if (!apiBase) return null;

    return `${apiBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const isPublicMediaUrl = (value?: string | null) => {
  const resolved = resolvePublicMediaUrl(value);
  if (!resolved) return false;

  try {
    return isPublicMediaPath(new URL(resolved, "https://lectum.local").pathname);
  } catch {
    return false;
  }
};
