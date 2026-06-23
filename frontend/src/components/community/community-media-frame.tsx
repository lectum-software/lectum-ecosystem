"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export type CommunityMediaFrameVariant = "post" | "detail" | "reply";
export type CommunityMediaOrientation = "landscape" | "portrait" | "square";
export type CommunityMediaType = "image" | "video";

const MEDIA_ORIENTATION_LANDSCAPE_RATIO = 1.12;
const MEDIA_ORIENTATION_PORTRAIT_RATIO = 0.88;

const mediaFrameAspectClassName: Record<CommunityMediaOrientation, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
};

const mediaFrameWidthClassName: Record<
  CommunityMediaFrameVariant,
  Record<CommunityMediaOrientation, string>
> = {
  detail: {
    landscape: "w-full md:max-w-[560px]",
    portrait: "w-full md:max-w-[380px]",
    square: "w-full md:max-w-[480px]",
  },
  post: {
    landscape: "w-full md:max-w-[560px]",
    portrait: "w-full md:max-w-[380px]",
    square: "w-full md:max-w-[480px]",
  },
  reply: {
    landscape: "w-full md:max-w-[480px]",
    portrait: "w-full md:max-w-[340px]",
    square: "w-full md:max-w-[400px]",
  },
};

const mediaFrameSizes: Record<
  CommunityMediaFrameVariant,
  Record<CommunityMediaOrientation, string>
> = {
  detail: {
    landscape: "(max-width: 430px) calc(100vw - 40px), 560px",
    portrait: "(max-width: 430px) calc(100vw - 40px), 380px",
    square: "(max-width: 430px) calc(100vw - 40px), 480px",
  },
  post: {
    landscape: "(max-width: 430px) calc(100vw - 64px), 560px",
    portrait: "(max-width: 430px) calc(100vw - 64px), 380px",
    square: "(max-width: 430px) calc(100vw - 64px), 480px",
  },
  reply: {
    landscape: "(max-width: 430px) calc(100vw - 96px), 480px",
    portrait: "(max-width: 430px) calc(100vw - 96px), 340px",
    square: "(max-width: 430px) calc(100vw - 96px), 400px",
  },
};

export const normalizeCommunityMediaType = (value?: string | null): CommunityMediaType | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

export const communityMediaOrientationFromDimensions = (
  width?: number | null,
  height?: number | null,
): CommunityMediaOrientation => {
  if (!width || !height) return "landscape";

  const ratio = width / height;
  if (ratio > MEDIA_ORIENTATION_LANDSCAPE_RATIO) return "landscape";
  if (ratio < MEDIA_ORIENTATION_PORTRAIT_RATIO) return "portrait";

  return "square";
};

export const detectCommunityMediaOrientation = (
  src: string,
  mediaType: CommunityMediaType,
): Promise<CommunityMediaOrientation> => {
  if (typeof window === "undefined") {
    return Promise.resolve("landscape");
  }

  return new Promise((resolve) => {
    if (mediaType === "image") {
      const image = new window.Image();
      image.onload = () =>
        resolve(communityMediaOrientationFromDimensions(image.naturalWidth, image.naturalHeight));
      image.onerror = () => resolve("landscape");
      image.src = src;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve(communityMediaOrientationFromDimensions(video.videoWidth, video.videoHeight));
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => resolve("landscape");
    video.src = src;
    video.load();
  });
};

export const resolveCarouselMediaOrientation = (
  orientations: CommunityMediaOrientation[],
): CommunityMediaOrientation => {
  if (orientations.length === 0) return "landscape";
  if (orientations.every((orientation) => orientation === "landscape")) return "landscape";
  if (orientations.every((orientation) => orientation === "square")) return "square";
  if (orientations.every((orientation) => orientation === "portrait")) return "portrait";
  if (orientations.includes("portrait")) return "portrait";

  return "square";
};

export const getCommunityMediaFrameClassName = (
  variant: CommunityMediaFrameVariant,
  orientation: CommunityMediaOrientation,
  className?: string,
) =>
  cn(
    "grid max-w-full gap-2 justify-self-start md:mx-0",
    mediaFrameWidthClassName[variant][orientation],
    className,
  );

export const getCommunityMediaViewportClassName = (
  orientation: CommunityMediaOrientation,
  roundedClassName: string,
  className?: string,
) =>
  cn(
    "relative w-full overflow-hidden border border-border bg-surface-muted",
    mediaFrameAspectClassName[orientation],
    roundedClassName,
    className,
  );

export const getCommunityMediaSizes = (
  variant: CommunityMediaFrameVariant,
  orientation: CommunityMediaOrientation,
) => mediaFrameSizes[variant][orientation];

type CommunityMediaBlockProps = {
  alt: string;
  className?: string;
  footer?: ReactNode;
  imageClassName?: string;
  mediaType: string | null;
  mediaUrl: string | null;
  roundedClassName?: string;
  sizes?: string;
  variant?: CommunityMediaFrameVariant;
  videoClassName?: string;
  viewportClassName?: string;
};

export const CommunityMediaBlock = ({
  alt,
  className,
  footer,
  imageClassName,
  mediaType,
  mediaUrl,
  roundedClassName = "rounded-[22px]",
  sizes,
  variant = "post",
  videoClassName,
  viewportClassName,
}: CommunityMediaBlockProps) => {
  const normalizedMediaType = normalizeCommunityMediaType(mediaType);
  const resolvedUrl = mediaUrl ? resolvePublicMediaUrl(mediaUrl) : null;
  const [detectedMedia, setDetectedMedia] = useState<{
    orientation: CommunityMediaOrientation;
    src: string;
    type: CommunityMediaType;
  } | null>(null);

  useEffect(() => {
    if (!resolvedUrl || !normalizedMediaType) {
      return;
    }

    let isMounted = true;

    detectCommunityMediaOrientation(resolvedUrl, normalizedMediaType).then((orientation) => {
      if (!isMounted) return;

      setDetectedMedia({
        orientation,
        src: resolvedUrl,
        type: normalizedMediaType,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [normalizedMediaType, resolvedUrl]);

  if (!mediaUrl || !resolvedUrl || !normalizedMediaType) return null;

  const orientation =
    detectedMedia?.src === resolvedUrl && detectedMedia.type === normalizedMediaType
      ? detectedMedia.orientation
      : "landscape";
  const frameClassName = getCommunityMediaFrameClassName(variant, orientation, className);
  const viewportClasses = getCommunityMediaViewportClassName(
    orientation,
    roundedClassName,
    viewportClassName,
  );
  const resolvedSizes = sizes ?? getCommunityMediaSizes(variant, orientation);

  if (normalizedMediaType === "video") {
    return (
      <div className={frameClassName}>
        <VerticalVideoPlayer
          className={cn(
            "w-full border-border shadow-none",
            mediaFrameAspectClassName[orientation],
            roundedClassName,
            viewportClassName,
            videoClassName,
          )}
          fit={orientation === "landscape" ? "cover" : "contain"}
          fullscreenVariant="content"
          src={resolvedUrl}
          title={alt}
        />
        {footer}
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <div className={viewportClasses}>
        <Image
          alt={alt}
          className={cn("object-cover", imageClassName)}
          fill
          sizes={resolvedSizes}
          src={resolvedUrl}
          unoptimized={isPublicMediaUrl(mediaUrl)}
        />
      </div>
      {footer}
    </div>
  );
};
