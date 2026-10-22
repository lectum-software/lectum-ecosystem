"use client";

import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { hasVisibleModalLayer } from "@/components/onboarding/modal-layer";
import {
  canShowAutomaticSignup,
  SIGNUP_TIME_KEY,
  trackVisibleNavigation,
} from "@/components/onboarding/navigation-prompt-timing";
import { normalizeTrustedWhatsAppUrl } from "@/utils/external-url";

import {
  createConversionPromptOpener,
  useConversionPromptState,
} from "./progressive-conversion-lifecycle";
import { ProgressiveConversionPrompt } from "./progressive-conversion-prompt";

import {
  type ConversionIntent,
  type ConversionTrigger,
  clearPendingIntent,
  getCurrentReturnTo,
  hasPromptBeenShown,
  isConversionPromptSuppressedPath,
  isPublicDiscoveryPath,
  ProgressiveConversionContext,
  type ProgressiveConversionProviderProps,
  type RequestConversionOptions,
  readPendingIntent,
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
    (whatsappUrl: string) => Boolean(normalizeTrustedWhatsAppUrl(whatsappUrl)),
    [],
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

    return trackVisibleNavigation(SIGNUP_TIME_KEY, (elapsedMs) => {
      if (!hasPromptBeenShown() && canShowAutomaticSignup(elapsedMs) && !hasVisibleModalLayer()) {
        openPrompt("trigger_tempo");
      }
    });
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
