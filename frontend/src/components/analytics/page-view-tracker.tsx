"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useImportantActionTracking, usePageViewTracking } from "@/api/callers/analytics";
import {
  type DisplayMode,
  sendPageViewDurationBeacon,
  updatePageViewDuration,
} from "@/api/req/analytics";
import { useAppSelector } from "@/hooks/redux";
import { isAdminViewAsActive } from "@/utils/admin-view-as";
import { ANALYTICS_ATTRIBUTION_KEY, ANALYTICS_REFERRER_SENT_KEY } from "@/utils/analytics-session";
import { getBrowserStorage } from "@/utils/browser-storage";
import { documentHasUserAttention } from "./attention";
import { getOrCreateAnalyticsIdentity, safeGetItem, safeSetItem } from "./storage";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const MAX_REFERRER_LENGTH = 2048;

type UtmKey = (typeof UTM_KEYS)[number];
type SessionAttribution = Partial<Record<UtmKey, string>>;
type CurrentPageView = {
  accumulatedVisibleMs: number;
  activeStartedAt: number | null;
  id: string;
  visitorId: string;
  sessionId: string;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const getDisplayMode = (): DisplayMode => {
  if (typeof window === "undefined") return "unknown";

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  ) {
    return "standalone";
  }

  if (window.matchMedia("(display-mode: browser)").matches) return "browser";

  return "unknown";
};

const safeReadAttribution = (): SessionAttribution => {
  const storage = getBrowserStorage("sessionStorage");
  if (!storage) return {};

  const value = safeGetItem(storage, ANALYTICS_ATTRIBUTION_KEY);
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as SessionAttribution;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const resolveAttribution = (searchParams: URLSearchParams): SessionAttribution => {
  if (typeof window === "undefined") return {};

  const current: SessionAttribution = {};
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)?.trim();
    if (value) current[key] = value.slice(0, 128);
  }

  if (Object.keys(current).length > 0) {
    safeSetItem(
      getBrowserStorage("sessionStorage"),
      ANALYTICS_ATTRIBUTION_KEY,
      JSON.stringify(current),
    );
    return current;
  }

  return safeReadAttribution();
};

const consumeInitialReferrer = () => {
  const storage = getBrowserStorage("sessionStorage");
  if (!storage || typeof document === "undefined") return undefined;

  if (safeGetItem(storage, ANALYTICS_REFERRER_SENT_KEY) === "true") return undefined;

  safeSetItem(storage, ANALYTICS_REFERRER_SENT_KEY, "true");

  const rawReferrer = document.referrer.trim();
  if (!rawReferrer || rawReferrer.length > MAX_REFERRER_LENGTH) return undefined;

  try {
    const referrer = new URL(rawReferrer);
    if (
      (referrer.protocol !== "http:" && referrer.protocol !== "https:") ||
      referrer.username ||
      referrer.password
    ) {
      return undefined;
    }

    return `${referrer.origin}${referrer.pathname}`;
  } catch {
    return undefined;
  }
};

const buildPathWithSearch = (pathname: string, search: string) => {
  if (!search) return pathname || "/";

  return `${pathname || "/"}?${search}`;
};

const buildSafeAnalyticsPath = (pathname: string, search: string) => {
  const path = pathname || "/";
  if (!search) return path;

  const allowed = new URLSearchParams();
  const params = new URLSearchParams(search);

  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) allowed.set(key, value.slice(0, 128));
  }

  const query = allowed.toString();
  return query ? `${path}?${query}` : path;
};

export const PageViewTracker = () => {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = buildPathWithSearch(pathname, search);
  const analyticsUserKey = useAppSelector((state) => state.user?.id ?? "anonymous");
  const trackingKey = `${routeKey}:${analyticsUserKey}`;
  const { mutateAsync: trackPageView } = usePageViewTracking();
  const { mutateAsync: trackImportantAction } = useImportantActionTracking();
  const currentRef = useRef<CurrentPageView | null>(null);
  const lastRouteKeyRef = useRef<string | null>(null);
  const lastInactiveAtRef = useRef<number | null>(null);

  const flushCurrentDuration = useCallback((keepalive: boolean, finalize: boolean) => {
    const current = currentRef.current;
    if (!current) return;

    const now = Date.now();
    const activeSegmentMs = current.activeStartedAt
      ? Math.max(0, now - current.activeStartedAt)
      : 0;
    const accumulatedVisibleMs = current.accumulatedVisibleMs + activeSegmentMs;

    currentRef.current = finalize
      ? null
      : {
          ...current,
          accumulatedVisibleMs,
          activeStartedAt: null,
        };

    const durationSeconds = Math.max(0, Math.round(accumulatedVisibleMs / 1000));
    if (durationSeconds <= 0) return;

    const body = {
      duration_seconds: durationSeconds,
      occurred_at: new Date().toISOString(),
      session_id: current.sessionId,
      visitor_id: current.visitorId,
    };

    if (keepalive) {
      sendPageViewDurationBeacon(current.id, body);
      return;
    }

    void updatePageViewDuration(current.id, body).catch(() => {
      // Analytics must fail silently.
    });
  }, []);

  const trackPwaAction = useCallback(
    (actionType: "pwa_install_prompt_accepted" | "pwa_installed") => {
      if (isAdminViewAsActive()) return;

      const identity = getOrCreateAnalyticsIdentity();
      if (!identity) return;

      void trackImportantAction({
        action_type: actionType,
        display_mode: getDisplayMode(),
        occurred_at: new Date().toISOString(),
        path: pathname,
        session_id: identity.sessionId,
        visitor_id: identity.visitorId,
      }).catch(() => {
        // Analytics must fail silently.
      });
    },
    [pathname, trackImportantAction],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastRouteKeyRef.current === trackingKey) return;

    flushCurrentDuration(false, true);
    lastRouteKeyRef.current = trackingKey;
    if (pathname === "/auth/admin-view-as" || isAdminViewAsActive()) return;

    const identity = getOrCreateAnalyticsIdentity();
    if (!identity) return;

    const attribution = resolveAttribution(new URLSearchParams(search));
    const startedAt = Date.now();
    const requestKey = trackingKey;

    void trackPageView({
      display_mode: getDisplayMode(),
      occurred_at: new Date(startedAt).toISOString(),
      path: buildSafeAnalyticsPath(pathname, search),
      referrer: consumeInitialReferrer(),
      session_id: identity.sessionId,
      title: document.title || undefined,
      visitor_id: identity.visitorId,
      ...attribution,
    })
      .then((response) => {
        if (!response.id || lastRouteKeyRef.current !== requestKey) return;

        const inactiveAt = lastInactiveAtRef.current;
        const inactiveBeforeResponse = !documentHasUserAttention();
        const accumulatedVisibleMs =
          inactiveBeforeResponse && inactiveAt !== null && inactiveAt >= startedAt
            ? Math.max(0, inactiveAt - startedAt)
            : 0;

        currentRef.current = {
          accumulatedVisibleMs,
          activeStartedAt: inactiveBeforeResponse ? null : startedAt,
          id: response.id,
          sessionId: identity.sessionId,
          visitorId: identity.visitorId,
        };

        if (inactiveBeforeResponse) {
          flushCurrentDuration(true, false);
        }
      })
      .catch(() => {
        // Analytics must fail silently.
      });
  }, [flushCurrentDuration, pathname, search, trackPageView, trackingKey]);

  useEffect(() => {
    const pauseCurrentDuration = () => {
      lastInactiveAtRef.current = Date.now();
      flushCurrentDuration(true, false);
    };
    const resumeCurrentDuration = () => {
      if (!documentHasUserAttention()) return;

      lastInactiveAtRef.current = null;
      const current = currentRef.current;
      if (!current || current.activeStartedAt !== null) return;

      currentRef.current = {
        ...current,
        activeStartedAt: Date.now(),
      };
    };
    const handleVisibilityChange = () => {
      if (documentHasUserAttention()) resumeCurrentDuration();
      else pauseCurrentDuration();
    };
    const handleFocus = () => resumeCurrentDuration();
    const handleBlur = () => pauseCurrentDuration();
    const handlePageHide = () => pauseCurrentDuration();
    const handleAppInstalled = () => trackPwaAction("pwa_installed");
    const handlePromptAccepted = () => trackPwaAction("pwa_install_prompt_accepted");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("lectum:pwa-install-prompt-accepted", handlePromptAccepted);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("lectum:pwa-install-prompt-accepted", handlePromptAccepted);
      flushCurrentDuration(true, true);
    };
  }, [flushCurrentDuration, trackPwaAction]);

  return null;
};
