"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { createExperienceController, type ExperienceSdk } from "./experience-controller";
import {
  canCaptureExperience,
  EXPERIENCE_CHANGED,
  isSamePageReelTransition,
} from "./experience-policy";
import { loadExperienceSdk } from "./experience-sdk";
import {
  EXPERIENCE_ENABLED,
  EXPERIENCE_PREVIEW,
  readExperienceChoice,
} from "./use-experience-choice";
import { usePrivacyIdentity } from "./use-identity";

export function ExperienceCapture() {
  const { user, hasToken, ready } = usePrivacyIdentity();
  const userId = user?.id || null;
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const sdk = useRef<Promise<ExperienceSdk> | null>(null);
  const resume = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!EXPERIENCE_ENABLED || !ready || (hasToken && !userId)) return;
    // Without a pre-navigation signal, stopping in a route effect is too late.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    if (!navigation) return;
    let navigating = false;
    let reelFrame = 0;
    const controller = createExperienceController({
      scope: () => {
        if (navigating) return null;
        const choice = readExperienceChoice(userId);
        return canCaptureExperience({
          enabled: EXPERIENCE_ENABLED,
          localPreview: EXPERIENCE_PREVIEW,
          choice,
          url: window.location.href,
          referrer: document.referrer,
        }) && choice
          ? `${userId || "guest"}:${choice.savedAt}:${window.location.href}`
          : null;
      },
      load: () => (sdk.current ??= loadExperienceSdk()),
    });
    const sync = () => {
      void controller.sync();
    };
    const stop = () => controller.dispose();
    const pause = (event: Event) => {
      window.cancelAnimationFrame(reelFrame);
      const destination = (event as Event & { destination?: { url: string } }).destination;
      if (destination?.url === window.location.href) return;
      navigating = true;
      controller.stop();
    };
    resume.current = () => {
      navigating = false;
      sync();
    };
    // Reels preserve Next's internal history state, which can bypass its search hook.
    // The player updates history after committing the active slide.
    const reelChanged = (event: Event) => {
      const from = (event as Event & { from?: { url?: string } }).from?.url;
      const destination = window.location.href;
      if (!from || !isSamePageReelTransition(from, destination)) return;
      window.cancelAnimationFrame(reelFrame);
      reelFrame = window.requestAnimationFrame(() => {
        if (window.location.href !== destination) return;
        navigating = false;
        sync();
      });
    };
    navigation.addEventListener("navigate", pause);
    navigation.addEventListener("currententrychange", reelChanged);
    window.addEventListener("pagehide", stop);
    window.addEventListener(EXPERIENCE_CHANGED, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const timer = window.setInterval(sync, 1000);
    sync();
    return () => {
      stop();
      resume.current = null;
      window.clearInterval(timer);
      window.cancelAnimationFrame(reelFrame);
      navigation.removeEventListener("navigate", pause);
      navigation.removeEventListener("currententrychange", reelChanged);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener(EXPERIENCE_CHANGED, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [userId, hasToken, ready]);
  // Resume after React commits the destination, not during the URL transition.
  useEffect(() => {
    void pathname;
    void search;
    resume.current?.();
  }, [pathname, search]);
  return null;
}
