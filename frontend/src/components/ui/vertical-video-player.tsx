"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";

import {
  clampNumber,
  fitClassName,
  formatVideoTime,
  getReadableVideoDuration,
  MOBILE_FULLSCREEN_MEDIA_QUERY,
  type StoredVideoStyle,
  staticMobileContentFullscreenStyles,
  type VerticalVideoPlayerProps,
  waitForVideoEvent,
} from "./vertical-video-player-support";

export const VerticalVideoPlayer = ({
  className,
  controls = true,
  controlsVariant = "native",
  fit = "cover",
  fullscreenVariant = "default",
  onContentClick,
  onVideoElementReady,
  poster,
  preload = "metadata",
  src,
  style,
  title,
  videoClassName,
  videoProps,
}: VerticalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const storedFullscreenStylesRef = useRef<StoredVideoStyle[] | null>(null);
  const isSeekingRef = useRef(false);
  const blobBackedVideoRef = useRef<{ source: string; url: string } | null>(null);
  const blobBackedVideoPromiseRef = useRef<Promise<boolean> | null>(null);
  const persistentSeekVerificationTimerRef = useRef<number | null>(null);
  const persistentProgressPointerIdRef = useRef<number | null>(null);
  const persistentProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const wasPlayingBeforePersistentSeekRef = useRef(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const usesMinimalControls = controls && controlsVariant === "minimal";
  const usesPersistentControls = controls && controlsVariant === "persistent";
  const hasNativeControls = controls && !usesMinimalControls && !usesPersistentControls;
  const {
    controlsList: videoControlsList,
    disablePictureInPicture: videoDisablePictureInPicture,
    disableRemotePlayback: videoDisableRemotePlayback,
    onClick: onVideoClick,
    onContextMenu: onVideoContextMenu,
    ...passthroughVideoProps
  } = videoProps ?? {};
  const defaultNativeControlsList = "nodownload noplaybackrate noremoteplayback";

  useEffect(() => {
    onVideoElementReady?.(videoRef.current);

    return () => onVideoElementReady?.(null);
  }, [onVideoElementReady]);

  useEffect(() => {
    const effectSource = src;

    return () => {
      if (persistentSeekVerificationTimerRef.current) {
        window.clearTimeout(persistentSeekVerificationTimerRef.current);
        persistentSeekVerificationTimerRef.current = null;
      }

      const currentBlobBackedVideo = blobBackedVideoRef.current;
      if (currentBlobBackedVideo?.source === effectSource) {
        URL.revokeObjectURL(currentBlobBackedVideo.url);
        blobBackedVideoRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (usesMinimalControls || usesPersistentControls) {
      video.controls = false;
    }
  }, [usesMinimalControls, usesPersistentControls]);

  useEffect(() => {
    if (fullscreenVariant !== "content" || typeof window === "undefined") return;

    const video = videoRef.current;
    if (!video) return;

    const restoreMobileContentFullscreenStyles = () => {
      const storedStyles = storedFullscreenStylesRef.current;
      if (!storedStyles) return;

      for (const { name, priority, value } of storedStyles) {
        video.style.setProperty(name, value, priority);
      }

      storedFullscreenStylesRef.current = null;
    };

    const applyMobileContentFullscreenStyles = () => {
      if (!window.matchMedia(MOBILE_FULLSCREEN_MEDIA_QUERY).matches) {
        restoreMobileContentFullscreenStyles();
        return;
      }

      const viewportHeight =
        typeof CSS !== "undefined" && CSS.supports("height: 100dvh") ? "100dvh" : "100vh";
      const dynamicStyles = [
        ["width", `min(100vw, calc(${viewportHeight} * 9 / 16))`],
        ["height", `min(${viewportHeight}, calc(100vw * 16 / 9))`],
        ["max-height", viewportHeight],
      ] as const;
      const fullscreenStyles = [...staticMobileContentFullscreenStyles, ...dynamicStyles];

      if (!storedFullscreenStylesRef.current) {
        storedFullscreenStylesRef.current = fullscreenStyles.map(([name]) => ({
          name,
          priority: video.style.getPropertyPriority(name),
          value: video.style.getPropertyValue(name),
        }));
      }

      for (const [name, value] of fullscreenStyles) {
        video.style.setProperty(name, value, "important");
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === video) {
        applyMobileContentFullscreenStyles();
        return;
      }

      restoreMobileContentFullscreenStyles();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    video.addEventListener("webkitbeginfullscreen", applyMobileContentFullscreenStyles);
    video.addEventListener("webkitendfullscreen", restoreMobileContentFullscreenStyles);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      video.removeEventListener("webkitbeginfullscreen", applyMobileContentFullscreenStyles);
      video.removeEventListener("webkitendfullscreen", restoreMobileContentFullscreenStyles);
      restoreMobileContentFullscreenStyles();
    };
  }, [fullscreenVariant]);

  useEffect(() => {
    if (!usesMinimalControls && !usesPersistentControls) return;

    const video = videoRef.current;
    if (!video) return;

    const syncPlayerState = () => {
      setIsPaused(video.paused || video.ended);
      setIsMuted(video.muted || video.volume <= 0);
      setDuration(getReadableVideoDuration(video));

      if (!isSeekingRef.current) {
        setCurrentTime(video.currentTime || 0);
      }
    };

    if (usesMinimalControls) {
      video.playbackRate = 1;
    }

    syncPlayerState();

    video.addEventListener("durationchange", syncPlayerState);
    video.addEventListener("ended", syncPlayerState);
    video.addEventListener("loadedmetadata", syncPlayerState);
    video.addEventListener("pause", syncPlayerState);
    video.addEventListener("play", syncPlayerState);
    video.addEventListener("timeupdate", syncPlayerState);
    video.addEventListener("volumechange", syncPlayerState);

    return () => {
      video.removeEventListener("durationchange", syncPlayerState);
      video.removeEventListener("ended", syncPlayerState);
      video.removeEventListener("loadedmetadata", syncPlayerState);
      video.removeEventListener("pause", syncPlayerState);
      video.removeEventListener("play", syncPlayerState);
      video.removeEventListener("timeupdate", syncPlayerState);
      video.removeEventListener("volumechange", syncPlayerState);
    };
  }, [usesMinimalControls, usesPersistentControls]);

  const handleContentClick = useCallback(() => {
    if (onContentClick) {
      onContentClick();
      return;
    }

    void toggleVideoElementPlayback(videoRef.current);
  }, [onContentClick]);

  const handlePersistentPlayPause = useCallback(() => {
    void toggleVideoElementPlayback(videoRef.current);
  }, []);

  const handlePersistentMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !(video.muted || video.volume <= 0);
    video.muted = nextMuted;

    if (!nextMuted && video.volume <= 0) {
      video.volume = 1;
    }

    setIsMuted(video.muted || video.volume <= 0);
  }, []);

  const ensureBlobBackedVideoForSeek = useCallback(
    (targetTime: number) => {
      if (typeof window === "undefined") {
        return Promise.resolve(false);
      }

      const video = videoRef.current;
      if (!video || !src) return Promise.resolve(false);

      const currentBlobBackedVideo = blobBackedVideoRef.current;
      if (currentBlobBackedVideo?.source === src) {
        return Promise.resolve(true);
      }

      if (blobBackedVideoPromiseRef.current) {
        return blobBackedVideoPromiseRef.current;
      }

      const promise = (async () => {
        const previousTime = video.currentTime || targetTime;
        const wasPaused = video.paused || video.ended;

        try {
          const response = await fetch(src, {
            cache: "force-cache",
          });

          if (!response.ok) return false;

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          if (blobBackedVideoRef.current) {
            URL.revokeObjectURL(blobBackedVideoRef.current.url);
          }

          blobBackedVideoRef.current = {
            source: src,
            url: objectUrl,
          };

          video.src = objectUrl;
          video.load();

          await waitForVideoEvent(video, "loadedmetadata");

          const duration = getReadableVideoDuration(video);
          const restoredTime = clampNumber(targetTime || previousTime, 0, duration || targetTime);

          try {
            video.currentTime = restoredTime;
            setCurrentTime(restoredTime);
          } catch {
            // O video segue utilizavel; apenas nao aplica o seek inicial do fallback.
          }

          if (!wasPaused) {
            void video.play().catch(() => undefined);
          }

          return true;
        } catch {
          return false;
        }
      })();

      blobBackedVideoPromiseRef.current = promise;

      promise.finally(() => {
        blobBackedVideoPromiseRef.current = null;
      });

      return promise;
    },
    [src],
  );

  const seekPersistentVideoToTime = useCallback(
    (nextTime: number) => {
      const video = videoRef.current;
      const resolvedDuration = video ? getReadableVideoDuration(video) : duration;

      if (!video || !resolvedDuration) return;

      const clampedTime = clampNumber(nextTime, 0, resolvedDuration);
      const commitSeek = () => {
        try {
          if ("fastSeek" in video && typeof video.fastSeek === "function") {
            video.fastSeek(clampedTime);
          } else {
            video.currentTime = clampedTime;
          }
        } catch {
          return;
        }

        setCurrentTime(clampedTime);
      };

      commitSeek();

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        const commitWhenReady = () => commitSeek();

        video.addEventListener("canplay", commitWhenReady, {
          once: true,
        });
        video.addEventListener("loadeddata", commitWhenReady, {
          once: true,
        });
      }

      if (persistentSeekVerificationTimerRef.current) {
        window.clearTimeout(persistentSeekVerificationTimerRef.current);
      }

      persistentSeekVerificationTimerRef.current = window.setTimeout(() => {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;

        if (Math.abs((currentVideo.currentTime || 0) - clampedTime) <= 0.75) return;

        void ensureBlobBackedVideoForSeek(clampedTime).then((didSwitchToBlob) => {
          if (!didSwitchToBlob) return;

          try {
            currentVideo.currentTime = clampedTime;
            setCurrentTime(clampedTime);
          } catch {
            // Mantem o estado atual se o browser ainda negar o seek.
          }
        });
      }, 320);
    },
    [duration, ensureBlobBackedVideoForSeek],
  );

  const seekPersistentProgressFromClientX = useCallback(
    (clientX: number) => {
      const video = videoRef.current;
      const track = persistentProgressTrackRef.current;
      const resolvedDuration = video ? getReadableVideoDuration(video) : duration;

      if (!video || !track || !resolvedDuration) return;

      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1);
      const nextTime = ratio * resolvedDuration;

      seekPersistentVideoToTime(nextTime);
    },
    [duration, seekPersistentVideoToTime],
  );

  const handlePersistentProgressPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const video = videoRef.current;
      wasPlayingBeforePersistentSeekRef.current = Boolean(video && !video.paused && !video.ended);

      if (wasPlayingBeforePersistentSeekRef.current) {
        video?.pause();
      }

      persistentProgressPointerIdRef.current = event.pointerId;
      isSeekingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      seekPersistentProgressFromClientX(event.clientX);
    },
    [seekPersistentProgressFromClientX],
  );

  const handlePersistentProgressPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (persistentProgressPointerIdRef.current !== event.pointerId) return;

      event.preventDefault();
      event.stopPropagation();
      seekPersistentProgressFromClientX(event.clientX);
    },
    [seekPersistentProgressFromClientX],
  );

  const handlePersistentProgressPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        persistentProgressPointerIdRef.current !== null &&
        persistentProgressPointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (persistentProgressPointerIdRef.current !== null) {
        const pointerId = persistentProgressPointerIdRef.current;

        if (event.currentTarget.hasPointerCapture(pointerId)) {
          event.currentTarget.releasePointerCapture(pointerId);
        }
      }

      persistentProgressPointerIdRef.current = null;
      isSeekingRef.current = false;
      setCurrentTime(videoRef.current?.currentTime || 0);

      if (wasPlayingBeforePersistentSeekRef.current) {
        wasPlayingBeforePersistentSeekRef.current = false;
        void videoRef.current?.play().catch(() => undefined);
      }
    },
    [],
  );

  const handlePersistentProgressKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const resolvedDuration = video ? getReadableVideoDuration(video) : duration;
      if (!video || !resolvedDuration) return;

      const step = Math.min(5, Math.max(1, resolvedDuration * 0.05));
      let nextTime: number | null = null;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextTime = currentTime - step;
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextTime = currentTime + step;
      } else if (event.key === "Home") {
        nextTime = 0;
      } else if (event.key === "End") {
        nextTime = resolvedDuration;
      }

      if (nextTime === null) return;

      event.preventDefault();
      event.stopPropagation();

      const clampedTime = clampNumber(nextTime, 0, resolvedDuration);
      seekPersistentVideoToTime(clampedTime);
    },
    [currentTime, duration, seekPersistentVideoToTime],
  );

  const handleVideoContextMenu = useCallback(
    (event: MouseEvent<HTMLVideoElement>) => {
      if (usesMinimalControls) {
        event.preventDefault();
      }

      onVideoContextMenu?.(event);
    },
    [onVideoContextMenu, usesMinimalControls],
  );

  const handleVideoClick = useCallback(
    (event: MouseEvent<HTMLVideoElement>) => {
      onVideoClick?.(event);

      if (!event.defaultPrevented && usesPersistentControls && onContentClick) {
        onContentClick();
      }
    },
    [onContentClick, onVideoClick, usesPersistentControls],
  );

  const persistentProgressRatio = duration > 0 ? clampNumber(currentTime / duration, 0, 1) : 0;

  return (
    <div
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-media-background shadow-inner",
        className,
      )}
      style={style}
    >
      <video
        {...passthroughVideoProps}
        aria-label={title}
        className={cn("h-full w-full bg-media-background", fitClassName[fit], videoClassName)}
        controls={hasNativeControls}
        controlsList={
          usesMinimalControls
            ? "nodownload noplaybackrate nofullscreen noremoteplayback"
            : (videoControlsList ?? defaultNativeControlsList)
        }
        data-lectum-content-video={fullscreenVariant === "content" ? "true" : undefined}
        data-lectum-video-player="true"
        disablePictureInPicture={
          videoDisablePictureInPicture ?? (usesMinimalControls || hasNativeControls)
        }
        disableRemotePlayback={
          videoDisableRemotePlayback ?? (usesMinimalControls || hasNativeControls)
        }
        onClick={handleVideoClick}
        onContextMenu={handleVideoContextMenu}
        playsInline
        poster={poster || undefined}
        preload={preload}
        ref={videoRef}
        src={src}
      >
        Seu navegador não suporta a reprodução de vídeo.
      </video>
      <button
        aria-label={
          onContentClick
            ? `Mostrar interface do vídeo: ${title}`
            : `Alternar reprodução do vídeo: ${title}`
        }
        className="absolute inset-x-0 top-0 z-[1] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/50"
        onClick={handleContentClick}
        style={{
          bottom: usesPersistentControls
            ? "max(104px, calc(env(safe-area-inset-bottom) + 96px))"
            : controls
              ? "max(64px, 20%)"
              : 0,
        }}
        type="button"
      />
      {usesPersistentControls ? (
        <div
          data-lectum-video-player-controls="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-4 text-primary-foreground"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)",
          }}
        >
          <div
            className="pointer-events-auto [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.78))]"
            style={{ touchAction: "none" }}
          >
            <div
              aria-label={`Progresso do vídeo: ${title}`}
              aria-valuemax={Math.round(duration)}
              aria-valuemin={0}
              aria-valuenow={Math.round(currentTime)}
              className="relative flex h-7 w-full cursor-pointer items-center outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
              onKeyDown={handlePersistentProgressKeyDown}
              onPointerCancel={handlePersistentProgressPointerEnd}
              onPointerDown={handlePersistentProgressPointerDown}
              onPointerMove={handlePersistentProgressPointerMove}
              onPointerUp={handlePersistentProgressPointerEnd}
              ref={persistentProgressTrackRef}
              role="slider"
              tabIndex={0}
              style={{ touchAction: "none" }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-media-background/35"
              />
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface"
                style={{ width: `${persistentProgressRatio * 100}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface shadow-lectum-soft"
                style={{ left: `${persistentProgressRatio * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label={isPaused ? `Reproduzir vídeo: ${title}` : `Pausar vídeo: ${title}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
                onClick={handlePersistentPlayPause}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                {isPaused ? (
                  <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
                ) : (
                  <Pause className="h-[18px] w-[18px] fill-current" />
                )}
              </button>

              <span className="min-w-0 flex-1 text-[12px] font-semibold tabular-nums text-primary-foreground">
                {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
              </span>

              <button
                aria-label={isMuted ? `Ativar som do vídeo: ${title}` : `Mutar vídeo: ${title}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
                onClick={handlePersistentMuteToggle}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                {isMuted ? (
                  <VolumeX className="h-[18px] w-[18px]" />
                ) : (
                  <Volume2 className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {usesMinimalControls ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-media-background/80 via-media-background/45 to-transparent px-4 pb-4 pt-12">
          <div className="pointer-events-auto flex items-center">
            <button
              aria-label={isPaused ? `Reproduzir video: ${title}` : `Pausar video: ${title}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-[var(--lectum-shadow-soft)] transition hover:scale-[1.03] hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
              onClick={handleContentClick}
              type="button"
            >
              {isPaused ? (
                <Play className="h-4 w-4 fill-current" />
              ) : (
                <Pause className="h-4 w-4 fill-current" />
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
