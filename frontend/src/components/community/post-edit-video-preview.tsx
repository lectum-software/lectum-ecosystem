"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useAttachVideoSource, useVideoPlaybackSource } from "@/hooks/video-stream";
import { isVideoAssetReference } from "@/utils/video-stream";

type VideoPreviewProps = {
  src: string;
  poster?: string | null;
  onOrientation: (orientation: "landscape" | "portrait") => void;
};

function VideoFrame({ src, adaptive, onOrientation }: VideoPreviewProps & { adaptive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const attachFailed = useAttachVideoSource({ adaptive, source: src, videoRef });
  if (!src || failed || attachFailed) {
    return (
      <span
        role="img"
        aria-label="Miniatura de vídeo indisponível"
        className="grid h-full w-full place-items-center text-muted"
      >
        <ImageOff aria-hidden="true" className="h-5 w-5" />
      </span>
    );
  }
  return (
    <video
      aria-label="Miniatura do vídeo anexado"
      className="h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
      ref={videoRef}
      src={adaptive ? undefined : src}
      onError={() => setFailed(true)}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        onOrientation(video.videoWidth / video.videoHeight >= 1.12 ? "landscape" : "portrait");
        // iOS does not reliably paint a frame with metadata alone.
        if (Number.isFinite(video.duration) && video.duration > 0)
          video.currentTime = Math.min(0.1, video.duration / 2);
      }}
    />
  );
}

function VideoThumbnail({
  src,
  poster,
  onOrientation,
  adaptive = false,
}: VideoPreviewProps & { adaptive?: boolean }) {
  const [failedPoster, setFailedPoster] = useState<string | null>(null);
  return poster && failedPoster !== poster ? (
    <Image
      alt="Miniatura do vídeo anexado"
      className="object-cover"
      fill
      sizes="160px"
      src={poster}
      unoptimized
      onError={() => setFailedPoster(poster)}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        onOrientation(naturalWidth / naturalHeight >= 1.12 ? "landscape" : "portrait");
      }}
    />
  ) : (
    <VideoFrame key={src} src={src} adaptive={adaptive} onOrientation={onOrientation} />
  );
}

function StreamVideoThumbnail({ src, poster, onOrientation }: VideoPreviewProps) {
  const playback = useVideoPlaybackSource(src, poster);
  return (
    <VideoThumbnail
      src={playback.source}
      poster={playback.poster}
      adaptive
      onOrientation={onOrientation}
    />
  );
}

export const PostEditVideoPreview = (props: VideoPreviewProps) =>
  isVideoAssetReference(props.src) ? (
    <StreamVideoThumbnail {...props} />
  ) : (
    <VideoThumbnail {...props} />
  );
