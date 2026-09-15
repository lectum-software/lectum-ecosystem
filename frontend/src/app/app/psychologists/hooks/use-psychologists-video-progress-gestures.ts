"use client";

import {
  type PointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
} from "react";
import { clampNumber } from "../modules/onboarding";
import { getReadableVideoDuration } from "../modules/search-suggestions";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsFeedNavigation } from "./use-psychologists-feed-navigation";
import type { PsychologistsNavigation } from "./use-psychologists-navigation";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";
import type { PsychologistsVideoAnalytics } from "./use-psychologists-video-analytics";

export const usePsychologistsVideoProgressGestures = ({
  analytics,
  directory,
  feed,
  navigation,
  onboarding,
}: {
  analytics: PsychologistsVideoAnalytics;
  directory: PsychologistsDirectory;
  feed: PsychologistsFeedNavigation;
  navigation: PsychologistsNavigation;
  onboarding: PsychologistsOnboarding;
}) => {
  const {
    backgroundVideoRef,
    isSearchFocused,
    isVideoProgressSeekingRef,
    setIsVideoPaused,
    setIsVideoProgressSeeking,
    setVideoProgress,
    videoProgress,
    videoProgressStateRef,
    videoSeekPreviewRatioRef,
    wasVideoPlayingBeforeProgressScrubRef,
  } = usePsychologistsSetupContext();

  const { shouldShowVideo } = directory;
  const { registerSwipeHintInteraction } = onboarding;
  const { applyVideoProgressRatio, syncActiveVideoProgress } = analytics;
  const { cancelPendingVideoGestureTimers } = navigation;
  const { playCurrentVideo } = feed;

  const seekActiveVideoToTime = useCallback(
    (nextTime: number, durationOverride?: number) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      const duration =
        getReadableVideoDuration(currentVideo) || durationOverride || videoProgress.duration;
      if (!duration) return;

      const currentTime = clampNumber(nextTime, 0, duration);
      currentVideo.currentTime = currentTime;
      applyVideoProgressRatio(duration ? currentTime / duration : 0);
      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [
      applyVideoProgressRatio,
      backgroundVideoRef,
      setVideoProgress,
      videoProgress.duration,
      videoProgressStateRef,
    ],
  );

  const getVideoProgressRatioFromClientX = useCallback(
    (clientX: number, track: HTMLDivElement | null) => {
      if (!track) return null;

      const bounds = track.getBoundingClientRect();
      if (bounds.width <= 0) return null;

      return clampNumber((clientX - bounds.left) / bounds.width, 0, 1);
    },
    [],
  );

  const seekActiveVideoToRatio = useCallback(
    (ratio: number) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const currentTime = clampNumber(ratio, 0, 1) * duration;
      currentVideo.currentTime = currentTime;
      applyVideoProgressRatio(duration ? currentTime / duration : 0);
      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [
      applyVideoProgressRatio,
      backgroundVideoRef,
      setVideoProgress,
      videoProgress.duration,
      videoProgressStateRef,
    ],
  );

  const previewActiveVideoSeekToRatio = useCallback(
    (ratio: number) => {
      const clampedRatio = clampNumber(ratio, 0, 1);
      const currentVideo = backgroundVideoRef.current;
      const duration = currentVideo ? getReadableVideoDuration(currentVideo) : 0;
      const resolvedDuration = duration || videoProgressStateRef.current.duration;

      applyVideoProgressRatio(clampedRatio);

      if (!resolvedDuration) return;

      const nextProgress = {
        currentTime: clampedRatio * resolvedDuration,
        duration: resolvedDuration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [applyVideoProgressRatio, backgroundVideoRef, setVideoProgress, videoProgressStateRef],
  );

  const updateVideoSeekFromClientX = useCallback(
    (clientX: number, track: HTMLDivElement | null) => {
      const ratio = getVideoProgressRatioFromClientX(clientX, track);
      if (ratio === null) return;

      videoSeekPreviewRatioRef.current = ratio;
      previewActiveVideoSeekToRatio(ratio);
    },
    [getVideoProgressRatioFromClientX, previewActiveVideoSeekToRatio, videoSeekPreviewRatioRef],
  );

  const finishVideoProgressScrub = useCallback(
    (clientX?: number, track?: HTMLDivElement | null) => {
      const storedPreviewRatio = videoSeekPreviewRatioRef.current;
      const pointerRatio =
        storedPreviewRatio === null && typeof clientX === "number"
          ? getVideoProgressRatioFromClientX(clientX, track ?? null)
          : null;
      const finalRatio = storedPreviewRatio ?? pointerRatio;
      const shouldResumeVideo = wasVideoPlayingBeforeProgressScrubRef.current;

      videoSeekPreviewRatioRef.current = null;
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      setIsVideoProgressSeeking(false);

      if (finalRatio === null) {
        syncActiveVideoProgress();
        if (shouldResumeVideo) {
          playCurrentVideo();
        }
        return;
      }

      seekActiveVideoToRatio(finalRatio);
      syncActiveVideoProgress(undefined, {
        forceState: true,
      });

      if (shouldResumeVideo) {
        playCurrentVideo();
      }
    },
    [
      getVideoProgressRatioFromClientX,
      isVideoProgressSeekingRef,
      playCurrentVideo,
      seekActiveVideoToRatio,
      setIsVideoProgressSeeking,
      syncActiveVideoProgress,
      videoSeekPreviewRatioRef,
      wasVideoPlayingBeforeProgressScrubRef,
    ],
  );

  const cancelVideoProgressScrub = useCallback(() => {
    const shouldResumeVideo = wasVideoPlayingBeforeProgressScrubRef.current;

    videoSeekPreviewRatioRef.current = null;
    isVideoProgressSeekingRef.current = false;
    wasVideoPlayingBeforeProgressScrubRef.current = false;
    setIsVideoProgressSeeking(false);
    syncActiveVideoProgress();

    if (shouldResumeVideo) {
      playCurrentVideo();
    }
  }, [
    isVideoProgressSeekingRef,
    playCurrentVideo,
    setIsVideoProgressSeeking,
    syncActiveVideoProgress,
    videoSeekPreviewRatioRef,
    wasVideoPlayingBeforeProgressScrubRef,
  ]);

  const handleVideoProgressPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressScrubRef.current = !currentVideo.paused && !currentVideo.ended;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      updateVideoSeekFromClientX(event.clientX, event.currentTarget);
    },
    [
      backgroundVideoRef,
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      isVideoProgressSeekingRef,
      registerSwipeHintInteraction,
      setIsVideoPaused,
      setIsVideoProgressSeeking,
      shouldShowVideo,
      updateVideoSeekFromClientX,
      wasVideoPlayingBeforeProgressScrubRef,
    ],
  );

  const handleVideoProgressPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      event.preventDefault();
      updateVideoSeekFromClientX(event.clientX, event.currentTarget);
    },
    [isSearchFocused, isVideoProgressSeekingRef, updateVideoSeekFromClientX],
  );

  const handleVideoProgressPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (event.type === "pointercancel") {
        cancelVideoProgressScrub();
        return;
      }

      finishVideoProgressScrub(event.clientX, event.currentTarget);
    },
    [cancelVideoProgressScrub, finishVideoProgressScrub],
  );

  const shouldUseTouchProgressFallback = useCallback(
    () => typeof window !== "undefined" && !("PointerEvent" in window),
    [],
  );

  const handleVideoProgressTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      if (!shouldShowVideo || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressScrubRef.current = !currentVideo.paused && !currentVideo.ended;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      updateVideoSeekFromClientX(touch.clientX, event.currentTarget);
    },
    [
      backgroundVideoRef,
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      isVideoProgressSeekingRef,
      registerSwipeHintInteraction,
      setIsVideoPaused,
      setIsVideoProgressSeeking,
      shouldShowVideo,
      shouldUseTouchProgressFallback,
      updateVideoSeekFromClientX,
      wasVideoPlayingBeforeProgressScrubRef,
    ],
  );

  const handleVideoProgressTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      event.preventDefault();
      updateVideoSeekFromClientX(touch.clientX, event.currentTarget);
    },
    [
      isSearchFocused,
      isVideoProgressSeekingRef,
      shouldUseTouchProgressFallback,
      updateVideoSeekFromClientX,
    ],
  );

  const handleVideoProgressTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      if (event.type === "touchcancel") {
        cancelVideoProgressScrub();
        return;
      }

      const touch = event.changedTouches[0];
      finishVideoProgressScrub(touch?.clientX, event.currentTarget);
    },
    [cancelVideoProgressScrub, finishVideoProgressScrub, shouldUseTouchProgressFallback],
  );

  const handleVideoProgressKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const step = Math.min(5, Math.max(1, duration * 0.05));
      let nextTime: number | null = null;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextTime = currentVideo.currentTime - step;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextTime = currentVideo.currentTime + step;
      }

      if (event.key === "Home") {
        nextTime = 0;
      }

      if (event.key === "End") {
        nextTime = duration;
      }

      if (nextTime === null) return;

      event.preventDefault();
      event.stopPropagation();
      cancelPendingVideoGestureTimers();
      seekActiveVideoToTime(nextTime);
      syncActiveVideoProgress();
    },
    [
      backgroundVideoRef,
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      seekActiveVideoToTime,
      shouldShowVideo,
      syncActiveVideoProgress,
      videoProgress.duration,
    ],
  );

  return {
    handleVideoProgressKeyDown,
    handleVideoProgressPointerDown,
    handleVideoProgressPointerEnd,
    handleVideoProgressPointerMove,
    handleVideoProgressTouchEnd,
    handleVideoProgressTouchMove,
    handleVideoProgressTouchStart,
  };
};

export type PsychologistsVideoProgressGestures = ReturnType<
  typeof usePsychologistsVideoProgressGestures
>;
