"use client";

import {
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
  type UIEvent,
  useCallback,
  useEffect,
} from "react";
import { playVideoWithSound } from "@/lib/video-playback";
import {
  clampPsychologistFeedSlideIndex,
  getPsychologistsFeedCycleCountForIndex,
} from "../modules/feed-loop";
import {
  isPsychologistsScrollLockTarget,
  PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR,
} from "../modules/onboarding";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsNavigation } from "./use-psychologists-navigation";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";

export const usePsychologistsFeedNavigation = ({
  directory,
  onboarding,
  navigation,
}: {
  directory: PsychologistsDirectory;
  onboarding: PsychologistsOnboarding;
  navigation: PsychologistsNavigation;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    activePsychologistIndex,
    backgroundVideoRef,
    desktopSearchControlsRef,
    desktopTouchStartYRef,
    feedContainerRef,
    feedLoopCycleCount,
    filterDialogRef,
    isFiltersOpen,
    isSearchFocused,
    isVideoProgressSeeking,
    metrics,
    searchInputRef,
    setActivePsychologistIndex,
    setFeedLoopCycleCount,
    setIsUiHidden,
    setIsVideoMuted,
    setIsVideoPaused,
    setVideoVolume,
    suppressNextTapRef,
    videoPlaybackRate,
  } = setup;

  const { psychologists, shouldShowVideo } = directory;

  const { markSwipeHintSeen, registerSwipeHintInteraction } = onboarding;

  const { cancelPendingVideoGestureTimers, exitSearchMode, handleFiltersClose } = navigation;

  const extendFeedLoopThroughIndex = useCallback(
    (index: number) => {
      const nextCycleCount = getPsychologistsFeedCycleCountForIndex({
        currentCycleCount: feedLoopCycleCount,
        index,
        psychologistsCount: psychologists.length,
      });

      if (nextCycleCount > feedLoopCycleCount) {
        setFeedLoopCycleCount(nextCycleCount);
      }

      return nextCycleCount;
    },
    [feedLoopCycleCount, psychologists.length, setFeedLoopCycleCount],
  );

  const scrollFeedContainerToIndex = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const container = feedContainerRef.current;
      if (!container) return;

      const targetSlide = container.querySelector<HTMLElement>(
        `[data-psychologists-slide-index="${index}"]`,
      );

      container.scrollTo({
        behavior,
        top: targetSlide?.offsetTop ?? index * container.clientHeight,
      });
    },
    [feedContainerRef],
  );

  const pauseVideoPlayback = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.pause();
    setIsVideoPaused(true);
  }, [backgroundVideoRef, setIsVideoPaused, shouldShowVideo]);

  const unmuteAllVideos = useCallback(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = false;
      });
  }, []);

  const playCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.playbackRate = videoPlaybackRate;
    setIsVideoPaused(false);
    void currentVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [backgroundVideoRef, setIsVideoPaused, shouldShowVideo, videoPlaybackRate]);

  const unmuteCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;

    if (currentVideo) {
      currentVideo.muted = false;
      if (currentVideo.volume <= 0) {
        currentVideo.volume = 1;
      }
      setVideoVolume(currentVideo.volume);
    }

    unmuteAllVideos();
    setIsVideoMuted(false);
  }, [backgroundVideoRef, setIsVideoMuted, setVideoVolume, unmuteAllVideos]);

  const playCurrentVideoWithSound = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.playbackRate = videoPlaybackRate;
    unmuteCurrentVideo();
    setIsVideoPaused(false);

    void playVideoWithSound(currentVideo).then((played) => {
      if (!played) {
        setIsVideoPaused(true);
      }
    });
  }, [
    backgroundVideoRef,
    setIsVideoPaused,
    shouldShowVideo,
    unmuteCurrentVideo,
    videoPlaybackRate,
  ]);

  const stopVideoControlInteraction = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.stopPropagation();
      event.preventDefault?.();
      cancelPendingVideoGestureTimers();
    },
    [cancelPendingVideoGestureTimers],
  );

  const revealUiFromImmersiveVideo = useCallback(() => {
    cancelPendingVideoGestureTimers();
    setIsUiHidden(false);
  }, [cancelPendingVideoGestureTimers, setIsUiHidden]);

  const handleImmersiveExit = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);
      const currentVideo = backgroundVideoRef.current;
      if (currentVideo) {
        currentVideo.controls = false;
      }
      revealUiFromImmersiveVideo();
    },
    [backgroundVideoRef, revealUiFromImmersiveVideo, stopVideoControlInteraction],
  );

  const handleFeedScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const container = event.currentTarget;
      if (psychologists.length === 0) return;

      const slides = Array.from(
        container.querySelectorAll<HTMLElement>("[data-psychologists-slide-index]"),
      );

      const nearestSlide = slides.reduce<HTMLElement | null>((nearest, slide) => {
        if (!nearest) return slide;

        const currentDistance = Math.abs(slide.offsetTop - container.scrollTop);
        const nearestDistance = Math.abs(nearest.offsetTop - container.scrollTop);

        return currentDistance < nearestDistance ? slide : nearest;
      }, null);

      const slideIndex = Number(nearestSlide?.dataset.psychologistsSlideIndex);
      if (!Number.isFinite(slideIndex)) return;

      const nextIndex = clampPsychologistFeedSlideIndex(
        slideIndex,
        psychologists.length,
        feedLoopCycleCount,
      );

      extendFeedLoopThroughIndex(nextIndex);

      if (nextIndex !== activePsychologistIndex) {
        markSwipeHintSeen();
        setActivePsychologistIndex(nextIndex);
      }
    },
    [
      activePsychologistIndex,
      extendFeedLoopThroughIndex,
      feedLoopCycleCount,
      isSearchFocused,
      markSwipeHintSeen,
      psychologists.length,
      setActivePsychologistIndex,
    ],
  );

  const scrollToPsychologistIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (psychologists.length === 0) return;

      const targetCycleCount = extendFeedLoopThroughIndex(index);
      const nextIndex = clampPsychologistFeedSlideIndex(
        index,
        psychologists.length,
        targetCycleCount,
      );

      if (nextIndex !== activePsychologistIndex) {
        markSwipeHintSeen();
      }

      if (behavior === "auto") {
        setActivePsychologistIndex(nextIndex);
      }

      if (targetCycleCount > feedLoopCycleCount && typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          scrollFeedContainerToIndex(nextIndex, behavior);
        });
        return;
      }

      scrollFeedContainerToIndex(nextIndex, behavior);
    },
    [
      activePsychologistIndex,
      extendFeedLoopThroughIndex,
      feedLoopCycleCount,
      markSwipeHintSeen,
      psychologists.length,
      scrollFeedContainerToIndex,
      setActivePsychologistIndex,
    ],
  );

  const navigateToPreviousPsychologist = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation();
      scrollToPsychologistIndex(activePsychologistIndex - 1);
    },
    [activePsychologistIndex, scrollToPsychologistIndex],
  );

  const navigateToNextPsychologist = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation();
      scrollToPsychologistIndex(activePsychologistIndex + 1);
    },
    [activePsychologistIndex, scrollToPsychologistIndex],
  );

  const advanceToNextPsychologistVideo = useCallback(() => {
    if (psychologists.length <= 1) return;

    scrollToPsychologistIndex(activePsychologistIndex + 1);
  }, [activePsychologistIndex, psychologists.length, scrollToPsychologistIndex]);

  const shouldForwardDesktopFeedScroll = useCallback(() => {
    return (
      metrics.isDesktopLayout &&
      !isFiltersOpen &&
      !isSearchFocused &&
      !isVideoProgressSeeking &&
      psychologists.length > 0
    );
  }, [
    isFiltersOpen,
    isSearchFocused,
    isVideoProgressSeeking,
    metrics.isDesktopLayout,
    psychologists.length,
  ]);

  const handleDesktopPageWheelCapture = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      const container = feedContainerRef.current;
      if (!container) return;

      event.preventDefault();
      registerSwipeHintInteraction();
      container.scrollBy({
        behavior: "auto",
        left: event.deltaX,
        top: event.deltaY,
      });
    },
    [feedContainerRef, registerSwipeHintInteraction, shouldForwardDesktopFeedScroll],
  );

  const handleDesktopPageTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      desktopTouchStartYRef.current = event.touches[0]?.clientY ?? null;
    },
    [desktopTouchStartYRef, shouldForwardDesktopFeedScroll],
  );

  const handleDesktopPageTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      const touch = event.touches[0];
      const lastY = desktopTouchStartYRef.current;
      const container = feedContainerRef.current;

      if (!touch || lastY === null || !container) return;

      const deltaY = lastY - touch.clientY;
      if (Math.abs(deltaY) < 1) return;

      event.preventDefault();
      registerSwipeHintInteraction();
      container.scrollBy({
        behavior: "auto",
        top: deltaY,
      });
      desktopTouchStartYRef.current = touch.clientY;
    },
    [
      desktopTouchStartYRef,
      feedContainerRef,
      registerSwipeHintInteraction,
      shouldForwardDesktopFeedScroll,
    ],
  );

  const handleDesktopPageTouchEnd = useCallback(() => {
    desktopTouchStartYRef.current = null;
  }, [desktopTouchStartYRef]);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const timer = window.setTimeout(() => {
      filterDialogRef.current?.focus();
    }, 280);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleFiltersClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterDialogRef, handleFiltersClose, isFiltersOpen]);

  useEffect(() => {
    if (!isSearchFocused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      exitSearchMode();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exitSearchMode, isSearchFocused]);

  useEffect(() => {
    if (!metrics.isDesktopLayout || !isSearchFocused) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isSearchFocused, metrics.isDesktopLayout, searchInputRef]);

  useEffect(() => {
    if (!metrics.isDesktopLayout || !isSearchFocused) return;

    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (desktopSearchControlsRef.current?.contains(target)) return;

      suppressNextTapRef.current = true;
      cancelPendingVideoGestureTimers();
      exitSearchMode();
      window.setTimeout(() => {
        suppressNextTapRef.current = false;
      }, 0);
    };

    window.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [
    cancelPendingVideoGestureTimers,
    desktopSearchControlsRef,
    exitSearchMode,
    isSearchFocused,
    metrics.isDesktopLayout,
    suppressNextTapRef,
  ]);

  return {
    advanceToNextPsychologistVideo,
    handleDesktopPageTouchEnd,
    handleDesktopPageTouchMove,
    handleDesktopPageTouchStart,
    handleDesktopPageWheelCapture,
    handleFeedScroll,
    handleImmersiveExit,
    navigateToNextPsychologist,
    navigateToPreviousPsychologist,
    pauseVideoPlayback,
    playCurrentVideo,
    playCurrentVideoWithSound,
    revealUiFromImmersiveVideo,
  };
};

export type PsychologistsFeedNavigation = ReturnType<typeof usePsychologistsFeedNavigation>;
