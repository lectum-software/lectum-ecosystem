"use client";

import { type ComponentPropsWithoutRef, useId } from "react";
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
  const controlId = useId();
  const errorId = `${controlId}-error`;
  const hasError = Boolean(fieldState.error?.message);

  return (
    <div className="block w-full text-sm font-semibold text-foreground">
      <label className="mb-2 block" htmlFor={controlId}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        {...field}
        aria-describedby={errorId}
        aria-invalid={hasError}
        aria-required={required || undefined}
        autoComplete={autoComplete}
        className={cn(
          "h-12 w-full rounded-2xl border bg-surface px-4 text-base text-foreground shadow-control outline-none transition",
          "placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft",
          hasError ? "border-danger" : "border-border",
        )}
        disabled={disabled}
        id={controlId}
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
