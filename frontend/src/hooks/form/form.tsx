"use client";

import type { FieldValues } from "react-hook-form";
import { components } from "@/components/controllers";
import type { FormProps } from "./types";

export const onlyReadProps = {
  disabled: true,
  readOnly: true,
  tabIndex: -1,
};

export function Form<FormType extends FieldValues>({
  children,
  fields,
  hook,
  onlyRead,
  ...rest
}: FormProps<FormType>) {
  const readProps = onlyRead ? onlyReadProps : {};

  return (
    <form {...rest} data-testid="form" noValidate>
      {fields.map((field) => {
        if (field.hide) {
          return null;
        }

        const Component = components[field.field];

        if (!Component) {
          return null;
        }

        return (
          <Component
            key={`form--${String(field.name)}`}
            control={hook.control}
            read={onlyRead ? "true" : undefined}
            {...field}
            {...readProps}
            disabled={field.disabled || onlyRead}
            readOnly={field.readOnly || onlyRead}
          />
        );
      })}

      {children}

      <input className="hidden" data-testid="submit-button" type="submit" />
    </form>
  );
}
