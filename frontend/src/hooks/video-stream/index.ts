"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { useVideoAssetPlayback } from "@/api/callers/video-assets";
import {
  isVideoAssetReference,
  isVideoPlaybackFresh,
  selectAdaptiveVideoPlaybackAdapter,
} from "@/utils/video-stream";

const PLAYBACK_REFRESH_ADVANCE_MS = 2 * 60 * 1_000;

export const useVideoPlaybackSource = (
  source: string,
  fallbackPoster?: string | null,
  enabled = true,
) => {
  const isStream = isVideoAssetReference(source);
  const playback = useVideoAssetPlayback(isStream ? source : null, enabled);
  const refetchPlayback = playback.refetch;
  const hasFreshPlayback = isVideoPlaybackFresh(playback.data?.expires_at);

  useEffect(() => {
    const expiresAt = playback.data?.expires_at;
    if (!isStream || !enabled || !expiresAt) return;

    const expiresAtMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) return;

    const refreshIn = Math.max(1_000, expiresAtMs - Date.now() - PLAYBACK_REFRESH_ADVANCE_MS);
    const timeout = window.setTimeout(() => {
      void refetchPlayback();
    }, refreshIn);

    return () => window.clearTimeout(timeout);
  }, [enabled, isStream, playback.data?.expires_at, refetchPlayback]);

  return {
    error: isStream && !hasFreshPlayback ? playback.error : null,
    isLoading: isStream && enabled && !playback.error && !hasFreshPlayback,
    isStream,
    poster: isStream
      ? hasFreshPlayback
        ? (playback.data?.thumbnail_url ?? fallbackPoster)
        : fallbackPoster
      : fallbackPoster,
    source: isStream ? (enabled && hasFreshPlayback ? (playback.data?.hls_url ?? "") : "") : source,
  };
};

export const useAttachVideoSource = ({
  adaptive,
  source,
  videoRef,
}: {
  adaptive: boolean;
  source: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  useEffect(() => {
    if (!adaptive || !source) return;

    const video = videoRef.current;
    if (!video) return;

    let active = true;
    let destroyPlayer: (() => void) | null = null;
    let mediaRecoveryAttempts = 0;
    let networkRecoveryAttempts = 0;
    setFailedSource(null);

    if (
      selectAdaptiveVideoPlaybackAdapter({
        hlsJsSupported: false,
        nativeHlsSupported: Boolean(video.canPlayType("application/vnd.apple.mpegurl")),
      }) === "native"
    ) {
      video.src = source;
      video.load();

      return () => {
        if (video.currentSrc === source || video.src === source) {
          video.removeAttribute("src");
          video.load();
        }
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (!active) return;
        if (
          selectAdaptiveVideoPlaybackAdapter({
            hlsJsSupported: Hls.isSupported(),
            nativeHlsSupported: false,
          }) === "unsupported"
        ) {
          setFailedSource(source);
          return;
        }

        const player = new Hls({
          enableWorker: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        destroyPlayer = () => player.destroy();
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
            networkRecoveryAttempts += 1;
            player.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
            mediaRecoveryAttempts += 1;
            player.recoverMediaError();
            return;
          }

          setFailedSource(source);
          player.destroy();
        });
        player.loadSource(source);
        player.attachMedia(video);
      })
      .catch(() => {
        if (active) setFailedSource(source);
      });

    return () => {
      active = false;
      destroyPlayer?.();
      if (video.currentSrc) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [adaptive, source, videoRef]);

  return failedSource === source;
};
