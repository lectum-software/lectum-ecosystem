"use client";

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
}: {
  badge?: string | null;
  className?: string;
}) => {
  if (!badge) return null;

  const tone = resolveMentorBadgeTone(badge);

  return (
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
};
