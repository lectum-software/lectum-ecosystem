"use client";

import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";

export type AnalyticsCustomRange = { end_at: string; start_at: string };

const isDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const dateField = (requiredMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .refine((value) => !value || isDateOnly(value), {
      message: "Informe uma data válida.",
    });

export const analyticsCustomRangeSchema = z
  .object({
    start_at: dateField("Informe a data de início."),
    end_at: dateField("Informe a data de fim."),
  })
  .refine(
    ({ start_at, end_at }) => !isDateOnly(start_at) || !isDateOnly(end_at) || start_at <= end_at,
    { message: "Fim anterior ao início.", path: ["end_at"] },
  );

export const CUSTOM_PERIOD_FIELDS = [
  {
    name: "start_at",
    field: "input",
    type: "date",
    label: "Início",
    required: true,
    autoFocus: true,
    className: "[&>[role=alert]]:h-8",
  },
  {
    name: "end_at",
    field: "input",
    type: "date",
    label: "Fim",
    required: true,
    className: "[&>[role=alert]]:h-8",
  },
] satisfies Field<AnalyticsCustomRange>[];

export function CustomPeriodForm({
  range,
  disabled,
  onApply,
}: {
  range: AnalyticsCustomRange;
  disabled?: boolean;
  onApply: (range: AnalyticsCustomRange) => void;
}) {
  const form = useFormList<AnalyticsCustomRange>({
    fields: CUSTOM_PERIOD_FIELDS,
    schema: analyticsCustomRangeSchema,
    defaultValues: range,
    mode: "onSubmit",
    onlyRead: disabled,
  });

  return (
    <form.Form
      {...form.formProps}
      className="grid gap-x-3 sm:grid-cols-2"
      onSubmit={form.hook.handleSubmit((values) => {
        if (!disabled) onApply(values);
      })}
    >
      <Button
        className="mt-2 h-11 w-full rounded-full text-sm font-extrabold sm:col-span-2"
        disabled={disabled || form.hook.formState.isSubmitting}
        type="submit"
      >
        Aplicar período
      </Button>
    </form.Form>
  );
}
