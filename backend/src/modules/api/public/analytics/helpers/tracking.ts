import type { Request } from "express";
import { parsePublicHttpOrigins } from "@/utils/public-origin";

export type AnalyticsDisplayMode =
  | "browser"
  | "fullscreen"
  | "minimal-ui"
  | "standalone"
  | "unknown";
export type AnalyticsPageKind =
  | "billing"
  | "community"
  | "community_post"
  | "home"
  | "login"
  | "other"
  | "psychologist_profile"
  | "psychologists"
  | "signup";

export type AnalyticsTarget = {
  pageKind: AnalyticsPageKind;
  targetType: string | null;
  targetId: string | null;
};

export type NormalizedTraffic = {
  referrerHost: string | null;
  trafficSource: string;
  trafficMedium: string | null;
};

const MAX_PATH_LENGTH = 512;
const MAX_LABEL_LENGTH = 128;
const DISPLAY_MODES: AnalyticsDisplayMode[] = [
  "browser",
  "standalone",
  "fullscreen",
  "minimal-ui",
  "unknown",
];
const SEARCH_HOSTS: Record<string, string> = {
  "bing.com": "bing",
  "br.search.yahoo.com": "yahoo",
  "duckduckgo.com": "duckduckgo",
  "ecosia.org": "ecosia",
  "google.com": "google",
  "google.com.br": "google",
  "search.yahoo.com": "yahoo",
  "yahoo.com": "yahoo",
};
const SOCIAL_HOSTS: Record<string, string> = {
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "t.co": "x",
  "tiktok.com": "tiktok",
  "twitter.com": "x",
  "x.com": "x",
  "youtube.com": "youtube",
};
const SHARE_HOSTS: Record<string, string> = {
  "api.whatsapp.com": "whatsapp",
  "wa.me": "whatsapp",
  "web.whatsapp.com": "whatsapp",
  "whatsapp.com": "whatsapp",
};

const stripControlCharacters = (value: string, replacement: string) =>
  Array.from(value, (char) => {
    const code = char.charCodeAt(0);

    return code <= 31 || code === 127 ? replacement : char;
  }).join("");

export const sanitizeString = (value: unknown, maxLength = MAX_LABEL_LENGTH): string | null => {
  if (typeof value !== "string") return null;

  const normalized = stripControlCharacters(value, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  return normalized.slice(0, maxLength);
};

export const normalizeAnalyticsSlug = (value: unknown, fallback: string | null = null) => {
  const sanitized = sanitizeString(value, 96);
  if (!sanitized) return fallback;

  const slug = sanitized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

  return slug || fallback;
};

const safeDecodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizePathname = (value: string) => {
  const path = safeDecodePath(value || "/")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);

      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/\/{2,}/g, "/")
    .trim();
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const withoutTrailing = withSlash.length > 1 ? withSlash.replace(/\/+$/g, "") : withSlash;

  return withoutTrailing.slice(0, MAX_PATH_LENGTH) || "/";
};

export const sanitizePath = (value: unknown): string => {
  if (typeof value !== "string") return "/";

  const input = value.trim();
  if (!input) return "/";

  try {
    const parsed =
      input.startsWith("http://") || input.startsWith("https://")
        ? new URL(input)
        : new URL(input, "https://lectum.local");

    return normalizePathname(parsed.pathname);
  } catch {
    return normalizePathname(input.split("#")[0]?.split("?")[0] || "/");
  }
};

export const normalizePathForAggregation = (path: string) => {
  const dynamicSegment = /^(?:[a-z0-9]{16,}|[0-9]{4,}|[0-9a-f]{8}-[0-9a-f-]{13,})$/i;
  const segments = sanitizePath(path)
    .split("/")
    .filter(Boolean)
    .map((segment) => (dynamicSegment.test(segment) ? ":id" : segment));

  return segments.length ? `/${segments.join("/")}` : "/";
};

const getSegments = (path: string) => sanitizePath(path).split("/").filter(Boolean);

const deriveCommunityTarget = (segments: string[]): AnalyticsTarget => {
  const postIndex = Math.max(segments.indexOf("post"), segments.indexOf("publicacao"));

  if (postIndex >= 0 && segments[postIndex + 1]) {
    return {
      pageKind: "community_post",
      targetType: "community_post",
      targetId: segments[postIndex + 1],
    };
  }

  const slug = segments[0] === "app" ? segments[2] : segments[1];
  if (
    slug &&
    !["feed", "publicacao", "suggest", "sugerir", "top-mentors", "top-mentores"].includes(slug)
  ) {
    return {
      pageKind: "community",
      targetType: "community",
      targetId: slug,
    };
  }

  return { pageKind: "community", targetType: null, targetId: null };
};

export const derivePageTarget = (path: string): AnalyticsTarget => {
  const normalizedPath = sanitizePath(path);
  const segments = getSegments(normalizedPath);
  const [first, second, third] = segments;

  if (normalizedPath === "/") return { pageKind: "home", targetType: null, targetId: null };

  if (first === "login" || second === "login") {
    return { pageKind: "login", targetType: null, targetId: null };
  }

  if (
    [first, second, third].some((segment) =>
      ["cadastro", "register", "signup"].includes(segment || ""),
    )
  ) {
    return { pageKind: "signup", targetType: null, targetId: null };
  }

  if (
    segments.includes("assinatura") ||
    segments.includes("billing") ||
    segments.includes("checkout") ||
    segments.includes("pagamento")
  ) {
    return { pageKind: "billing", targetType: null, targetId: null };
  }

  if (first === "psychologists" || first === "psicologos") {
    if (second) {
      return { pageKind: "psychologist_profile", targetType: "psychologist", targetId: second };
    }

    return { pageKind: "psychologists", targetType: null, targetId: null };
  }

  if (first === "app" && (second === "psychologists" || second === "psicologos")) {
    return { pageKind: "psychologists", targetType: null, targetId: null };
  }

  if (first === "app" && (second === "psychologist" || second === "psicologo") && third) {
    return { pageKind: "psychologist_profile", targetType: "psychologist", targetId: third };
  }

  if (
    first === "community" ||
    first === "comunidades" ||
    (first === "app" && (second === "community" || second === "comunidades"))
  ) {
    return deriveCommunityTarget(segments);
  }

  return { pageKind: "other", targetType: null, targetId: null };
};

const parseHost = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return normalizeHost(url.hostname);
  } catch {
    return null;
  }
};

const normalizeHost = (host: string | null | undefined) => {
  const sanitized = sanitizeString(host, 128)?.toLowerCase() || null;
  if (!sanitized) return null;

  return sanitized.replace(/^www\./, "");
};

const hostMatches = (host: string, candidates: Record<string, string>) => {
  for (const [candidate, source] of Object.entries(candidates)) {
    if (host === candidate || host.endsWith(`.${candidate}`)) return source;
  }

  return null;
};

const getInternalHosts = (req: Request) => {
  const hosts = new Set<string>();
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (typeof origin === "string") {
    const originHost = parseHost(origin);
    if (originHost) hosts.add(originHost);
  }

  if (typeof host === "string") {
    const requestHost = normalizeHost(host.split(":")[0]);
    if (requestHost) hosts.add(requestHost);
  }

  for (const envValue of [process.env.WEB_URL, process.env.FRONTEND_URL]) {
    for (const origin of parsePublicHttpOrigins(envValue)) {
      const envHost = parseHost(origin);
      if (envHost) hosts.add(envHost);
    }
  }

  hosts.add("localhost");
  hosts.add("127.0.0.1");

  return hosts;
};

const isInternalReferrer = (host: string | null, req: Request) => {
  if (!host) return false;

  return getInternalHosts(req).has(host);
};

const sourceFromInternalReferrer = (referrer: string | null) => {
  if (!referrer) return "lectum_internal";

  try {
    const target = derivePageTarget(new URL(referrer).pathname);

    if (target.pageKind === "community" || target.pageKind === "community_post") {
      return "lectum_community";
    }

    if (target.pageKind === "psychologist_profile" || target.pageKind === "psychologists") {
      return "lectum_profile";
    }

    if (target.pageKind === "billing") return "lectum_billing";
  } catch {
    // O referrer interno ainda pode ser classificado de forma genérica.
  }

  return "lectum_internal";
};

export const normalizeTraffic = (
  req: Request,
  referrer: unknown,
  utmSource?: unknown,
  utmMedium?: unknown,
): NormalizedTraffic => {
  const normalizedUtmSource = normalizeAnalyticsSlug(utmSource);
  const normalizedUtmMedium = normalizeAnalyticsSlug(utmMedium);

  if (normalizedUtmSource) {
    return {
      referrerHost: parseHost(sanitizeString(referrer, 2048)),
      trafficSource: normalizedUtmSource,
      trafficMedium: normalizedUtmMedium || "campaign",
    };
  }

  const sanitizedReferrer = sanitizeString(referrer, 2048);
  const referrerHost = parseHost(sanitizedReferrer);

  if (!referrerHost) {
    return { referrerHost: null, trafficSource: "direct", trafficMedium: null };
  }

  if (isInternalReferrer(referrerHost, req)) {
    return {
      referrerHost,
      trafficSource: sourceFromInternalReferrer(sanitizedReferrer),
      trafficMedium: "internal",
    };
  }

  const searchSource = hostMatches(referrerHost, SEARCH_HOSTS);
  if (searchSource) return { referrerHost, trafficSource: searchSource, trafficMedium: "search" };

  const socialSource = hostMatches(referrerHost, SOCIAL_HOSTS);
  if (socialSource) return { referrerHost, trafficSource: socialSource, trafficMedium: "social" };

  const shareSource = hostMatches(referrerHost, SHARE_HOSTS);
  if (shareSource) return { referrerHost, trafficSource: shareSource, trafficMedium: "share" };

  return {
    referrerHost,
    trafficSource: normalizeAnalyticsSlug(referrerHost, "referral") || "referral",
    trafficMedium: "referral",
  };
};

export const normalizeDisplayMode = (value: unknown): AnalyticsDisplayMode => {
  if (DISPLAY_MODES.includes(value as AnalyticsDisplayMode)) return value as AnalyticsDisplayMode;

  return "unknown";
};

export const normalizeOccurredAt = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return new Date();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();

  const now = Date.now();
  const maxFuture = now + 5 * 60 * 1000;
  const minPast = now - 30 * 24 * 60 * 60 * 1000;

  if (date.getTime() > maxFuture || date.getTime() < minPast) return new Date();

  return date;
};
