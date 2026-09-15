"use client";

import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { normalizeTrustedWhatsAppUrl } from "@/utils/external-url";

import {
  createConversionPromptOpener,
  useConversionPromptState,
} from "./progressive-conversion-lifecycle";
import { ProgressiveConversionPrompt } from "./progressive-conversion-prompt";

import {
  addToSessionSet,
  type ConversionIntent,
  type ConversionTrigger,
  clearPendingIntent,
  getCurrentReturnTo,
  getPathSegments,
  hasPromptBeenShown,
  isCommunityDetailPath,
  isCommunityPostPath,
  isConversionPromptSuppressedPath,
  isPsychologistProfilePath,
  isPublicDiscoveryPath,
  isPublicPsychologistsPath,
  NAVIGATION_SECONDS_KEY,
  OPENED_POSTS_KEY,
  PROFILE_IDS_KEY,
  ProgressiveConversionContext,
  type ProgressiveConversionProviderProps,
  type RequestConversionOptions,
  readNumber,
  readPendingIntent,
  WHATSAPP_CLICK_COUNT_KEY,
  writeNumber,
} from "./progressive-conversion-state";

export const ProgressiveConversionProvider = ({
  children,
  isAuthenticated,
  pathname,
}: ProgressiveConversionProviderProps) => {
  const router = useRouter();
  const [prompt, setPrompt] = useConversionPromptState(isAuthenticated);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const openPrompt = useCallback(
    (trigger: ConversionTrigger, intent?: ConversionIntent) =>
      createConversionPromptOpener(pathnameRef, isAuthenticatedRef, setPrompt)(trigger, intent),
    [setPrompt],
  );

  const requestConversion = useCallback(
    (trigger: ConversionTrigger, options?: RequestConversionOptions) => {
      if (isAuthenticated) return true;

      const intent = options?.intent
        ? {
            ...options.intent,
            createdAt: new Date().toISOString(),
            returnTo: options.intent.returnTo ?? getCurrentReturnTo(),
            trigger,
          }
        : undefined;

      return openPrompt(trigger, intent);
    },
    [isAuthenticated, openPrompt],
  );

  const requestWhatsAppAccess = useCallback(
    (whatsappUrl: string, returnTo?: string) => {
      if (isAuthenticated) return true;
      const trustedUrl = normalizeTrustedWhatsAppUrl(whatsappUrl);
      if (!trustedUrl) return false;
      const nextCount = readNumber(WHATSAPP_CLICK_COUNT_KEY) + 1;
      writeNumber(WHATSAPP_CLICK_COUNT_KEY, nextCount);
      if (isPublicPsychologistsPath(pathnameRef.current)) return true;

      if (nextCount < 2 || hasPromptBeenShown()) return true;

      return requestConversion("trigger_whatsapp", {
        intent: {
          payload: {
            whatsappUrl: trustedUrl,
          },
          returnTo: returnTo ?? getCurrentReturnTo(),
          type: "open_whatsapp",
        },
      });
    },
    [isAuthenticated, requestConversion],
  );

  const consumePendingIntent = useCallback((predicate?: (intent: ConversionIntent) => boolean) => {
    const intent = readPendingIntent();

    if (!intent) return null;
    if (predicate && !predicate(intent)) return null;

    clearPendingIntent();

    return intent;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intent = readPendingIntent();
    if (intent?.type !== "open_whatsapp") return;

    clearPendingIntent();

    const whatsappUrl = normalizeTrustedWhatsAppUrl(String(intent.payload?.whatsappUrl ?? ""));
    if (!whatsappUrl) return;

    window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 250);
  }, [isAuthenticated]);

  useEffect(() => {
    if (
      isAuthenticated ||
      hasPromptBeenShown() ||
      !isPublicDiscoveryPath(pathname) ||
      isConversionPromptSuppressedPath(pathname)
    ) {
      return;
    }

    let previousTick = Date.now();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        previousTick = Date.now();

        return;
      }

      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - previousTick) / 1000);
      previousTick = now;

      const nextSeconds = readNumber(NAVIGATION_SECONDS_KEY) + elapsedSeconds;
      writeNumber(NAVIGATION_SECONDS_KEY, nextSeconds);

      if (nextSeconds >= 90) {
        window.clearInterval(interval);
        openPrompt("trigger_tempo");
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (isAuthenticated || hasPromptBeenShown()) return;
    const timeouts: number[] = [];

    if (isPsychologistProfilePath(pathname)) {
      const psychologistId = getPathSegments(pathname)[1];
      const count = addToSessionSet(PROFILE_IDS_KEY, psychologistId);

      if (count >= 3) {
        timeouts.push(window.setTimeout(() => openPrompt("trigger_psicologos"), 0));
      }
    }

    if (isCommunityPostPath(pathname)) {
      const segments = getPathSegments(pathname);
      const postKey = `${segments[1]}:${segments[3]}`;
      const count = addToSessionSet(OPENED_POSTS_KEY, postKey);

      if (count >= 3) {
        timeouts.push(window.setTimeout(() => openPrompt("trigger_comunidade"), 0));
      }
    }
    return () => {
      timeouts.forEach((timeout) => {
        window.clearTimeout(timeout);
      });
    };
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (isAuthenticated || hasPromptBeenShown() || !isCommunityDetailPath(pathname)) return;

    const timeout = window.setTimeout(() => {
      openPrompt("trigger_comunidade");
    }, 60_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  useEffect(() => {
    if (
      isAuthenticated ||
      hasPromptBeenShown() ||
      (!isCommunityDetailPath(pathname) && !isCommunityPostPath(pathname))
    ) {
      return;
    }

    const onScroll = () => {
      if (hasPromptBeenShown()) return;

      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const progress =
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

      if (progress >= 0.75) {
        window.removeEventListener("scroll", onScroll);
        openPrompt("trigger_scroll");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const timeout = window.setTimeout(onScroll, 250);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isAuthenticated, openPrompt, pathname]);

  const closePrompt = () => {
    setPrompt(null);
  };

  const startSignup = () => {
    const returnTo = prompt?.intent?.returnTo ?? getCurrentReturnTo();
    setPrompt(null);
    router.push(`/auth/profile-selection?redirectTo=${encodeURIComponent(returnTo)}`);
  };

  const startLogin = () => {
    const returnTo = prompt?.intent?.returnTo ?? getCurrentReturnTo();
    setPrompt(null);
    router.push(`/auth/login?redirectTo=${encodeURIComponent(returnTo)}`);
  };

  const value = useMemo(
    () => ({
      consumePendingIntent,
      isAuthenticated,
      requestConversion,
      requestWhatsAppAccess,
    }),
    [consumePendingIntent, isAuthenticated, requestConversion, requestWhatsAppAccess],
  );

  return (
    <ProgressiveConversionContext.Provider value={value}>
      {children}
      <ProgressiveConversionPrompt
        prompt={prompt}
        isAuthenticated={isAuthenticated}
        closePrompt={closePrompt}
        startSignup={startSignup}
        startLogin={startLogin}
      />
    </ProgressiveConversionContext.Provider>
  );
};

export const useProgressiveConversion = () => useContext(ProgressiveConversionContext);

export type { ConversionIntent, ConversionTrigger } from "./progressive-conversion-state";
