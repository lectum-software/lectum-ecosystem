"use client";

import { useEffect, useRef, useState } from "react";
import { useLocationCapture } from "@/api/callers/analytics";
import type { LocationCaptureRequest } from "@/api/req/analytics";
import { useAppSelector } from "@/hooks/redux";
import { isAdminViewAsActive } from "@/utils/admin-view-as";
import {
  ANALYTICS_AUTH_LINKED_KEY,
  ANALYTICS_LOCATION_CAPTURED_KEY,
  ANALYTICS_LOCATION_RETRY_AT_KEY,
  ANALYTICS_LOCATION_RETRY_COUNT_KEY,
  ANALYTICS_LOCATION_RETRY_SCOPE_KEY,
} from "@/utils/analytics-session";
import { getBrowserStorage, removeStorageItem } from "@/utils/browser-storage";
import {
  getLocationCaptureRetryDelay,
  LOCATION_CAPTURE_RETRY_DELAYS_MS,
  shouldRememberAuthenticatedLink,
  shouldRememberLocationCapture,
} from "./location-capture-policy";
import { getOrCreateAnalyticsIdentity, safeGetItem, safeSetItem } from "./storage";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: { brand: string; version: string }[];
    mobile?: boolean;
    platform?: string;
  };
};

type DeviceMetadata = Omit<LocationCaptureRequest, "session_id" | "visitor_id">;
type LocationRetryState = {
  count: number;
  nextAt: number;
  scope: string | null;
};

const readNonNegativeInteger = (value: string | null) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const clearLocationRetryStorage = (storage: Storage) => {
  removeStorageItem(storage, ANALYTICS_LOCATION_RETRY_SCOPE_KEY);
  removeStorageItem(storage, ANALYTICS_LOCATION_RETRY_COUNT_KEY);
  removeStorageItem(storage, ANALYTICS_LOCATION_RETRY_AT_KEY);
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
  const retryStateRef = useRef<LocationRetryState>({ count: 0, nextAt: 0, scope: null });
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAdminViewAsActive()) return;

    const identity = getOrCreateAnalyticsIdentity();
    const sessionStorage = getBrowserStorage("sessionStorage");
    if (!identity || !sessionStorage) return;

    const { sessionId, visitorId } = identity;
    const hasLinkedAuthenticatedUser =
      safeGetItem(sessionStorage, ANALYTICS_AUTH_LINKED_KEY) === "true";
    const alreadyCapturedInSession =
      safeGetItem(sessionStorage, ANALYTICS_LOCATION_CAPTURED_KEY) === "true";
    const shouldLinkAuthenticatedUser = Boolean(userId && !hasLinkedAuthenticatedUser);

    if (alreadyCapturedInSession && !shouldLinkAuthenticatedUser) {
      clearLocationRetryStorage(sessionStorage);
      retryStateRef.current = { count: 0, nextAt: 0, scope: null };
      return;
    }

    const retryScope = `${sessionId}:${userId || "anonymous"}`;
    const persistedScope = safeGetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_SCOPE_KEY);
    if (persistedScope !== retryScope && retryStateRef.current.scope !== retryScope) {
      retryStateRef.current = { count: 0, nextAt: 0, scope: retryScope };
      safeSetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_SCOPE_KEY, retryScope);
      safeSetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_COUNT_KEY, "0");
      safeSetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_AT_KEY, "0");
    } else {
      if (retryStateRef.current.scope !== retryScope) {
        retryStateRef.current = { count: 0, nextAt: 0, scope: retryScope };
      }
      if (persistedScope === retryScope) {
        retryStateRef.current.count = Math.max(
          retryStateRef.current.count,
          readNonNegativeInteger(safeGetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_COUNT_KEY)),
        );
        retryStateRef.current.nextAt = Math.max(
          retryStateRef.current.nextAt,
          readNonNegativeInteger(safeGetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_AT_KEY)),
        );
      }
    }

    if (retryStateRef.current.count > LOCATION_CAPTURE_RETRY_DELAYS_MS.length) return;

    if (retryStateRef.current.nextAt > Date.now()) {
      const timer = window.setTimeout(
        () => setRetryVersion((current) => current + 1),
        retryStateRef.current.nextAt - Date.now(),
      );

      return () => window.clearTimeout(timer);
    }

    const inFlightKey = `${visitorId}:${sessionId}:${userId || "anonymous"}:${
      shouldLinkAuthenticatedUser ? "link" : "session"
    }:${retryVersion}`;

    if (inFlightKeyRef.current === inFlightKey) return;
    inFlightKeyRef.current = inFlightKey;
    let cancelled = false;
    let retryTimer: number | null = null;
    const exhaustRetries = () => {
      retryStateRef.current.count = LOCATION_CAPTURE_RETRY_DELAYS_MS.length + 1;
      retryStateRef.current.nextAt = 0;
      safeSetItem(
        sessionStorage,
        ANALYTICS_LOCATION_RETRY_COUNT_KEY,
        String(retryStateRef.current.count),
      );
      safeSetItem(sessionStorage, ANALYTICS_LOCATION_RETRY_AT_KEY, "0");
    };
    const scheduleRetry = () => {
      const delay = getLocationCaptureRetryDelay(retryStateRef.current.count);
      if (delay === null) {
        exhaustRetries();
        return;
      }

      retryStateRef.current.count += 1;
      retryStateRef.current.nextAt = Date.now() + delay;
      safeSetItem(
        sessionStorage,
        ANALYTICS_LOCATION_RETRY_COUNT_KEY,
        String(retryStateRef.current.count),
      );
      safeSetItem(
        sessionStorage,
        ANALYTICS_LOCATION_RETRY_AT_KEY,
        String(retryStateRef.current.nextAt),
      );
      retryTimer = window.setTimeout(() => {
        if (!cancelled) setRetryVersion((current) => current + 1);
      }, delay);
    };

    void mutateAsync({
      visitor_id: visitorId,
      session_id: sessionId,
      ...detectDeviceMetadata(),
    })
      .then((response) => {
        if (cancelled || inFlightKeyRef.current !== inFlightKey) return;

        if (shouldRememberLocationCapture(response)) {
          safeSetItem(sessionStorage, ANALYTICS_LOCATION_CAPTURED_KEY, "true");
        }

        if (userId && shouldRememberAuthenticatedLink(response)) {
          safeSetItem(sessionStorage, ANALYTICS_AUTH_LINKED_KEY, "true");
        }

        if (response.reason === "unavailable") {
          scheduleRetry();
        } else if (shouldRememberLocationCapture(response)) {
          clearLocationRetryStorage(sessionStorage);
          retryStateRef.current = { count: 0, nextAt: 0, scope: null };
        } else {
          exhaustRetries();
        }
      })
      .catch(() => {
        // Falhas de analytics são silenciosas por requisito de privacidade/UX.
        if (!cancelled && inFlightKeyRef.current === inFlightKey) scheduleRetry();
      })
      .finally(() => {
        if (inFlightKeyRef.current === inFlightKey) {
          inFlightKeyRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (inFlightKeyRef.current === inFlightKey) {
        inFlightKeyRef.current = null;
      }
    };
  }, [mutateAsync, retryVersion, userId]);

  return null;
};
