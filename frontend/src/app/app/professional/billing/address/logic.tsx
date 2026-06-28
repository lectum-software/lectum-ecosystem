"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";
import {
  type BillingAddressForm,
  toBillingAddressPayload,
  useBillingAddressForm,
} from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;

  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "") ||
    "Não foi possível salvar o endereço agora."
  );
};

const isActiveProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "ativa" && subscription.plan?.slug === "profissional";

const AddressHeader = () => (
  <header className="text-center">
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
      <MapPin className="h-10 w-10" aria-hidden="true" />
    </div>
    <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
      Endereço de faturamento
    </p>
    <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">
      Complete os dados da sua assinatura
    </h1>
    <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted">
      Este endereço fica vinculado ao seu cadastro de cobrança e só é salvo depois da assinatura
      profissional estar ativa na Lectum.
    </p>
  </header>
);

export const ProfessionalBillingAddressLogic = () => {
  const router = useRouter();
  const billingAddressForm = useBillingAddressForm();
  const AddressForm = billingAddressForm.Form;

  const billing = usePsychologistBilling({
    callbacks: {
      address: {
        onSuccess: (data) => {
          toast.success("Endereço de faturamento salvo");
          router.push(data.next_path || PSYCHOLOGIST_ONBOARDING_PATHS.phone);
        },
        onError: (error) => toast.error(resolveApiError(error)),
      },
    },
  });

  const current = billing.current.data?.current ?? null;
  const activeProfessional = isActiveProfessional(current);
  const isLoading = billing.current.isLoading;

  const submitAddress = billingAddressForm.hook.handleSubmit((values: BillingAddressForm) => {
    billing.address.mutate(toBillingAddressPayload(values));
  });

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
          href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para pagamento
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)] md:px-8">
          <AddressHeader />

          {isLoading ? (
            <div className="mt-8">
              <LoadingState label="Verificando sua assinatura" />
            </div>
          ) : null}

          {billing.current.isError ? (
            <InlineAlert
              className="mt-8"
              title="Não foi possível verificar a assinatura"
              variant="error"
            >
              {resolveApiError(billing.current.error)}
            </InlineAlert>
          ) : null}

          {!isLoading && !billing.current.isError && !activeProfessional ? (
            <div className="mt-8">
              <EmptyState
                description="A assinatura profissional ainda não está ativa. Conclua o checkout e aguarde a confirmação real do Mercado Pago antes de salvar o endereço."
                icon={ShieldCheck}
                title="Assinatura ainda não confirmada"
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button asChild className="h-12 rounded-full" variant="outline">
                  <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}>Voltar ao checkout</Link>
                </Button>
                <Button
                  className="h-12 rounded-full"
                  onClick={() => billing.current.refetch()}
                  type="button"
                >
                  Atualizar status
                </Button>
              </div>
            </div>
          ) : null}

          {!isLoading && !billing.current.isError && activeProfessional ? (
            <AddressForm
              className="mt-8 grid gap-1 md:grid-cols-2 md:gap-x-4"
              {...billingAddressForm.formProps}
              onSubmit={submitAddress}
            >
              <InlineAlert className="md:col-span-2" title="Pagamento confirmado" variant="success">
                <span className="inline-flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Sua assinatura profissional está ativa. Agora salve o endereço de faturamento para
                  seguir para o WhatsApp profissional.
                </span>
              </InlineAlert>

              <Button
                className="mt-3 h-14 w-full rounded-full text-base md:col-span-2"
                disabled={billing.address.isPending}
                type="submit"
              >
                {billing.address.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                Salvar e continuar
              </Button>
            </AddressForm>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};
