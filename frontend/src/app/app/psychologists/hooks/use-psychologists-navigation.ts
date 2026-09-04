"use client";

import { type FormEvent, type WheelEvent as ReactWheelEvent, useCallback, useEffect } from "react";
import { rememberPsychologistsFeedReturnPosition } from "@/utils/psychologists-feed-return-memory";
import { buildFiltersParams } from "../modules/directory-url";
import type { FilterFeatureKey, PsychologistFilterKey } from "../modules/filter-config";
import { normalizeFormValues } from "../modules/profile-format";
import { defaultPsychologistsFilterValues, type PsychologistsFilterForm } from "../use-form";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";

export const usePsychologistsNavigation = ({
  directory,
  onboarding,
}: {
  directory: PsychologistsDirectory;
  onboarding: PsychologistsOnboarding;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    activePsychologistIndex,
    backgroundVideoRef,
    desktopFilterChipsRef,
    didLongPressRef,
    didMoveDuringPressRef,
    feedContainerRef,
    feedLoopCycleCount,
    filterValues,
    hasShownOnboardingTipThisVisitRef,
    isSearchModeActiveRef,
    longPressTimeoutRef,
    metrics,
    pointerStartRef,
    router,
    searchDraft,
    searchInputRef,
    setActiveOnboardingTip,
    setDesktopFilterChipScroll,
    setFilterModalSearchDraft,
    setIsLongPressing,
    setIsSearchFocused,
    setIsVideoPaused,
    setSearchDraft,
    shouldResumeVideoAfterSearchRef,
    suppressNextTapRef,
    tapTimeoutRef,
  } = setup;

  const {
    activeFilterChips,
    closeFilterDialogWithMotion,
    filters,
    hasActiveFilters,
    openFilterDialogWithMotion,
    psychologists,
    shouldShowVideo,
    trackDirectoryFilterSearch,
    trackPresentationVideoAction,
  } = directory;

  const { persistMySearchTipSeen, persistWhatsappTipSeen, registerSwipeHintInteraction } =
    onboarding;

  const stopInteractionPropagation = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  const rememberCurrentFeedReturn = useCallback(
    (psychologistId: string) => {
      rememberPsychologistsFeedReturnPosition({
        activeIndex: activePsychologistIndex,
        feedLoopCycleCount,
        psychologistId,
        scrollTop: feedContainerRef.current?.scrollTop ?? 0,
      });
    },
    [activePsychologistIndex, feedContainerRef, feedLoopCycleCount],
  );

  const updateDesktopFilterChipScrollState = useCallback(() => {
    const container = desktopFilterChipsRef.current;

    if (!container || !metrics.isDesktopLayout) {
      setDesktopFilterChipScroll((current) =>
        current.canScrollLeft || current.canScrollRight
          ? { canScrollLeft: false, canScrollRight: false }
          : current,
      );
      return;
    }

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const nextState = {
      canScrollLeft: container.scrollLeft > 1,
      canScrollRight: container.scrollLeft < maxScrollLeft - 1,
    };

    setDesktopFilterChipScroll((current) =>
      current.canScrollLeft === nextState.canScrollLeft &&
      current.canScrollRight === nextState.canScrollRight
        ? current
        : nextState,
    );
  }, [desktopFilterChipsRef, metrics.isDesktopLayout, setDesktopFilterChipScroll]);

  const handleDesktopFilterChipsWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!metrics.isDesktopLayout) return;

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.scrollBy({ behavior: "auto", left: delta });
      window.requestAnimationFrame(updateDesktopFilterChipScrollState);
    },
    [metrics.isDesktopLayout, updateDesktopFilterChipScrollState],
  );

  const scrollDesktopFilterChips = useCallback(
    (direction: -1 | 1, event: { preventDefault: () => void; stopPropagation: () => void }) => {
      event.preventDefault();
      event.stopPropagation();

      const container = desktopFilterChipsRef.current;
      if (!container) return;

      container.scrollBy({
        behavior: "smooth",
        left: direction * Math.max(96, container.clientWidth * 0.68),
      });
      window.setTimeout(updateDesktopFilterChipScrollState, 220);
    },
    [desktopFilterChipsRef, updateDesktopFilterChipScrollState],
  );

  useEffect(() => {
    if (activeFilterChips.length === 0 || psychologists.length === 0) {
      updateDesktopFilterChipScrollState();
      return;
    }

    const frame = window.requestAnimationFrame(updateDesktopFilterChipScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeFilterChips.length, psychologists.length, updateDesktopFilterChipScrollState]);

  const handleWhatsappInteraction = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      hasShownOnboardingTipThisVisitRef.current = true;
      persistWhatsappTipSeen();
      setActiveOnboardingTip((current) => (current === "whatsapp" ? null : current));
    },
    [hasShownOnboardingTipThisVisitRef, persistWhatsappTipSeen, setActiveOnboardingTip],
  );

  const navigateToPublicPsychologistProfile = useCallback(
    (
      psychologistId: string,
      event: { preventDefault?: () => void; stopPropagation: () => void },
    ) => {
      event.preventDefault?.();
      event.stopPropagation();

      rememberCurrentFeedReturn(psychologistId);
      trackPresentationVideoAction("psychologist_video_profile_access", psychologistId);
      router.push(`/psicologos/${psychologistId}`);
    },
    [rememberCurrentFeedReturn, router, trackPresentationVideoAction],
  );

  const cancelPendingVideoGestureTimers = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    pointerStartRef.current = null;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    suppressNextTapRef.current = false;
    setIsLongPressing(false);
  }, [
    didLongPressRef,
    didMoveDuringPressRef,
    longPressTimeoutRef,
    pointerStartRef,
    setIsLongPressing,
    suppressNextTapRef,
    tapTimeoutRef,
  ]);

  const applyFilterValues = useCallback(
    (values: PsychologistsFilterForm) => {
      const normalizedValues = normalizeFormValues(values);
      const next = buildFiltersParams(normalizedValues, 1);

      trackDirectoryFilterSearch(normalizedValues);

      router.replace(next.toString() ? `/psicologos?${next}` : "/psicologos", {
        scroll: false,
      });
    },
    [router, trackDirectoryFilterSearch],
  );

  const enterSearchMode = useCallback(() => {
    if (isSearchModeActiveRef.current) {
      setIsSearchFocused(true);
      return;
    }

    isSearchModeActiveRef.current = true;
    cancelPendingVideoGestureTimers();

    if (metrics.isDesktopLayout) {
      shouldResumeVideoAfterSearchRef.current = false;
      setIsSearchFocused(true);
      return;
    }

    const currentVideo = backgroundVideoRef.current;
    shouldResumeVideoAfterSearchRef.current = Boolean(
      currentVideo && shouldShowVideo && !currentVideo.paused,
    );

    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    setIsSearchFocused(true);
  }, [
    backgroundVideoRef,
    cancelPendingVideoGestureTimers,
    isSearchModeActiveRef,
    metrics.isDesktopLayout,
    setIsSearchFocused,
    setIsVideoPaused,
    shouldResumeVideoAfterSearchRef,
    shouldShowVideo,
  ]);

  const exitSearchMode = useCallback(
    (options?: { resumeVideo?: boolean; shouldBlur?: boolean }) => {
      if (options?.shouldBlur !== false) {
        searchInputRef.current?.blur();
      }

      isSearchModeActiveRef.current = false;
      setIsSearchFocused(false);

      const shouldResumeVideo =
        options?.resumeVideo !== false && shouldResumeVideoAfterSearchRef.current;
      shouldResumeVideoAfterSearchRef.current = false;

      if (!shouldResumeVideo) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      setIsVideoPaused(false);
      void currentVideo.play().catch(() => {
        setIsVideoPaused(true);
      });
    },
    [
      backgroundVideoRef,
      isSearchModeActiveRef,
      searchInputRef,
      setIsSearchFocused,
      setIsVideoPaused,
      shouldResumeVideoAfterSearchRef,
      shouldShowVideo,
    ],
  );

  const handleSubmitFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void filters.hook.handleSubmit((values) => {
        const nextValues = normalizeFormValues({
          ...filterValues,
          ...values,
        });

        setSearchDraft(nextValues.search || "");
        setFilterModalSearchDraft(nextValues.search || "");
        applyFilterValues(nextValues);
        closeFilterDialogWithMotion();
      })(event);
    },
    [
      applyFilterValues,
      closeFilterDialogWithMotion,
      filterValues,
      filters.hook,
      setFilterModalSearchDraft,
      setSearchDraft,
    ],
  );

  const clearFilters = useCallback(() => {
    filters.hook.reset(defaultPsychologistsFilterValues);
    setSearchDraft("");
    setFilterModalSearchDraft("");
    exitSearchMode();
    applyFilterValues(defaultPsychologistsFilterValues);
    closeFilterDialogWithMotion();
  }, [
    applyFilterValues,
    closeFilterDialogWithMotion,
    exitSearchMode,
    filters.hook,
    setFilterModalSearchDraft,
    setSearchDraft,
  ]);

  const toggleFilterFeature = useCallback(
    (name: FilterFeatureKey) => {
      const currentValue = Boolean(filters.hook.getValues(name));

      filters.hook.setValue(name, !currentValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [filters.hook],
  );

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextSearch = searchDraft.trim();

      setSearchDraft(nextSearch);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: nextSearch,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues, searchDraft, setSearchDraft],
  );

  const handleSearchSuggestionSelect = useCallback(
    (name: string) => {
      setSearchDraft(name);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: name,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues, setSearchDraft],
  );

  const handleFiltersOpen = useCallback(() => {
    exitSearchMode({
      resumeVideo: false,
    });

    const currentVideo = backgroundVideoRef.current;
    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    filters.hook.reset(filterValues);
    setFilterModalSearchDraft(filterValues.search || "");
    openFilterDialogWithMotion();
  }, [
    backgroundVideoRef,
    exitSearchMode,
    filterValues,
    filters.hook,
    openFilterDialogWithMotion,
    setFilterModalSearchDraft,
    setIsVideoPaused,
    shouldShowVideo,
  ]);

  const handleFiltersClose = useCallback(() => {
    filters.hook.reset(filterValues);
    setFilterModalSearchDraft(filterValues.search || "");
    closeFilterDialogWithMotion();
  }, [closeFilterDialogWithMotion, filterValues, filters.hook, setFilterModalSearchDraft]);

  const handleExploreModeClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      registerSwipeHintInteraction();

      if (hasActiveFilters) {
        clearFilters();
      }
    },
    [clearFilters, hasActiveFilters, registerSwipeHintInteraction],
  );

  const handleMySearchModeClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      registerSwipeHintInteraction();
      hasShownOnboardingTipThisVisitRef.current = true;
      persistMySearchTipSeen();
      setActiveOnboardingTip((current) => (current === "mySearch" ? null : current));
      handleFiltersOpen();
    },
    [
      handleFiltersOpen,
      hasShownOnboardingTipThisVisitRef,
      persistMySearchTipSeen,
      registerSwipeHintInteraction,
      setActiveOnboardingTip,
    ],
  );

  const handleRemoveActiveFilter = useCallback(
    (key: PsychologistFilterKey) => {
      const nextValues = normalizeFormValues(filterValues);

      switch (key) {
        case "search":
          nextValues.search = "";
          setSearchDraft("");
          break;
        case "specialty":
          nextValues.specialty = null;
          break;
        case "service":
          nextValues.service = null;
          break;
        case "modality":
          nextValues.modality = null;
          break;
        case "approach":
          nextValues.approach = null;
          break;
        case "target_audience":
          nextValues.target_audience = null;
          break;
        case "state":
          nextValues.state = null;
          nextValues.city = null;
          break;
        case "city":
          nextValues.city = null;
          break;
        case "gender":
          nextValues.gender = null;
          break;
        case "race_color":
          nextValues.race_color = null;
          break;
        case "religion":
          nextValues.religion = null;
          break;
        case "language":
          nextValues.language = null;
          break;
        case "verified":
          nextValues.verified = false;
          break;
        case "more_experienced":
          nextValues.more_experienced = false;
          break;
        case "discount_first_session":
          nextValues.discount_first_session = false;
          break;
        case "accepts_insurance":
          nextValues.accepts_insurance = false;
          break;
        case "social_value":
          nextValues.social_value = false;
          break;
        case "available_today":
          nextValues.available_today = false;
          break;
      }

      filters.hook.reset(nextValues);
      applyFilterValues(nextValues);
    },
    [applyFilterValues, filterValues, filters.hook, setSearchDraft],
  );

  return {
    cancelPendingVideoGestureTimers,
    clearFilters,
    enterSearchMode,
    exitSearchMode,
    handleDesktopFilterChipsWheel,
    handleExploreModeClick,
    handleFiltersClose,
    handleFiltersOpen,
    handleMySearchModeClick,
    handleRemoveActiveFilter,
    handleSearchSubmit,
    handleSearchSuggestionSelect,
    handleSubmitFilters,
    handleWhatsappInteraction,
    navigateToPublicPsychologistProfile,
    scrollDesktopFilterChips,
    stopInteractionPropagation,
    toggleFilterFeature,
    updateDesktopFilterChipScrollState,
  };
};

export type PsychologistsNavigation = ReturnType<typeof usePsychologistsNavigation>;
