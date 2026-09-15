"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAdminPsychologistDetail } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { DetailHeader } from "./modules/components/detail-header";
import { ErrorState, LoadingState } from "./modules/components/shared";
import type { ActiveTab } from "./modules/support/config";
import { AccountTab } from "./modules/tabs/account/index";
import { ActivitiesTab } from "./modules/tabs/activities/index";
import { PlanBillingTab } from "./modules/tabs/billing/index";
import { GeneralTab } from "./modules/tabs/general/index";
import { ProfileTab } from "./modules/tabs/profile/index";
import { PublicationsTab } from "./modules/tabs/publications/index";
import { ReportsTab } from "./modules/tabs/reports/index";
import { ReviewsTab } from "./modules/tabs/reviews/index";
import { StatisticsTab } from "./modules/tabs/statistics/index";

const Content = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  tab: ActiveTab;
}) => (
  <main className="space-y-7" data-psychologist-detail-id={id}>
    <DetailHeader detail={detail} id={id} tab={tab} />

    {tab === "perfil" ? (
      <ProfileTab detail={detail} id={id} />
    ) : tab === "plano" ? (
      <PlanBillingTab detail={detail} id={id} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} id={id} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab createdAt={detail.header.created_at} id={id} />
    ) : tab === "avaliacoes" ? (
      <ReviewsTab id={id} />
    ) : tab === "atividades" ? (
      <ActivitiesTab id={id} />
    ) : tab === "denuncias" ? (
      <ReportsTab id={id} />
    ) : tab === "conta" ? (
      <AccountTab id={id} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </main>
);

export const AdminPsychologistDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ActiveTab | null;
  const tab: ActiveTab =
    requestedTab === "perfil" ||
    requestedTab === "plano" ||
    requestedTab === "estatisticas" ||
    requestedTab === "publicacoes" ||
    requestedTab === "avaliacoes" ||
    requestedTab === "atividades" ||
    requestedTab === "denuncias" ||
    requestedTab === "conta"
      ? requestedTab
      : "geral";
  const query = useAdminPsychologistDetail(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-7">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <Content detail={query.data} id={id} tab={tab} /> : null}
      {query.isFetching && !query.isLoading ? (
        <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-black text-muted shadow-admin-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados
        </div>
      ) : null}
    </div>
  );
};
