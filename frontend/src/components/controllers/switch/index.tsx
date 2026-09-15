"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

export function SwitchController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  disabled,
  readOnly,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const checked = Boolean(field.value);
        const error = fieldState.error?.message;

        return (
          <Container
            className={className}
            description={description}
            error={error}
            label={label}
            name={String(name)}
            required={required}
            skipHtmlFor
            tooltip={tooltip}
          >
            <button
              aria-checked={checked}
              aria-label={label || String(name)}
              className={cn(
                "relative h-7 w-12 rounded-full border border-border bg-border-strong transition focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
                checked && "border-primary bg-primary",
                error && "border-danger focus:ring-danger/10",
                inputClassName,
              )}
              disabled={disabled || readOnly}
              onBlur={field.onBlur}
              onClick={() => {
                const nextValue = !checked;
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              role="switch"
              type="button"
            >
              <span
                className={cn(
                  "absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-sm transition",
                  checked && "translate-x-5",
                )}
              />
            </button>
          </Container>
        );
      }}
    />
  );
}
