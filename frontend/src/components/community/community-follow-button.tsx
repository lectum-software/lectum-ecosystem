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
      "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-black leading-none tracking-[-0.01em] shadow-none transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70",
      following
        ? "border-primary/18 bg-primary-soft/85 text-primary hover:border-primary/25 hover:bg-primary-soft"
        : "border-primary/45 bg-white text-primary hover:border-primary/60 hover:bg-primary-soft/75 dark:bg-surface",
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
