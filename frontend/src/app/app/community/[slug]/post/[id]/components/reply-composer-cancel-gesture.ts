"use client";

import { type PointerEvent, useCallback, useRef, useState } from "react";
import {
  POST_DETAIL_MOBILE_QUERY,
  POST_REPLY_CANCEL_DRAG_THRESHOLD,
} from "../modules/reply-support";

export const useReplyComposerCancelGesture = ({
  enabled,
  onCancel,
}: {
  enabled: boolean;
  onCancel: () => void;
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [draggingToCancel, setDraggingToCancel] = useState(false);
  const cancelDragRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const resetCancelDrag = useCallback(() => {
    cancelDragRef.current = null;
    setDragOffset(0);
    setDraggingToCancel(false);
  }, []);

  const handleCancelPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== "touch" ||
      !enabled ||
      typeof window === "undefined" ||
      !window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches
    )
      return;

    cancelDragRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCancelPointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.dragging) {
      if (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return;
      gesture.dragging = true;
      setDraggingToCancel(true);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    if (gesture.dragging) {
      event.preventDefault();
      setDragOffset(Math.min(96, Math.max(0, deltaY * 0.72)));
    }
  };

  const handleCancelPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const shouldCancel =
      gesture.dragging && event.clientY - gesture.startY >= POST_REPLY_CANCEL_DRAG_THRESHOLD;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (shouldCancel) {
      onCancel();
      return;
    }
    resetCancelDrag();
  };

  return {
    dragOffset,
    draggingToCancel,
    resetCancelDrag,
    handleCancelPointerDown,
    handleCancelPointerMove,
    handleCancelPointerEnd,
  };
};
