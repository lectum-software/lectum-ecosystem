"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CommunityFollowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  following: boolean;
  pending?: boolean;
};

export const CommunityFollowButton = ({
  className,
  disabled,
  following,
  pending,
  ...props
}: CommunityFollowButtonProps) => (
  <button
    aria-pressed={following}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-black transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70",
      following
        ? "border-transparent bg-surface-muted text-foreground hover:bg-border/60"
        : "border-primary/45 bg-surface text-primary hover:bg-primary-soft",
      className,
    )}
    disabled={disabled || pending}
    type="button"
    {...props}
  >
    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
    {following ? "Seguindo" : "Seguir"}
  </button>
);
