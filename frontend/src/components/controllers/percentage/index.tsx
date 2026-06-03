"use client";

import type { FieldValues } from "react-hook-form";
import { NumberFieldController } from "@/components/controllers/number-field";
import type { ControllerFieldProps } from "@/hooks/form";

export function PercentageController<FormType extends FieldValues>(
  props: ControllerFieldProps<FormType>,
) {
  return (
    <NumberFieldController
      {...props}
      adornment="%"
      defaultPlaceholder="0"
      max={props.max ?? 100}
      min={props.min ?? 0}
      step={props.step ?? 0.01}
    />
  );
}
