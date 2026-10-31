"use client";

import { type RefObject, useEffect, useRef } from "react";

export const useContentVideoProgress = (
  video: RefObject<HTMLVideoElement | null>,
  playing: boolean,
  time: number,
  duration: number,
) => {
  const fill = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const current = video.current;
      const length = current?.duration || duration;
      const elapsed = current?.currentTime ?? time;
      const ratio = Number.isFinite(length) && length > 0 ? elapsed / length : 0;
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
      if (playing) frame = window.requestAnimationFrame(draw);
    };
    draw();
    return () => window.cancelAnimationFrame(frame);
  }, [video, playing, time, duration]);
  return fill;
};
