"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MentorBadgeTone = "gold" | "silver" | "bronze";
type MentorBadgeRank = 1 | 2 | 3;

const resolveMentorBadgeRank = (badge: string): MentorBadgeRank => {
  const normalized = badge.toUpperCase();

  if (normalized.includes("#2")) return 2;
  if (normalized.includes("#3")) return 3;

  return 1;
};

const resolveMentorBadgeTone = (rank: MentorBadgeRank): MentorBadgeTone => {
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";

  return "gold";
};

const medalDimensions: Record<MentorBadgeTone, { height: number; width: number }> = {
  bronze: { height: 208, width: 208 },
  gold: { height: 208, width: 208 },
  silver: { height: 208, width: 208 },
};

export const MentorBadge = ({
  badge,
  className,
  onClick,
  size = "inline",
}: {
  badge?: string | null;
  className?: string;
  href?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  size?: "avatar" | "inline";
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const rank = resolveMentorBadgeRank(badge ?? "");
  const tone = resolveMentorBadgeTone(rank);
  const tooltip = `Top ${rank} mentor nesta comunidade`;
  const dimensions = medalDimensions[tone];
  const avatarSize = size === "avatar" || className?.includes("text-[8.5px]");

  useEffect(() => {
    if (!tooltipOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setTooltipOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTooltipOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [tooltipOpen]);

  if (!badge) return null;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        !avatarSize && "-ml-0.5",
        className,
      )}
      ref={containerRef}
    >
      <button
        aria-expanded={tooltipOpen}
        aria-label={tooltip}
        className={cn(
          "pointer-events-auto inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]",
          avatarSize ? "h-8 w-8" : "h-5 w-5",
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick?.(event as unknown as MouseEvent<HTMLAnchorElement>);
          setTooltipOpen((current) => !current);
        }}
        title={tooltip}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className={cn("select-none object-contain", avatarSize ? "h-7 w-7" : "h-5 w-5")}
          height={dimensions.height}
          src={`/images/community/top-mentor/${tone}.svg`}
          unoptimized
          width={dimensions.width}
        />
      </button>
      {tooltipOpen ? (
        <span
          className="absolute bottom-[calc(100%+0.35rem)] left-1/2 z-30 w-max max-w-[min(13rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-center text-[11px] font-bold leading-snug text-foreground shadow-lectum-soft"
          role="tooltip"
        >
          {tooltip}
          <span
            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-surface"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </span>
  );
};
