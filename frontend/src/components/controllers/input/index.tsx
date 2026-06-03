"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";

export function InputController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  type = "text",
  placeholder,
  disabled,
  readOnly,
  autoComplete,
  autoFocus,
  tabIndex,
  min,
  max,
  step,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);
  const [visible, setVisible] = useState(false);
  const inputType = type === "password" && visible ? "text" : type;

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
              <Input
                aria-describedby={describedBy({ id: inputId, description, error })}
                aria-invalid={Boolean(error)}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className={cn(
                  error && "border-danger focus:border-danger focus:ring-danger/10",
                  type === "password" && "pr-11",
                  inputClassName,
                )}
                disabled={disabled}
                id={inputId}
                max={max}
                min={min}
                name={field.name}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const nextValue =
                    type === "number"
                      ? event.target.value
                        ? Number(event.target.value)
                        : null
                      : event.target.value;

                  field.onChange(nextValue);
                  onChangeCallback?.(nextValue);
                }}
                placeholder={placeholder}
                readOnly={readOnly}
                ref={field.ref}
                required={false}
                step={step}
                tabIndex={tabIndex}
                type={inputType}
                value={field.value ?? ""}
              />

              {type === "password" ? (
                <button
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                  onClick={() => setVisible((current) => !current)}
                  tabIndex={-1}
                  type="button"
                >
                  {visible ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </span>
          </Container>
        );
      }}
    />
  );
}
