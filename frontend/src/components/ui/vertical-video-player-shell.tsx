"use client";

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type VerticalVideoPlayerShellProps = {
  children: ReactNode;
  className?: string;
  isContentExpanded: boolean;
  style?: CSSProperties;
};

const baseRootClassName =
  "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-media-background shadow-inner";

export const VerticalVideoPlayerShell = ({
  children,
  className,
  isContentExpanded,
  style,
}: VerticalVideoPlayerShellProps) => {
  const rootClassName = cn(
    baseRootClassName,
    className,
    isContentExpanded &&
      "fixed inset-0 isolate z-[1100] h-[100dvh] min-h-[100dvh] w-screen max-w-none rounded-none border-0 bg-media-background shadow-none",
  );
  const rootStyle: CSSProperties | undefined = isContentExpanded
    ? {
        ...(style ?? {}),
        aspectRatio: "auto",
        height: "100dvh",
        maxHeight: "100dvh",
        maxWidth: "none",
        width: "100vw",
      }
    : style;
  const playerRoot = (
    <div
      className={rootClassName}
      data-lectum-video-expanded={isContentExpanded ? "true" : undefined}
      data-lectum-video-expanded-portal={isContentExpanded ? "true" : undefined}
      data-lectum-video-player-root="true"
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
