"use client";

import { useMemo, useRef } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

const normalizeDigits = (value: string, length: number) =>
  value.replace(/\D/g, "").slice(0, length);

export function OtpController<FormType extends FieldValues>({
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
  length = 6,
  autoFocus,
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hasAutoFocused = useRef(false);
  const slots = useMemo(
    () =>
      Array.from({ length }, (_, index) => ({
        index,
        key: `${String(name)}-digit-${index + 1}`,
      })),
    [length, name],
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const value = normalizeDigits(String(field.value ?? ""), length);
        const characters = value.padEnd(length, " ").split("");
        const isDisabled = disabled || readOnly;

        const focusIndex = (index: number) => {
          inputRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
        };

        const updateValue = (nextValue: string, focusTo?: number) => {
          const normalized = normalizeDigits(nextValue, length);
          field.onChange(normalized);
          onChangeCallback?.(normalized);

          if (typeof focusTo === "number") {
            requestAnimationFrame(() => focusIndex(focusTo));
          }
        };

        const applyInputValue = (index: number, rawValue: string) => {
          const digits = normalizeDigits(rawValue, length);
          const nextCharacters = value.padEnd(length, " ").split("");

          if (!digits) {
            nextCharacters[index] = " ";
            updateValue(nextCharacters.join("").replace(/\s/g, ""), index);
            return;
          }

          digits.split("").forEach((digit, offset) => {
            const nextIndex = index + offset;
            if (nextIndex < length) {
              nextCharacters[nextIndex] = digit;
            }
          });

          updateValue(nextCharacters.join("").replace(/\s/g, ""), index + digits.length);
        };

        return (
          <Container
            className={className}
            description={description}
            error={error}
            htmlFor={inputId}
            label={label}
            name={String(name)}
            required={required}
            skipHtmlFor
            tooltip={tooltip}
          >
            <fieldset
              className="grid grid-cols-6 gap-2 border-0 p-0 sm:gap-3"
              aria-describedby={describedBy({ id: inputId, description, error })}
              aria-label={label || "Código de verificação"}
            >
              {slots.map(({ index, key }) => {
                const digit = characters[index]?.trim() || "";

                return (
                  <input
                    aria-invalid={Boolean(error)}
                    aria-label={`Dígito ${index + 1} de ${length}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    className={cn(
                      "h-14 w-full rounded-[var(--lectum-control-radius)] border border-border bg-surface text-center text-xl font-bold text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                      error && "border-danger focus:border-danger focus:ring-danger/10",
                      inputClassName,
                    )}
                    disabled={isDisabled}
                    id={index === 0 ? inputId : `${inputId}-${index}`}
                    inputMode="numeric"
                    key={key}
                    maxLength={1}
                    name={`${field.name}-${index}`}
                    onBlur={field.onBlur}
                    onChange={(event) => applyInputValue(index, event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !digit && index > 0) {
                        event.preventDefault();
                        const nextCharacters = value.padEnd(length, " ").split("");
                        nextCharacters[index - 1] = " ";
                        updateValue(nextCharacters.join("").replace(/\s/g, ""), index - 1);
                      }

                      if (event.key === "ArrowLeft" && index > 0) {
                        event.preventDefault();
                        focusIndex(index - 1);
                      }

                      if (event.key === "ArrowRight" && index < length - 1) {
                        event.preventDefault();
                        focusIndex(index + 1);
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      applyInputValue(index, event.clipboardData.getData("text"));
                    }}
                    pattern="[0-9]*"
                    readOnly={readOnly}
                    ref={(node) => {
                      inputRefs.current[index] = node;
                      if (index === 0) {
                        field.ref(node);
                        if (autoFocus && node && !isDisabled && !hasAutoFocused.current) {
                          hasAutoFocused.current = true;
                          requestAnimationFrame(() => node.focus());
                        }
                      }
                    }}
                    type="text"
                    value={digit}
                  />
                );
              })}
            </fieldset>
          </Container>
        );
      }}
    />
  );
}
