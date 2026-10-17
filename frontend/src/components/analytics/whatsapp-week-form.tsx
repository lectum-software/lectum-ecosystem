"use client";
import { z } from "zod";
import type { WhatsappWeekReport } from "@/api/req/whatsapp-reports";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";

type Values = { count: number | null };
export const whatsappWeekFormSchema = (max: number) =>
  z.object({
    count: z
      .number()
      .int("Informe um número inteiro.")
      .min(0, "Informe zero ou mais pessoas.")
      .max(max, `Informe até ${max} pessoas.`)
      .nullable()
      .refine((value) => value !== null, "Informe a quantidade, inclusive se for zero."),
  });

export function WhatsappWeekForm({
  report,
  pending,
  onSubmit,
}: {
  report: WhatsappWeekReport;
  pending: boolean;
  onSubmit: (count: number) => Promise<void>;
}) {
  const fields = [
    {
      name: "count",
      field: "input",
      type: "number",
      min: 0,
      max: report.people_count,
      step: 1,
      label: "Quantidade de pessoas",
      required: true,
      autoComplete: "off",
    },
  ] satisfies Field<Values>[];
  const form = useFormList<Values>({
    fields,
    schema: whatsappWeekFormSchema(report.people_count),
    defaultValues: { count: report.acquired_count },
    mode: "onSubmit",
    onlyRead: pending,
  });
  return (
    <form.Form
      {...form.formProps}
      onSubmit={form.hook.handleSubmit(async ({ count }) => {
        if (count !== null) await onSubmit(count);
      })}
    >
      <p className="text-xs leading-5 text-muted">
        Sua resposta será registrada nos seus Analytics da Lectum.
      </p>
      <Button
        className="mt-4 w-full"
        type="submit"
        disabled={pending || form.hook.formState.isSubmitting}
      >
        {pending ? "Enviando…" : "Enviar resposta"}
      </Button>
    </form.Form>
  );
}
