"use client";

import { useCallback, useEffect } from "react";
import { SWIPE_HINT_NUDGE_DURATION_MS } from "../modules/video-analytics";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";

export const usePsychologistsOnboarding = ({
  directory,
}: {
  directory: PsychologistsDirectory;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    accountTips,
    accountTipsUserId,
    activePsychologistIndex,
    didLongPressRef,
    didMoveBeyondLongPressToleranceRef,
    didMoveDuringPressRef,
    feedContainerRef,
    hasLoadedSwipeHintPreference,
    hasPersistedMySearchTipSeenRef,
    hasPersistedSwipeHintSeenRef,
    hasPersistedWhatsappTipSeenRef,
    hasPlayedSwipeNudgeRef,
    hasSeenSwipeHint,
    hasShownInitialSwipeHintRef,
    hasShownOnboardingTipThisVisitRef,
    hasSyncedSwipeHintPreferenceRef,
    isSearchModeActiveRef,
    isVideoProgressSeekingRef,
    lastSearchParamsStringRef,
    longPressTimeoutRef,
    metrics,
    pointerStartRef,
    searchParamsString,
    setActiveOnboardingTip,
    setActivePsychologistIndex,
    setHasLoadedSwipeHintPreference,
    setHasSeenSwipeHint,
    setIsLongPressing,
    setIsSearchFocused,
    setIsUiHidden,
    setIsVideoProgressSeeking,
    setShouldNudgeSwipeCard,
    setShowSwipeHint,
    shouldResumeVideoAfterSearchRef,
    shouldShowPatientDiscoveryActionTips,
    suppressNextTapRef,
    swipeHintNudgeTimeoutRef,
    tapTimeoutRef,
    videoSeekPreviewRatioRef,
    wasVideoPlayingBeforeProgressScrubRef,
  } = setup;

  const { canSwipeBetweenPsychologists, errorMessage, psychologists, showInitialLoading } =
    directory;

  const clearSwipeHintTimers = useCallback(() => {
    if (swipeHintNudgeTimeoutRef.current) {
      window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      swipeHintNudgeTimeoutRef.current = null;
    }
  }, [swipeHintNudgeTimeoutRef]);

  const showSwipeHintUntilNavigation = useCallback(
    (options?: { nudge?: boolean }) => {
      setShowSwipeHint(true);

      if (options?.nudge && !hasPlayedSwipeNudgeRef.current) {
        hasPlayedSwipeNudgeRef.current = true;
        setShouldNudgeSwipeCard(true);

        if (swipeHintNudgeTimeoutRef.current) {
          window.clearTimeout(swipeHintNudgeTimeoutRef.current);
        }

        swipeHintNudgeTimeoutRef.current = window.setTimeout(() => {
          setShouldNudgeSwipeCard(false);
          swipeHintNudgeTimeoutRef.current = null;
        }, SWIPE_HINT_NUDGE_DURATION_MS);
      }
    },
    [hasPlayedSwipeNudgeRef, setShouldNudgeSwipeCard, setShowSwipeHint, swipeHintNudgeTimeoutRef],
  );

  const registerSwipeHintInteraction = useCallback(() => {
    if (swipeHintNudgeTimeoutRef.current) {
      window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      swipeHintNudgeTimeoutRef.current = null;
    }

    setShouldNudgeSwipeCard(false);
  }, [setShouldNudgeSwipeCard, swipeHintNudgeTimeoutRef]);

  const persistSwipeHintSeen = useCallback(() => {
    if (
      hasPersistedSwipeHintSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_discover_psychologists_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedSwipeHintSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_discover_psychologists_tip: true,
      },
      {
        onError: () => {
          hasPersistedSwipeHintSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_discover_psychologists_tip,
    accountTips.updateOnboardingTips,
    hasPersistedSwipeHintSeenRef,
  ]);

  const persistMySearchTipSeen = useCallback(() => {
    if (
      !shouldShowPatientDiscoveryActionTips ||
      !accountTipsUserId ||
      hasPersistedMySearchTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologists_my_search_tip
    ) {
      return;
    }

    hasPersistedMySearchTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologists_my_search_tip: true,
      },
      {
        onError: () => {
          hasPersistedMySearchTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologists_my_search_tip,
    accountTips.updateOnboardingTips,
    accountTipsUserId,
    hasPersistedMySearchTipSeenRef,
    shouldShowPatientDiscoveryActionTips,
  ]);

  const persistWhatsappTipSeen = useCallback(() => {
    if (
      !shouldShowPatientDiscoveryActionTips ||
      !accountTipsUserId ||
      hasPersistedWhatsappTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologist_whatsapp_tip
    ) {
      return;
    }

    hasPersistedWhatsappTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologist_whatsapp_tip: true,
      },
      {
        onError: () => {
          hasPersistedWhatsappTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologist_whatsapp_tip,
    accountTips.updateOnboardingTips,
    accountTipsUserId,
    hasPersistedWhatsappTipSeenRef,
    shouldShowPatientDiscoveryActionTips,
  ]);

  const markSwipeHintSeen = useCallback(() => {
    clearSwipeHintTimers();
    setShowSwipeHint(false);
    setShouldNudgeSwipeCard(false);
    setHasSeenSwipeHint(true);
    persistSwipeHintSeen();
  }, [
    clearSwipeHintTimers,
    persistSwipeHintSeen,
    setHasSeenSwipeHint,
    setShouldNudgeSwipeCard,
    setShowSwipeHint,
  ]);

  const resetVideoInteractionState = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    suppressNextTapRef.current = false;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    didMoveBeyondLongPressToleranceRef.current = false;
    isSearchModeActiveRef.current = false;
    shouldResumeVideoAfterSearchRef.current = false;
    pointerStartRef.current = null;

    setIsUiHidden(false);
    setIsLongPressing(false);
    setIsSearchFocused(false);
    setIsVideoProgressSeeking(false);
    isVideoProgressSeekingRef.current = false;
    wasVideoPlayingBeforeProgressScrubRef.current = false;
    videoSeekPreviewRatioRef.current = null;
  }, [
    didLongPressRef,
    didMoveBeyondLongPressToleranceRef,
    didMoveDuringPressRef,
    isSearchModeActiveRef,
    isVideoProgressSeekingRef,
    longPressTimeoutRef,
    pointerStartRef,
    setIsLongPressing,
    setIsSearchFocused,
    setIsUiHidden,
    setIsVideoProgressSeeking,
    shouldResumeVideoAfterSearchRef,
    suppressNextTapRef,
    tapTimeoutRef,
    videoSeekPreviewRatioRef,
    wasVideoPlayingBeforeProgressScrubRef,
  ]);

  useEffect(() => {
    return () => {
      resetVideoInteractionState();
      clearSwipeHintTimers();
    };
  }, [clearSwipeHintTimers, resetVideoInteractionState]);

  useEffect(() => {
    if (typeof document === "undefined" || !metrics.isDesktopLayout) return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [metrics.isDesktopLayout]);

  useEffect(() => {
    hasSyncedSwipeHintPreferenceRef.current = false;
    hasPersistedSwipeHintSeenRef.current = false;
    hasPersistedMySearchTipSeenRef.current = false;
    hasPersistedWhatsappTipSeenRef.current = false;
    hasShownInitialSwipeHintRef.current = false;
    hasShownOnboardingTipThisVisitRef.current = false;
    hasPlayedSwipeNudgeRef.current = false;
    clearSwipeHintTimers();

    const frame = window.requestAnimationFrame(() => {
      setActiveOnboardingTip(null);
      setShowSwipeHint(false);
      setShouldNudgeSwipeCard(false);
      setHasSeenSwipeHint(true);
      setHasLoadedSwipeHintPreference(false);
    });

    if (!accountTipsUserId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [
    accountTipsUserId,
    clearSwipeHintTimers,
    hasPersistedMySearchTipSeenRef,
    hasPersistedSwipeHintSeenRef,
    hasPersistedWhatsappTipSeenRef,
    hasPlayedSwipeNudgeRef,
    hasShownInitialSwipeHintRef,
    hasShownOnboardingTipThisVisitRef,
    hasSyncedSwipeHintPreferenceRef,
    setActiveOnboardingTip,
    setHasLoadedSwipeHintPreference,
    setHasSeenSwipeHint,
    setShouldNudgeSwipeCard,
    setShowSwipeHint,
  ]);

  useEffect(() => {
    if (hasSyncedSwipeHintPreferenceRef.current) return;
    if (accountTips.onboardingTips.isPending) return;

    hasSyncedSwipeHintPreferenceRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      if (!accountTips.onboardingTips.isSuccess) {
        setHasSeenSwipeHint(true);
        setHasLoadedSwipeHintPreference(true);
        return;
      }

      setHasSeenSwipeHint(
        Boolean(accountTips.onboardingTips.data.has_seen_discover_psychologists_tip),
      );
      setHasLoadedSwipeHintPreference(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
    hasSyncedSwipeHintPreferenceRef,
    setHasLoadedSwipeHintPreference,
    setHasSeenSwipeHint,
  ]);

  useEffect(() => {
    if (
      !hasLoadedSwipeHintPreference ||
      hasSeenSwipeHint ||
      !canSwipeBetweenPsychologists ||
      showInitialLoading ||
      errorMessage ||
      hasShownInitialSwipeHintRef.current
    ) {
      return;
    }

    hasShownInitialSwipeHintRef.current = true;
    hasShownOnboardingTipThisVisitRef.current = true;
    showSwipeHintUntilNavigation({ nudge: true });
    persistSwipeHintSeen();
  }, [
    canSwipeBetweenPsychologists,
    errorMessage,
    hasLoadedSwipeHintPreference,
    hasSeenSwipeHint,
    hasShownInitialSwipeHintRef,
    hasShownOnboardingTipThisVisitRef,
    persistSwipeHintSeen,
    showInitialLoading,
    showSwipeHintUntilNavigation,
  ]);

  useEffect(() => {
    if (lastSearchParamsStringRef.current === searchParamsString) return;

    lastSearchParamsStringRef.current = searchParamsString;
    const frame = window.requestAnimationFrame(() => {
      setActivePsychologistIndex(0);
      resetVideoInteractionState();
      feedContainerRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    feedContainerRef,
    lastSearchParamsStringRef,
    resetVideoInteractionState,
    searchParamsString,
    setActivePsychologistIndex,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (psychologists.length === 0) {
        setActivePsychologistIndex(0);
        return;
      }

      if (activePsychologistIndex >= psychologists.length) {
        setActivePsychologistIndex(psychologists.length - 1);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activePsychologistIndex, psychologists.length, setActivePsychologistIndex]);

  return {
    markSwipeHintSeen,
    persistMySearchTipSeen,
    persistWhatsappTipSeen,
    registerSwipeHintInteraction,
    resetVideoInteractionState,
  };
};

export type PsychologistsOnboarding = ReturnType<typeof usePsychologistsOnboarding>;
