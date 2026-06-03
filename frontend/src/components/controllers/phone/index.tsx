"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId, formatPhone, onlyDigits } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";

export function PhoneController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  placeholder = "(00) 00000-0000",
  disabled,
  readOnly,
  autoFocus,
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
            <Input
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-invalid={Boolean(error)}
              autoFocus={autoFocus}
              className={cn(
                error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
                inputClassName,
              )}
              disabled={disabled}
              id={inputId}
              inputMode="tel"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue = onlyDigits(event.target.value).slice(0, 13);
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              placeholder={placeholder}
              readOnly={readOnly}
              ref={field.ref}
              required={false}
              tabIndex={tabIndex}
              type="tel"
              value={formatPhone(field.value)}
            />
          </Container>
        );
      }}
    />
  );
}
