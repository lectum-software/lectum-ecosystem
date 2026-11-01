"use client";

import { type RefObject, useEffect } from "react";
import { isKeyboardInput } from "@/utils/fixed-bottom-viewport";

/** iOS can hide the keyboard without blurring its contenteditable. */
export const useReelsComposerFocus = ({
  enabled,
  locked,
  composerRef,
  onDismiss,
  onActiveChange,
}: {
  enabled: boolean;
  locked: boolean;
  composerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  onActiveChange: (active: boolean) => void;
}) => {
  useEffect(() => {
    if (!enabled || locked) return;
    const node = composerRef.current;
    const viewport = window.visualViewport;
    let keyboardWasOpen = false;
    let settleTimer: number | undefined;
    onActiveChange(Boolean(node?.contains(document.activeElement)));

    const dismissOutside = (event: PointerEvent | MouseEvent) => {
      if (!(event.target instanceof Element) || node?.contains(event.target)) return;
      if (
        event.type === "pointerdown" &&
        node?.contains(document.activeElement) &&
        event.target.closest("button:not(:disabled):not([data-lectum-video-surface]),a[href]")
      ) {
        // Keep rail controls in place until click has its target, then dismiss the keyboard.
        event.preventDefault();
        return;
      }
      onDismiss();
    };
    const updateViewport = () => {
      window.clearTimeout(settleTimer);
      if (!viewport || Math.abs(viewport.scale - 1) > 0.01) return;
      const focused =
        node?.contains(document.activeElement) && isKeyboardInput(document.activeElement);
      if (!focused) {
        keyboardWasOpen = false;
        return;
      }
      const occlusion = window.innerHeight - viewport.height;
      if (occlusion >= 100) keyboardWasOpen = true;
      else if (keyboardWasOpen) {
        // Wait for the viewport animation; toolbar/zoom changes alone must not blur.
        settleTimer = window.setTimeout(() => {
          keyboardWasOpen = false;
          if (node?.contains(document.activeElement)) onDismiss();
        }, 120);
      }
    };
    const resetKeyboard = () => {
      keyboardWasOpen = false;
      window.clearTimeout(settleTimer);
    };
    updateViewport();
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("click", dismissOutside, true);
    viewport?.addEventListener("resize", updateViewport);
    document.addEventListener("focusin", updateViewport);
    window.addEventListener("orientationchange", resetKeyboard);
    return () => {
      window.clearTimeout(settleTimer);
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("click", dismissOutside, true);
      viewport?.removeEventListener("resize", updateViewport);
      document.removeEventListener("focusin", updateViewport);
      window.removeEventListener("orientationchange", resetKeyboard);
    };
  }, [composerRef, enabled, locked, onActiveChange, onDismiss]);
};
