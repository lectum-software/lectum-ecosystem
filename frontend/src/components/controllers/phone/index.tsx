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
  countryCodeName,
  countryCodeOptions = [],
  countryCodeClassName,
  prefix,
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
            <div className="relative flex min-w-0 w-full items-stretch">
              {countryCodeName ? (
                <Controller
                  control={control}
                  name={countryCodeName}
                  render={({ field: countryField }) => (
                    <select
                      aria-label="Código do país"
                      className={cn(
                        "h-12 w-32 shrink-0 rounded-l-[var(--lectum-control-radius)] border border-border bg-surface px-3 text-sm font-semibold text-muted shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                        countryCodeClassName,
                      )}
                      disabled={disabled || readOnly}
                      name={countryField.name}
                      onBlur={countryField.onBlur}
                      onChange={(event) => countryField.onChange(event.target.value)}
                      ref={countryField.ref}
                      tabIndex={tabIndex}
                      value={String(countryField.value || "")}
                    >
                      {countryCodeOptions.map((option) => (
                        <option
                          key={option.key ?? `${option.label}-${String(option.value)}`}
                          value={String(option.value)}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              ) : null}
              {!countryCodeName && prefix ? (
                <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-5 text-base font-semibold text-muted">
                  {prefix}
                </span>
              ) : null}
              <Input
                aria-describedby={describedBy({ id: inputId, description, error })}
                aria-invalid={Boolean(error)}
                autoFocus={autoFocus}
                className={cn(
                  prefix && "pl-16",
                  countryCodeName && "rounded-l-none border-l-0",
                  error && "border-danger focus:border-danger focus:ring-danger/10",
                  "min-w-0 flex-1",
                  inputClassName,
                )}
                disabled={disabled}
                id={inputId}
                inputMode="tel"
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const nextValue = onlyDigits(event.target.value).slice(0, 15);
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
            </div>
          </Container>
        );
      }}
    />
  );
}
