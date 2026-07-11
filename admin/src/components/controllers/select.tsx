"use client";

import { ChevronDown } from "lucide-react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export type SelectControllerOption = {
  label: string;
  value: string;
};

export type SelectControllerProps<TFormValues extends FieldValues> = {
  name: FieldPath<TFormValues>;
  label: string;
  options: SelectControllerOption[];
  disabled?: boolean;
  insetChevron?: boolean;
  required?: boolean;
  selectClassName?: string;
};

export const SelectController = <TFormValues extends FieldValues>({
  disabled,
  insetChevron = true,
  label,
  name,
  options,
  required,
  selectClassName,
}: SelectControllerProps<TFormValues>) => {
  const { control } = useFormContext<TFormValues>();
  const { field, fieldState } = useController({ control, name });
  const errorId = `${String(name)}-error`;
  const hasError = Boolean(fieldState.error?.message);

  return (
    <label className="block w-full text-sm font-semibold text-foreground" htmlFor={String(name)}>
      <span className="mb-2 block">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <span className="relative block">
        <select
          {...field}
          aria-describedby={errorId}
          aria-invalid={hasError}
          className={cn(
            "h-12 w-full rounded-2xl border bg-surface px-4 text-base text-foreground shadow-control outline-none transition",
            "focus:border-primary focus:ring-4 focus:ring-primary-soft",
            insetChevron ? "appearance-none pr-12" : null,
            hasError ? "border-danger" : "border-border",
            selectClassName,
          )}
          disabled={disabled}
          id={String(name)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {insetChevron ? (
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
        ) : null}
      </span>
      <span className="mt-1 block min-h-5 text-xs font-medium text-danger" id={errorId}>
        {fieldState.error?.message || ""}
      </span>
    </label>
  );
};
