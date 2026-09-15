"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAdminPatientDetail } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import { CardShell, ErrorState } from "./components/common";
import { LOADING_PLACEHOLDERS, type PatientDetailTab } from "./modules/detail-config";
import { isPatientDetailTab } from "./modules/detail-support";

import { DetailContent } from "./views/detail-content";

export const AdminPatientDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: PatientDetailTab = isPatientDetailTab(requestedTab) ? requestedTab : "geral";
  const query = useAdminPatientDetail(id, { period: "all" });
  const queryError = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={placeholder} />
          ))}
        </div>
      ) : null}
      {query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados...
        </p>
      ) : null}
      {query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <DetailContent detail={query.data} id={id} tab={tab} /> : null}
    </div>
  );
};
