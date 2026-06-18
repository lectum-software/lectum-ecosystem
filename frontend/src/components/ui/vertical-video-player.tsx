"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";

type VideoFit = "contain" | "cover";

type VerticalVideoPlayerProps = {
  className?: string;
  controls?: boolean;
  fit?: VideoFit;
  fullscreenVariant?: "default" | "content";
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
  poster?: string | null;
  preload?: "auto" | "metadata" | "none";
  src: string;
  title: string;
  videoClassName?: string;
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
  fit = "cover",
  fullscreenVariant = "default",
  onVideoElementReady,
  poster,
  preload = "metadata",
  src,
  title,
  videoClassName,
}: VerticalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const storedFullscreenStylesRef = useRef<StoredVideoStyle[] | null>(null);

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

  const handleContentClick = useCallback(() => {
    void toggleVideoElementPlayback(videoRef.current);
  }, []);

  return (
    <div
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-black shadow-inner",
        className,
      )}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Conteúdos enviados por usuários ainda não possuem legenda persistida. */}
      <video
        aria-label={title}
        className={cn("h-full w-full bg-black", fitClassName[fit], videoClassName)}
        controls={controls}
        controlsList="nodownload"
        data-lectum-content-video={fullscreenVariant === "content" ? "true" : undefined}
        data-lectum-video-player="true"
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
          bottom: controls ? "max(56px, 20%)" : 0,
        }}
        type="button"
      />
    </div>
  );
};
