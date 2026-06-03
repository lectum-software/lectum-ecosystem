import type * as React from "react";

import { cn } from "@/lib/utils";

const Input = ({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        "h-12 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-muted",
        className,
      )}
      type={type}
      {...props}
    />
  );
};

export { Input };
