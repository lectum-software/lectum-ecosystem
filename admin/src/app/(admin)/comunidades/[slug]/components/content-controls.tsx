"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveApiError } from "@/api/handle";
import { cn } from "@/lib/utils";

import { numberFormatter } from "../modules/detail-support";

export const PaginationControls = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => {
  const safePages = Math.max(1, pages);
  const currentPage = Math.min(Math.max(1, page), safePages);
  const start = Math.min(Math.max(currentPage - 2, 1), Math.max(safePages - 4, 1));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label="Página anterior"
        className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
        disabled={currentPage <= 1}
        onClick={() => setPage(Math.max(1, currentPage - 1))}
        title="Página anterior"
        type="button"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
      </button>
      {Array.from({ length: Math.min(5, safePages) }, (_, index) => {
        const itemPage = start + index;
        if (itemPage > safePages) return null;

        return (
          <button
            aria-current={itemPage === currentPage ? "page" : undefined}
            className={cn(
              "h-10 min-w-10 rounded-control border px-3 text-sm font-black",
              itemPage === currentPage
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground",
            )}
            key={itemPage}
            onClick={() => setPage(itemPage)}
            type="button"
          >
            {numberFormatter.format(itemPage)}
          </button>
        );
      })}
      <button
        aria-label="Próxima página"
        className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
        disabled={currentPage >= safePages}
        onClick={() => setPage(Math.min(safePages, currentPage + 1))}
        title="Próxima página"
        type="button"
      >
        <ChevronRight aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
};

export const QueryStatus = ({
  error,
  loading,
  onRetry,
}: {
  error: unknown;
  loading: boolean;
  onRetry: () => void;
}) => {
  if (loading) {
    return (
      <div className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
        Carregando dados...
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-danger-border bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
      <span>{resolveApiError(error)}</span>
      <button className="font-black" onClick={onRetry} type="button">
        Tentar novamente
      </button>
    </div>
  );
};
