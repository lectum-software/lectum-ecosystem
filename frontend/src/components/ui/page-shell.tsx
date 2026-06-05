import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = PropsWithChildren<{
  className?: string;
  contentClassName?: string;
  header?: ReactNode;
}>;

export function PageShell({ children, className, contentClassName, header }: PageShellProps) {
  return (
    <main className={cn("min-h-screen bg-background text-foreground", className)}>
      {header}
      <div className={cn("mx-auto w-full max-w-6xl px-5 py-6 sm:py-8", contentClassName)}>
        {children}
      </div>
    </main>
  );
}
