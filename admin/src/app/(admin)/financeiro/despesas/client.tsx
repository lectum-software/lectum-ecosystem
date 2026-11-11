"use client";

import { Loader2, Plus, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminExpenseActions, useAdminExpenses } from "@/api/callers/finance/expenses";
import { resolveApiError } from "@/api/handle";
import type { AdminExpense, ExpenseCreation, ExpenseQuery } from "@/api/req/finance/expenses";
import { AdminPagination } from "@/components/admin-shell/pagination";
import { useAdminAuth } from "@/providers/admin-auth";
import { formatMoney } from "../modules/finance-support";
import { ExpenseFormDialog } from "./components/expense-form";
import { ExpenseFilters } from "./components/filters";
import { ExpenseSummary } from "./components/summary";
import { ExpenseTable } from "./components/table";
import { ExpenseVoidDialog } from "./components/void-dialog";
import {
  categoryLabel,
  type ExpenseFormValues,
  expenseCategories,
  expenseCreationWasRejected,
  expenseFormInput,
  resolveExpenseQuery,
} from "./modules/expense-policy";
import { useExpenseRecovery } from "./modules/use-expense-recovery";

type Modal = { kind: "create" } | { kind: "correct" | "void"; item: AdminExpense };
export const AdminExpensesClient = () => {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const resolved = useMemo(() => resolveExpenseQuery(new URLSearchParams(search)), [search]);
  const query = useAdminExpenses(resolved.query, resolved.valid);
  const actions = useAdminExpenseActions();
  const recovery = useExpenseRecovery(admin?.id);
  const [modal, setModal] = useState<Modal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const categories =
    query.data?.categories ?? expenseCategories.map((id) => ({ id, label: categoryLabel[id] }));
  const navigate = (input: ExpenseQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input))
      if (value !== undefined && value !== "") params.set(key, String(value));
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  };
  const clearRejectedRequest = (cause: unknown) => {
    if (!expenseCreationWasRejected(cause)) return false;
    try {
      recovery.preserve(null);
    } catch {
      recovery.block();
    }
    setNotice(
      "Os dados foram recusados antes de salvar um novo lançamento. Revise o formulário para uma nova solicitação.",
    );
    return true;
  };
  const submitCreation = async (request: ExpenseCreation) => {
    const result = await actions.create.mutateAsync(request);
    recovery.preserve(null);
    setModal(null);
    setNotice(
      result.replayed
        ? "Solicitação recuperada. O cadastro atual foi preservado, inclusive eventuais correções ou anulação; nenhum pagamento foi efetuado."
        : "Despesa registrada manualmente. Nenhum pagamento foi efetuado.",
    );
  };
  const submitForm = async (values: ExpenseFormValues) => {
    if (!modal || modal.kind === "void" || actions.busy) return;
    const input = expenseFormInput(values);
    if (modal.kind === "create") {
      if (!recovery.ready || recovery.hasRequest()) return;
      const request = { ...input, request_key: window.crypto.randomUUID() };
      try {
        recovery.preserve(request);
      } catch {
        recovery.block();
        toast.error(
          "Não foi possível preservar a solicitação. Recarregue antes de criar um lançamento.",
        );
        return;
      }
      try {
        await submitCreation(request);
      } catch (cause) {
        if (!clearRejectedRequest(cause)) {
          setModal(null);
          setNotice(
            "Não foi possível confirmar o resultado. Recupere a solicitação preservada, sem registrar outra despesa para substituí-la.",
          );
        }
        toast.error(resolveApiError(cause));
      }
      return;
    }
    try {
      await actions.correct.mutateAsync({
        id: modal.item.id,
        input: { ...input, expected_revision: modal.item.revision, reason: values.reason.trim() },
      });
      setNotice("Correção registrada com histórico preservado. Nenhum pagamento foi efetuado.");
    } catch (cause) {
      toast.error(resolveApiError(cause));
      setNotice(
        "Não foi possível confirmar a correção. Atualize a lista e revise o cadastro atual antes de tentar novamente.",
      );
    }
    setModal(null);
  };
  const recover = async () => {
    if (!recovery.ready || !recovery.request || actions.busy) return;
    try {
      await submitCreation(recovery.request);
    } catch (cause) {
      clearRejectedRequest(cause);
      toast.error(resolveApiError(cause));
    }
  };
  const voidExpense = async (reason: string) => {
    if (modal?.kind !== "void" || actions.busy) return;
    try {
      await actions.cancel.mutateAsync({
        id: modal.item.id,
        input: { expected_revision: modal.item.revision, reason: reason.trim() },
      });
      setNotice(
        "Lançamento anulado. O registro foi preservado, sem estorno, pagamento ou exclusão de dados.",
      );
    } catch (cause) {
      toast.error(resolveApiError(cause));
      setNotice(
        "Não foi possível confirmar a anulação. Atualize a lista e revise a situação antes de tentar novamente.",
      );
    }
    setModal(null);
  };
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <header className="rounded-card border border-border bg-surface p-5 shadow-admin-soft md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Financeiro · registros manuais
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Despesas operacionais</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Registre custos por competência e informe pagamentos já realizados. Esta tela não
              efetua pagamentos, não cobra, não emite notas e não apura lucro.
            </p>
          </div>
          <button
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={
              actions.busy ||
              !resolved.valid ||
              query.isLoading ||
              query.isError ||
              !query.data ||
              !recovery.ready ||
              Boolean(recovery.request)
            }
            onClick={() => setModal({ kind: "create" })}
            type="button"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Registrar despesa
          </button>
        </div>
      </header>
      {notice ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-6 text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {recovery.request ? (
        <section className="rounded-card border border-warning/25 bg-warning/10 p-5">
          <h2 className="font-bold text-foreground">
            Solicitação preservada · {formatMoney(recovery.request.amount_cents)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A resposta pode ter sido interrompida. A recuperação repete a mesma identificação e os
            mesmos dados originais, sem sobrescrever correções existentes.
          </p>
          <button
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-bold text-primary disabled:opacity-50"
            disabled={actions.busy || !recovery.ready}
            onClick={() => void recover()}
            type="button"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Recuperar solicitação preservada
          </button>
        </section>
      ) : null}
      {!recovery.ready ? (
        <p className="rounded-2xl border border-warning/25 p-4 text-sm leading-6 text-warning">
          Novas criações aguardam a confirmação do armazenamento deste navegador. Se o aviso
          continuar, recarregue e consulte o histórico ou solicite uma revisão operacional. A
          consulta, correção e anulação de registros existentes continuam disponíveis.
        </p>
      ) : null}
      <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-admin-soft">
        <ExpenseFilters
          categories={categories}
          key={search}
          onApply={(filters) =>
            navigate({ ...filters, limit: resolved.query.limit ?? 20, page: 1 })
          }
          onClear={() => navigate({})}
          query={resolved.query}
        />
        {!resolved.valid ? (
          <p className="p-5 text-sm leading-6 text-danger" role="alert">
            Os filtros da URL são inválidos. Revise as datas e opções ou use Limpar. Nenhuma
            consulta sem filtros foi apresentada.
          </p>
        ) : null}
        {resolved.valid && query.isLoading ? (
          <p className="flex items-center gap-2 p-5 text-sm text-muted">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
            Carregando lançamentos...
          </p>
        ) : null}
        {resolved.valid && query.isError ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-danger" role="alert">
              {resolveApiError(query.error)}
            </p>
            <button
              className="min-h-11 rounded-control border border-border px-4 text-sm font-bold text-primary"
              onClick={() => void query.refetch()}
              type="button"
            >
              Atualizar lançamentos
            </button>
          </div>
        ) : null}
        {resolved.valid && !query.isError && query.data ? (
          <>
            <ExpenseTable
              busy={actions.busy}
              items={query.data.items}
              onCorrect={(item) => setModal({ kind: "correct", item })}
              onVoid={(item) => setModal({ kind: "void", item })}
            />
            <AdminPagination
              onChangePage={(page) => navigate({ ...resolved.query, page })}
              onLimit={(limit) => navigate({ ...resolved.query, page: 1, limit })}
              page={query.data.pagination.page}
              pages={Math.max(1, query.data.pagination.total_pages)}
              perPage={query.data.pagination.limit}
            />
          </>
        ) : null}
      </section>
      {resolved.valid && !query.isError && query.data ? <ExpenseSummary data={query.data} /> : null}
      {modal?.kind === "create" || modal?.kind === "correct" ? (
        <ExpenseFormDialog
          busy={actions.busy}
          categories={categories}
          item={modal.kind === "correct" ? modal.item : undefined}
          onClose={() => setModal(null)}
          onSubmit={submitForm}
        />
      ) : null}
      {modal?.kind === "void" ? (
        <ExpenseVoidDialog
          busy={actions.busy}
          item={modal.item}
          onClose={() => setModal(null)}
          onSubmit={voidExpense}
        />
      ) : null}
    </div>
  );
};
