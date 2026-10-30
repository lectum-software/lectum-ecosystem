"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useReviewEligibility } from "@/api/callers/reviews";
import { ReviewsIcon } from "@/components/ui/reviews-icon";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

export type TestimonialInvitationAppearance = "outline" | "inline" | "profile";
export type TestimonialInvitationOptions = {
  psychologistId: string;
  className?: string;
  allowGuest?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  appearance?: TestimonialInvitationAppearance;
};

export const TestimonialInvitationAction = ({
  psychologistId,
  className,
  allowGuest = false,
  variant = "outline",
  appearance = "outline",
  onCompose,
}: TestimonialInvitationOptions & { onCompose: (trigger: HTMLButtonElement) => void }) => {
  const user = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const eligibility = useReviewEligibility(psychologistId, hasToken && user?.role === "paciente");
  const inline = appearance === "inline";
  const classes = cn(
    "min-h-[44px] min-w-[44px] shrink-0 gap-1.5 rounded-full font-semibold shadow-none",
    inline
      ? "border-0 bg-transparent px-2 text-muted hover:bg-surface-muted hover:text-foreground"
      : appearance === "profile"
        ? "h-11 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary-hover"
        : "border border-border bg-transparent px-4 text-muted hover:bg-surface-muted hover:text-foreground",
    className,
  );
  const content = (
    <>
      <ReviewsIcon aria-hidden className="size-5 shrink-0" />
      <span className={inline ? "max-sm:sr-only" : undefined}>
        {inline ? "Depoimento" : "Deixar depoimento"}
      </span>
    </>
  );
  if (!hasToken)
    return allowGuest ? (
      <Button
        asChild
        variant={inline ? "ghost" : appearance === "profile" ? "default" : variant}
        className={classes}
      >
        <Link
          aria-label="Deixar depoimento"
          title="Deixar depoimento"
          onClick={(event) => event.stopPropagation()}
          href={`/auth/login?redirectTo=${encodeURIComponent(`/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(psychologistId)}`)}`}
        >
          {content}
        </Link>
      </Button>
    ) : null;
  if (user?.role !== "paciente" || !eligibility.data?.eligible) return null;
  return (
    <Button
      type="button"
      className={classes}
      variant={inline ? "ghost" : appearance === "profile" ? "default" : variant}
      aria-label="Deixar depoimento"
      title="Deixar depoimento"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onCompose(event.currentTarget);
      }}
    >
      {content}
    </Button>
  );
};
