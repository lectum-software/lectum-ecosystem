import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = PropsWithChildren<{
  className?: string;
  footer?: ReactNode;
}>;

export function AuthCard({ children, className, footer }: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full max-w-[var(--lectum-container)] overflow-hidden rounded-[var(--lectum-auth-radius)] border border-border bg-surface shadow-[var(--lectum-shadow)]",
        className,
      )}
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7">{children}</div>
      {footer ? (
        <div className="border-t border-border px-5 py-4 text-center text-[13px] leading-5 text-muted sm:px-7 sm:text-sm">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
