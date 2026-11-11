"use client";

import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
import { useAdminSubscriptionPlanSetting } from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import { cn } from "@/lib/utils";
import { CheckoutOfferCard } from "./components/checkout-offer-card";
import { PlanDefinitionCard } from "./components/plan-definition-card";
import { PriceManagement } from "./components/price-management";

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

const SettingsHeader = () => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Configurações
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Assinatura
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Consulte a oferta, gerencie preços versionados para novas adesões e preserve os valores já
          contratados. O cadastro legado do Plano Profissional é mostrado separadamente.
        </p>
      </div>
      <div className="rounded-[1.35rem] border border-primary/15 bg-primary-soft p-4 text-sm text-primary lg:max-w-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-6">
            Oferta, cadastro do plano e contratos existentes são informações diferentes.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const LoadingPlanCard = () => (
  <section className={cn(cardClass, "grid place-items-center p-8 text-center")}>
    <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
    <p className="mt-3 text-sm font-semibold text-muted">Carregando plano atual...</p>
  </section>
);

const ErrorPlanCard = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">Não foi possível carregar o plano</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </section>
);

export const AdminSubscriptionSettingsClient = () => {
  const subscriptionPlanQuery = useAdminSubscriptionPlanSetting();
  const queryError = subscriptionPlanQuery.isError
    ? resolveApiError(subscriptionPlanQuery.error)
    : null;

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <SettingsHeader />

      {subscriptionPlanQuery.isLoading ? <LoadingPlanCard /> : null}
      {subscriptionPlanQuery.isError && queryError ? (
        <ErrorPlanCard message={queryError} onRetry={() => void subscriptionPlanQuery.refetch()} />
      ) : null}
      {subscriptionPlanQuery.data?.plan ? (
        <>
          <CheckoutOfferCard checkout={subscriptionPlanQuery.data.checkout} />
          {subscriptionPlanQuery.data.capabilities?.price_management === true ? (
            <PriceManagement
              key={`${subscriptionPlanQuery.data.plan.id}:${subscriptionPlanQuery.data.catalog?.mode ?? subscriptionPlanQuery.data.checkout?.mode}`}
              settings={subscriptionPlanQuery.data}
            />
          ) : (
            <p className="rounded-2xl border border-border p-4 text-sm leading-6 text-muted">
              Esta versão do serviço disponibiliza apenas a consulta da oferta. Nenhum preço pode
              ser alterado por esta tela.
            </p>
          )}
          <PlanDefinitionCard plan={subscriptionPlanQuery.data.plan} />
        </>
      ) : null}
    </div>
  );
};
