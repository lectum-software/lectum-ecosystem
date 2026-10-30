"use client";

import { Check, Loader2, Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { RelationshipButton } from "@/components/ui/relationship-button";
import { cn } from "@/lib/utils";

type CommunityFollowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  followVariant?: "primary" | "secondary";
  following: boolean;
  pending?: boolean;
  size?: "compact" | "hero" | "recommendation";
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
  if (size === "recommendation") {
    return (
      <button
        {...props}
        type="button"
        aria-pressed={following}
        aria-busy={pending}
        disabled={disabled || pending}
        className={cn(
          "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border px-3 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none",
          following
            ? "border-border bg-surface-muted text-muted hover:bg-surface-muted"
            : "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
          className,
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : following ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{following ? "Seguindo" : "Seguir"}</span>
      </button>
    );
  }
  if (size === "hero") {
    return (
      <span className="group relative inline-flex shrink-0">
        <RelationshipButton
          {...props}
          type="button"
          size="header"
          aria-label={following ? "Seguindo comunidade. Deixar de seguir" : "Seguir comunidade"}
          aria-busy={pending}
          aria-pressed={following}
          className={cn(
            "transition-colors duration-200 motion-reduce:transition-none hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60",
            following ? "w-[44px] gap-0" : "w-auto",
            className,
          )}
          disabled={disabled || pending}
        >
          <span className="relative h-[20px] w-[20px] shrink-0" aria-hidden="true">
            <Plus
              className={cn(
                "absolute inset-0 h-[20px] w-[20px] transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                following || pending ? "scale-75 opacity-0" : "scale-100 opacity-100",
              )}
            />
            <Check
              className={cn(
                "absolute inset-0 h-[20px] w-[20px] transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                following && !pending ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
            />
            {pending ? (
              <Loader2 className="absolute inset-0 h-[20px] w-[20px] animate-spin motion-reduce:animate-none" />
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 motion-reduce:transition-none",
              following ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Seguir
          </span>
        </RelationshipButton>
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
