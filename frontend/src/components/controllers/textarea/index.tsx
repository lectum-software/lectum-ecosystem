"use client";

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
  disabled,
  readOnly,
  tabIndex,
  rows = 4,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);

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
                "min-h-28 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                error && "border-danger focus:border-danger focus:ring-danger/10",
                inputClassName,
              )}
              disabled={disabled}
              id={inputId}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue = event.target.value === "" ? undefined : event.target.value;
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              placeholder={placeholder}
              readOnly={readOnly}
              ref={field.ref}
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
