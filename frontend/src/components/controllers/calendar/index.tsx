"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId, toInputDate } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";

export function CalendarController<FormType extends FieldValues>({
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
  autoFocus,
  tabIndex,
  min,
  max,
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
            <Input
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-invalid={Boolean(error)}
              autoFocus={autoFocus}
              className={cn(
                error && "border-danger focus:border-danger focus:ring-danger/10",
                inputClassName,
              )}
              disabled={disabled}
              id={inputId}
              max={typeof max === "number" ? undefined : max}
              min={typeof min === "number" ? undefined : min}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue = event.target.value || null;
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              readOnly={readOnly}
              ref={field.ref}
              required={false}
              tabIndex={tabIndex}
              type="date"
              value={toInputDate(field.value)}
            />
          </Container>
        );
      }}
    />
  );
}
