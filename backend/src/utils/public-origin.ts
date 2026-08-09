import { isIP } from "node:net";
import { isPublishedRuntime } from "./runtime-config";

const MAX_CONFIGURED_URL_LENGTH = 2_048;
const EXACT_HTTP_SCHEME_SEPARATOR = /^https?:\/\/[^/\\]/i;

type PublicOriginOptions = {
  productionRuntime?: boolean;
};

type PublicFileUrlOptions = PublicOriginOptions & {
  baseUrl?: string | null;
};

const configuredBaseUrl = (options: PublicFileUrlOptions) =>
  Object.hasOwn(options, "baseUrl") ? options.baseUrl : process.env.BASE;

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export const isLoopbackWebHostname = (hostname: string) => {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("::ffff:") ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
};

/**
 * Normaliza uma origem pública configurada sem aceitar componentes que mudem
 * o destino. Em runtime publicado, origens locais e HTTP falham de forma segura.
 */
export const parsePublicHttpOrigin = (
  value?: string | null,
  options: PublicOriginOptions = {},
): string | null => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > MAX_CONFIGURED_URL_LENGTH ||
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
      !url.hostname ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const productionRuntime = options.productionRuntime ?? isPublishedRuntime();
    const normalizedHostname = url.hostname.replace(/^\[|\]$/g, "");
    if (
      productionRuntime &&
      (url.protocol !== "https:" ||
        isLoopbackWebHostname(url.hostname) ||
        isIP(normalizedHostname) !== 0)
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export const parsePublicHttpOrigins = (
  value?: string | null,
  options: PublicOriginOptions = {},
) => {
  const origins = new Set<string>();

  for (const item of value?.split(",") ?? []) {
    const origin = parsePublicHttpOrigin(item, options);
    if (origin) origins.add(origin);
  }

  return [...origins];
};

export const getPublicWebOrigins = (options: PublicOriginOptions = {}) =>
  parsePublicHttpOrigins(process.env.WEB_URL, options);

export const getPrimaryPublicWebOrigin = (options: PublicOriginOptions = {}) =>
  getPublicWebOrigins(options)[0] ?? null;

export const resolvePublicWebUrl = (
  path: string | null | undefined,
  options: PublicOriginOptions = {},
) => {
  const origin = getPrimaryPublicWebOrigin(options);
  const rawPath = path?.trim();
  if (
    !origin ||
    !rawPath ||
    rawPath.length > MAX_CONFIGURED_URL_LENGTH ||
    !rawPath.startsWith("/") ||
    rawPath.startsWith("//") ||
    rawPath.includes("\\") ||
    hasControlCharacter(rawPath)
  ) {
    return null;
  }

  try {
    const url = new URL(rawPath, origin);
    return url.origin === origin ? url.toString() : null;
  } catch {
    return null;
  }
};

const normalizePublicObjectKey = (key: string) => {
  const segments = key.split("/");
  if (
    !key ||
    key.length > 1_024 ||
    hasControlCharacter(key) ||
    key.includes("\\") ||
    !segments.every((segment) => segment && segment !== "." && segment !== "..")
  ) {
    return null;
  }

  return segments.join("/");
};

export const publicFileKeyFromUrl = (
  value: string | null | undefined,
  allowedPrefixes: readonly string[],
  options: PublicFileUrlOptions = {},
) => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > 4_096 ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacter(raw)
  ) {
    return null;
  }

  const base = parsePublicHttpOrigin(configuredBaseUrl(options), options);
  const isRelative = raw.startsWith("/");
  if (!isRelative && (!base || !EXACT_HTTP_SCHEME_SEPARATOR.test(raw))) return null;

  try {
    const url = new URL(raw, base ?? "https://lectum.invalid");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (!isRelative && url.origin !== base)
    ) {
      return null;
    }

    const publicPathPrefix = "/public/files/";
    if (!url.pathname.startsWith(publicPathPrefix)) return null;

    const key = normalizePublicObjectKey(
      decodeURIComponent(url.pathname.slice(publicPathPrefix.length)),
    );
    if (!key || !allowedPrefixes.some((prefix) => key.startsWith(prefix))) return null;

    return key;
  } catch {
    return null;
  }
};

export const publicFileUrl = (key: string, options: PublicFileUrlOptions = {}) => {
  const normalizedKey = normalizePublicObjectKey(key);
  const safeKey = normalizedKey
    ? normalizedKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")
    : "unavailable";
  const publicPath = `/public/files/${safeKey}`;
  const base = parsePublicHttpOrigin(configuredBaseUrl(options), options);

  return base ? `${base}${publicPath}` : publicPath;
};
