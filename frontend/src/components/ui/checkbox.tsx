import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

export function Checkbox({ className, label, error, id, ...props }: CheckboxProps) {
  const inputId = id || props.name;

  return (
    <label className="flex items-start gap-3 text-sm text-muted" htmlFor={inputId}>
      <input
        id={inputId}
        className={cn(
          "mt-0.5 h-5 w-5 rounded border-border text-primary accent-[var(--lectum-primary)] focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        type="checkbox"
        {...props}
      />
      <span>
        {label}
        {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
      </span>
    </label>
  );
}
