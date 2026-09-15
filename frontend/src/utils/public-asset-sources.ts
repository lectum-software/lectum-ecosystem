const DEFAULT_API_URL = "http://localhost:3001";
const BASE_PUBLIC_ASSET_URLS = ["https://lh3.googleusercontent.com"] as const;
const LOCAL_PUBLIC_ASSET_URLS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
] as const;

export type PublicAssetSource = {
  host: string;
  hostname: string;
  origin: string;
  port: string;
  protocol: "http" | "https";
};

export type PublicAssetSourceOptions = {
  apiUrl?: string | null;
  imageRemoteHosts?: string | null;
  nodeEnv?: string | null;
};

const normalizeAssetHostname = (hostname: string) => {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
};

export const isIpLiteralHostname = (hostname: string) => {
  const normalized = normalizeAssetHostname(hostname);
  if (!normalized) return false;
  if (normalized.includes(":")) return true;

  const segments = normalized.split(".");
  return (
    segments.length === 4 &&
    segments.every((segment) => /^\d{1,3}$/.test(segment) && Number(segment) <= 255)
  );
};

export const isLocalAssetHostname = (hostname: string) => {
  const normalized = normalizeAssetHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    /^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized) ||
    /^::ffff:127(?:\.\d{1,3}){3}$/.test(normalized) ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
};

export const isAllowedPublicAssetSource = (source: PublicAssetSource, nodeEnv?: string | null) => {
  if (isIpLiteralHostname(source.hostname)) {
    return nodeEnv !== "production" && isLocalAssetHostname(source.hostname);
  }
  if (isLocalAssetHostname(source.hostname)) return nodeEnv !== "production";
  if (source.protocol === "https") return true;

  return false;
};

export const parsePublicAssetSource = (value?: string | null): PublicAssetSource | null => {
  const raw = value?.trim();
  const hasControlCharacter = value
    ? Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })
    : false;

  if (
    !raw ||
    raw.length > 2048 ||
    raw.startsWith("//") ||
    raw.includes("*") ||
    raw.includes("\\") ||
    hasControlCharacter
  ) {
    return null;
  }

  try {
    const hasExplicitHttpScheme = /^https?:\/\/[^/\\]/i.test(raw);
    if (
      (raw.includes("://") && !hasExplicitHttpScheme) ||
      (/^https?:/i.test(raw) && !hasExplicitHttpScheme)
    ) {
      return null;
    }

    const url = new URL(hasExplicitHttpScheme ? raw : `https://${raw}`);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return {
      host: url.host,
      hostname: url.hostname,
      origin: url.origin,
      port: url.port,
      protocol: url.protocol === "https:" ? "https" : "http",
    };
  } catch {
    return null;
  }
};

export const getPublicAssetSources = ({
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
  imageRemoteHosts = process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS,
  nodeEnv = process.env.NODE_ENV,
}: PublicAssetSourceOptions = {}) => {
  const isPublishedBuild = nodeEnv === "production";
  const resolvedApiUrl = apiUrl?.trim() ? apiUrl : !isPublishedBuild ? DEFAULT_API_URL : null;
  const values = [
    ...BASE_PUBLIC_ASSET_URLS,
    ...(!isPublishedBuild ? LOCAL_PUBLIC_ASSET_URLS : []),
    ...(resolvedApiUrl ? [resolvedApiUrl] : []),
    ...(imageRemoteHosts?.split(",") ?? []),
  ];
  const sources = new Map<string, PublicAssetSource>();

  for (const value of values) {
    const source = parsePublicAssetSource(value);
    if (!source || !isAllowedPublicAssetSource(source, nodeEnv)) continue;

    sources.set(`${source.protocol}:${source.host}`, source);
  }

  return [...sources.values()];
};

export const getPublicApiSource = ({
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
  nodeEnv = process.env.NODE_ENV,
}: Pick<PublicAssetSourceOptions, "apiUrl" | "nodeEnv"> = {}) => {
  const resolvedApiUrl = apiUrl?.trim()
    ? apiUrl
    : nodeEnv === "production"
      ? null
      : DEFAULT_API_URL;
  const source = parsePublicAssetSource(resolvedApiUrl);

  return source && isAllowedPublicAssetSource(source, nodeEnv) ? source : null;
};

export const isTrustedPublicAssetUrl = (value: URL, options?: PublicAssetSourceOptions) => {
  if (value.username || value.password) return false;

  const protocol =
    value.protocol === "https:" ? "https" : value.protocol === "http:" ? "http" : null;
  if (!protocol) return false;

  return getPublicAssetSources(options).some((source) => {
    if (source.protocol !== protocol || source.hostname !== value.hostname) return false;

    return source.port === value.port;
  });
};
