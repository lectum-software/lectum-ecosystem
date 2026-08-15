import { getPublicApiSource } from "@/utils/public-asset-sources";

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

export const buildTrustedGoogleLoginUrlFromIntent = (
  value: string,
  deviceId: string | null | undefined,
) => {
  const trustedIntentUrl = normalizeTrustedApiUrl(value);
  if (!trustedIntentUrl) return null;

  const url = new URL(trustedIntentUrl);
  const googleLoginPath = "/api/public/google/login";
  const normalizedPath = url.pathname.replace(/\/+$/, "");

  if (normalizedPath.startsWith(`${googleLoginPath}/`)) {
    return url.toString();
  }

  if (!deviceId) return null;

  return buildTrustedGoogleLoginUrl(deviceId, url.searchParams);
};
