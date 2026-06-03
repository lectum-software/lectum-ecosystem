import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

const variants = {
  primary:
    "bg-primary text-white shadow-[var(--lectum-shadow-soft)] hover:bg-[#247bd1] focus-visible:outline-primary disabled:bg-[#94a3b8]",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-primary-soft focus-visible:outline-primary disabled:text-subtle",
  ghost:
    "bg-transparent text-muted hover:bg-primary-soft hover:text-foreground focus-visible:outline-primary disabled:text-subtle",
};

export function Button({
  className,
  children,
  isLoading,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--lectum-control-radius)] px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
