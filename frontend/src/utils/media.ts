const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const COMMUNITY_ICON_MEDIA_PATH_PREFIX = "/community/icons/";
const COMMUNITY_ICON_FRONTEND_PATH_PREFIX = "/images/community/explore/";
const PUBLIC_MEDIA_PATH_PREFIXES = ["/public/files/", COMMUNITY_ICON_MEDIA_PATH_PREFIX];

const isPublicMediaPath = (pathname: string) =>
  PUBLIC_MEDIA_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const resolveCommunityIconAssetPath = (pathname: string, search = "") => {
  if (!pathname.startsWith(COMMUNITY_ICON_MEDIA_PATH_PREFIX)) return null;

  const filename = pathname.slice(COMMUNITY_ICON_MEDIA_PATH_PREFIX.length);
  if (!filename || filename.includes("/")) return null;

  return `${COMMUNITY_ICON_FRONTEND_PATH_PREFIX}${filename}${search}`;
};

export const resolvePublicMediaUrl = (value?: string | null) => {
  if (!value) return null;

  const apiBase = API_URL.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);
    const communityIconPath = resolveCommunityIconAssetPath(parsed.pathname, parsed.search);

    if (communityIconPath) {
      return communityIconPath;
    }

    if (isPublicMediaPath(parsed.pathname)) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }

    if (value.startsWith("http")) return value;
    return `${apiBase}${value.startsWith("/") ? value : `/${value}`}`;
  } catch {
    const communityIconPath = resolveCommunityIconAssetPath(value);

    if (communityIconPath) {
      return communityIconPath;
    }

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
