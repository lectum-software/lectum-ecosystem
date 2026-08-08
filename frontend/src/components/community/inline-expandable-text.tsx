"use client";

import Link from "next/link";
import { type MouseEvent as ReactMouseEvent, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_LINES = 2;
const DEFAULT_MORE_LABEL = "... ver mais";
const DEFAULT_LESS_LABEL = "ver menos";
const HEIGHT_TOLERANCE_PX = 1;
const FALLBACK_LINE_HEIGHT_PX = 24;
const FALLBACK_LINE_HEIGHT_RATIO = 1.5;

type InlineExpandableTextProps = {
  className?: string;
  expanded: boolean;
  href?: string;
  lessLabel?: string;
  maxLines?: number;
  moreLabel?: string;
  onToggle?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  text: string;
};

export const InlineExpandableText = ({
  className,
  expanded,
  href,
  lessLabel = DEFAULT_LESS_LABEL,
  maxLines = DEFAULT_MAX_LINES,
  moreLabel = DEFAULT_MORE_LABEL,
  onToggle,
  text,
}: InlineExpandableTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [preview, setPreview] = useState(text);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const containerNode = containerRef.current;
    const measureNode = measureRef.current;

    if (!containerNode || !measureNode) return;

    let animationFrame = 0;
    let cancelled = false;

    const lineHeightPx = () => {
      const styles = window.getComputedStyle(measureNode);
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);

      if (Number.isFinite(parsedLineHeight)) return parsedLineHeight;

      const parsedFontSize = Number.parseFloat(styles.fontSize);
      return Number.isFinite(parsedFontSize)
        ? parsedFontSize * FALLBACK_LINE_HEIGHT_RATIO
        : FALLBACK_LINE_HEIGHT_PX;
    };

    const fitsWithinMaxLines = (value: string) => {
      measureNode.textContent = value;
      return measureNode.scrollHeight <= lineHeightPx() * maxLines + HEIGHT_TOLERANCE_PX;
    };

    const measure = () => {
      if (cancelled) return;

      const availableWidth = containerNode.getBoundingClientRect().width;
      const normalizedText = text.trimEnd();

      if (availableWidth <= 0 || normalizedText.length === 0) {
        setPreview(text);
        setTruncated(false);
        return;
      }

      measureNode.style.width = `${availableWidth}px`;

      if (fitsWithinMaxLines(normalizedText)) {
        setPreview(text);
        setTruncated(false);
        return;
      }

      let low = 0;
      let high = normalizedText.length;
      let bestPreview = "";

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidatePreview = normalizedText.slice(0, middle).trimEnd();
        const candidate = `${candidatePreview} ${moreLabel}`;

        if (fitsWithinMaxLines(candidate)) {
          bestPreview = candidatePreview;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      setPreview(bestPreview || normalizedText.slice(0, 1));
      setTruncated(true);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerNode);

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [maxLines, moreLabel, text]);

  const visibleText = expanded || !truncated ? text : preview;
  const toggleLabel = expanded ? lessLabel : moreLabel;
  const toggleClassName =
    "pointer-events-auto inline cursor-pointer rounded-none border-0 bg-transparent p-0 align-baseline font-[inherit] text-[#64748B]/80 [font-size:inherit] [line-height:inherit] dark:text-muted/80";
  const textContent = (
    <p className={cn("whitespace-pre-line", className)}>
      {visibleText}
      {truncated ? (
        <>
          {" "}
          {href || !onToggle ? (
            <span className={toggleClassName}>{toggleLabel}</span>
          ) : (
            <button className={toggleClassName} onClick={onToggle} type="button">
              {toggleLabel}
            </button>
          )}
        </>
      ) : null}
    </p>
  );

  return (
    <div className="relative min-w-0 max-w-full" ref={containerRef}>
      {href ? (
        <Link
          className="block rounded-md no-underline transition hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          href={href}
        >
          {textContent}
        </Link>
      ) : (
        textContent
      )}
      <p
        aria-hidden="true"
        className={cn(
          "pointer-events-none invisible absolute inset-x-0 top-0 whitespace-pre-line",
          className,
        )}
        ref={measureRef}
      />
    </div>
  );
};
