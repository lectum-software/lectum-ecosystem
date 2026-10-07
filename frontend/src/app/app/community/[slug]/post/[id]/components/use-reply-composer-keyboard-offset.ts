"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { getReplyKeyboardOffset, isKeyboardInput } from "@/utils/fixed-bottom-viewport";
import { POST_DETAIL_MOBILE_QUERY } from "../modules/reply-support";

const POST_REPLY_KEYBOARD_SETTLE_DELAYS_MS = [80, 240] as const;

export const useReplyComposerKeyboardOffset = ({
  composerActive,
  composerRef,
  isInline,
}: {
  composerActive: boolean;
  composerRef: RefObject<HTMLElement | null>;
  isInline: boolean;
}) => {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const keyboardOffsetRef = useRef(0);

  const setKeyboardOffsetSafely = useCallback((nextOffset: number) => {
    const normalizedOffset = Math.max(0, Math.round(nextOffset));
    keyboardOffsetRef.current = normalizedOffset;
    setKeyboardOffset((currentOffset) =>
      currentOffset === normalizedOffset ? currentOffset : normalizedOffset,
    );
  }, []);

  useEffect(() => {
    if (isInline || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    let animationFrame: number | null = null;
    const settleTimers = new Set<number>();
    const updateKeyboardOffset = () => {
      if (!composerActive || !window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches) {
        setKeyboardOffsetSafely(0);
        return;
      }

      const composerRect = composerRef.current?.getBoundingClientRect();
      setKeyboardOffsetSafely(
        viewport && composerRect
          ? getReplyKeyboardOffset({
              focused:
                Boolean(composerRef.current?.contains(document.activeElement)) &&
                isKeyboardInput(document.activeElement),
              layoutHeight: window.innerHeight,
              viewportHeight: viewport.height,
              viewportTop: viewport.offsetTop,
              scale: viewport.scale,
              composerBottom: composerRect.bottom,
              currentOffset: keyboardOffsetRef.current,
            })
          : 0,
      );
    };

    const scheduleKeyboardOffsetUpdate = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateKeyboardOffset();
      });
    };

    const scheduleSettledKeyboardOffsetUpdate = () => {
      scheduleKeyboardOffsetUpdate();
      for (const timer of settleTimers) window.clearTimeout(timer);
      settleTimers.clear();

      for (const delay of POST_REPLY_KEYBOARD_SETTLE_DELAYS_MS) {
        const timer = window.setTimeout(() => {
          settleTimers.delete(timer);
          scheduleKeyboardOffsetUpdate();
        }, delay);
        settleTimers.add(timer);
      }
    };

    scheduleSettledKeyboardOffsetUpdate();
    viewport?.addEventListener("resize", scheduleSettledKeyboardOffsetUpdate);
    viewport?.addEventListener("scroll", scheduleSettledKeyboardOffsetUpdate);
    window.addEventListener("orientationchange", scheduleSettledKeyboardOffsetUpdate);
    window.addEventListener("resize", scheduleSettledKeyboardOffsetUpdate);
    document.addEventListener("focusin", scheduleSettledKeyboardOffsetUpdate);
    document.addEventListener("focusout", scheduleSettledKeyboardOffsetUpdate);
    window.addEventListener("pageshow", scheduleSettledKeyboardOffsetUpdate);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      for (const timer of settleTimers) {
        window.clearTimeout(timer);
      }

      viewport?.removeEventListener("resize", scheduleSettledKeyboardOffsetUpdate);
      viewport?.removeEventListener("scroll", scheduleSettledKeyboardOffsetUpdate);
      window.removeEventListener("orientationchange", scheduleSettledKeyboardOffsetUpdate);
      window.removeEventListener("resize", scheduleSettledKeyboardOffsetUpdate);
      document.removeEventListener("focusin", scheduleSettledKeyboardOffsetUpdate);
      document.removeEventListener("focusout", scheduleSettledKeyboardOffsetUpdate);
      window.removeEventListener("pageshow", scheduleSettledKeyboardOffsetUpdate);
    };
  }, [composerActive, composerRef, isInline, setKeyboardOffsetSafely]);

  return keyboardOffset;
};
