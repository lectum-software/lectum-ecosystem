import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ className, id, label, error, ...props }: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="grid gap-2 text-sm font-semibold text-foreground" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={cn(
          "h-12 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-muted",
          error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}
