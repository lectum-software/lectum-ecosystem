"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useVideoAssetPlayback } from "@/api/callers/video-assets";
import {
  documentHasUserAttention,
  subscribeDocumentAttention,
} from "@/components/analytics/attention";
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
    captions: hasFreshPlayback ? playback.data?.captions : null,
    refetch: refetchPlayback,
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
  standby = false,
  videoElementVersion = 0,
  videoRef,
}: {
  adaptive: boolean;
  source: string;
  standby?: boolean;
  videoElementVersion?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
}) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const standbyRef = useRef(standby);
  const bufferConfig = useRef<{ maxBufferLength: number; maxMaxBufferLength: number } | null>(null);
  useEffect(() => {
    standbyRef.current = standby;
    if (bufferConfig.current) {
      bufferConfig.current.maxBufferLength = standby ? 3 : 30;
      bufferConfig.current.maxMaxBufferLength = standby ? 6 : 60;
    }
  }, [standby]);

  useEffect(() => {
    // Reanexa HLS/native source quando o ref recebe outro elemento de video.
    void videoElementVersion;

    if (!adaptive || !source) return;

    const video = videoRef.current;
    if (!video) return;

    let active = true;
    let destroyPlayer: (() => void) | null = null;
    let syncLoading = () => {};
    const unsubscribeAttention = subscribeDocumentAttention(() => syncLoading());
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
        unsubscribeAttention();
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
          autoStartLoad: false,
          enableWorker: true,
          maxBufferLength: standbyRef.current ? 3 : 30,
          maxMaxBufferLength: standbyRef.current ? 6 : 60,
        });
        bufferConfig.current = player.config;
        syncLoading = () => {
          if (!active) return;
          if (documentHasUserAttention()) player.startLoad();
          else player.stopLoad();
        };
        destroyPlayer = () => player.destroy();
        player.on(Hls.Events.MANIFEST_PARSED, syncLoading);
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
            networkRecoveryAttempts += 1;
            syncLoading();
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
      bufferConfig.current = null;
      unsubscribeAttention();
      destroyPlayer?.();
      if (video.currentSrc) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [adaptive, source, videoElementVersion, videoRef]);

  return failedSource === source;
};
