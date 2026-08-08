"use client";

import { type PointerEvent, useCallback } from "react";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import {
  LONG_PRESS_MOVE_TOLERANCE_PX,
  LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX,
  LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX,
  LONG_PRESS_VERTICAL_DOMINANCE_RATIO,
  VIDEO_LONG_PRESS_DELAY_MS,
  VIDEO_SINGLE_TAP_DELAY_MS,
} from "../modules/onboarding";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsFavoriteActions } from "./use-psychologists-favorite-actions";
import type { PsychologistsFeedNavigation } from "./use-psychologists-feed-navigation";
import type { PsychologistsNavigation } from "./use-psychologists-navigation";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";
import type { PsychologistsVideoAnalytics } from "./use-psychologists-video-analytics";
import { usePsychologistsVideoProgressGestures } from "./use-psychologists-video-progress-gestures";

export const usePsychologistsVideoGestures = ({
  directory,
  onboarding,
  analytics,
  navigation,
  feed,
  favorite,
}: {
  directory: PsychologistsDirectory;
  onboarding: PsychologistsOnboarding;
  analytics: PsychologistsVideoAnalytics;
  navigation: PsychologistsNavigation;
  feed: PsychologistsFeedNavigation;
  favorite: PsychologistsFavoriteActions;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    backgroundVideoRef,
    didLongPressRef,
    didMoveBeyondLongPressToleranceRef,
    didMoveDuringPressRef,
    isSearchFocused,
    isVideoMuted,
    isVideoPaused,
    longPressTimeoutRef,
    pointerStartRef,
    setIsLongPressing,
    setIsUiHidden,
    setIsVideoPaused,
    suppressNextTapRef,
    tapTimeoutRef,
  } = setup;

  const { shouldShowVideo } = directory;

  const { pauseVideoPlayback, playCurrentVideo, playCurrentVideoWithSound } = feed;

  const { toggleFavorite } = favorite;

  const runVideoAreaSingleTapAction = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;

    if (shouldShowVideo && currentVideo) {
      const shouldActivateVideoWithSound =
        isVideoMuted ||
        currentVideo.muted ||
        currentVideo.volume <= 0 ||
        currentVideo.paused ||
        currentVideo.ended ||
        isVideoPaused;

      if (shouldActivateVideoWithSound) {
        currentVideo.controls = true;
        playCurrentVideoWithSound();
        setIsUiHidden(true);
        return;
      }

      setIsUiHidden((current) => {
        const next = !current;
        currentVideo.controls = next;
        return next;
      });
      return;
    }

    setIsUiHidden((current) => !current);
  }, [
    backgroundVideoRef,
    isVideoMuted,
    isVideoPaused,
    playCurrentVideoWithSound,
    setIsUiHidden,
    shouldShowVideo,
  ]);

  const handleVideoAreaTap = useCallback(
    (psychologist: DirectoryPsychologist, uiHidden: boolean) => {
      if (isSearchFocused) return;

      if (suppressNextTapRef.current || didMoveDuringPressRef.current) {
        suppressNextTapRef.current = false;
        didMoveDuringPressRef.current = false;
        return;
      }

      if (didLongPressRef.current) {
        didLongPressRef.current = false;
        return;
      }

      if (!uiHidden && shouldShowVideo) {
        if (tapTimeoutRef.current) {
          window.clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
          toggleFavorite(psychologist);
          return;
        }

        tapTimeoutRef.current = window.setTimeout(() => {
          tapTimeoutRef.current = null;
          runVideoAreaSingleTapAction();
        }, VIDEO_SINGLE_TAP_DELAY_MS);
        return;
      }

      runVideoAreaSingleTapAction();
    },
    [
      didLongPressRef,
      didMoveDuringPressRef,
      isSearchFocused,
      runVideoAreaSingleTapAction,
      shouldShowVideo,
      suppressNextTapRef,
      tapTimeoutRef,
      toggleFavorite,
    ],
  );

  const handleLongPressStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      didMoveDuringPressRef.current = false;
      didMoveBeyondLongPressToleranceRef.current = false;
      didLongPressRef.current = false;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }

      longPressTimeoutRef.current = window.setTimeout(() => {
        if (didMoveDuringPressRef.current) return;

        const currentVideo = backgroundVideoRef.current;
        if (!currentVideo) return;

        didLongPressRef.current = true;
        suppressNextTapRef.current = true;

        if (tapTimeoutRef.current) {
          window.clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        currentVideo.pause();
        setIsVideoPaused(true);
        setIsLongPressing(true);
      }, VIDEO_LONG_PRESS_DELAY_MS);
    },
    [
      backgroundVideoRef,
      didLongPressRef,
      didMoveBeyondLongPressToleranceRef,
      didMoveDuringPressRef,
      isSearchFocused,
      longPressTimeoutRef,
      pointerStartRef,
      setIsLongPressing,
      setIsVideoPaused,
      shouldShowVideo,
      suppressNextTapRef,
      tapTimeoutRef,
    ],
  );

  const handleLongPressMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointerStartRef.current;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const absoluteDeltaX = Math.abs(deltaX);
      const absoluteDeltaY = Math.abs(deltaY);
      const distance = Math.hypot(deltaX, deltaY);

      if (distance <= LONG_PRESS_MOVE_TOLERANCE_PX) return;

      didMoveBeyondLongPressToleranceRef.current = true;

      const hasVerticalScrollIntent =
        absoluteDeltaY >= LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX &&
        absoluteDeltaY >= absoluteDeltaX * LONG_PRESS_VERTICAL_DOMINANCE_RATIO;
      const hasSignificantDragIntent = distance >= LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX;

      if (!hasVerticalScrollIntent && !hasSignificantDragIntent) return;

      didMoveDuringPressRef.current = true;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      didLongPressRef.current = false;
      suppressNextTapRef.current = true;
      playCurrentVideo();
    },
    [
      didLongPressRef,
      didMoveBeyondLongPressToleranceRef,
      didMoveDuringPressRef,
      longPressTimeoutRef,
      playCurrentVideo,
      pointerStartRef,
      setIsLongPressing,
      suppressNextTapRef,
    ],
  );

  const handleLongPressEnd = useCallback(
    (event?: PointerEvent<HTMLButtonElement>) => {
      if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      pointerStartRef.current = null;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (
        (didMoveDuringPressRef.current || didMoveBeyondLongPressToleranceRef.current) &&
        !didLongPressRef.current
      ) {
        suppressNextTapRef.current = true;
        window.setTimeout(() => {
          suppressNextTapRef.current = false;
          didMoveDuringPressRef.current = false;
          didMoveBeyondLongPressToleranceRef.current = false;
        }, VIDEO_SINGLE_TAP_DELAY_MS);
        return;
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      playCurrentVideo();

      window.setTimeout(() => {
        suppressNextTapRef.current = false;
        didLongPressRef.current = false;
        didMoveDuringPressRef.current = false;
        didMoveBeyondLongPressToleranceRef.current = false;
      }, VIDEO_SINGLE_TAP_DELAY_MS);
    },
    [
      didLongPressRef,
      didMoveBeyondLongPressToleranceRef,
      didMoveDuringPressRef,
      longPressTimeoutRef,
      playCurrentVideo,
      pointerStartRef,
      setIsLongPressing,
      suppressNextTapRef,
    ],
  );

  const handleVideoControlTap = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      if (
        isVideoMuted ||
        currentVideo.muted ||
        currentVideo.volume <= 0 ||
        currentVideo.paused ||
        isVideoPaused
      ) {
        playCurrentVideoWithSound();
        setIsUiHidden(true);
        return;
      }

      if (!currentVideo.paused) {
        pauseVideoPlayback();
      }
    },
    [
      backgroundVideoRef,
      isVideoMuted,
      isVideoPaused,
      pauseVideoPlayback,
      playCurrentVideoWithSound,
      setIsUiHidden,
      shouldShowVideo,
    ],
  );

  const progressGestures = usePsychologistsVideoProgressGestures({
    analytics,
    directory,
    feed,
    navigation,
    onboarding,
  });

  return {
    ...progressGestures,
    handleLongPressEnd,
    handleLongPressMove,
    handleLongPressStart,
    handleVideoAreaTap,
    handleVideoControlTap,
  };
};

export type PsychologistsVideoGestures = ReturnType<typeof usePsychologistsVideoGestures>;
