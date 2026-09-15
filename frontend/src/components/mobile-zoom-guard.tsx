"use client";

import { useEffect } from "react";

const zoomGestureListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: false,
};

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('a, button, input, textarea, select, [role="button"], video, audio'));

const preventDefaultWhenCancelable = (event: Event) => {
  if (event.cancelable) event.preventDefault();
};

export function MobileZoomGuard() {
  useEffect(() => {
    let lastTouchEndAt = 0;

    const preventPinchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) preventDefaultWhenCancelable(event);
    };

    const preventDoubleTapZoom = (event: TouchEvent) => {
      const now = Date.now();
      const isDoubleTap = now - lastTouchEndAt <= 300;
      lastTouchEndAt = now;

      if (!isDoubleTap || isInteractiveTarget(event.target)) return;

      preventDefaultWhenCancelable(event);
    };

    document.addEventListener(
      "gesturestart",
      preventDefaultWhenCancelable,
      zoomGestureListenerOptions,
    );
    document.addEventListener(
      "gesturechange",
      preventDefaultWhenCancelable,
      zoomGestureListenerOptions,
    );
    document.addEventListener(
      "gestureend",
      preventDefaultWhenCancelable,
      zoomGestureListenerOptions,
    );
    document.addEventListener("touchmove", preventPinchZoom, zoomGestureListenerOptions);
    document.addEventListener("touchend", preventDoubleTapZoom, zoomGestureListenerOptions);

    return () => {
      document.removeEventListener(
        "gesturestart",
        preventDefaultWhenCancelable,
        zoomGestureListenerOptions,
      );
      document.removeEventListener(
        "gesturechange",
        preventDefaultWhenCancelable,
        zoomGestureListenerOptions,
      );
      document.removeEventListener(
        "gestureend",
        preventDefaultWhenCancelable,
        zoomGestureListenerOptions,
      );
      document.removeEventListener("touchmove", preventPinchZoom, zoomGestureListenerOptions);
      document.removeEventListener("touchend", preventDoubleTapZoom, zoomGestureListenerOptions);
    };
  }, []);

  return null;
}
