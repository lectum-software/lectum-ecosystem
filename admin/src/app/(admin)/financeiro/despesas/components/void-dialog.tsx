"use client";

import { Loader2 } from "lucide-react";
import { z } from "zod";
import type { AdminExpense } from "@/api/req/finance/expenses";
import { TextareaController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import { formatMoney } from "../../modules/finance-support";
import { expenseReasonSchema, formatExpenseDate } from "../modules/expense-policy";
import { ExpenseDialogShell } from "./dialog-shell";

const schema = z.object({ reason: expenseReasonSchema });
export const ExpenseVoidDialog = ({
  item,
  busy,
  onClose,
  onSubmit,
}: {
  item: AdminExpense;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) => {
  const form = useFormList<{ reason: string }>({
    defaultValues: { reason: "" },
    fields: [],
    schema,
  });
  return (
    <ExpenseDialogShell busy={busy} onClose={onClose} title="Anular lançamento de despesa">
      <p className="text-lg font-bold text-foreground">
        {formatMoney(item.amount_cents)} · {formatExpenseDate(item.competence_date)}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-muted">{item.description}</p>
      <p className="my-4 rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm leading-6 text-warning">
        O lançamento sairá dos totais ativos, mas continuará no histórico como anulado. Não haverá
        estorno, cancelamento de serviço, pagamento ou exclusão de dados. Confirmação sobre a
        revisão {item.revision}.
      </p>
      <Form className="space-y-3" form={form} onSubmit={({ reason }) => onSubmit(reason)}>
        <TextareaController<{ reason: string }>
          disabled={busy}
          label="Motivo da anulação"
          name="reason"
          required
          rows={3}
        />
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          disabled={busy || form.formState.isSubmitting}
          type="submit"
        >
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Confirmar anulação
          do lançamento
        </button>
      </Form>
    </ExpenseDialogShell>
  );
};
