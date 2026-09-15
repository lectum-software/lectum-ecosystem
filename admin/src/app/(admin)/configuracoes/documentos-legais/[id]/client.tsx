"use client";

import { useAdminLegalDocument } from "@/api/callers/legal";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { LegalLoading } from "../components/common";
import { LegalDocumentWorkspace } from "../components/document-workspace";

export const LegalDocumentClient = ({ id }: { id: string }) => {
  const query = useAdminLegalDocument(id);
  if (query.isPending) return <LegalLoading label="Carregando documento..." />;
  // Preserve the editor (and its unsaved text) on a background refresh failure.
  if (!query.data)
    return (
      <AdminQueryErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        title="Não foi possível carregar o documento"
      />
    );
  return (
    <div className="min-w-0 space-y-6">
      {query.isError ? (
        <AdminQueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Não foi possível atualizar o documento"
        />
      ) : null}
      <LegalDocumentWorkspace
        latest={query.data}
        reload={async () => {
          const result = await query.refetch();
          return result.isError ? null : (result.data ?? null);
        }}
      />
    </div>
  );
};
