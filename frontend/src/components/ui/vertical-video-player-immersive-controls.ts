"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { requestVideoFullscreen } from "@/lib/video-fullscreen";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";
import {
  type PersistentControlsVisibility,
  shouldHidePersistentVideoControls,
} from "./vertical-video-player-support";

type UseVerticalVideoPlayerImmersiveControlsInput = {
  controlsVisibility?: PersistentControlsVisibility;
  enabled: boolean;
  fullscreenVariant: "default" | "content";
  isPaused: boolean;
  onContentClick?: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
};

const REVEALED_CONTROLS_AUTO_HIDE_MS = 2200;

export const useVerticalVideoPlayerImmersiveControls = ({
  controlsVisibility = "auto",
  enabled,
  fullscreenVariant,
  isPaused,
  onContentClick,
  videoRef,
}: UseVerticalVideoPlayerImmersiveControlsInput) => {
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlsRevealed, setControlsRevealed] = useState(false);

  const clearAutoHideTimer = useCallback(() => {
    if (!autoHideTimerRef.current) return;

    clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = null;
  }, []);

  const isVideoPlaying = useCallback(() => {
    const video = videoRef.current;
    return Boolean(video && !video.paused && !video.ended);
  }, [videoRef]);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHideTimer();

    if (controlsVisibility === "always") return;

    autoHideTimerRef.current = setTimeout(() => {
      if (isVideoPlaying()) setControlsRevealed(false);
      autoHideTimerRef.current = null;
    }, REVEALED_CONTROLS_AUTO_HIDE_MS);
  }, [clearAutoHideTimer, controlsVisibility, isVideoPlaying]);

  const revealControlsTemporarily = useCallback(() => {
    setControlsRevealed(true);

    if (isVideoPlaying()) scheduleAutoHide();
  }, [isVideoPlaying, scheduleAutoHide]);

  useEffect(() => () => clearAutoHideTimer(), [clearAutoHideTimer]);

  const handleContentClick = useCallback(() => {
    if (enabled && isVideoPlaying()) {
      revealControlsTemporarily();
      onContentClick?.();
      return;
    }

    if (onContentClick) {
      onContentClick();
      return;
    }

    void toggleVideoElementPlayback(videoRef.current);
  }, [enabled, isVideoPlaying, onContentClick, revealControlsTemporarily, videoRef]);

  const handlePlayPause = useCallback(() => {
    if (enabled) {
      clearAutoHideTimer();
      setControlsRevealed(false);
    }

    void toggleVideoElementPlayback(videoRef.current);
  }, [clearAutoHideTimer, enabled, videoRef]);

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !(video.muted || video.volume <= 0);
    video.muted = nextMuted;

    if (!nextMuted && video.volume <= 0) video.volume = 1;
  }, [videoRef]);

  const handleFullscreen = useCallback(() => {
    void requestVideoFullscreen(videoRef.current, {
      forceContain: fullscreenVariant === "content",
      temporaryControls: true,
    });
  }, [fullscreenVariant, videoRef]);

  const handleControlsInteraction = useCallback(() => {
    if (enabled && controlsVisibility === "auto" && isVideoPlaying()) scheduleAutoHide();
  }, [controlsVisibility, enabled, isVideoPlaying, scheduleAutoHide]);

  const controlsHidden = shouldHidePersistentVideoControls({
    controlsRevealed,
    enabled,
    isPaused,
    visibility: controlsVisibility,
  });

  return {
    controlsHidden,
    controlsVisible: !controlsHidden,
    handleContentClick,
    handleControlsInteraction,
    handleFullscreen,
    handleMuteToggle,
    handlePlayPause,
  };
};
