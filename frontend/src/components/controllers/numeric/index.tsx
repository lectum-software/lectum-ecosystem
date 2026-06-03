"use client";

import type { FieldValues } from "react-hook-form";
import { NumberFieldController } from "@/components/controllers/number-field";
import type { ControllerFieldProps } from "@/hooks/form";

export function NumericController<FormType extends FieldValues>(
  props: ControllerFieldProps<FormType>,
) {
  return <NumberFieldController {...props} defaultPlaceholder="0" />;
}
