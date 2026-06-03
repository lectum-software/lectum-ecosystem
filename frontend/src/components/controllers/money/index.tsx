"use client";

import type { FieldValues } from "react-hook-form";
import { NumberFieldController } from "@/components/controllers/number-field";
import type { ControllerFieldProps } from "@/hooks/form";

export function MoneyController<FormType extends FieldValues>({
  currency = "R$",
  ...props
}: ControllerFieldProps<FormType>) {
  return (
    <NumberFieldController
      {...props}
      adornment={currency}
      defaultPlaceholder="0,00"
      step={props.step ?? 0.01}
    />
  );
}
