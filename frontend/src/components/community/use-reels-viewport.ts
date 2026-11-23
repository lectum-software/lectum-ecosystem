"use client";

import { useEffect, useState } from "react";
import { isKeyboardInput } from "@/utils/fixed-bottom-viewport";

type Frame = { top: number; left: number; width: number; height: number };
type Viewport = Frame & { keyboardOffset: number };

export const resolveReelsViewport = (
  previous: Viewport | null,
  visual: Frame,
  editing: boolean,
): Viewport => {
  const sameWidth = previous && Math.abs(previous.width - visual.width) < 2;
  const keepFrame =
    sameWidth &&
    (editing || (previous.keyboardOffset > 0 && previous.height - visual.height >= 100));
  const frame = keepFrame ? previous : visual;
  return {
    top: visual.top,
    left: visual.left,
    width: frame.width,
    height: frame.height,
    keyboardOffset: keepFrame ? Math.max(0, frame.height - visual.height) : 0,
  };
};

/** Keep the media frame intact; only the composer follows the software keyboard. */
export const useReelsViewport = () => {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  useEffect(() => {
    const visual = window.visualViewport;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = {
          top: visual?.offsetTop ?? 0,
          left: visual?.offsetLeft ?? 0,
          width: visual?.width ?? window.innerWidth,
          height: visual?.height ?? window.innerHeight,
        };
        if (next.width <= 0 || next.height <= 0) return;
        setViewport((previous) =>
          resolveReelsViewport(previous, next, isKeyboardInput(document.activeElement)),
        );
      });
    };
    update();
    window.addEventListener("resize", update);
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  return viewport;
};
