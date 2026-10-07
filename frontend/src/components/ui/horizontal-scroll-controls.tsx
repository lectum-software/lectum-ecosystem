"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { horizontalScrollEdges } from "@/utils/horizontal-scroll";

// The single child is the existing scroll viewport, preserving its semantics and touch behavior.
export function HorizontalScrollControls({
  children,
  label,
  className,
  pageSize = 0.8,
}: {
  children: ReactElement;
  label: string;
  className?: string;
  pageSize?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const viewport = root.current?.firstElementChild as HTMLElement | null;
    if (!viewport) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const { left, right } = horizontalScrollEdges(
        viewport.scrollLeft,
        viewport.clientWidth,
        viewport.scrollWidth,
      );
      setEdges((current) =>
        current.left === left && current.right === right ? current : { left, right },
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    const observeSizes = () => {
      resize.disconnect();
      resize.observe(viewport);
      for (const child of viewport.children) resize.observe(child);
      schedule();
    };
    const mutation = new MutationObserver(observeSizes);
    mutation.observe(viewport, { childList: true, subtree: true });
    observeSizes();
    viewport.addEventListener("scroll", schedule, { passive: true });
    viewport.addEventListener("load", schedule, true);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("load", schedule, true);
    };
  }, []);

  return (
    <div
      ref={root}
      className={cn("relative min-w-0 max-w-full", className)}
      data-horizontal-carousel={label}
    >
      {children}
      {(["left", "right"] as const).map((direction) => {
        const Icon = direction === "left" ? ChevronLeft : ChevronRight;
        const title = `${direction === "left" ? "Ver anteriores" : "Ver próximos"}: ${label}`;
        return edges[direction] ? (
          <button
            key={direction}
            type="button"
            aria-label={title}
            title={title}
            data-post-card-ignore-click="true"
            data-create-post-editor-ignore="true"
            className={cn(
              "absolute top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-surface/95 text-muted opacity-75 shadow-lectum-soft transition hover:bg-background hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 lg:grid",
              direction === "left" ? "left-0" : "right-0",
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const viewport = root.current?.firstElementChild as HTMLElement | null;
              viewport?.scrollBy({
                left: viewport.clientWidth * pageSize * (direction === "left" ? -1 : 1),
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            }}
          >
            <Icon className="h-3 w-3" aria-hidden="true" strokeWidth={2} />
          </button>
        ) : null;
      })}
    </div>
  );
}
