import { isIP } from "node:net";
import { isPublishedRuntime, parsePositiveInteger } from "@/utils/runtime-config";

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MAX_CONFIGURED_URL_LENGTH = 2_048;
const EXACT_HTTP_SCHEME_SEPARATOR = /^https?:\/\/[^/\\]/i;

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

const isPrivateServiceHostname = (hostname: string, publishedRuntime: boolean) => {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  const family = isIP(normalized);

  if (family === 4) {
    if (isPrivateIpv4(normalized)) return true;
    return !publishedRuntime && /^127(?:\.\d{1,3}){3}$/.test(normalized);
  }

  if (family === 6) {
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    return !publishedRuntime && normalized === "::1";
  }

  return !publishedRuntime && (normalized === "localhost" || normalized.endsWith(".localhost"));
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
      !isPrivateServiceHostname(url.hostname, publishedRuntime)
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
