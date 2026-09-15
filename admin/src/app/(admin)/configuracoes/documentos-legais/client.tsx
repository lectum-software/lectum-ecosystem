"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAdminLegalDocuments } from "@/api/callers/legal";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import {
  LegalHeader,
  LegalLoading,
  LegalPagination,
  LegalStatus,
  legalButtonClass,
  legalCardClass,
} from "./components/common";
import { legalDate, legalDocumentPath, legalKindLabel } from "./modules/legal-policy";

export const AdminLegalDocumentsClient = () => {
  const [page, setPage] = useState(1);
  const query = useAdminLegalDocuments(page);

  return (
    <div className="min-w-0 space-y-6">
      <LegalHeader
        title="Documentos legais"
        description="Gerencie versões dos Termos de Uso e da Política de Privacidade e consulte os aceites de cada documento."
      />
      <section className={legalCardClass}>
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <FileText aria-hidden className="h-5 w-5 text-primary" />
          Criar rascunho com minuta
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          A minuta apenas preenche o formulário. Nada é criado até clicar em Salvar rascunho. O
          texto deve ser revisado pelo jurídico antes de qualquer publicação.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["terms", "privacy"] as const).map((kind) => (
            <Link
              className={legalButtonClass}
              href={`/configuracoes/documentos-legais/novo?tipo=${kind}`}
              key={kind}
            >
              <Plus aria-hidden className="h-4 w-4 shrink-0" />
              Minuta de {legalKindLabel(kind)}
            </Link>
          ))}
        </div>
      </section>
      {query.isPending ? (
        <LegalLoading />
      ) : query.isError ? (
        <AdminQueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Não foi possível carregar os documentos"
        />
      ) : (
        <section aria-busy={query.isFetching} className={legalCardClass}>
          <h2 className="text-xl font-bold text-foreground">Versões e publicações</h2>
          {!query.data.configured ? (
            <p className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-foreground">
              A configuração dos documentos legais ainda não está completa. Salvar rascunhos não
              publica nem regulariza os aceites. Conclua a revisão jurídica antes de publicar Termos
              e Privacidade.
            </p>
          ) : null}
          {query.data.items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
              Nenhum documento nesta página. Use uma minuta acima para preparar o primeiro rascunho.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {query.data.items.map((document) => (
                <li className="min-w-0 rounded-2xl border border-border p-4" key={document.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">
                        {legalKindLabel(document.kind)} · Versão {document.version}
                      </p>
                      <h3 className="mt-1 break-words text-lg font-bold text-foreground">
                        {document.title}
                      </h3>
                    </div>
                    <LegalStatus document={document} />
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                    {document.change_summary}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted">Atualizado em</dt>
                      <dd className="mt-1 text-foreground">{legalDate(document.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Publicação</dt>
                      <dd className="mt-1 text-foreground">{legalDate(document.published_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Aceites desta versão</dt>
                      <dd className="mt-1 font-bold text-foreground">
                        {document.acceptance_count}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    className={`${legalButtonClass} mt-4 w-full sm:w-auto`}
                    href={legalDocumentPath(document.id)}
                  >
                    {document.status === "draft" ? "Abrir rascunho" : "Ver documento e aceites"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <LegalPagination
            limit={query.data.limit}
            onPage={setPage}
            page={query.data.page}
            pending={query.isFetching}
            total={query.data.total}
          />
        </section>
      )}
    </div>
  );
};
