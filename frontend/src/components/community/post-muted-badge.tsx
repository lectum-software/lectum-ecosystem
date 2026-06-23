"use client";

import { BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PostMutedBadgeProps = {
  className?: string;
};

export const PostMutedBadge = ({ className }: PostMutedBadgeProps) => (
  <span
    className={cn(
      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 text-[11px] font-bold leading-none text-primary",
      className,
    )}
  >
    <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
    Silenciado
  </span>
);
