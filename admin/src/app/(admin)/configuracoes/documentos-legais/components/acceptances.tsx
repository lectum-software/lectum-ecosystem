"use client";

import { useState } from "react";
import { useAdminLegalAcceptances } from "@/api/callers/legal";
import type { AdminLegalDocument } from "@/api/req/legal/types";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { legalDate, legalKindLabel } from "../modules/legal-policy";
import { LegalLoading, LegalPagination, legalCardClass } from "./common";

export const LegalAcceptances = ({ document }: { document: AdminLegalDocument }) => {
  const [page, setPage] = useState(1);
  const query = useAdminLegalAcceptances(document.id, page);
  return (
    <section aria-label="Aceites do documento" className={legalCardClass}>
      <h2 className="text-xl font-bold text-foreground">Aceites · versão {document.version}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Registros desta versão de {legalKindLabel(document.kind)}. Datas e horários no fuso deste
        dispositivo. Acesso restrito ao painel administrativo.
      </p>
      <div className="mt-5">
        {query.isPending ? (
          <LegalLoading label="Carregando aceites..." />
        ) : query.isError ? (
          <AdminQueryErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            title="Não foi possível carregar os aceites"
          />
        ) : (
          <div aria-busy={query.isFetching}>
            {query.data.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
                Nenhum aceite registrado nesta página para esta versão.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {query.data.items.map((acceptance) => (
                  <li
                    className="grid min-w-0 gap-3 py-4 sm:grid-cols-2"
                    key={`${acceptance.user_id}:${acceptance.document_id}`}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-foreground">
                        {acceptance.user_name || "Usuário sem nome disponível"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {legalKindLabel(acceptance.kind)} · versão {acceptance.version}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">
                        {acceptance.kind === "privacy"
                          ? "Ciência registrada em"
                          : "Aceite registrado em"}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {legalDate(acceptance.accepted_at)}
                      </p>
                    </div>
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
          </div>
        )}
      </div>
    </section>
  );
};
