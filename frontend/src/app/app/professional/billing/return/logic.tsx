"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import keys from "@/api/cache/keys";
import { getPsychologistBillingCurrent } from "@/api/req/psychologist-billing";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  isProfessionalSubscriptionActive,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";
import {
  readStripeBillingReturn,
  stripeCompletedOperationDestination,
} from "@/utils/stripe-billing";
import { useStripeOperation } from "../components/use-stripe-operation";

export const StripeBillingReturnLogic = () => {
  const search = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const operation = useMemo(() => {
    const value = readStripeBillingReturn(search.toString());
    return value ? { ...value, state: "processing" as const } : null;
  }, [search]);
  const result = useStripeOperation({
    kind: operation?.kind ?? "checkout",
    initialOperation: operation,
    onComplete: async () => {
      const fresh = await getPsychologistBillingCurrent();
      queryClient.setQueryData(keys.psychologistBilling.current(), fresh);
      await queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "auth_hydrate",
      });
      const destination = stripeCompletedOperationDestination({
        kind: operation?.kind ?? "checkout",
        hasCurrentProfessionalBenefits: isProfessionalSubscriptionActive(fresh.current),
        courtesy: fresh.current?.source === "admin_grant",
      });
      router.replace(
        destination === "onboarding"
          ? PSYCHOLOGIST_ONBOARDING_PATHS.completion
          : "/app/profissional/assinatura",
      );
      return true;
    },
  });
  const continuePath =
    operation?.kind === "payment_method"
      ? "/app/profissional/assinatura/cartao"
      : "/app/profissional/assinatura/pagamento";
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 py-8">
        <h1 className="text-2xl font-bold">Conferindo sua assinatura</h1>
        {result.busy ? <LoadingState label="Verificando confirmação" /> : null}
        <InlineAlert variant={result.error ? "error" : "info"}>
          {result.error ||
            "A confirmação é conferida com segurança antes de liberar os benefícios. Não inicie outra tentativa enquanto verificamos o status."}
        </InlineAlert>
        {operation ? (
          <Button
            disabled={result.busy}
            onClick={() => {
              void result.verify();
            }}
            type="button"
            variant="outline"
          >
            Verificar status
          </Button>
        ) : null}
        {result.operation?.state === "requires_confirmation" ? (
          <Button asChild>
            <Link href={continuePath}>Continuar confirmação</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/app/profissional/assinatura">Minha assinatura</Link>
        </Button>
      </section>
    </PrivateTemplate>
  );
};
