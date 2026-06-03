"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { clampNumber, describedBy, fieldId, parseDecimal } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";

type NumberFieldProps<FormType extends FieldValues> = ControllerFieldProps<FormType> & {
  adornment?: string;
  defaultPlaceholder?: string;
};

export function NumberFieldController<FormType extends FieldValues>({
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
  autoFocus,
  tabIndex,
  min,
  max,
  step,
  int,
  positive,
  onChangeCallback,
  adornment,
  defaultPlaceholder = "0",
}: NumberFieldProps<FormType>) {
  const inputId = fieldId(name, id);
  const minimum = positive ? 0 : min;

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
            <span className="relative block">
              {adornment ? (
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                  {adornment}
                </span>
              ) : null}
              <Input
                aria-describedby={describedBy({ id: inputId, description, error })}
                aria-invalid={Boolean(error)}
                autoFocus={autoFocus}
                className={cn(
                  error && "border-danger focus:border-danger focus:ring-danger/10",
                  adornment && "pl-11",
                  inputClassName,
                )}
                disabled={disabled}
                id={inputId}
                inputMode="decimal"
                max={max}
                min={minimum}
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  let nextValue = clampNumber(parseDecimal(event.target.value), minimum, max);

                  if (nextValue !== null && int) {
                    nextValue = Math.trunc(nextValue);
                  }

                  field.onChange(nextValue);
                  onChangeCallback?.(nextValue);
                }}
                placeholder={placeholder || defaultPlaceholder}
                readOnly={readOnly}
                ref={field.ref}
                required={false}
                step={step}
                tabIndex={tabIndex}
                type="text"
                value={field.value ?? ""}
              />
            </span>
          </Container>
        );
      }}
    />
  );
}
