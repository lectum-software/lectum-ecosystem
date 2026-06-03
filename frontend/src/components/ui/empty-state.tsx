import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function EmptyState({ action, className, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <section
      className={cn(
        "grid justify-items-center gap-3 rounded-[var(--lectum-card-radius)] border border-dashed border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="max-w-sm text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
