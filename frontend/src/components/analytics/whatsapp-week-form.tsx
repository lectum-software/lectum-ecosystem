"use client";
import { z } from "zod";
import type { WhatsappWeekReport } from "@/api/req/whatsapp-reports";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";

type Values = { count: number | null };
export const whatsappWeekFormSchema = () =>
  z.object({
    count: z
      .number()
      .int("Informe um número inteiro.")
      .min(0, "Informe zero ou mais pessoas.")
      .max(1_000_000, "Informe até 1.000.000 de pacientes.")
      .nullable()
      .refine((value) => value !== null, "Informe a quantidade, inclusive se for zero."),
  });

export function WhatsappWeekForm({
  report,
  pending,
  onSubmit,
}: {
  report: Pick<WhatsappWeekReport, "people_count" | "acquired_count">;
  pending: boolean;
  onSubmit: (count: number) => Promise<void>;
}) {
  const fields = [
    {
      name: "count",
      field: "input",
      type: "number",
      min: 0,
      max: 1_000_000,
      step: 1,
      label: "Quantidade de pessoas",
      required: true,
      autoComplete: "off",
    },
  ] satisfies Field<Values>[];
  const form = useFormList<Values>({
    fields,
    schema: whatsappWeekFormSchema(),
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
