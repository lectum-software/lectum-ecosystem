import { isIP } from "node:net";
import { subHours } from "date-fns";
import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { getJwtSecret, JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import {
  getUserJwtTtlSeconds,
  isTrustProxyEnabled,
  parsePositiveInteger,
} from "@/utils/runtime-config";
import { parseSafeExternalHttpsUrl } from "@/utils/safe-external-url";
import { getUserRequestToken } from "@/utils/user-auth-cookie";
import type {
  ILocationCaptureDTO,
  LocationCaptureResult,
  LocationResolution,
} from "../DTOs/ILocationCaptureDTO";
import { LocationCaptureRepository } from "../repositories/LocationCaptureRepository";
import {
  hasLocationCity,
  isMoreSpecificLocation,
  preferMostSpecificLocation,
} from "./location-resolution";
import { buildLocationCaptureResult } from "./response";

type RequestHeaders = Request["headers"];

type IpGeolocationProviderResponse = {
  city?: unknown;
  region?: unknown;
  region_code?: unknown;
  country?: unknown;
  country_code?: unknown;
  country_name?: unknown;
  confidence?: unknown;
  accuracy_radius?: unknown;
  error?: unknown;
  reason?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type AuthPayload = JwtPayload & {
  id?: string;
  email?: string;
  device_id?: string;
};

const LOCATION_CAPTURE_WINDOW_HOURS = 24;
const DEFAULT_PROVIDER_ENDPOINT = "https://ipapi.co/{ip}/json/";
const PRIVATE_IPV6_PREFIXES = ["fc", "fd", "fe80"];

const getHeaderValue = (headers: RequestHeaders, names: string[]): string | null => {
  for (const name of names) {
    const value = headers[name.toLowerCase()];

    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) return first;
      continue;
    }

    if (typeof value === "string" && value.trim()) return value;
  }

  return null;
};

const decodeHeaderValue = (value: string | null): string | null => {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === "unknown") return null;

  try {
    return decodeURIComponent(normalized.replace(/\+/g, "%20"));
  } catch {
    return normalized;
  }
};

const normalizeIp = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const normalized = value
    .trim()
    .replace(/^::ffff:/, "")
    .replace(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/, "$1");

  if (!normalized || normalized.toLowerCase() === "unknown" || !isIP(normalized)) return null;

  return normalized;
};

const isPrivateIPv4 = (ip: string) => {
  const octets = ip.split(".").map((octet) => Number(octet));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) return false;

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 0
  );
};

const isPrivateIp = (ip: string) => {
  const family = isIP(ip);

  if (family === 4) return isPrivateIPv4(ip);

  const normalized = ip.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    PRIVATE_IPV6_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
};

const extractClientIp = (req: Request): string | null => {
  const trustProxy = isTrustProxyEnabled();
  const forwardedFor = trustProxy ? getHeaderValue(req.headers, ["x-forwarded-for"]) : null;
  const forwardedCandidates = trustProxy
    ? [
        getHeaderValue(req.headers, ["cf-connecting-ip"]),
        getHeaderValue(req.headers, ["x-real-ip"]),
        ...(forwardedFor ? forwardedFor.split(",") : []),
      ]
    : [];
  const candidates = [req.ip, ...forwardedCandidates, req.socket.remoteAddress];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip && !isPrivateIp(ip)) return ip;
  }

  return null;
};

const stringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();

  return normalized ? normalized : null;
};

const numberOrNull = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;

  return value;
};

const resolveLocationFromProxyHeaders = (headers: RequestHeaders): LocationResolution | null => {
  const city = decodeHeaderValue(
    getHeaderValue(headers, ["x-vercel-ip-city", "cf-ipcity", "x-appengine-city"]),
  );
  const state = decodeHeaderValue(
    getHeaderValue(headers, [
      "x-vercel-ip-country-region",
      "cf-region-code",
      "cf-region",
      "x-appengine-region",
    ]),
  );
  const country = decodeHeaderValue(
    getHeaderValue(headers, ["x-vercel-ip-country", "cf-ipcountry", "x-appengine-country"]),
  );

  if (!city && !state && !country) return null;

  return {
    city,
    state,
    country,
    source: "ip",
    confidence: null,
    provider: "proxy-headers",
  };
};

const buildProviderUrl = (ip: string) => {
  const endpoint = process.env.IP_GEOLOCATION_ENDPOINT || DEFAULT_PROVIDER_ENDPOINT;
  const token = process.env.IP_GEOLOCATION_TOKEN || "";

  const resolvedEndpoint = endpoint
    .replace("{ip}", encodeURIComponent(ip))
    .replace("{token}", encodeURIComponent(token));

  return parseSafeExternalHttpsUrl(resolvedEndpoint)?.toString() ?? null;
};

const resolveConfidence = (payload: IpGeolocationProviderResponse) => {
  const explicitConfidence = numberOrNull(payload.confidence);
  if (explicitConfidence !== null) return explicitConfidence;

  const accuracyRadius = numberOrNull(payload.accuracy_radius);
  if (accuracyRadius === null) return null;

  return Math.max(0, 1 - Math.min(accuracyRadius, 500) / 500);
};

const resolveLocationFromProvider = async (ip: string): Promise<LocationResolution | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    parsePositiveInteger(process.env.IP_GEOLOCATION_TIMEOUT_MS, 2500, { max: 10_000 }),
  );

  try {
    const providerUrl = buildProviderUrl(ip);
    if (!providerUrl) return null;

    const response = await fetch(providerUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LectumAnalytics/1.0",
      },
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as IpGeolocationProviderResponse;

    if (payload.error) return null;

    const city = stringOrNull(payload.city);
    const state = stringOrNull(payload.region_code) ?? stringOrNull(payload.region);
    const country =
      stringOrNull(payload.country_code) ??
      stringOrNull(payload.country) ??
      stringOrNull(payload.country_name);

    if (!city && !state && !country) return null;

    return {
      city,
      state,
      country,
      source: "ip",
      confidence: resolveConfidence(payload),
      provider: process.env.IP_GEOLOCATION_PROVIDER || "ipapi",
    };
  } catch {
    console.warn("[analytics] Falha silenciosa na geolocalização por IP.", {
      name: "IpGeolocationError",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const resolveAuthenticatedUserId = async (req: Request): Promise<string | null> => {
  const token = getUserRequestToken(req);
  const deviceId = getHeaderValue(req.headers, ["x-device"]);
  if (!token || !deviceId) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      maxAge: getUserJwtTtlSeconds(),
    }) as AuthPayload;

    if (!payload.email || !payload.id || payload.device_id !== deviceId) return null;

    const user = await prisma.user.findFirst({
      where: {
        id: payload.id,
        email: payload.email,
        active: true,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!user) return null;

    const tokenRecord = await prisma.user_token.findFirst({
      where: {
        user_id: user.id,
        device_id: deviceId,
        token,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    return tokenRecord ? user.id : null;
  } catch {
    return null;
  }
};

const resolveLocation = async (req: Request): Promise<LocationResolution | null> => {
  const headerLocation = isTrustProxyEnabled()
    ? resolveLocationFromProxyHeaders(req.headers)
    : null;
  if (hasLocationCity(headerLocation)) return headerLocation;

  const ip = extractClientIp(req);
  if (!ip) return headerLocation;

  const providerLocation = await resolveLocationFromProvider(ip);

  return preferMostSpecificLocation(headerLocation, providerLocation);
};

export default async (req: Request) => {
  const data = req as Request & ILocationCaptureDTO;
  const repository = new LocationCaptureRepository();
  const visitorId = data.b.visitor_id;
  const sessionId = data.b.session_id || null;
  const userId = await resolveAuthenticatedUserId(req);

  const storedSession = sessionId
    ? await repository.upsertSession({
        visitorId,
        sessionId,
        userId,
        deviceType: data.b.device_type,
        os: data.b.os,
        browser: data.b.browser,
        viewportWidth: data.b.viewport_width,
        viewportHeight: data.b.viewport_height,
      })
    : null;
  let linked = false;

  if (sessionId && !storedSession) {
    const result: LocationCaptureResult = buildLocationCaptureResult({
      authenticated: Boolean(userId),
      captured: false,
      linked: false,
      reason: "unavailable",
    });

    return {
      status: 200,
      ...msg("location_capture_skipped", {}),
      data: result,
    };
  }

  if (userId && storedSession) {
    const [linkedLocations, linkedSessions] = await Promise.all([
      repository.linkVisitorToUser(visitorId, userId),
      repository.linkSessionsToUser(visitorId, userId),
    ]);

    linked = linkedLocations > 0 || linkedSessions > 0;
  }

  const since = subHours(new Date(), LOCATION_CAPTURE_WINDOW_HOURS);
  const recentLocation = await repository.findRecent({ visitorId, userId, since });

  if (hasLocationCity(recentLocation)) {
    const result: LocationCaptureResult = buildLocationCaptureResult({
      captured: false,
      linked,
      authenticated: Boolean(userId),
      reason: "frequency",
    });

    return {
      status: 200,
      ...msg("location_capture_skipped", {}),
      data: result,
    };
  }

  const location = await resolveLocation(req);

  if (!location) {
    const result: LocationCaptureResult = buildLocationCaptureResult({
      captured: false,
      linked,
      authenticated: Boolean(userId),
      reason: "unavailable",
    });

    return {
      status: 200,
      ...msg("location_capture_skipped", {}),
      data: result,
    };
  }

  if (!isMoreSpecificLocation(location, recentLocation)) {
    const result: LocationCaptureResult = buildLocationCaptureResult({
      captured: false,
      linked,
      authenticated: Boolean(userId),
      reason: "frequency",
    });

    return {
      status: 200,
      ...msg("location_capture_skipped", {}),
      data: result,
    };
  }

  await repository.store({
    visitorId,
    sessionId,
    userId,
    city: location.city,
    state: location.state,
    country: location.country,
    source: location.source,
    confidence: location.confidence,
    provider: location.provider,
  });

  const result: LocationCaptureResult = buildLocationCaptureResult({
    captured: true,
    linked,
    authenticated: Boolean(userId),
  });

  return {
    status: 200,
    ...msg("location_capture_success", {}),
    data: result,
  };
};
