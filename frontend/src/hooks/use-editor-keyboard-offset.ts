"use client";

import { useEffect, useState } from "react";

export const resolveKeyboardViewportOffset = () => {
  if (typeof window === "undefined" || !window.visualViewport) return 0;
  const viewport = window.visualViewport;
  return Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
};

export const useEditorKeyboardOffset = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame: number | null = null;
    const update = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setOffset(resolveKeyboardViewportOffset());
      });
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return offset;
};
