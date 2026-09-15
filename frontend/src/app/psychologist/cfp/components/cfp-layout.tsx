"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { supportLinkProps } from "../modules/support";

export type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const SupportFooterLink = () => (
  <p className="px-2 text-center text-sm font-medium text-muted">
    Problemas?{" "}
    <a
      {...supportLinkProps}
      className="font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      Fale com o suporte
    </a>
  </p>
);

export const SupportGuidance = () => (
  <div className="grid gap-3">
    <Button asChild className="h-11 w-full rounded-full" variant="outline">
      <a {...supportLinkProps}>{"Fale com o suporte pelo WhatsApp"}</a>
    </Button>
  </div>
);

export const PageFrame = ({ children }: { children: ReactNode }) => (
  <PrivateTemplate allowAnonymous showHeader={false} showMobileNavigation={false}>
    <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-4xl">
      {children}
      <SupportFooterLink />
    </section>
  </PrivateTemplate>
);

export const PremiumPanel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)] md:px-8 md:py-9",
      className,
    )}
  >
    <div className="relative">{children}</div>
  </div>
);

export const CfpHero = ({
  description,
  eyebrow = "Selo de verificado",
  icon: Icon = VerifiedBadgeIcon,
  title,
  variant = "primary",
}: {
  description: ReactNode;
  eyebrow?: string;
  icon?: HeroIcon;
  title: string;
  variant?: "primary" | "success" | "warning";
}) => {
  const isVerifiedBadgeIcon = Icon === VerifiedBadgeIcon;
  const tone = {
    primary: "bg-primary text-primary-foreground ring-primary-soft/70",
    success: "bg-success/10 text-success ring-success/10",
    warning: "bg-warning/10 text-warning ring-warning/10",
  }[variant];

  return (
    <header className="grid justify-items-center text-center">
      <div
        className={cn(
          "grid h-20 w-20 place-items-center rounded-full shadow-[var(--lectum-shadow-soft)] ring-8 md:h-24 md:w-24",
          isVerifiedBadgeIcon ? "bg-transparent shadow-none ring-0" : tone,
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10 md:h-12 md:w-12",
            isVerifiedBadgeIcon && "h-16 w-16 md:h-20 md:w-20",
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-4xl">{title}</h1>
      <div className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted md:text-lg">
        {description}
      </div>
    </header>
  );
};
