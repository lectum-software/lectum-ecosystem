"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import keys from "@/api/cache/keys";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { StripeBillingConfig } from "@/api/generator/types/stripe-billing";
import { getPsychologistBillingSubscription } from "@/api/req/psychologist-billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { billingMaintenanceSubscription } from "@/utils/billing-management";
import { canReplaceStripePendingCard } from "@/utils/stripe-billing";
import { BillingProviderState } from "../components/provider-state";
import { StripePaymentForm } from "../components/stripe-payment-form";

export const StripeCardLogic = ({ config }: { config: StripeBillingConfig }) => {
  const billing = usePsychologistBilling();
  const queryClient = useQueryClient();
  const [complete, setComplete] = useState(false);
  const subscription = billingMaintenanceSubscription(billing.subscription.data);
  const paymentMethod = billing.subscription.data?.payment_method;
  const confirm = async () => {
    const fresh = await getPsychologistBillingSubscription();
    queryClient.setQueryData(keys.psychologistBilling.subscription(), fresh);
    await queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
    if (fresh.payment_method?.gateway !== "stripe") return false;
    setComplete(true);
    return true;
  };
  if (billing.subscription.isPending) return <BillingProviderState loading />;
  if (billing.subscription.isError || subscription?.gateway !== "stripe")
    return <BillingProviderState />;
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <AppPageHeader
          title="Alterar cartão"
          backHref="/app/profissional/assinatura"
          backLabel="Voltar"
        />
        {paymentMethod?.last4 ? (
          <div className="rounded-[var(--lectum-card-radius)] bg-primary p-5 text-primary-foreground">
            <p className="text-sm">Cartão atual</p>
            <p className="mt-4 text-xl font-bold">
              {paymentMethod.brand?.toUpperCase()} •••• {paymentMethod.last4}
            </p>
          </div>
        ) : null}
        <div className="grid gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 md:p-6">
          {complete ? (
            <>
              <InlineAlert title="Cartão atualizado" variant="success">
                O novo cartão foi vinculado à assinatura. Uma pendência de pagamento só será
                regularizada após confirmação da cobrança.
              </InlineAlert>
              <Button asChild className="h-12">
                <Link href="/app/profissional/assinatura">Concluir</Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Novo cartão</h2>
              {!canReplaceStripePendingCard(config.pending_operation) ? (
                <InlineAlert>
                  Existe uma tentativa em confirmação. Confira seu status antes de alterar o cartão.
                  <Button asChild className="mt-3 w-full" variant="outline">
                    <Link href="/app/profissional/assinatura/pagamento">Conferir tentativa</Link>
                  </Button>
                </InlineAlert>
              ) : (
                <StripePaymentForm config={config} kind="payment_method" onComplete={confirm} />
              )}
            </>
          )}
        </div>
      </section>
    </PrivateTemplate>
  );
};
