import { isIP } from "node:net";
import { isLoopbackWebHostname } from "@/utils/public-origin";
import { isPublishedRuntime } from "@/utils/runtime-config";

export const GOOGLE_MANAGE_ACCOUNT_URL = "https://myaccount.google.com/security";
const EXACT_HTTP_SCHEME_SEPARATOR = /^https?:\/\/[^/\\]/i;

type GoogleHttpUrlOptions = {
  originOnly?: boolean;
  productionRuntime?: boolean;
};

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export const parseGoogleHttpUrl = (value?: string | null, options: GoogleHttpUrlOptions = {}) => {
  const raw = value?.trim();

  if (
    !raw ||
    raw.length > 2_048 ||
    !EXACT_HTTP_SCHEME_SEPARATOR.test(raw) ||
    raw.startsWith("//") ||
    raw.includes("*") ||
    raw.includes("\\") ||
    hasControlCharacter(raw)
  ) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }
    const productionRuntime = options.productionRuntime ?? isPublishedRuntime();
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      productionRuntime &&
      (url.protocol !== "https:" || isLoopbackWebHostname(hostname) || isIP(hostname) !== 0)
    ) {
      return null;
    }
    if (options.originOnly && (url.pathname !== "/" || url.search || url.hash)) return null;

    return url;
  } catch {
    return null;
  }
};

export const sanitizeGoogleCallbackTarget = (
  value?: string | null,
  fallback = "/",
  options: Pick<GoogleHttpUrlOptions, "productionRuntime"> = {},
) => {
  const raw = value?.trim();
  if (!raw || raw.length > 2_048 || hasControlCharacter(raw) || raw.includes("\\")) return fallback;

  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return fallback;

    try {
      const url = new URL(raw, "https://lectum.local");
      return url.origin === "https://lectum.local"
        ? `${url.pathname}${url.search}${url.hash}`
        : fallback;
    } catch {
      return fallback;
    }
  }

  return parseGoogleHttpUrl(raw, options)?.toString() ?? fallback;
};

const toUrlOrigin = (value?: string | null) =>
  parseGoogleHttpUrl(value, { originOnly: true })?.origin ?? "";

export const getGoogleOAuthBaseUrl = () =>
  toUrlOrigin(process.env.GOOGLE_OAUTH_BASE_URL) || toUrlOrigin(process.env.BASE);

export const getGoogleOAuthCallbackUrl = () => {
  const baseUrl = getGoogleOAuthBaseUrl();

  return baseUrl ? `${baseUrl}/api/public/google/callback` : "";
};

export const createGoogleOAuthLoginUrl = (deviceId: string) => {
  const baseUrl = getGoogleOAuthBaseUrl();

  if (!baseUrl) return null;

  return new URL(`/api/public/google/login/${encodeURIComponent(deviceId)}`, baseUrl);
};

export const isGoogleOAuthConfigured = () => {
  return Boolean(
    getGoogleOAuthBaseUrl() &&
      parseGoogleHttpUrl(process.env.CALLBACK_URL_API_USER) &&
      process.env.GOOGLE_CLIENT_ID_API_USER?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET_API_USER?.trim(),
  );
};
