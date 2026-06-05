"use client";

import { Controller, type FieldValues } from "react-hook-form";
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
          <div className={cn("grid gap-2 text-sm text-muted", className)}>
            <label className="flex items-start gap-3" htmlFor={inputId}>
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
              <span className="flex-1 text-xs font-normal leading-5">
                {label}
                {required ? <span className="text-danger"> *</span> : null}
                {tooltip ? <span className="sr-only"> {tooltip}</span> : null}
              </span>
            </label>

            {description ? (
              <span className="-mt-1 text-xs font-normal leading-5" id={`${inputId}-description`}>
                {description}
              </span>
            ) : null}

            <span
              className="block min-h-4 text-xs font-medium leading-4 text-danger"
              id={`${inputId}-error`}
              role="alert"
            >
              {error}
            </span>
          </div>
        );
      }}
    />
  );
}
