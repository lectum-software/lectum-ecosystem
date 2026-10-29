"use client";

import type { CSSProperties, FocusEventHandler, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useExpandedVideoViewport } from "./vertical-video-player-content-expansion";

type VerticalVideoPlayerShellProps = {
  children: ReactNode;
  className?: string;
  isContentExpanded: boolean;
  onBlurCapture?: FocusEventHandler<HTMLDivElement>;
  onFocusCapture?: FocusEventHandler<HTMLDivElement>;
  style?: CSSProperties;
};

const baseRootClassName =
  "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-media-background shadow-inner";

export const VerticalVideoPlayerShell = ({
  children,
  className,
  isContentExpanded,
  onBlurCapture,
  onFocusCapture,
  style,
}: VerticalVideoPlayerShellProps) => {
  const viewport = useExpandedVideoViewport(isContentExpanded);
  const rootClassName = cn(
    baseRootClassName,
    className,
    isContentExpanded &&
      "fixed inset-0 isolate z-[1100] h-[100dvh] min-h-[100dvh] w-screen max-w-none rounded-none border-0 bg-media-background shadow-none",
  );
  const rootStyle = isContentExpanded
    ? ({
        ...(style ?? {}),
        aspectRatio: "auto",
        backgroundColor: "var(--lectum-media-background)",
        top: viewport?.top ?? 0,
        left: viewport?.left ?? 0,
        right: "auto",
        bottom: "auto",
        height: viewport?.height ?? "100dvh",
        maxHeight: viewport?.height ?? "100dvh",
        minHeight: 0,
        minWidth: 0,
        maxWidth: "none",
        width: viewport?.width ?? "100vw",
        // Expanded controls belong to this viewport, not the app navigation below it.
        "--lectum-bottom-fixed-padding":
          "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
        "--lectum-video-safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "--lectum-video-safe-left": "env(safe-area-inset-left, 0px)",
        "--lectum-video-safe-right": "env(safe-area-inset-right, 0px)",
      } satisfies CSSProperties & Record<`--${string}`, string>)
    : style;
  const playerRoot = (
    <div
      className={rootClassName}
      data-lectum-video-expanded={isContentExpanded ? "true" : undefined}
      data-lectum-video-expanded-portal={isContentExpanded ? "true" : undefined}
      data-lectum-video-player-root="true"
      onBlurCapture={onBlurCapture}
      onFocusCapture={onFocusCapture}
      role={isContentExpanded ? "dialog" : undefined}
      style={rootStyle}
    >
      {children}
    </div>
  );

  if (isContentExpanded && typeof document !== "undefined") {
    return (
      <>
        <div
          aria-hidden="true"
          className={cn(baseRootClassName, className)}
          data-lectum-video-inline-placeholder="true"
          style={style}
        />
        {createPortal(playerRoot, document.body)}
      </>
    );
  }

  return playerRoot;
};
