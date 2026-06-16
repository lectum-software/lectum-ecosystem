"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { toggleVideoElementPlayback } from "@/lib/video-interactions";

type VideoFit = "contain" | "cover";

type VerticalVideoPlayerProps = {
  className?: string;
  controls?: boolean;
  fit?: VideoFit;
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

export const VerticalVideoPlayer = ({
  className,
  controls = true,
  fit = "cover",
  poster,
  preload = "metadata",
  src,
  title,
  videoClassName,
}: VerticalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
