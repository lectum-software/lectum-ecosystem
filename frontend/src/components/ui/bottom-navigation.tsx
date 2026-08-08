import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type BottomNavigationItem = {
  label: string;
  href?: string;
  active?: boolean;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type BottomNavigationProps = {
  items: BottomNavigationItem[];
  className?: string;
};

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegacao principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-3 pb-3 pt-2 text-foreground shadow-lectum-soft backdrop-blur md:hidden dark:shadow-lectum-soft",
        className,
      )}
    >
      <div className="mx-auto grid max-w-[var(--lectum-container)] grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </>
          );

          return item.href ? (
            <a
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-subtle transition",
                item.active && "bg-primary-soft text-primary",
              )}
              href={item.href}
              key={item.label}
            >
              {content}
            </a>
          ) : (
            <button
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-subtle transition",
                item.active && "bg-primary-soft text-primary",
              )}
              key={item.label}
              type="button"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
