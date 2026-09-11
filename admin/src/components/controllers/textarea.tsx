"use client";

import { useId } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export type TextareaControllerProps<TFormValues extends FieldValues> = {
  name: FieldPath<TFormValues>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
};

export const TextareaController = <TFormValues extends FieldValues>({
  disabled,
  label,
  name,
  placeholder,
  required,
  rows = 4,
}: TextareaControllerProps<TFormValues>) => {
  const { control } = useFormContext<TFormValues>();
  const { field, fieldState } = useController({ control, name });
  const controlId = useId();
  const errorId = `${controlId}-error`;
  const hasError = Boolean(fieldState.error?.message);

  return (
    <div className="block w-full text-sm font-semibold text-foreground">
      <label className="mb-2 block" htmlFor={controlId}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <textarea
        {...field}
        aria-describedby={errorId}
        aria-invalid={hasError}
        aria-required={required || undefined}
        className={cn(
          "w-full resize-y rounded-2xl border bg-surface px-4 py-3 text-base text-foreground shadow-control outline-none transition",
          "placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft",
          hasError ? "border-danger" : "border-border",
        )}
        disabled={disabled}
        id={controlId}
        placeholder={placeholder}
        rows={rows}
      />
      <span
        className="mt-1 block min-h-5 text-xs font-medium text-danger"
        id={errorId}
        role="alert"
      >
        {fieldState.error?.message || ""}
      </span>
    </div>
  );
};
