"use client";

import { Pause, Play } from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";

type VideoFit = "contain" | "cover";
type ControlsVariant = "native" | "minimal";
type VideoDataAttributes = {
  [key: `data-${string}`]: string | undefined;
};
type VerticalVideoElementProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children" | "className" | "controls" | "poster" | "preload" | "ref" | "src"
> &
  VideoDataAttributes;

type VerticalVideoPlayerProps = {
  className?: string;
  controls?: boolean;
  controlsVariant?: ControlsVariant;
  fit?: VideoFit;
  fullscreenVariant?: "default" | "content";
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
  poster?: string | null;
  preload?: "auto" | "metadata" | "none";
  src: string;
  style?: CSSProperties;
  title: string;
  videoClassName?: string;
  videoProps?: VerticalVideoElementProps;
};

const fitClassName: Record<VideoFit, string> = {
  contain: "object-contain",
  cover: "object-cover",
};

const MOBILE_FULLSCREEN_MEDIA_QUERY = "(max-width: 1023px)";

const staticMobileContentFullscreenStyles = [
  ["position", "fixed"],
  ["inset", "0"],
  ["display", "block"],
  ["min-width", "0"],
  ["min-height", "0"],
  ["max-width", "100vw"],
  ["margin", "auto"],
  ["aspect-ratio", "9 / 16"],
  ["background", "#000"],
  ["object-fit", "contain"],
  ["object-position", "center center"],
] as const;

type StoredVideoStyle = {
  name: string;
  priority: string;
  value: string;
};

export const VerticalVideoPlayer = ({
  className,
  controls = true,
  controlsVariant = "native",
  fit = "cover",
  fullscreenVariant = "default",
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
  const [isPaused, setIsPaused] = useState(true);
  const usesMinimalControls = controls && controlsVariant === "minimal";
  const hasNativeControls = controls && !usesMinimalControls;
  const {
    controlsList: videoControlsList,
    onContextMenu: onVideoContextMenu,
    ...passthroughVideoProps
  } = videoProps ?? {};

  useEffect(() => {
    onVideoElementReady?.(videoRef.current);

    return () => onVideoElementReady?.(null);
  }, [onVideoElementReady]);

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
    if (!usesMinimalControls) return;

    const video = videoRef.current;
    if (!video) return;

    const syncPlayerState = () => {
      setIsPaused(video.paused || video.ended);
    };

    video.playbackRate = 1;
    syncPlayerState();

    video.addEventListener("ended", syncPlayerState);
    video.addEventListener("pause", syncPlayerState);
    video.addEventListener("play", syncPlayerState);

    return () => {
      video.removeEventListener("ended", syncPlayerState);
      video.removeEventListener("pause", syncPlayerState);
      video.removeEventListener("play", syncPlayerState);
    };
  }, [usesMinimalControls]);

  const handleContentClick = useCallback(() => {
    void toggleVideoElementPlayback(videoRef.current);
  }, []);

  const handleVideoContextMenu = useCallback(
    (event: MouseEvent<HTMLVideoElement>) => {
      if (usesMinimalControls) {
        event.preventDefault();
      }

      onVideoContextMenu?.(event);
    },
    [onVideoContextMenu, usesMinimalControls],
  );

  return (
    <div
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-black shadow-inner",
        className,
      )}
      style={style}
    >
      <video
        {...passthroughVideoProps}
        aria-label={title}
        className={cn("h-full w-full bg-black", fitClassName[fit], videoClassName)}
        controls={hasNativeControls}
        controlsList={
          usesMinimalControls
            ? "nodownload noplaybackrate nofullscreen noremoteplayback"
            : (videoControlsList ?? "nodownload")
        }
        data-lectum-content-video={fullscreenVariant === "content" ? "true" : undefined}
        data-lectum-video-player="true"
        disablePictureInPicture={usesMinimalControls}
        disableRemotePlayback={usesMinimalControls}
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
        aria-label={`Alternar reprodução do vídeo: ${title}`}
        className="absolute inset-x-0 top-0 z-[1] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        onClick={handleContentClick}
        style={{
          bottom: controls ? "max(64px, 20%)" : 0,
        }}
        type="button"
      />
      {usesMinimalControls ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-4 pt-12">
          <div className="pointer-events-auto flex items-center">
            <button
              aria-label={isPaused ? `Reproduzir video: ${title}` : `Pausar video: ${title}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-[var(--lectum-shadow-soft)] transition hover:scale-[1.03] hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
