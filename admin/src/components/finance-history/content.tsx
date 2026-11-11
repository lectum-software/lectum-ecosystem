"use client";

import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";
import type { FinancialHistory } from "@/api/req/finance/history";
import { cn } from "@/lib/utils";
import { hasFinancialHistoryContract, historyPageNumbers } from "./presentation";
import { FinancialHistoryTable } from "./table";

const Pagination = ({
  data,
  onPageChange,
  onLimitChange,
}: {
  data: FinancialHistory;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) => {
  const { page, limit, total, total_pages: pages } = data.pagination;
  return (
    <footer className="flex flex-col gap-4 border-t border-border p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="space-y-2">
        <p className="text-xs text-muted" aria-live="polite">
          {total.toLocaleString("pt-BR")} registros locais · Página {page} de {Math.max(1, pages)}
        </p>
        <nav aria-label="Páginas do histórico financeiro" className="flex flex-wrap gap-2">
          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-border text-foreground disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          {historyPageNumbers(page, pages).map((number) => (
            <button
              aria-current={number === page ? "page" : undefined}
              aria-label={`Página ${number}`}
              className={cn(
                "grid h-11 min-w-11 place-items-center rounded-xl border border-border px-3 text-sm font-semibold text-foreground",
                number === page && "border-primary bg-primary text-primary-foreground",
              )}
              key={number}
              onClick={() => onPageChange(number)}
              type="button"
            >
              {number}
            </button>
          ))}
          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-border text-foreground disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            type="button"
            aria-label="Próxima página"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </nav>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Itens por página</p>
        <fieldset className="flex gap-2">
          <legend className="sr-only">Itens por página</legend>
          {[10, 20, 50].map((value) => (
            <button
              aria-pressed={limit === value}
              className={cn(
                "h-11 min-w-11 rounded-xl border border-border px-3 text-sm font-semibold text-foreground",
                limit === value && "border-primary bg-primary-soft text-primary",
              )}
              key={value}
              onClick={() => onLimitChange(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </fieldset>
      </div>
    </footer>
  );
};

export const FinancialHistoryContent = ({
  data,
  loading,
  failed,
  limitReached,
  onRetry,
  onPageChange,
  onLimitChange,
  showPsychologist = false,
}: {
  data?: FinancialHistory;
  loading: boolean;
  failed: boolean;
  limitReached?: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  showPsychologist?: boolean;
}) => {
  if (loading)
    return (
      <div
        className="flex min-h-48 items-center justify-center gap-2 p-5 text-sm text-muted"
        role="status"
      >
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
        Consultando histórico…
      </div>
    );
  if (failed || !hasFinancialHistoryContract(data))
    return (
      <div className="space-y-3 p-5" role="alert">
        <p className="text-sm text-muted">
          {limitReached
            ? "Não foi possível consultar este volume de registros. Refine os filtros e tente novamente."
            : "Histórico financeiro indisponível no momento. Nenhum pagamento ou nota fiscal foi alterado."}
        </p>
        <button
          className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-primary"
          onClick={onRetry}
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    );
  return (
    <>
      <p className="border-b border-border bg-surface-muted px-4 py-3 text-xs leading-5 text-muted">
        Todos os registros locais elegíveis dos contratos estão acessíveis pela paginação. O gateway
        não é consultado nesta tela; a cobertura externa pode ser incompleta. A situação financeira
        e a nota fiscal são verificadas separadamente.
      </p>
      {data.items.length ? (
        <FinancialHistoryTable items={data.items} showPsychologist={showPsychologist} />
      ) : (
        <div className="grid min-h-44 place-content-center gap-2 p-5 text-center">
          <History aria-hidden className="mx-auto h-6 w-6 text-muted" />
          <p className="text-sm font-semibold text-foreground">Nenhum registro local encontrado</p>
          <p className="max-w-md text-xs leading-5 text-muted">
            Não há registros elegíveis para este filtro. Isso não comprova ausência de pagamentos no
            gateway.
          </p>
        </div>
      )}
      <Pagination data={data} onPageChange={onPageChange} onLimitChange={onLimitChange} />
    </>
  );
};
