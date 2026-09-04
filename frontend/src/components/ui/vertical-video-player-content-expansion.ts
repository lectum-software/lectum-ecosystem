"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  type FullscreenVariant,
  MOBILE_FULLSCREEN_MEDIA_QUERY,
  type StoredVideoStyle,
  staticMobileContentFullscreenStyles,
} from "./vertical-video-player-support";

export const useMobileContentFullscreenStyles = ({
  fullscreenVariant,
  videoRef,
}: {
  fullscreenVariant: FullscreenVariant;
  videoRef: RefObject<HTMLVideoElement | null>;
}) => {
  const storedFullscreenStylesRef = useRef<StoredVideoStyle[] | null>(null);

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
  }, [fullscreenVariant, videoRef]);
};

export const useInlineContentVideoExpansion = ({
  effectiveSource,
  enabled,
}: {
  effectiveSource: string;
  enabled: boolean;
}) => {
  const [expandedContentSource, setExpandedContentSource] = useState<string | null>(null);
  const isContentExpanded = enabled && expandedContentSource === effectiveSource;

  const handleInlineContentExpansion = useCallback(() => {
    if (!enabled) return;

    setExpandedContentSource((current) => (current === effectiveSource ? null : effectiveSource));
  }, [effectiveSource, enabled]);

  const closeInlineContentExpansion = useCallback(() => {
    setExpandedContentSource(null);
  }, []);

  useEffect(() => {
    if (!isContentExpanded || typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedContentSource(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isContentExpanded]);

  return {
    closeInlineContentExpansion,
    handleInlineContentExpansion,
    isContentExpanded,
  };
};
