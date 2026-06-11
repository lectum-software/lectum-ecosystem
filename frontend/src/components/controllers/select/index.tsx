"use client";

import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

export function SelectController<FormType extends FieldValues>({
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
  options = [],
  emptyLabel = "Selecione",
  loading,
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
            <select
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-invalid={Boolean(error)}
              className={cn(
                "h-12 w-full rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                error && "border-danger focus:border-danger focus:ring-danger/10",
                inputClassName,
              )}
              disabled={disabled || readOnly || loading}
              id={inputId}
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => {
                const option = options.find((item) => String(item.value) === event.target.value);
                const nextValue =
                  event.target.value === "" ? null : (option?.value ?? event.target.value);
                field.onChange(nextValue);
                onChangeCallback?.(nextValue);
              }}
              ref={field.ref}
              required={false}
              tabIndex={tabIndex}
              value={field.value === null || field.value === undefined ? "" : String(field.value)}
            >
              <option value="">{loading ? "Carregando..." : placeholder || emptyLabel}</option>
              {options.map((option) => (
                <option
                  disabled={option.disabled}
                  key={`${option.label}-${String(option.value)}`}
                  value={String(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </Container>
        );
      }}
    />
  );
}
