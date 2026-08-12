"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import {
  type ContentVideoWatchTrackingTarget,
  useContentVideoWatchTracking,
} from "@/components/analytics/content-video-watch-tracker";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { createVideoPosterObjectUrl } from "@/utils/video-thumbnail";

export type CommunityMediaFrameVariant = "post" | "detail" | "reply";
export type CommunityMediaOrientation = "landscape" | "portrait" | "square";
export type CommunityMediaType = "image" | "video";
export type CommunityMediaMetadata = {
  height?: number | null;
  orientation: CommunityMediaOrientation;
  width?: number | null;
};

const MEDIA_ORIENTATION_LANDSCAPE_RATIO = 1.12;
const MEDIA_ORIENTATION_PORTRAIT_RATIO = 0.88;
const CAROUSEL_VERTICAL_CANONICAL_MAX_RATIO = 0.7;

const imageMediaFrameAspectClassName: Record<CommunityMediaOrientation, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[9/16]",
  square: "aspect-square",
};

const videoMediaFrameAspectClassName: Record<CommunityMediaOrientation, string> = {
  landscape: "aspect-video",
  portrait: "aspect-[9/16]",
  square: "aspect-video",
};

const mediaFrameWidthClassName: Record<
  CommunityMediaFrameVariant,
  Record<CommunityMediaOrientation, string>
> = {
  detail: {
    landscape: "w-full md:max-w-[460px]",
    portrait: "w-full md:max-w-[300px]",
    square: "w-full md:max-w-[380px]",
  },
  post: {
    landscape: "w-full md:max-w-[460px]",
    portrait: "w-full md:max-w-[300px]",
    square: "w-full md:max-w-[380px]",
  },
  reply: {
    landscape: "w-full md:max-w-[420px]",
    portrait: "w-full md:max-w-[260px]",
    square: "w-full md:max-w-[340px]",
  },
};

const mediaFrameSizes: Record<
  CommunityMediaFrameVariant,
  Record<CommunityMediaOrientation, string>
> = {
  detail: {
    landscape: "(max-width: 430px) calc(100vw - 40px), 460px",
    portrait: "(max-width: 430px) calc(100vw - 40px), 300px",
    square: "(max-width: 430px) calc(100vw - 40px), 380px",
  },
  post: {
    landscape: "(max-width: 430px) calc(100vw - 64px), 460px",
    portrait: "(max-width: 430px) calc(100vw - 64px), 300px",
    square: "(max-width: 430px) calc(100vw - 64px), 380px",
  },
  reply: {
    landscape: "(max-width: 430px) calc(100vw - 96px), 420px",
    portrait: "(max-width: 430px) calc(100vw - 96px), 260px",
    square: "(max-width: 430px) calc(100vw - 96px), 340px",
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

const communityVideoOrientationFromDimensions = (
  width?: number | null,
  height?: number | null,
): CommunityMediaOrientation => {
  if (!width || !height) return "landscape";

  return width >= height ? "landscape" : "portrait";
};

export const detectCommunityMediaMetadata = (
  src: string,
  mediaType: CommunityMediaType,
): Promise<CommunityMediaMetadata> => {
  if (typeof window === "undefined") {
    return Promise.resolve({ orientation: "landscape" });
  }

  return new Promise((resolve) => {
    if (mediaType === "image") {
      const image = new window.Image();
      image.onload = () =>
        resolve({
          height: image.naturalHeight,
          orientation: communityMediaOrientationFromDimensions(
            image.naturalWidth,
            image.naturalHeight,
          ),
          width: image.naturalWidth,
        });
      image.onerror = () => resolve({ orientation: "landscape" });
      image.src = src;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        height: video.videoHeight,
        orientation: communityVideoOrientationFromDimensions(video.videoWidth, video.videoHeight),
        width: video.videoWidth,
      });
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => resolve({ orientation: "landscape" });
    video.src = src;
    video.load();
  });
};

export const detectCommunityMediaOrientation = async (
  src: string,
  mediaType: CommunityMediaType,
): Promise<CommunityMediaOrientation> =>
  (await detectCommunityMediaMetadata(src, mediaType)).orientation;

const communityCarouselMediaOrientationFromMetadata = ({
  height,
  orientation,
  width,
}: CommunityMediaMetadata): CommunityMediaOrientation => {
  if (!width || !height) return orientation;

  const ratio = width / height;
  if (ratio > MEDIA_ORIENTATION_LANDSCAPE_RATIO) return "landscape";
  if (ratio < CAROUSEL_VERTICAL_CANONICAL_MAX_RATIO) return "portrait";

  return "square";
};

export const resolveCarouselMediaOrientation = (
  orientations: CommunityMediaOrientation[],
  totalItems = orientations.length,
): CommunityMediaOrientation => {
  if (totalItems > 1 && orientations.length < totalItems) return "square";
  if (orientations.length === 0) return totalItems > 1 ? "square" : "landscape";
  if (orientations.every((orientation) => orientation === "landscape")) return "landscape";
  if (orientations.every((orientation) => orientation === "square")) return "square";
  if (orientations.every((orientation) => orientation === "portrait")) return "portrait";

  return "square";
};

export const resolveCarouselMediaOrientationFromMetadata = (
  mediaMetadata: CommunityMediaMetadata[],
  totalItems = mediaMetadata.length,
): CommunityMediaOrientation =>
  resolveCarouselMediaOrientation(
    mediaMetadata.map(communityCarouselMediaOrientationFromMetadata),
    totalItems,
  );

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
  mediaType: CommunityMediaType = "image",
) =>
  cn(
    "relative w-full overflow-hidden border border-border bg-surface-muted",
    mediaType === "video"
      ? videoMediaFrameAspectClassName[orientation]
      : imageMediaFrameAspectClassName[orientation],
    roundedClassName,
    className,
  );

export const getCommunityMediaSizes = (
  variant: CommunityMediaFrameVariant,
  orientation: CommunityMediaOrientation,
) => mediaFrameSizes[variant][orientation];

type CommunityMediaBlockProps = {
  alt: string;
  analyticsTarget?: ContentVideoWatchTrackingTarget;
  className?: string;
  footer?: ReactNode;
  imageClassName?: string;
  mediaType: string | null;
  mediaUrl: string | null;
  roundedClassName?: string;
  sizes?: string;
  thumbnailUrl?: string | null;
  variant?: CommunityMediaFrameVariant;
  videoClassName?: string;
  viewportClassName?: string;
};

export const CommunityMediaBlock = ({
  alt,
  analyticsTarget,
  className,
  footer,
  imageClassName,
  mediaType,
  mediaUrl,
  roundedClassName = "rounded-[22px]",
  sizes,
  thumbnailUrl,
  variant = "post",
  videoClassName,
  viewportClassName,
}: CommunityMediaBlockProps) => {
  const normalizedMediaType = normalizeCommunityMediaType(mediaType);
  const resolvedUrl = mediaUrl ? resolvePublicMediaUrl(mediaUrl) : null;
  const shouldUseStoredVideoThumbnail = normalizedMediaType === "video" && variant !== "reply";
  const resolvedThumbnailUrl =
    shouldUseStoredVideoThumbnail && thumbnailUrl ? resolvePublicMediaUrl(thumbnailUrl) : null;
  const fallbackPosterKey =
    normalizedMediaType === "video" && !resolvedThumbnailUrl ? resolvedUrl : null;
  const [fallbackPoster, setFallbackPoster] = useState<{ key: string; url: string } | null>(null);
  const fallbackPosterUrl =
    fallbackPoster && fallbackPoster.key === fallbackPosterKey ? fallbackPoster.url : null;
  const resolvedPosterUrl = resolvedThumbnailUrl ?? fallbackPosterUrl;
  const handleVideoElementReady = useContentVideoWatchTracking(
    normalizedMediaType === "video" && analyticsTarget
      ? {
          ...analyticsTarget,
          videoUrl: analyticsTarget.videoUrl ?? resolvedUrl,
        }
      : null,
  );
  const [detectedMedia, setDetectedMedia] = useState<{
    height?: number | null;
    orientation: CommunityMediaOrientation;
    src: string;
    type: CommunityMediaType;
    width?: number | null;
  } | null>(null);

  useEffect(() => {
    if (!fallbackPosterKey) {
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    createVideoPosterObjectUrl(fallbackPosterKey).then((posterUrl) => {
      if (!active) {
        if (posterUrl) URL.revokeObjectURL(posterUrl);
        return;
      }

      if (!posterUrl) {
        setFallbackPoster(null);
        return;
      }

      objectUrl = posterUrl;
      setFallbackPoster({ key: fallbackPosterKey, url: posterUrl });
    });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fallbackPosterKey]);

  useEffect(() => {
    if (!resolvedUrl || !normalizedMediaType) {
      return;
    }

    let isMounted = true;

    detectCommunityMediaMetadata(resolvedUrl, normalizedMediaType).then((metadata) => {
      if (!isMounted) return;

      setDetectedMedia({
        height: metadata.height,
        orientation: metadata.orientation,
        src: resolvedUrl,
        type: normalizedMediaType,
        width: metadata.width,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [normalizedMediaType, resolvedUrl]);

  if (!mediaUrl || !resolvedUrl || !normalizedMediaType) return null;

  const shouldForceReplyVideoAspectRatio = normalizedMediaType === "video" && variant === "reply";
  const orientation = shouldForceReplyVideoAspectRatio
    ? "portrait"
    : detectedMedia?.src === resolvedUrl && detectedMedia.type === normalizedMediaType
      ? detectedMedia.orientation
      : "landscape";
  const hasFooter = Boolean(footer);
  const frameClassName = cn(
    getCommunityMediaFrameClassName(variant, orientation, className),
    hasFooter && "gap-0",
  );
  const mediaRoundedClassName = cn(roundedClassName, hasFooter && "rounded-b-none");
  const viewportClasses = getCommunityMediaViewportClassName(
    orientation,
    mediaRoundedClassName,
    viewportClassName,
    normalizedMediaType,
  );
  const resolvedSizes = sizes ?? getCommunityMediaSizes(variant, orientation);
  const videoAspectRatio =
    !shouldForceReplyVideoAspectRatio &&
    normalizedMediaType === "video" &&
    detectedMedia?.src === resolvedUrl &&
    detectedMedia.type === normalizedMediaType &&
    detectedMedia.width &&
    detectedMedia.height
      ? `${detectedMedia.width} / ${detectedMedia.height}`
      : undefined;

  if (normalizedMediaType === "video") {
    return (
      <div className={frameClassName}>
        <VerticalVideoPlayer
          className={cn(
            "w-full border-border shadow-none",
            videoMediaFrameAspectClassName[orientation],
            mediaRoundedClassName,
            viewportClassName,
            videoClassName,
          )}
          controlsVariant="persistent"
          fit="contain"
          fullscreenVariant="content"
          onVideoElementReady={handleVideoElementReady}
          persistentControlsLayout="media"
          poster={resolvedPosterUrl}
          src={resolvedUrl}
          style={videoAspectRatio ? { aspectRatio: videoAspectRatio } : undefined}
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
