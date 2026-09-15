"use client";

import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type CoachMarkPlacement = "auto" | "bottom" | "top";

type CoachMarkPosition = {
  arrowClassName: string;
  arrowLeft: number;
  bubbleStyle: CSSProperties;
  ringStyle: CSSProperties;
};

export type ActionableCoachMarkProps = {
  children: ReactNode;
  className?: string;
  onDismiss: () => void;
  placement?: CoachMarkPlacement;
  targetSelector: string;
  title: string;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isVisibleTarget = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;

  let current: HTMLElement | null = element;

  while (current) {
    const styles = window.getComputedStyle(current);

    if (styles.display === "none" || styles.visibility === "hidden") return false;
    if (Number(styles.opacity) === 0) return false;

    current = current.parentElement;
  }

  return true;
};

const findTarget = (selector: string) => {
  if (typeof document === "undefined") return null;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return candidates.find(isVisibleTarget) ?? null;
};

const getPosition = (target: HTMLElement, placement: CoachMarkPlacement): CoachMarkPosition => {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleWidth = Math.min(332, Math.max(284, viewportWidth - 32));
  const estimatedBubbleHeight = 150;
  const preferredBelow =
    placement === "bottom" || (placement === "auto" && rect.top < viewportHeight / 2);
  let top = preferredBelow ? rect.bottom + 14 : rect.top - estimatedBubbleHeight - 14;

  if (top < 16) top = rect.bottom + 14;
  if (top + estimatedBubbleHeight > viewportHeight - 16) {
    top = Math.max(16, rect.top - estimatedBubbleHeight - 14);
  }

  const left = clampNumber(
    rect.left + rect.width / 2 - bubbleWidth / 2,
    16,
    Math.max(16, viewportWidth - bubbleWidth - 16),
  );
  const arrowLeft = clampNumber(rect.left + rect.width / 2 - left - 7, 24, bubbleWidth - 30);
  const isBelowTarget = top >= rect.bottom;

  return {
    arrowClassName: isBelowTarget ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-r border-b",
    arrowLeft,
    bubbleStyle: {
      left,
      top,
      width: bubbleWidth,
    },
    ringStyle: {
      borderRadius: "9999px",
      height: rect.height + 16,
      left: rect.left - 8,
      top: rect.top - 8,
      width: rect.width + 16,
    },
  };
};

export const ActionableCoachMark = ({
  children,
  className,
  onDismiss,
  placement = "auto",
  targetSelector,
  title,
}: ActionableCoachMarkProps) => {
  const [position, setPosition] = useState<CoachMarkPosition | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: number | null = null;

    const updatePosition = () => {
      const target = findTarget(targetSelector);
      setPosition(target ? getPosition(target, placement) : null);
    };

    updatePosition();
    timeout = window.setTimeout(updatePosition, 120);

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [placement, targetSelector]);

  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[135]" data-actionable-coach-mark>
      <span
        aria-hidden="true"
        className="fixed border-2 border-primary/70 shadow-lectum-soft ring-4 ring-primary/25 ring-offset-2 ring-offset-background/80 motion-safe:animate-pulse"
        style={position.ringStyle}
      />

      <section
        aria-live="polite"
        className={cn(
          "pointer-events-auto fixed rounded-[24px] border border-border bg-surface p-4 pr-11 text-left text-foreground shadow-lectum-soft ring-1 ring-primary/10",
          className,
        )}
        style={position.bubbleStyle}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-3.5 w-3.5 rotate-45 border-border bg-surface",
            position.arrowClassName,
          )}
          style={{ left: position.arrowLeft }}
        />
        <button
          aria-label="Fechar dica"
          className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full text-subtle transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="grid gap-1.5">
          <h2 className="font-extrabold text-[0.98rem] leading-tight">{title}</h2>
          <div className="text-sm leading-5 text-muted">{children}</div>
        </div>
      </section>
    </div>,
    document.body,
  );
};
