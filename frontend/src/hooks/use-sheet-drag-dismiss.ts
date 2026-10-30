"use client";

import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const INTERACTIVE =
  "button, a, input, select, textarea, label, [role='button'], [role='link'], [role='slider'], [contenteditable]:not([contenteditable='false']), [tabindex], [data-sheet-drag-ignore]";

type Gesture = {
  pointerId: number;
  target: HTMLElement;
  startX: number;
  startY: number;
  dragging: boolean;
  samples: { y: number; time: number }[];
};

/** Apply handleProps only to the non-scrolling header, and sheetStyle to the panel. */
export const useSheetDragDismiss = ({
  open,
  disabled = false,
  onClose,
}: {
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
}) => {
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClickRef = useRef(false);
  const enabled = open && !disabled;
  const [motion, setMotion] = useState({ enabled, offset: 0 });
  if (motion.enabled !== enabled) setMotion({ enabled, offset: 0 });
  const offset = enabled ? motion.offset : 0;
  const [reducedMotion, setReducedMotion] = useState(false);

  const release = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture?.target.hasPointerCapture(gesture.pointerId)) {
      gesture.target.releasePointerCapture(gesture.pointerId);
    }
  }, []);

  const reset = useCallback(() => {
    release();
    setMotion((current) => (current.offset === 0 ? current : { ...current, offset: 0 }));
  }, [release]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || disabled) return;
    const additionalPointer = (event: globalThis.PointerEvent) => {
      if (gestureRef.current && event.pointerId !== gestureRef.current.pointerId) reset();
    };
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", reset);
    document.addEventListener("pointerdown", additionalPointer, true);
    return () => {
      release();
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", reset);
      document.removeEventListener("pointerdown", additionalPointer, true);
    };
  }, [disabled, open, release, reset]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    suppressClickRef.current = false;
    if (
      !open ||
      disabled ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.pointerType !== "touch" && event.pointerType !== "pen") ||
      !(event.target instanceof Element)
    )
      return;
    const interactive = event.target.closest(INTERACTIVE);
    if (interactive && event.currentTarget.contains(interactive)) return;
    reset();
    gestureRef.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      samples: [{ y: event.clientY, time: event.timeStamp }],
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    // A header drag must not blur the editor and move the sheet with the keyboard.
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!open || disabled) return reset();
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (dy <= 0 || dy < Math.abs(dx) * 1.25) return reset();
      gesture.dragging = true;
      suppressClickRef.current = true;
    }
    gesture.samples = gesture.samples.filter((sample) => event.timeStamp - sample.time <= 120);
    gesture.samples.push({ y: event.clientY, time: event.timeStamp });
    setMotion({ enabled: true, offset: Math.min(320, Math.max(0, dy)) });
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const distance = Math.max(0, event.clientY - gesture.startY);
    const recent = gesture.samples.find((sample) => event.timeStamp - sample.time <= 120);
    const elapsed = recent ? event.timeStamp - recent.time : 0;
    const velocity = recent && elapsed > 0 ? (event.clientY - recent.y) / elapsed : 0;
    const dismiss =
      open &&
      !disabled &&
      gesture.dragging &&
      (distance >= 96 || (distance >= 40 && velocity >= 0.65));
    // Reset first: a rejected draft confirmation must leave the sheet usable.
    reset();
    if (gesture.dragging) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (dismiss) onClose();
  };

  return {
    isDragging: offset > 0,
    sheetStyle: {
      translate: offset > 0 ? `0 ${offset}px` : "none",
      transition: offset > 0 || reducedMotion ? "none" : "translate 180ms ease-out",
    } satisfies CSSProperties,
    handleProps: {
      style: { touchAction: "none", userSelect: "none" } satisfies CSSProperties,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
      onLostPointerCapture: reset,
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        if (!suppressClickRef.current || event.detail === 0) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
};
