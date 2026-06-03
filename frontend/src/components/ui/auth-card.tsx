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
      <div className="px-6 py-8 sm:px-8">{children}</div>
      {footer ? (
        <div className="border-t border-border bg-[#fbfdff] px-6 py-5 text-center text-sm text-muted sm:px-8">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
