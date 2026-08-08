"use client";

import { useEffect } from "react";
import type { PsychologistsOnboardingTip } from "../modules/onboarding";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsFavoriteActions } from "./use-psychologists-favorite-actions";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";

export const usePsychologistsDerivedView = ({
  directory,
  onboarding,
  favorite,
}: {
  directory: PsychologistsDirectory;
  onboarding: PsychologistsOnboarding;
  favorite: PsychologistsFavoriteActions;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    accountTips,
    accountTipsUserId,
    activeOnboardingTip,
    activePsychologistIndex,
    currentUserId,
    favoriteOverrides,
    hasLoadedSwipeHintPreference,
    hasPersistedMySearchTipSeenRef,
    hasPersistedWhatsappTipSeenRef,
    hasSeenSwipeHint,
    hasShownOnboardingTipThisVisitRef,
    isFiltersOpen,
    isSearchFocused,
    isUiHidden,
    metrics,
    setActiveOnboardingTip,
    shouldShowPatientDiscoveryActionTips,
    showSwipeHint,
  } = setup;

  const {
    canSwipeBetweenPsychologists,
    errorMessage,
    featuredPsychologist,
    psychologists,
    showInitialLoading,
  } = directory;

  const { persistMySearchTipSeen, persistWhatsappTipSeen } = onboarding;

  const { favoritePendingId } = favorite;

  const shouldRenderSwipeHint =
    hasLoadedSwipeHintPreference &&
    !hasSeenSwipeHint &&
    showSwipeHint &&
    canSwipeBetweenPsychologists &&
    !isUiHidden &&
    !isFiltersOpen &&
    !isSearchFocused &&
    !showInitialLoading &&
    !errorMessage;

  const shouldRenderGlobalControls =
    !showInitialLoading && !errorMessage && psychologists.length > 0;

  const shouldRenderMobileGlobalControls = false;

  const shouldRenderDesktopFeedControls = false;

  const areFeedModeControlsHidden = isUiHidden || isFiltersOpen;

  const feedModeControlsVisibilityClass = areFeedModeControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  const areGlobalControlsHidden = isUiHidden || isFiltersOpen;

  const globalControlsVisibilityClass = areGlobalControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  const areDesktopFeedControlsHidden = isFiltersOpen;

  const desktopFeedControlsVisibilityClass = areDesktopFeedControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  const desktopActionPsychologist = featuredPsychologist;

  const desktopActionIsOwnProfile = Boolean(
    currentUserId && desktopActionPsychologist?.id === currentUserId,
  );

  const desktopActionIsFavorited =
    desktopActionPsychologist && !desktopActionIsOwnProfile
      ? (favoriteOverrides[desktopActionPsychologist.id] ??
        Boolean(desktopActionPsychologist.favorited))
      : false;

  const desktopActionIsFavoritePending =
    desktopActionPsychologist && !desktopActionIsOwnProfile
      ? favoritePendingId === desktopActionPsychologist.id
      : false;

  const shouldRenderDesktopActionRail =
    metrics.isDesktopLayout && shouldRenderGlobalControls && Boolean(desktopActionPsychologist);

  const shouldRenderDesktopNavigationRail =
    metrics.isDesktopLayout && shouldRenderGlobalControls && psychologists.length > 1;

  const canNavigateToPreviousPsychologist = activePsychologistIndex > 0;

  const canNavigateToNextPsychologist = activePsychologistIndex < psychologists.length - 1;

  const isDesktopActionRailHidden = isFiltersOpen;

  const desktopActionRailVisibilityClass = isDesktopActionRailHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  const shouldRenderDesktopControlRail =
    shouldRenderDesktopActionRail && Boolean(desktopActionPsychologist);

  useEffect(() => {
    if (!activeOnboardingTip) return;
    if (
      shouldShowPatientDiscoveryActionTips &&
      !isUiHidden &&
      !isFiltersOpen &&
      !isSearchFocused &&
      !showInitialLoading &&
      !errorMessage
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActiveOnboardingTip(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeOnboardingTip,
    errorMessage,
    isFiltersOpen,
    isSearchFocused,
    isUiHidden,
    setActiveOnboardingTip,
    shouldShowPatientDiscoveryActionTips,
    showInitialLoading,
  ]);

  useEffect(() => {
    if (hasShownOnboardingTipThisVisitRef.current) return;
    if (!shouldShowPatientDiscoveryActionTips) return;
    if (!accountTipsUserId) return;
    if (!hasLoadedSwipeHintPreference) return;
    if (!accountTips.onboardingTips.isSuccess) return;
    if (accountTips.onboardingTips.isPending) return;
    if (activeOnboardingTip) return;
    if (!shouldRenderGlobalControls || isFiltersOpen || isSearchFocused || isUiHidden) return;

    const tips = accountTips.onboardingTips.data;
    const hasSeenDiscoverTip = Boolean(tips?.has_seen_discover_psychologists_tip);
    const hasSeenMySearchTip =
      hasPersistedMySearchTipSeenRef.current || Boolean(tips?.has_seen_psychologists_my_search_tip);
    const hasSeenWhatsappTip =
      hasPersistedWhatsappTipSeenRef.current || Boolean(tips?.has_seen_psychologist_whatsapp_tip);
    const nextTip: PsychologistsOnboardingTip | null = !hasSeenDiscoverTip
      ? null
      : !hasSeenMySearchTip
        ? "mySearch"
        : !hasSeenWhatsappTip && featuredPsychologist?.whatsapp_url
          ? "whatsapp"
          : null;

    if (!nextTip) return;

    const timeout = window.setTimeout(() => {
      if (hasShownOnboardingTipThisVisitRef.current) return;

      hasShownOnboardingTipThisVisitRef.current = true;
      setActiveOnboardingTip(nextTip);

      if (nextTip === "mySearch") {
        persistMySearchTipSeen();
      } else {
        persistWhatsappTipSeen();
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
    accountTipsUserId,
    activeOnboardingTip,
    featuredPsychologist?.whatsapp_url,
    hasLoadedSwipeHintPreference,
    isFiltersOpen,
    isSearchFocused,
    isUiHidden,
    persistMySearchTipSeen,
    persistWhatsappTipSeen,
    shouldShowPatientDiscoveryActionTips,
    shouldRenderGlobalControls,
    hasShownOnboardingTipThisVisitRef,
    hasPersistedMySearchTipSeenRef,
    hasPersistedWhatsappTipSeenRef,
    setActiveOnboardingTip,
  ]);

  return {
    areDesktopFeedControlsHidden,
    areFeedModeControlsHidden,
    areGlobalControlsHidden,
    canNavigateToNextPsychologist,
    canNavigateToPreviousPsychologist,
    desktopActionIsFavoritePending,
    desktopActionIsFavorited,
    desktopActionIsOwnProfile,
    desktopActionPsychologist,
    desktopActionRailVisibilityClass,
    desktopFeedControlsVisibilityClass,
    feedModeControlsVisibilityClass,
    globalControlsVisibilityClass,
    isDesktopActionRailHidden,
    shouldRenderDesktopActionRail,
    shouldRenderDesktopControlRail,
    shouldRenderDesktopFeedControls,
    shouldRenderDesktopNavigationRail,
    shouldRenderGlobalControls,
    shouldRenderMobileGlobalControls,
    shouldRenderSwipeHint,
  };
};

export type PsychologistsDerivedView = ReturnType<typeof usePsychologistsDerivedView>;
