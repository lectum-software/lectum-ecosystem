"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { RelationshipButton } from "@/components/ui/relationship-button";
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
      <RelationshipButton
        {...props}
        aria-busy={pending}
        aria-pressed={following}
        className={className}
        disabled={disabled || pending}
        title={following ? "Deixar de seguir comunidade" : undefined}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {following ? "Seguindo" : "Seguir"}
      </RelationshipButton>
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
