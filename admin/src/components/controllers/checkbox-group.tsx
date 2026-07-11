"use client";

import type { FieldPath, FieldValues } from "react-hook-form";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export type CheckboxGroupControllerOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export type CheckboxGroupControllerProps<TFormValues extends FieldValues> = {
  name: FieldPath<TFormValues>;
  label: string;
  options: CheckboxGroupControllerOption[];
  description?: string;
  disabled?: boolean;
  required?: boolean;
};

export const CheckboxGroupController = <TFormValues extends FieldValues>({
  description,
  disabled,
  label,
  name,
  options,
  required,
}: CheckboxGroupControllerProps<TFormValues>) => {
  const { control } = useFormContext<TFormValues>();
  const { field, fieldState } = useController({ control, name });
  const values = Array.isArray(field.value) ? (field.value as string[]) : [];
  const errorId = `${String(name)}-error`;
  const hasError = Boolean(fieldState.error?.message);

  const toggleValue = (value: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...values, value]))
      : values.filter((item) => item !== value);
    field.onChange(next);
  };

  return (
    <fieldset className="block w-full text-sm font-semibold text-foreground">
      <legend className="mb-2 block">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </legend>
      {description ? <p className="mb-3 text-xs font-medium text-muted">{description}</p> : null}
      <div
        aria-describedby={errorId}
        aria-invalid={hasError}
        className={cn(
          "grid gap-2 rounded-2xl border bg-surface p-3 shadow-control transition sm:grid-cols-2",
          hasError ? "border-danger" : "border-border",
        )}
      >
        {options.length > 0 ? (
          options.map((option) => {
            const checked = values.includes(option.value);
            const optionDisabled = disabled || option.disabled;

            return (
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-foreground transition",
                  "hover:border-primary/40 hover:bg-primary-soft/40",
                  checked ? "border-primary bg-primary-soft text-primary" : null,
                  optionDisabled ? "cursor-not-allowed opacity-60" : null,
                )}
                key={option.value}
              >
                <input
                  checked={checked}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  disabled={optionDisabled}
                  onBlur={field.onBlur}
                  onChange={(event) => toggleValue(option.value, event.target.checked)}
                  type="checkbox"
                  value={option.value}
                />
                <span>{option.label}</span>
              </label>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm font-medium text-muted">
            Nenhuma opção disponível no catálogo.
          </p>
        )}
      </div>
      <span className="mt-1 block min-h-5 text-xs font-medium text-danger" id={errorId}>
        {fieldState.error?.message || ""}
      </span>
    </fieldset>
  );
};
