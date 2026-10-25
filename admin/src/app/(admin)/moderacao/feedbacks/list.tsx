"use client";
import { ArrowLeft, ArrowRight, Inbox, Paperclip, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFeedbacks } from "@/api/callers/feedback";
import { resolveApiError } from "@/api/handle";
import type { FeedbackFilters } from "@/api/req/feedback";
import { actionClass, categories, controlClass, dateLabel, statuses } from "./shared";

export function FeedbackList() {
  const [filters, setFilters] = useState<FeedbackFilters>({ page: 1 });
  const query = useFeedbacks(filters);
  return (
    <main className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Moderação</p>
          <h1 className="text-2xl font-bold">Feedbacks</h1>
        </div>
        <button
          className={actionClass}
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          title="Atualizar feedbacks"
          aria-label="Atualizar feedbacks"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>
      <form
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilters({
            page: 1,
            q: String(data.get("q") ?? "").trim() || undefined,
            status: String(data.get("status") ?? "") || undefined,
            category: String(data.get("category") ?? "") || undefined,
            role: String(data.get("role") ?? "") || undefined,
          });
        }}
      >
        <label className="space-y-1 text-xs font-semibold">
          Buscar
          <input name="q" maxLength={120} placeholder="Nome ou mensagem" className={controlClass} />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Status
          <select name="status" className={controlClass}>
            <option value="">Todos</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Classificação
          <select name="category" className={controlClass}>
            <option value="">Todas</option>
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Usuário
          <select name="role" className={controlClass}>
            <option value="">Todos</option>
            <option value="paciente">Paciente</option>
            <option value="psicologo">Psicólogo</option>
          </select>
        </label>
        <button type="submit" className={`${actionClass} self-end`}>
          <Search className="h-4 w-4" aria-hidden /> Buscar
        </button>
      </form>
      {query.isPending ? (
        <p role="status">Carregando feedbacks...</p>
      ) : query.isError ? (
        <p role="alert" className="text-danger">
          {resolveApiError(query.error)}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {query.data.total} feedbacks · {query.data.new_count} novos
          </p>
          {query.data.items.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-16 text-muted">
              <Inbox aria-hidden />
              <p>Nenhum feedback encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {query.data.items.map((item) => (
                <Link
                  href={`/moderacao/feedbacks/${item.id}`}
                  key={item.id}
                  className="grid min-w-0 gap-2 px-2 py-4 hover:bg-surface-muted md:grid-cols-[minmax(0,1fr)_180px_120px]"
                >
                  <div className="min-w-0">
                    <span className="break-words font-semibold">{item.user.name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {item.user.role === "psicologo" ? "Psicólogo" : "Paciente"}
                    </span>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-muted">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p>{dateLabel(item.created_at)}</p>
                    <p className="mt-1 text-xs text-muted">{categories[item.category]}</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span
                      className={
                        item.status === "new" ? "font-semibold text-primary" : "text-muted"
                      }
                    >
                      {statuses[item.status]}
                    </span>
                    {item.attachments.length ? (
                      <span
                        title={`${item.attachments.length} capturas`}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Paperclip className="h-4 w-4" />
                        {item.attachments.length}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Página anterior"
              title="Página anterior"
              className={actionClass}
              disabled={filters.page <= 1 || query.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">
              {filters.page} / {Math.max(1, query.data.pages)}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              title="Próxima página"
              className={actionClass}
              disabled={filters.page >= query.data.pages || query.isFetching}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
