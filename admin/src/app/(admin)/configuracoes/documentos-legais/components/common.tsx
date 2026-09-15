import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import type { AdminLegalDocumentSummary } from "@/api/req/legal/types";
import { cn } from "@/lib/utils";

export const legalCardClass =
  "min-w-0 rounded-card border border-border/80 bg-surface/95 p-5 shadow-admin-soft md:p-6";
export const legalButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";
export const legalPrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

export const LegalHeader = ({ title, description }: { title: string; description: string }) => (
  <section className={legalCardClass}>
    <Link
      className="text-sm font-semibold text-primary underline underline-offset-4"
      href="/configuracoes/documentos-legais"
    >
      Configurações / Documentos legais
    </Link>
    <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-foreground md:text-3xl">
      {title}
    </h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
  </section>
);

export const LegalLoading = ({ label = "Carregando documentos..." }: { label?: string }) => (
  <div className={cn(legalCardClass, "flex items-center gap-3 text-sm text-muted")} role="status">
    <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
    {label}
  </div>
);

export const LegalStatus = ({ document }: { document: AdminLegalDocumentSummary }) => (
  <span
    className={cn(
      "inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold",
      document.status === "published"
        ? "bg-success-soft text-success"
        : "bg-warning/10 text-warning",
    )}
  >
    {document.status === "published" ? "Publicado · imutável" : "Rascunho · não publicado"}
  </span>
);

// The shared AdminPagination offers variable limits; this API only permits 20.
export const LegalPagination = ({
  page,
  total,
  limit,
  pending,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  pending: boolean;
  onPage: (page: number) => void;
}) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <p className="text-xs text-muted" role="status">
        Página {page} de {pages} · {total} registros · 20 por página
      </p>
      <div className="flex gap-2">
        <button
          aria-label="Página anterior"
          className={legalButtonClass}
          disabled={pending || page <= 1}
          onClick={() => onPage(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Anterior
        </button>
        <button
          aria-label="Próxima página"
          className={legalButtonClass}
          disabled={pending || page >= pages}
          onClick={() => onPage(page + 1)}
          type="button"
        >
          Próxima
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};
