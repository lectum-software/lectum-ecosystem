"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export type InputControllerProps<TFormValues extends FieldValues> = {
  name: FieldPath<TFormValues>;
  label: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  inputMode?: ComponentPropsWithoutRef<"input">["inputMode"];
  maskValue?: (value: string) => string;
  max?: ComponentPropsWithoutRef<"input">["max"];
  maxLength?: number;
  min?: ComponentPropsWithoutRef<"input">["min"];
  onBlur?: ComponentPropsWithoutRef<"input">["onBlur"];
  required?: boolean;
};

export const InputController = <TFormValues extends FieldValues>({
  autoComplete,
  disabled,
  inputMode,
  label,
  maskValue,
  max,
  maxLength,
  min,
  name,
  onBlur,
  placeholder,
  required,
  type = "text",
}: InputControllerProps<TFormValues>) => {
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
      <input
        {...field}
        aria-describedby={errorId}
        aria-invalid={hasError}
        autoComplete={autoComplete}
        className={cn(
          "h-12 w-full rounded-2xl border bg-surface px-4 text-base text-foreground shadow-control outline-none transition",
          "placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft",
          hasError ? "border-danger" : "border-border",
        )}
        disabled={disabled}
        id={String(name)}
        inputMode={inputMode}
        max={max}
        maxLength={maxLength}
        min={min}
        onBlur={(event) => {
          field.onBlur();
          onBlur?.(event);
        }}
        onChangeCapture={(event) => {
          if (maskValue) event.currentTarget.value = maskValue(event.currentTarget.value);
        }}
        placeholder={placeholder}
        type={type}
      />
      <span className="mt-1 block min-h-5 text-xs font-medium text-danger" id={errorId}>
        {fieldState.error?.message || ""}
      </span>
    </label>
  );
};
