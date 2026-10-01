"use client";

import { useLayoutEffect, useRef, useState } from "react";

export const getContainedQuestionFrame = (
  width: number,
  height: number,
  videoWidth = 9,
  videoHeight = 16,
) => {
  const ratio = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 9 / 16;
  const contentWidth = Math.min(width, height * ratio);
  const contentHeight = contentWidth / ratio;
  return {
    height: contentHeight,
    left: (width - contentWidth) / 2,
    top: (height - contentHeight) / 2,
    width: contentWidth,
  };
};

export const ProfileReplyVideoQuestion = ({ title }: { title: string }) => {
  const planeRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<ReturnType<typeof getContainedQuestionFrame> | null>(null);

  useLayoutEffect(() => {
    const player = planeRef.current?.parentElement;
    const video = player?.querySelector("video");
    if (!player || !video) return;

    // Match object-contain, including the letterboxing used by the expanded player.
    const measure = () => {
      const next = getContainedQuestionFrame(
        player.clientWidth,
        player.clientHeight,
        video.videoWidth,
        video.videoHeight,
      );
      setFrame((current) =>
        current &&
        Object.keys(next).every(
          (key) => current[key as keyof typeof next] === next[key as keyof typeof next],
        )
          ? current
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(player);
    video.addEventListener("loadedmetadata", measure);
    video.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", measure);
      video.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute z-[2]"
      data-profile-question-plane
      ref={planeRef}
      style={{ ...(frame ?? { inset: 0 }), containerType: "size" }}
    >
      <div
        className="pointer-events-auto absolute top-[4%] left-[10.2%] flex max-h-[32%] w-[79.7%] flex-col overflow-hidden rounded-[3.75cqw] text-center"
        data-profile-video-question
      >
        <div className="shrink-0 bg-primary px-[3.75cqw] py-[1.875cqw] text-[4.375cqw] font-bold leading-[1.428571] text-primary-foreground">
          Pergunta
        </div>
        <section
          aria-label="Pergunta respondida no vídeo"
          className="min-h-0 overflow-y-auto overscroll-contain bg-media-foreground/95 p-[5cqw] text-media-background [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll long questions.
          tabIndex={0}
        >
          <h3 className="text-[5cqw] font-bold leading-[1.24]">{title}</h3>
        </section>
      </div>
    </div>
  );
};
