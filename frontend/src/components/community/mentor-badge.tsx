"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

type MentorBadgeTone = "gold" | "silver" | "bronze";

const resolveMentorBadgeTone = (badge: string): MentorBadgeTone => {
  const normalized = badge.toUpperCase();

  if (normalized.includes("#2")) return "silver";
  if (normalized.includes("#3")) return "bronze";

  return "gold";
};

export const MentorBadge = ({
  badge,
  className,
  href,
  onClick,
}: {
  badge?: string | null;
  className?: string;
  href?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) => {
  if (!badge) return null;

  const tone = resolveMentorBadgeTone(badge);

  const badgeNode = (
    <span
      className={cn(
        "top-mentor-badge shrink-0",
        tone === "gold" && "top-mentor-badge--gold",
        tone === "silver" && "top-mentor-badge--silver",
        tone === "bronze" && "top-mentor-badge--bronze",
        className,
      )}
    >
      <span className="relative z-10">{badge}</span>
    </span>
  );

  if (!href) return badgeNode;

  return (
    <Link
      aria-label={`Abrir perfil do ${badge}`}
      className="pointer-events-auto inline-flex shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
      onClick={onClick}
    >
      {badgeNode}
    </Link>
  );
};
