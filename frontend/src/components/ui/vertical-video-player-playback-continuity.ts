"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import { clampNumber } from "./vertical-video-player-support";

type VideoPlaybackSnapshot = {
  currentTime: number;
  muted: boolean;
  paused: boolean;
  playbackRate: number;
  volume: number;
};

type UseVideoPlaybackContinuityInput = {
  currentTime: number;
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
  setCurrentTime: (value: number) => void;
  setIsMuted: (value: boolean) => void;
  setIsPaused: (value: boolean) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export const useVideoPlaybackContinuity = ({
  currentTime,
  onVideoElementReady,
  setCurrentTime,
  setIsMuted,
  setIsPaused,
  videoRef,
}: UseVideoPlaybackContinuityInput) => {
  const playbackSnapshotRef = useRef<VideoPlaybackSnapshot | null>(null);
  const [videoElementVersion, setVideoElementVersion] = useState(0);

  const capturePlaybackSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      playbackSnapshotRef.current = null;
      return;
    }

    const readableCurrentTime = Number.isFinite(video.currentTime)
      ? video.currentTime
      : currentTime;

    playbackSnapshotRef.current = {
      currentTime: readableCurrentTime > 0 ? readableCurrentTime : currentTime,
      muted: video.muted,
      paused: video.paused || video.ended,
      playbackRate:
        Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1,
      volume: Number.isFinite(video.volume) ? clampNumber(video.volume, 0, 1) : 1,
    };
  }, [currentTime, videoRef]);

  const restorePlaybackSnapshot = useCallback(
    (video: HTMLVideoElement) => {
      const applySnapshot = () => {
        const snapshot = playbackSnapshotRef.current;
        if (!snapshot || videoRef.current !== video) return;

        playbackSnapshotRef.current = null;

        try {
          video.muted = snapshot.muted;
        } catch {
          // Mantem o estado padrao se o navegador bloquear o ajuste.
        }

        try {
          video.volume = snapshot.volume;
        } catch {
          // Alguns browsers mobile ignoram volume programatico.
        }

        try {
          video.playbackRate = snapshot.playbackRate;
        } catch {
          // Mantem a velocidade padrao se a midia negar o ajuste.
        }

        if (snapshot.currentTime > 0) {
          try {
            video.currentTime = snapshot.currentTime;
            setCurrentTime(snapshot.currentTime);
          } catch {
            // O video segue utilizavel; apenas nao restaura o ponto exato.
          }
        }

        setIsMuted(video.muted || video.volume <= 0);
        setIsPaused(snapshot.paused);

        if (!snapshot.paused) {
          void video
            .play()
            .then(() => setIsPaused(false))
            .catch(() => setIsPaused(true));
        }
      };

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        applySnapshot();
        return;
      }

      video.addEventListener("loadedmetadata", applySnapshot, { once: true });
    },
    [setCurrentTime, setIsMuted, setIsPaused, videoRef],
  );

  const handleVideoElementRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (videoRef.current === node) return;

      videoRef.current = node;
      onVideoElementReady?.(node);

      if (!node) return;

      setVideoElementVersion((version) => version + 1);
      restorePlaybackSnapshot(node);
    },
    [onVideoElementReady, restorePlaybackSnapshot, videoRef],
  );

  return {
    capturePlaybackSnapshot,
    handleVideoElementRef,
    videoElementVersion,
  };
};
