"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { POST_DETAIL_MOBILE_QUERY } from "../modules/reply-support";

const POST_REPLY_KEYBOARD_OFFSET_THRESHOLD_PX = 24;
const POST_REPLY_KEYBOARD_CLEARANCE_PX = 8;
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

      const viewportKeyboardOffset = viewport
        ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
        : 0;
      const composerRect = composerRef.current?.getBoundingClientRect();
      const measuredComposerOverlap =
        viewport && composerRect
          ? Math.max(
              0,
              keyboardOffsetRef.current + Math.ceil(composerRect.bottom - viewport.height),
            )
          : 0;
      const nextKeyboardOffset = Math.max(viewportKeyboardOffset, measuredComposerOverlap);

      setKeyboardOffsetSafely(
        nextKeyboardOffset > POST_REPLY_KEYBOARD_OFFSET_THRESHOLD_PX
          ? nextKeyboardOffset + POST_REPLY_KEYBOARD_CLEARANCE_PX
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
    };
  }, [composerActive, composerRef, isInline, setKeyboardOffsetSafely]);

  return keyboardOffset;
};
