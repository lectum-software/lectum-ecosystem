"use client";

import { useRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

export function TextareaController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  placeholder,
  autoGrow,
  autoFocus,
  disabled,
  readOnly,
  tabIndex,
  rows = 4,
  max,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);
  const hasAutoFocused = useRef(false);
  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!autoGrow || !element) return;

    const computedStyle = window.getComputedStyle(element);
    const maxHeight = Number.parseFloat(computedStyle.maxHeight);
    const hasMaxHeight = Number.isFinite(maxHeight) && maxHeight > 0;

    element.style.height = "auto";
    const nextHeight = hasMaxHeight
      ? Math.min(element.scrollHeight, maxHeight)
      : element.scrollHeight;

    element.style.height = `${nextHeight}px`;
    element.style.overflowY = hasMaxHeight && element.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        return (
          <Container
            className={className}
            description={description}
            error={error}
            htmlFor={inputId}
            label={label}
            name={String(name)}
            required={required}
            tooltip={tooltip}
          >
            <textarea
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-invalid={Boolean(error)}
              className={cn(
                "min-h-28 w-full rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                error && "border-danger focus:border-danger focus:ring-danger/10",
                autoGrow && "resize-none overflow-hidden",
                inputClassName,
              )}
              disabled={disabled}
              id={inputId}
              name={field.name}
              maxLength={typeof max === "number" ? max : undefined}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue = event.target.value;
                field.onChange(nextValue);
                resizeTextarea(event.currentTarget);
                onChangeCallback?.(nextValue);
              }}
              placeholder={placeholder}
              readOnly={readOnly}
              ref={(element) => {
                field.ref(element);
                resizeTextarea(element);
                if (autoFocus && element && !disabled && !readOnly && !hasAutoFocused.current) {
                  hasAutoFocused.current = true;
                  element.focus({ preventScroll: true });
                }
              }}
              required={false}
              rows={rows}
              tabIndex={tabIndex}
              value={field.value ?? ""}
            />
          </Container>
        );
      }}
    />
  );
}
