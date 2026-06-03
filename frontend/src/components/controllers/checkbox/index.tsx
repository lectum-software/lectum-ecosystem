"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

export function CheckboxController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  disabled,
  readOnly,
  tabIndex,
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
            <input
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-invalid={Boolean(error)}
              checked={Boolean(field.value)}
              className={cn(
                "h-5 w-5 rounded border-border accent-[var(--lectum-primary)] focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
                inputClassName,
              )}
              disabled={disabled || readOnly}
              id={inputId}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue = event.target.checked;
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              ref={field.ref}
              required={false}
              tabIndex={tabIndex}
              type="checkbox"
            />
          </Container>
        );
      }}
    />
  );
}
