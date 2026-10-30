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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] min-w-0 [&>*]:pointer-events-auto"
      data-lectum-video-bottom-overlay="true"
      style={{
        left: "var(--lectum-video-safe-left, 0px)",
        right: "var(--lectum-video-safe-right, 0px)",
        bottom: controlsVisible
          ? "calc(var(--lectum-bottom-fixed-padding, 1rem) + 4.5rem)"
          : "var(--lectum-video-safe-bottom, 0px)",
      }}
    >
      {children}
    </div>
  );
}
