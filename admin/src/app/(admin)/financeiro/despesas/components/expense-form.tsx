"use client";

import { Loader2 } from "lucide-react";
import type { AdminExpense, ExpenseList } from "@/api/req/finance/expenses";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import {
  type ExpenseFormValues,
  expenseFormDefaults,
  expenseFormSchema,
  expenseToday,
} from "../modules/expense-policy";
import { ExpenseDialogShell } from "./dialog-shell";

export const ExpenseFormDialog = ({
  item,
  categories,
  busy,
  onClose,
  onSubmit,
}: {
  item?: AdminExpense;
  categories: ExpenseList["categories"];
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}) => {
  const form = useFormList<ExpenseFormValues>({
    defaultValues: expenseFormDefaults(item),
    fields: [],
    schema: expenseFormSchema(Boolean(item)),
  });
  return (
    <ExpenseDialogShell
      busy={busy}
      onClose={onClose}
      title={item ? "Corrigir despesa registrada" : "Registrar despesa operacional"}
    >
      <p className="mb-4 text-sm leading-6 text-muted">
        Registro manual em BRL. Esta ação não paga contas, não cobra cartão e não emite nota. Não
        informe dados pessoais, credenciais ou dados de cartão na descrição ou no motivo.
      </p>
      {item ? (
        <p className="mb-4 rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm leading-6 text-warning">
          Correção da revisão {item.revision}. Se outra pessoa alterar o registro, atualize a lista
          e revise novamente. O histórico auditado é preservado.
        </p>
      ) : null}
      <Form className="space-y-3" form={form} onSubmit={onSubmit}>
        <div className="grid min-w-0 gap-x-4 sm:grid-cols-2">
          <InputController<ExpenseFormValues>
            autoComplete="off"
            disabled={busy}
            inputMode="decimal"
            label="Valor (R$)"
            maxLength={12}
            name="amount"
            placeholder="Ex.: 100,00"
            required
          />
          <SelectController<ExpenseFormValues>
            disabled={busy}
            label="Categoria"
            name="category"
            options={categories.map((item) => ({ value: item.id, label: item.label }))}
            required
          />
          <InputController<ExpenseFormValues>
            disabled={busy}
            label="Data de competência"
            max="2100-12-31"
            min="2000-01-01"
            name="competence_date"
            required
            type="date"
          />
          <InputController<ExpenseFormValues>
            disabled={busy}
            label="Data de pagamento (opcional)"
            max={expenseToday()}
            min="2000-01-01"
            name="paid_date"
            type="date"
          />
        </div>
        <p className="text-xs leading-5 text-muted">
          Valor com até duas casas decimais, sem separador de milhar. Competência e pagamento são
          independentes; adiantamentos são permitidos. Sem pagamento informado, o registro fica
          pendente.
        </p>
        <TextareaController<ExpenseFormValues>
          disabled={busy}
          label="Descrição operacional"
          name="description"
          required
          rows={2}
        />
        {item ? (
          <TextareaController<ExpenseFormValues>
            disabled={busy}
            label="Motivo da correção"
            name="reason"
            required
            rows={2}
          />
        ) : null}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            className="min-h-12 rounded-control border border-border px-5 text-sm font-bold text-muted"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Voltar sem salvar
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={busy || form.formState.isSubmitting}
            type="submit"
          >
            {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {item ? "Confirmar correção" : "Registrar sem efetuar pagamento"}
          </button>
        </div>
      </Form>
    </ExpenseDialogShell>
  );
};
