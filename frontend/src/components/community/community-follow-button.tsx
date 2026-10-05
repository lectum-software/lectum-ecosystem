"use client";

import { Check, Loader2, Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CommunityFollowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  followVariant?: "primary" | "secondary";
  following: boolean;
  pending?: boolean;
  size?: "compact" | "hero";
};

export const CommunityFollowButton = ({
  className,
  disabled,
  followVariant = "secondary",
  following,
  pending,
  size = "compact",
  ...props
}: CommunityFollowButtonProps) => {
  if (size === "hero") {
    return (
      <span className="group relative inline-flex shrink-0">
        <button
          {...props}
          type="button"
          aria-label={following ? "Seguindo comunidade. Deixar de seguir" : "Seguir comunidade"}
          aria-busy={pending}
          aria-pressed={following}
          className={cn(
            "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-[width,gap,background-color,border-color,color] duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
            following
              ? "w-10 gap-0 border-primary/25 bg-primary-soft text-primary"
              : "w-[112px] gap-2 border-border bg-surface text-muted hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface-muted",
            className,
          )}
          disabled={disabled || pending}
        >
          <span className="relative h-5 w-5 shrink-0" aria-hidden="true">
            <Plus
              className={cn(
                "absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                following || pending ? "scale-75 opacity-0" : "scale-100 opacity-100",
              )}
            />
            <Check
              className={cn(
                "absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                following && !pending ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
            />
            {pending ? (
              <Loader2 className="absolute inset-0 h-5 w-5 animate-spin motion-reduce:animate-none" />
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 motion-reduce:transition-none",
              following ? "w-0 opacity-0" : "w-[56px] opacity-100",
            )}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Seguir
          </span>
        </button>
        {following ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
          >
            Seguindo comunidade
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <button
      aria-pressed={following}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border font-extrabold leading-none tracking-[-0.01em] shadow-none transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70",
        "h-8 gap-1.5 px-3.5 text-[11px]",
        following
          ? "border-border bg-surface-muted text-muted hover:border-border hover:bg-surface-muted dark:border-border dark:bg-surface-muted dark:text-muted"
          : followVariant === "primary"
            ? "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover"
            : "border-primary/45 bg-surface text-primary hover:border-primary/60 hover:bg-primary-soft/75 dark:bg-surface",
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
};
