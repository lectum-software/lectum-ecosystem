import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DividerWithLabelProps = {
  children: ReactNode;
  className?: string;
};

export function DividerWithLabel({ children, className }: DividerWithLabelProps) {
  return (
    <div
      className={cn("flex items-center gap-4 text-xs font-medium uppercase text-subtle", className)}
    >
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
