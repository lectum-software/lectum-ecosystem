"use client";

import { Pause, Play } from "lucide-react";
import {
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useVerticalVideoPlayerImmersiveControls } from "./vertical-video-player-immersive-controls";
import { VerticalVideoPlayerPersistentControls } from "./vertical-video-player-persistent-controls";
import {
  clampNumber,
  fetchBoundedVideoBlob,
  fitClassName,
  getReadableVideoDuration,
  MOBILE_FULLSCREEN_MEDIA_QUERY,
  type StoredVideoStyle,
  staticMobileContentFullscreenStyles,
  type VerticalVideoPlayerProps,
  waitForVideoEvent,
} from "./vertical-video-player-support";

type BlobBackedVideoRequest = {
  controller: AbortController;
  promise: Promise<boolean>;
  source: string;
};

const SEEK_FALLBACK_TIMEOUT_MS = 15_000;

export const VerticalVideoPlayer = ({
  className,
  controls = true,
  controlsVariant = "native",
  fit = "cover",
  fullscreenVariant = "default",
  onContentClick,
  onVideoElementReady,
  persistentControlsLayout = "stacked",
  persistentControlsVisibility = "auto",
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
  const latestSourceRef = useRef(src);
  const isSeekingRef = useRef(false);
  const blobBackedVideoRef = useRef<{ source: string; url: string } | null>(null);
  const blobBackedVideoRequestRef = useRef<BlobBackedVideoRequest | null>(null);
  const persistentSeekVerificationTimerRef = useRef<number | null>(null);
  const persistentProgressPointerIdRef = useRef<number | null>(null);
  const persistentProgressTrackRef = useRef<HTMLDivElement | null>(null);
  const wasPlayingBeforePersistentSeekRef = useRef(false);
  const persistentReadySeekCleanupRef = useRef<(() => void) | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const usesMinimalControls = controls && controlsVariant === "minimal";
  const usesPersistentControls = controls && controlsVariant === "persistent";
  const usesMediaPersistentControls =
    usesPersistentControls && persistentControlsLayout === "media";
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
  useLayoutEffect(() => {
    latestSourceRef.current = src;
  }, [src]);

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

      persistentReadySeekCleanupRef.current?.();
      persistentReadySeekCleanupRef.current = null;

      const activeRequest = blobBackedVideoRequestRef.current;
      if (activeRequest?.source === effectSource) {
        activeRequest.controller.abort();
        blobBackedVideoRequestRef.current = null;
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

  const {
    controlsHidden: persistentControlsHidden,
    handleContentClick,
    handleControlsInteraction,
    handleFullscreen: handlePersistentFullscreen,
    handleMuteToggle: handlePersistentMuteToggle,
    handlePlayPause: handlePersistentPlayPause,
  } = useVerticalVideoPlayerImmersiveControls({
    controlsVisibility: persistentControlsVisibility,
    enabled: usesPersistentControls,
    fullscreenVariant,
    isPaused,
    onContentClick,
    videoRef,
  });

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

      const pendingRequest = blobBackedVideoRequestRef.current;
      if (pendingRequest?.source === src) {
        return pendingRequest.promise;
      }

      pendingRequest?.controller.abort();

      const source = src;
      const controller = new AbortController();
      let request: BlobBackedVideoRequest | null = null;

      const promise = (async () => {
        const previousTime = video.currentTime || targetTime;
        const wasPaused = video.paused || video.ended;
        const timeout = window.setTimeout(() => controller.abort(), SEEK_FALLBACK_TIMEOUT_MS);

        const isCurrentRequest = () =>
          !controller.signal.aborted &&
          request !== null &&
          blobBackedVideoRequestRef.current === request &&
          videoRef.current === video &&
          latestSourceRef.current === source;

        try {
          const blob = await fetchBoundedVideoBlob(source, controller.signal);
          if (!blob || !isCurrentRequest()) return false;

          const objectUrl = URL.createObjectURL(blob);

          if (!isCurrentRequest()) {
            URL.revokeObjectURL(objectUrl);
            return false;
          }

          if (blobBackedVideoRef.current) {
            URL.revokeObjectURL(blobBackedVideoRef.current.url);
          }

          blobBackedVideoRef.current = {
            source,
            url: objectUrl,
          };

          video.src = objectUrl;
          video.load();

          await waitForVideoEvent(video, "loadedmetadata", controller.signal);

          if (!isCurrentRequest()) {
            const currentBlobBackedVideo = blobBackedVideoRef.current;
            if (currentBlobBackedVideo?.url === objectUrl) {
              blobBackedVideoRef.current = null;
            }
            URL.revokeObjectURL(objectUrl);
            return false;
          }

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
        } finally {
          window.clearTimeout(timeout);
        }
      })();

      request = {
        controller,
        promise,
        source,
      };
      blobBackedVideoRequestRef.current = request;

      promise.finally(() => {
        if (blobBackedVideoRequestRef.current === request) {
          blobBackedVideoRequestRef.current = null;
        }
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
        if (videoRef.current !== video) return;

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

      persistentReadySeekCleanupRef.current?.();
      persistentReadySeekCleanupRef.current = null;

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        const removeReadyListeners = () => {
          video.removeEventListener("canplay", commitWhenReady);
          video.removeEventListener("loadeddata", commitWhenReady);
          if (persistentReadySeekCleanupRef.current === removeReadyListeners) {
            persistentReadySeekCleanupRef.current = null;
          }
        };
        const commitWhenReady = () => {
          removeReadyListeners();
          commitSeek();
        };

        persistentReadySeekCleanupRef.current = removeReadyListeners;

        video.addEventListener("canplay", commitWhenReady);
        video.addEventListener("loadeddata", commitWhenReady);
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
      if (!event.defaultPrevented && usesPersistentControls) {
        handleContentClick();
      }
    },
    [handleContentClick, onVideoClick, usesPersistentControls],
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
          persistentControlsHidden
            ? `Mostrar controles do vídeo: ${title}`
            : onContentClick
              ? `Mostrar interface do vídeo: ${title}`
              : `Alternar reprodução do vídeo: ${title}`
        }
        className="absolute inset-x-0 top-0 z-[1] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/50"
        onClick={handleContentClick}
        style={{
          bottom: usesPersistentControls
            ? persistentControlsHidden
              ? 0
              : usesMediaPersistentControls
                ? "calc(var(--lectum-bottom-fixed-padding) + 4.5rem)"
                : "calc(var(--lectum-bottom-fixed-padding) + 5.25rem)"
            : controls
              ? "max(64px, 20%)"
              : 0,
        }}
        type="button"
      />
      {usesMediaPersistentControls && !persistentControlsHidden ? (
        <button
          aria-label={isPaused ? `Reproduzir vídeo: ${title}` : `Pausar vídeo: ${title}`}
          className="absolute top-1/2 left-1/2 z-[2] grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface/75 text-foreground shadow-[var(--lectum-shadow-soft)] backdrop-blur transition hover:scale-[1.03] hover:bg-surface/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70 active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem]"
          onClick={handlePersistentPlayPause}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {isPaused ? (
            <Play className="ml-1 h-9 w-9 fill-current sm:h-10 sm:w-10" />
          ) : (
            <Pause className="h-8 w-8 fill-current sm:h-9 sm:w-9" />
          )}
        </button>
      ) : null}
      {usesPersistentControls ? (
        <VerticalVideoPlayerPersistentControls
          currentTime={currentTime}
          duration={duration}
          isMuted={isMuted}
          isPaused={isPaused}
          hidden={persistentControlsHidden}
          layout={persistentControlsLayout}
          onInteraction={handleControlsInteraction}
          onFullscreen={usesMediaPersistentControls ? handlePersistentFullscreen : undefined}
          onMuteToggle={handlePersistentMuteToggle}
          onPlayPause={handlePersistentPlayPause}
          onProgressKeyDown={handlePersistentProgressKeyDown}
          onProgressPointerDown={handlePersistentProgressPointerDown}
          onProgressPointerEnd={handlePersistentProgressPointerEnd}
          onProgressPointerMove={handlePersistentProgressPointerMove}
          progressRatio={persistentProgressRatio}
          progressTrackRef={persistentProgressTrackRef}
          title={title}
        />
      ) : null}
      {usesMinimalControls ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-media-background/80 via-media-background/45 to-transparent px-4 pt-12 pb-[var(--lectum-bottom-fixed-padding)]">
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
