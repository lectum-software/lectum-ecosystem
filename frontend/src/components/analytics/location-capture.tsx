"use client";

import { useEffect, useRef } from "react";
import { useLocationCapture } from "@/api/callers/analytics";
import type { LocationCaptureRequest } from "@/api/req/analytics";
import { useAppSelector } from "@/hooks/redux";

const VISITOR_ID_KEY = "lectum:analytics:visitor-id";
const SESSION_ID_KEY = "lectum:analytics:session-id";
const SESSION_CAPTURED_KEY = "lectum:analytics:location-captured-session";
const LAST_USER_ID_KEY = "lectum:analytics:location-captured-user-id";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: { brand: string; version: string }[];
    mobile?: boolean;
    platform?: string;
  };
};

type DeviceMetadata = Omit<LocationCaptureRequest, "session_id" | "visitor_id">;

const createTrackingId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lectum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const safeGetItem = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
  } catch {
    // Analytics não deve quebrar a experiência caso storage esteja indisponível.
  }
};

const getOrCreateStorageId = (storage: Storage, key: string) => {
  const existingId = safeGetItem(storage, key);
  if (existingId) return existingId;

  const newId = createTrackingId();
  safeSetItem(storage, key, newId);

  return newId;
};

const normalizeViewportDimension = (value: number | undefined) => {
  if (!value || !Number.isFinite(value) || value <= 0) return undefined;

  return Math.min(Math.round(value), 10000);
};

const detectOs = (userAgent: string, platform: string): DeviceMetadata["os"] => {
  const source = `${userAgent} ${platform}`.toLowerCase();

  if (source.includes("android")) return "android";
  if (source.includes("iphone") || source.includes("ipad") || source.includes("ipod")) return "ios";
  if (source.includes("windows")) return "windows";
  if (source.includes("mac")) return "macos";
  if (source.includes("cros")) return "chromeos";
  if (source.includes("linux")) return "linux";

  return "unknown";
};

const detectBrowser = (userAgent: string): DeviceMetadata["browser"] => {
  if (/Edg\//.test(userAgent)) return "edge";
  if (/SamsungBrowser\//.test(userAgent)) return "samsung";
  if (/OPR\/|Opera\//.test(userAgent)) return "opera";
  if (/Firefox\/|FxiOS\//.test(userAgent)) return "firefox";
  if (/Chrome\/|CriOS\/|Chromium\//.test(userAgent)) return "chrome";
  if (/Safari\//.test(userAgent)) return "safari";

  return "unknown";
};

const detectDeviceType = (
  userAgent: string,
  platform: string,
  mobileHint: boolean | undefined,
  viewportWidth: number | undefined,
  maxTouchPoints: number,
): DeviceMetadata["device_type"] => {
  const hasTouch = maxTouchPoints > 1;
  const isIpadLike =
    /iPad/.test(userAgent) || (platform === "MacIntel" && hasTouch && (viewportWidth ?? 0) >= 768);
  const isAndroidTablet = /Android/.test(userAgent) && !/Mobile/.test(userAgent);
  const isTablet =
    isIpadLike ||
    isAndroidTablet ||
    /Tablet|PlayBook|Silk/.test(userAgent) ||
    /Kindle/.test(userAgent);

  if (isTablet) return "tablet";

  const isMobile =
    mobileHint === true ||
    /Mobi|iPhone|iPod|IEMobile|BlackBerry/.test(userAgent) ||
    (/Android/.test(userAgent) && /Mobile/.test(userAgent)) ||
    (hasTouch && typeof viewportWidth === "number" && viewportWidth < 768);

  if (isMobile) return "mobile";
  if (viewportWidth || userAgent || platform) return "desktop";

  return "unknown";
};

const detectDeviceMetadata = (): DeviceMetadata => {
  const navigatorWithHints = window.navigator as NavigatorWithUserAgentData;
  const userAgent = window.navigator.userAgent || "";
  const platform = navigatorWithHints.userAgentData?.platform || window.navigator.platform || "";
  const viewportWidth = normalizeViewportDimension(window.innerWidth);
  const viewportHeight = normalizeViewportDimension(window.innerHeight);

  return {
    device_type: detectDeviceType(
      userAgent,
      platform,
      navigatorWithHints.userAgentData?.mobile,
      viewportWidth,
      window.navigator.maxTouchPoints || 0,
    ),
    os: detectOs(userAgent, platform),
    browser: detectBrowser(userAgent),
    viewport_width: viewportWidth,
    viewport_height: viewportHeight,
  };
};

export const LocationCapture = () => {
  const userId = useAppSelector((state) => state.user?.id ?? null);
  const { mutateAsync } = useLocationCapture();
  const inFlightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visitorId = getOrCreateStorageId(window.localStorage, VISITOR_ID_KEY);
    const sessionId = getOrCreateStorageId(window.sessionStorage, SESSION_ID_KEY);
    const lastUserId = safeGetItem(window.localStorage, LAST_USER_ID_KEY);
    const alreadyCapturedInSession =
      safeGetItem(window.sessionStorage, SESSION_CAPTURED_KEY) === "true";
    const shouldLinkAuthenticatedUser = Boolean(userId && lastUserId !== userId);

    if (alreadyCapturedInSession && !shouldLinkAuthenticatedUser) return;

    const inFlightKey = `${visitorId}:${sessionId}:${userId || "anonymous"}:${
      shouldLinkAuthenticatedUser ? "link" : "session"
    }`;

    if (inFlightKeyRef.current === inFlightKey) return;
    inFlightKeyRef.current = inFlightKey;

    void mutateAsync({
      visitor_id: visitorId,
      session_id: sessionId,
      ...detectDeviceMetadata(),
    })
      .then((response) => {
        safeSetItem(window.sessionStorage, SESSION_CAPTURED_KEY, "true");

        if (userId && response.authenticated) {
          safeSetItem(window.localStorage, LAST_USER_ID_KEY, userId);
        }
      })
      .catch(() => {
        // Falhas de analytics são silenciosas por requisito de privacidade/UX.
      })
      .finally(() => {
        if (inFlightKeyRef.current === inFlightKey) {
          inFlightKeyRef.current = null;
        }
      });
  }, [mutateAsync, userId]);

  return null;
};
