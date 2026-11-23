"use client";

import { useContext, useRef } from "react";
import { useAttachVideoSource } from "@/hooks/video-stream";
import { ContentVideoOpenContext } from "./content-video-context";

export function PublicReelPlayer({
  src,
  poster,
  title,
  captions,
}: {
  src?: string;
  poster?: string;
  title: string;
  captions?: string;
}) {
  const open = useContext(ContentVideoOpenContext);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const adaptive = Boolean(src?.includes("/manifest/video.m3u8"));
  useAttachVideoSource({ adaptive, source: open ? "" : (src ?? ""), videoRef });
  return (
    <video
      ref={videoRef}
      className="h-full w-full object-contain"
      controls
      playsInline
      preload="metadata"
      src={open ? undefined : src}
      poster={poster}
      aria-label={title}
    >
      <track kind="captions" label="Português" srcLang="pt" src={captions} />
    </video>
  );
}
