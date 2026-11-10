"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import keys from "@/api/cache/keys";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { StripeBillingConfig } from "@/api/generator/types/stripe-billing";
import { getPsychologistBillingCurrent } from "@/api/req/psychologist-billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { PrivateTemplate } from "@/templates/private";
import { rememberBillingCompletion } from "@/utils/billing-completion-intent";
import {
  isProfessionalSubscriptionActive,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";
import {
  isStripeBillingQuoteValid,
  stripeCompletedOperationDestination,
} from "@/utils/stripe-billing";
import { BillingProviderState } from "../components/provider-state";
import { StripePaymentForm } from "../components/stripe-payment-form";
import { SummaryCard } from "./summary-card";

export const StripeCheckoutLogic = ({ config }: { config: StripeBillingConfig }) => {
  const router = useRouter();
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.user);
  const billing = usePsychologistBilling();
  const current = billing.current.data?.current;
  const currentLoading = billing.current.isPending;
  const currentError = billing.current.isError;
  const quote = config.quote;
  const courtesy = quote?.intent === "courtesy_renewal";
  const alreadyActive =
    isProfessionalSubscriptionActive(current) && current?.source !== "admin_grant";

  useEffect(() => {
    if (alreadyActive) router.replace(PSYCHOLOGIST_ONBOARDING_PATHS.completion);
  }, [alreadyActive, router]);
  useEffect(() => {
    if (
      !user?.id ||
      currentLoading ||
      currentError ||
      alreadyActive ||
      courtesy ||
      config.pending_operation
    )
      return;
    rememberBillingCompletion(
      user.id,
      search.get("intent") === "upgrade" ? "upgrade" : "signup",
      current?.plan?.features ?? {},
    );
  }, [
    alreadyActive,
    currentError,
    currentLoading,
    config.pending_operation,
    courtesy,
    current,
    search,
    user?.id,
  ]);

  const complete = async () => {
    const fresh = await getPsychologistBillingCurrent();
    queryClient.setQueryData(keys.psychologistBilling.current(), fresh);
    await queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "auth_hydrate",
    });
    const destination = stripeCompletedOperationDestination({
      kind: "checkout",
      hasCurrentProfessionalBenefits: isProfessionalSubscriptionActive(fresh.current),
      courtesy: courtesy || fresh.current?.source === "admin_grant",
    });
    router.replace(
      destination === "onboarding"
        ? PSYCHOLOGIST_ONBOARDING_PATHS.completion
        : "/app/profissional/assinatura",
    );
    return true;
  };

  if (billing.current.isPending || alreadyActive) return <BillingProviderState loading />;
  if (billing.current.isError || !isStripeBillingQuoteValid(quote)) return <BillingProviderState />;
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-5xl">
        <AppPageHeader
          title={courtesy ? "Adicionar cartão de cobrança" : "Finalizar assinatura"}
          backHref="/app/profissional/assinatura/planos"
          backLabel="Voltar"
        />
        <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <SummaryCard
            isCourtesyRenewal={courtesy}
            plan={{ name: "Plano Profissional", price_cents: quote.amount_cents }}
            renewalDate={quote.scheduled_start_at}
          />
          <div className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] md:p-6">
            <h2 className="text-xl font-bold">Dados do cartão</h2>
            <p className="text-sm leading-6 text-muted">
              Preencha os campos seguros abaixo para{" "}
              {courtesy ? "preparar a cobrança futura" : "confirmar sua assinatura"}.
            </p>
            {config.pending_operation && config.pending_operation.kind !== "checkout" ? (
              <InlineAlert title="Uma alteração está em andamento">
                Confira a alteração do cartão em Minha assinatura antes de continuar.
              </InlineAlert>
            ) : (
              <StripePaymentForm config={config} kind="checkout" onComplete={complete} />
            )}
          </div>
        </div>
        {billing.current.isFetching ? <LoadingState label="Conferindo assinatura" /> : null}
      </section>
    </PrivateTemplate>
  );
};
