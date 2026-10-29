import type { ReactNode } from "react";

export function VerticalVideoPlayerBottomOverlay({
  children,
  controlsVisible,
  visible = true,
}: {
  children?: ReactNode;
  controlsVisible: boolean;
  visible?: boolean;
}) {
  if (!visible || !children) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-3 bottom-3 z-[3] mx-auto min-w-0 max-w-[420px] [--lectum-video-overlay-gap:0.75rem] [&>*]:pointer-events-auto sm:inset-x-4 sm:bottom-4 sm:[--lectum-video-overlay-gap:1rem]"
      data-lectum-video-bottom-overlay="true"
      style={{
        left: "calc(var(--lectum-video-safe-left, 0px) + var(--lectum-video-overlay-gap))",
        right: "calc(var(--lectum-video-safe-right, 0px) + var(--lectum-video-overlay-gap))",
        bottom: controlsVisible
          ? "calc(var(--lectum-bottom-fixed-padding, 1rem) + 4.5rem)"
          : "calc(var(--lectum-video-safe-bottom, 0px) + var(--lectum-video-overlay-gap))",
      }}
    >
      {children}
    </div>
  );
}
