"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import {
  describedBy,
  fieldId,
  formatDatePtBr,
  toDatePtBrInput,
  toInputDate,
} from "@/components/controllers/utils";
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
  autoComplete,
  dateDisplayFormat = "native",
  placeholder,
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
              inputMode={dateDisplayFormat === "pt-BR" ? "numeric" : undefined}
              maxLength={dateDisplayFormat === "pt-BR" ? 10 : undefined}
              max={typeof max === "number" ? undefined : max}
              min={typeof min === "number" ? undefined : min}
              name={field.name}
              autoComplete={autoComplete}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextValue =
                  dateDisplayFormat === "pt-BR"
                    ? formatDatePtBr(event.target.value)
                    : event.target.value || null;
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              placeholder={
                dateDisplayFormat === "pt-BR" ? (placeholder ?? "00/00/0000") : placeholder
              }
              readOnly={readOnly}
              ref={field.ref}
              required={false}
              tabIndex={tabIndex}
              type={dateDisplayFormat === "pt-BR" ? "text" : "date"}
              value={
                dateDisplayFormat === "pt-BR"
                  ? toDatePtBrInput(field.value)
                  : toInputDate(field.value)
              }
            />
          </Container>
        );
      }}
    />
  );
}
