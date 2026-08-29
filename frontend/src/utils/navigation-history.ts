"use client";

import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

type NavigationRouter = {
  back: () => void;
  push: (href: string) => void;
};

type BrowserHistoryState = {
  idx?: number;
};

const APP_NAVIGATION_HISTORY_KEY = "lectum.appNavigationHistory";
const APP_NAVIGATION_HISTORY_LIMIT = 25;

const getCurrentAppHref = () => {
  if (typeof window === "undefined") return null;

  return window.location.pathname;
};

const readAppNavigationHistory = () => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(APP_NAVIGATION_HISTORY_KEY) ?? "[]",
    ) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const writeAppNavigationHistory = (history: string[]) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      APP_NAVIGATION_HISTORY_KEY,
      JSON.stringify(history.slice(-APP_NAVIGATION_HISTORY_LIMIT)),
    );
  } catch {
    // If storage is unavailable, the browser history fallback remains in use.
  }
};

const getPreviousAppHref = () => {
  const currentHref = getCurrentAppHref();
  if (!currentHref) return null;

  const history = readAppNavigationHistory();
  const normalizedHistory = [...history];

  while (
    normalizedHistory.length > 0 &&
    normalizedHistory[normalizedHistory.length - 1] === currentHref
  ) {
    normalizedHistory.pop();
  }

  return normalizedHistory[normalizedHistory.length - 1] ?? null;
};

export const getPreviousAppNavigationHref = () => getPreviousAppHref();

const hasSameOriginReferrer = () => {
  if (typeof window === "undefined" || !document.referrer) return false;

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
};

export const canNavigateBackInApp = () => {
  if (typeof window === "undefined" || window.history.length <= 1) return false;

  if (getPreviousAppHref()) return true;

  const state = window.history.state as BrowserHistoryState | null;

  if (typeof state?.idx === "number") {
    return state.idx > 0;
  }

  return hasSameOriginReferrer();
};

export const navigateBackWithFallback = (
  router: NavigationRouter,
  fallbackHref = "/comunidades",
) => {
  if (canNavigateBackInApp()) {
    const currentHref = getCurrentAppHref();

    if (currentHref) {
      const history = readAppNavigationHistory();
      let lastCurrentIndex = -1;

      for (let index = history.length - 1; index >= 0; index -= 1) {
        if (history[index] === currentHref) {
          lastCurrentIndex = index;
          break;
        }
      }

      if (lastCurrentIndex >= 0) {
        writeAppNavigationHistory(history.slice(0, lastCurrentIndex));
      }
    }

    router.back();
    return;
  }

  router.push(normalizeSafeInternalRedirect(fallbackHref, "/comunidades") || "/comunidades");
};

export const recordAppNavigationPoint = (href?: string) => {
  const currentHref = normalizeSafeInternalRedirect(href ?? getCurrentAppHref());
  if (!currentHref) return;

  const history = readAppNavigationHistory();
  const lastHref = history[history.length - 1];

  if (lastHref === currentHref) return;

  writeAppNavigationHistory([...history, currentHref]);
};
