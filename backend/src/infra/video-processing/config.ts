import { isIP } from "node:net";
import { isPublishedRuntime, parsePositiveInteger } from "@/utils/runtime-config";

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MAX_CONFIGURED_URL_LENGTH = 2_048;
const EXACT_HTTP_SCHEME_SEPARATOR = /^https?:\/\/[^/\\]/i;
const INTERNAL_SERVICE_HOSTNAME_SUFFIXES = [
  ".internal",
  ".lan",
  ".local",
  ".private",
  ".svc",
  ".svc.cluster.local",
] as const;
const LOCAL_HOSTNAMES = new Set(["0.0.0.0", "localhost"]);
const VALID_DNS_HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/u;

export type VideoProcessingServiceConfig = {
  apiKey: string;
  baseUrl: string;
  requestTimeoutMs: number;
};

export type VideoProcessingServiceConfigResolution =
  | { config: null; status: "disabled" | "invalid" }
  | { config: VideoProcessingServiceConfig; status: "configured" };

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const isPrivateIpv4 = (hostname: string) => {
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isReservedIpv4 = (hostname: string) => {
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true;
  }

  const [first, second, third] = octets;
  return (
    first === 0 ||
    (first === 100 && second !== undefined && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 18) ||
    (first === 198 && second === 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
};

const normalizeServiceHostname = (hostname: string) =>
  hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

const isLoopbackIpv4 = (hostname: string) => /^127(?:\.\d{1,3}){3}$/u.test(hostname);

const ipv4FromMappedIpv6 = (hostname: string) => {
  const normalized = normalizeServiceHostname(hostname);
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(normalized)?.[1];
  if (dotted) return dotted;

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u.exec(normalized);
  if (!hex) return null;

  const high = Number.parseInt(hex[1] ?? "", 16);
  const low = Number.parseInt(hex[2] ?? "", 16);
  if (!Number.isInteger(high) || !Number.isInteger(low) || high > 0xffff || low > 0xffff) {
    return null;
  }

  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
};

const isPrivateIpv6 = (hostname: string) => {
  const mappedIpv4 = ipv4FromMappedIpv6(hostname);
  return (
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:") ||
    Boolean(mappedIpv4 && isPrivateIpv4(mappedIpv4))
  );
};

const isLoopbackIpv6 = (hostname: string) => {
  const mappedIpv4 = ipv4FromMappedIpv6(hostname);
  return (
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    Boolean(mappedIpv4 && isLoopbackIpv4(mappedIpv4))
  );
};

const isReservedIpv6 = (hostname: string) => {
  const mappedIpv4 = ipv4FromMappedIpv6(hostname);
  return hostname === "::" || Boolean(mappedIpv4 && isReservedIpv4(mappedIpv4));
};

const isLocalServiceHostname = (hostname: string) => {
  const normalized = normalizeServiceHostname(hostname);
  const family = isIP(normalized);

  if (family === 4) return normalized === "0.0.0.0" || isLoopbackIpv4(normalized);
  if (family === 6) return normalized === "::" || isLoopbackIpv6(normalized);

  return LOCAL_HOSTNAMES.has(normalized) || normalized.endsWith(".localhost");
};

const isPrivateNetworkAddress = (hostname: string) => {
  const normalized = normalizeServiceHostname(hostname);
  const family = isIP(normalized);

  if (family === 4) {
    return isPrivateIpv4(normalized);
  }

  if (family === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
};

const isValidDnsHostname = (hostname: string) =>
  hostname.length <= 253 && VALID_DNS_HOSTNAME_PATTERN.test(hostname);

const isInternalServiceDnsHostname = (hostname: string) => {
  const normalized = normalizeServiceHostname(hostname);
  if (isIP(normalized) || isLocalServiceHostname(normalized) || !isValidDnsHostname(normalized)) {
    return false;
  }

  return (
    !normalized.includes(".") ||
    INTERNAL_SERVICE_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
};

const isPublicHttpsServiceHostname = (hostname: string) => {
  const normalized = normalizeServiceHostname(hostname);
  if (isLocalServiceHostname(normalized)) return false;

  const family = isIP(normalized);
  if (family === 4) return !isPrivateIpv4(normalized) && !isReservedIpv4(normalized);
  if (family === 6) {
    return !isPrivateIpv6(normalized) && !isLoopbackIpv6(normalized) && !isReservedIpv6(normalized);
  }

  return isValidDnsHostname(normalized) && normalized.includes(".");
};

const isPrivateHttpServiceHostname = (hostname: string, publishedRuntime: boolean) => {
  if (isPrivateNetworkAddress(hostname) || isInternalServiceDnsHostname(hostname)) return true;

  return !publishedRuntime && isLocalServiceHostname(hostname);
};

const isAllowedServiceEndpoint = (url: URL, publishedRuntime: boolean) => {
  if (url.protocol === "http:") {
    return isPrivateHttpServiceHostname(url.hostname, publishedRuntime);
  }

  if (url.protocol === "https:") {
    return (
      isPrivateHttpServiceHostname(url.hostname, publishedRuntime) ||
      isPublicHttpsServiceHostname(url.hostname)
    );
  }

  return false;
};

export const parseVideoProcessingServiceUrl = (
  value: unknown,
  { publishedRuntime = isPublishedRuntime() } = {},
): string | null => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > MAX_CONFIGURED_URL_LENGTH ||
    !EXACT_HTTP_SCHEME_SEPARATOR.test(value.trim()) ||
    value.includes("\\") ||
    value.includes("*") ||
    hasControlCharacter(value)
  ) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !isAllowedServiceEndpoint(url, publishedRuntime)
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export const resolveVideoProcessingServiceConfig = (
  env: NodeJS.ProcessEnv = process.env,
): VideoProcessingServiceConfigResolution => {
  const rawUrl = env.VIDEO_PROCESSING_SERVICE_URL?.trim() ?? "";
  const rawApiKey = env.VIDEO_SERVICE_API_KEY?.trim() ?? "";

  if (!rawUrl && !rawApiKey) return { config: null, status: "disabled" };

  const baseUrl = parseVideoProcessingServiceUrl(rawUrl, {
    publishedRuntime: isPublishedRuntime(env.NODE_ENV),
  });
  if (!baseUrl || rawApiKey.length < 32 || rawApiKey.length > 512) {
    return { config: null, status: "invalid" };
  }

  return {
    config: {
      apiKey: rawApiKey,
      baseUrl,
      requestTimeoutMs: parsePositiveInteger(
        env.VIDEO_PROCESSING_SERVICE_REQUEST_TIMEOUT_MS,
        DEFAULT_REQUEST_TIMEOUT_MS,
        { max: 30_000, min: 500 },
      ),
    },
    status: "configured",
  };
};

export const getVideoProcessingServiceConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const resolution = resolveVideoProcessingServiceConfig(env);
  return resolution.status === "configured" ? resolution.config : null;
};
