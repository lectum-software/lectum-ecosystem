"use client";

import { Loader2, Plus } from "lucide-react";
import { InputController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import {
  type PriceFormValues,
  parseMonthlyPrice,
  priceFormSchema,
} from "../modules/price-management";

export const PriceCreateCard = ({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (amountCents: number) => Promise<void>;
}) => {
  const form = useFormList<PriceFormValues>({
    defaultValues: { amount: "" },
    fields: [{ field: "input", name: "amount", label: "Mensalidade (R$)" }],
    schema: priceFormSchema,
  });
  return (
    <section className="min-w-0 rounded-card border border-border/80 bg-surface/95 p-5 shadow-admin-soft md:p-6">
      <h2 className="text-xl font-bold text-foreground" id="new-price-title">
        Criar nova versão de preço
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Somente novas adesões · BRL · mensal. Criar uma versão não publica a oferta, não cobra e não
        altera contratos ou reservas existentes.
      </p>
      <Form
        className="mt-5 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
        form={form}
        onSubmit={async ({ amount }) => {
          const cents = parseMonthlyPrice(amount);
          if (cents !== null) await onCreate(cents);
        }}
      >
        <InputController<PriceFormValues>
          autoComplete="off"
          disabled={disabled}
          inputMode="decimal"
          label="Mensalidade (R$)"
          maxLength={12}
          name="amount"
          placeholder="Ex.: 29,90"
          required
        />
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 lg:mt-7 lg:w-auto"
          disabled={disabled || form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Plus aria-hidden className="h-4 w-4" />
          )}
          Criar versão sem publicar
        </button>
      </Form>
      <p className="text-xs leading-5 text-muted">
        Use até duas casas decimais, com vírgula ou ponto e sem separador de milhar.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        O valor é imutável. Para mudar novamente, crie outra versão. Cortesias continuam no fluxo
        próprio.
      </p>
    </section>
  );
};
