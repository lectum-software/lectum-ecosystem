"use client";

import { type RefObject, useEffect } from "react";
import { getFixedBottomCorrection, isKeyboardInput } from "@/utils/fixed-bottom-viewport";

const CORRECTION_PROPERTY = "--lectum-fixed-bottom-correction";

export function usePwaBottomRecovery(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!enabled || !standalone || !ios) return;

    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 639px)");
    let frame: number | null = null;
    let timer: number | null = null;
    let correction = 0;
    let element: HTMLElement | null = null;

    const reset = () => {
      element?.style.removeProperty(CORRECTION_PROPERTY);
      correction = 0;
    };
    const update = () => {
      frame = null;
      if (element !== ref.current) {
        reset();
        element = ref.current;
      }
      if (
        !element ||
        !mobile.matches ||
        document.visibilityState !== "visible" ||
        isKeyboardInput(document.activeElement) ||
        (viewport && Math.abs(viewport.scale - 1) > 0.01) ||
        getComputedStyle(element).position !== "fixed"
      ) {
        reset();
        return;
      }

      const rect = element.getBoundingClientRect();
      if (!rect.height || !rect.width) {
        reset();
        return;
      }
      const next = getFixedBottomCorrection({
        current: correction,
        bottom: rect.bottom,
        height: window.innerHeight,
      });
      if (next === correction) return;
      correction = next;
      element.style.setProperty(CORRECTION_PROPERTY, `${next}px`);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const settle = () => {
      schedule();
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(schedule, 300);
    };

    settle();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", settle);
    window.addEventListener("pageshow", settle);
    window.addEventListener("orientationchange", settle);
    document.addEventListener("focusin", settle);
    document.addEventListener("focusout", settle);
    document.addEventListener("visibilitychange", settle);
    viewport?.addEventListener("resize", settle);
    viewport?.addEventListener("scroll", schedule);
    mobile.addEventListener("change", settle);

    return () => {
      reset();
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", settle);
      window.removeEventListener("pageshow", settle);
      window.removeEventListener("orientationchange", settle);
      document.removeEventListener("focusin", settle);
      document.removeEventListener("focusout", settle);
      document.removeEventListener("visibilitychange", settle);
      viewport?.removeEventListener("resize", settle);
      viewport?.removeEventListener("scroll", schedule);
      mobile.removeEventListener("change", settle);
    };
  }, [enabled, ref]);
}
