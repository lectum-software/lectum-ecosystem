import { getPublicApiSource, isLocalAssetHostname } from "@/utils/public-asset-sources";

export const normalizeTrustedApiUrl = (value: string) => {
  const configuredApiUrl = getPublicApiSource()?.origin;
  const raw = value.trim();
  const hasControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (
    !configuredApiUrl ||
    !raw ||
    raw.length > 8192 ||
    raw.startsWith("//") ||
    raw.includes("*") ||
    raw.includes("\\") ||
    hasControlCharacter
  ) {
    return null;
  }

  try {
    const apiUrl = new URL(configuredApiUrl);
    const url = new URL(raw, apiUrl);
    const usesHttp =
      (apiUrl.protocol === "http:" || apiUrl.protocol === "https:") &&
      (url.protocol === "http:" || url.protocol === "https:");

    if (
      !usesHttp ||
      url.origin !== apiUrl.origin ||
      apiUrl.username ||
      apiUrl.password ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

export const buildTrustedGoogleLoginUrl = (
  deviceId: string | null | undefined,
  query?: URLSearchParams,
) => {
  if (!deviceId) throw new Error("Device identifier is unavailable");

  const configuredApiUrl = getPublicApiSource()?.origin;
  if (!configuredApiUrl) throw new Error("Serviço de login indisponível");

  const defaultLoginUrl = new URL("/api/public/google/login", configuredApiUrl).toString();
  const configuredLoginUrl = process.env.NEXT_PUBLIC_LOGIN_URL?.trim() || defaultLoginUrl;
  const trustedLoginUrl = normalizeTrustedApiUrl(configuredLoginUrl);

  if (!trustedLoginUrl) throw new Error("Google login URL is not trusted");

  const url = new URL(trustedLoginUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(deviceId)}`;
  url.search = query?.toString() || "";

  return url.toString();
};

const isTrustedFallbackGoogleLoginOrigin = (url: URL) => {
  if (url.protocol !== "https:" || url.username || url.password || url.hostname.length === 0) {
    return false;
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.+$/, "");
  if (
    hostname === "api.lectum.com.br" ||
    hostname.endsWith("-api.lectum.com.br") ||
    hostname.endsWith(".api.lectum.com.br")
  ) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && isLocalAssetHostname(hostname);
};

const parseGoogleIntentSearchParams = (value: string) => {
  const raw = value.trim();
  const hasControlCharacter = Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

  if (
    !raw ||
    raw.length > 8192 ||
    raw.startsWith("//") ||
    raw.includes("*") ||
    raw.includes("\\") ||
    hasControlCharacter
  ) {
    return null;
  }

  try {
    return new URL(raw, "https://lectum.invalid").searchParams;
  } catch {
    return null;
  }
};

const parseTrustedGoogleIntentUrl = (value: string) => {
  const trustedIntentUrl = normalizeTrustedApiUrl(value);
  if (trustedIntentUrl) return new URL(trustedIntentUrl);

  try {
    const url = new URL(value.trim());
    return isTrustedFallbackGoogleLoginOrigin(url) ? url : null;
  } catch {
    return null;
  }
};

const hasDeleteAccountIntent = (searchParams: URLSearchParams) =>
  searchParams.get("intent") === "delete_account" && Boolean(searchParams.get("delete_token"));

export const buildTrustedGoogleLoginUrlFromIntent = (
  value: string,
  deviceId: string | null | undefined,
) => {
  const url = parseTrustedGoogleIntentUrl(value);
  const searchParams = url?.searchParams ?? parseGoogleIntentSearchParams(value);
  if (!searchParams || !hasDeleteAccountIntent(searchParams)) return null;

  const googleLoginPath = "/api/public/google/login";
  const normalizedPath = url?.pathname.replace(/\/+$/, "");

  if (url && normalizedPath?.startsWith(`${googleLoginPath}/`)) {
    return url.toString();
  }

  if (!deviceId) return null;

  try {
    return buildTrustedGoogleLoginUrl(deviceId, searchParams);
  } catch {
    if (!url || !isTrustedFallbackGoogleLoginOrigin(url)) return null;

    const fallbackUrl = new URL(`${googleLoginPath}/${encodeURIComponent(deviceId)}`, url.origin);
    fallbackUrl.search = url.search;

    return fallbackUrl.toString();
  }
};
