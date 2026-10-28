import type { ReactNode } from "react";

export function VerticalVideoPlayerBottomOverlay({
  children,
  controlsVisible,
}: {
  children?: ReactNode;
  controlsVisible: boolean;
}) {
  if (!children) return null;
  return (
    <div
      className="absolute inset-x-3 z-[3] mx-auto min-w-0 max-w-[420px] sm:inset-x-4"
      data-lectum-video-bottom-overlay="true"
      style={{
        bottom: controlsVisible
          ? "calc(var(--lectum-bottom-fixed-padding) + 4.5rem)"
          : "max(12px, var(--lectum-bottom-fixed-padding))",
      }}
    >
      {children}
    </div>
  );
}
