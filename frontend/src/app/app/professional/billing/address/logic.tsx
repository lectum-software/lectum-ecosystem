"use client";

import { ArrowRight, CheckCircle2, Loader2, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  getPsychologistRegistrationRequirementPath,
  isAdministrativeCourtesySubscription,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";
import {
  type BillingAddressForm,
  toBillingAddressPayload,
  useBillingAddressForm,
} from "./use-form";

const resolveApiError = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível salvar o endereço agora.");

const isCurrentPeriodValid = (currentPeriodEnd?: string | null) => {
  if (!currentPeriodEnd) return true;

  const periodEnd = new Date(currentPeriodEnd);

  return !Number.isNaN(periodEnd.getTime()) && periodEnd > new Date();
};

const isActiveProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "ativa" &&
  subscription.plan?.slug === "profissional" &&
  isCurrentPeriodValid(subscription.current_period_end);

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
      Informe seu endereço profissional, como o endereço de um consultório. Os dados de Cidade e
      Estado já ficarão salvos no seu perfil para o filtro de localidade.
    </p>
  </header>
);

export const ProfessionalBillingAddressLogic = () => {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const billingAddressForm = useBillingAddressForm();
  const AddressForm = billingAddressForm.Form;

  const billing = usePsychologistBilling({
    callbacks: {
      address: {
        onSuccess: (data) => {
          toast.success("Endereço de faturamento salvo");
          router.push(
            normalizeSafeInternalRedirect(data.next_path, PSYCHOLOGIST_ONBOARDING_PATHS.phone) ||
              PSYCHOLOGIST_ONBOARDING_PATHS.phone,
          );
        },
        onError: (error) => toast.error(resolveApiError(error)),
      },
    },
  });

  const current = billing.current.data?.current ?? null;
  const activeProfessional = isActiveProfessional(current);
  const activeCourtesy = isAdministrativeCourtesySubscription(current);
  const courtesyRedirectPath = user
    ? (getPsychologistRegistrationRequirementPath(user) ?? "/app/profissional/assinatura")
    : null;
  const isLoading = billing.current.isLoading;

  useEffect(() => {
    if (!activeCourtesy || !courtesyRedirectPath) return;

    router.replace(courtesyRedirectPath);
  }, [activeCourtesy, courtesyRedirectPath, router]);

  const submitAddress = billingAddressForm.hook.handleSubmit((values: BillingAddressForm) => {
    billing.address.mutate(toBillingAddressPayload(values));
  });

  const syncSubscriptionStatus = async () => {
    try {
      await billing.sync.mutateAsync();
      await billing.current.refetch();
      toast.success("Status da assinatura atualizado");
    } catch {
      // handleReq já exibe o erro público sanitizado.
    }
  };

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
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
                description="A assinatura profissional ainda não está ativa. Conclua o checkout e aguarde a confirmação do pagamento antes de salvar o endereço."
                icon={ShieldCheck}
                title="Assinatura ainda não confirmada"
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button asChild className="h-12 rounded-full" variant="outline">
                  <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}>Voltar ao checkout</Link>
                </Button>
                <Button
                  className="h-12 rounded-full"
                  disabled={billing.sync.isPending}
                  onClick={syncSubscriptionStatus}
                  type="button"
                >
                  {billing.sync.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  Atualizar status
                </Button>
              </div>
            </div>
          ) : null}

          {!isLoading && !billing.current.isError && activeProfessional ? (
            activeCourtesy ? (
              <div className="mt-8">
                <LoadingState label="Redirecionando para sua próxima etapa" />
              </div>
            ) : (
              <>
                <div className="mt-6 flex justify-center">
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-extrabold text-success"
                    role="status"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Pagamento bem-sucedido
                  </span>
                </div>

                <AddressForm
                  className="mt-6 grid gap-1 md:grid-cols-2 md:gap-x-4"
                  {...billingAddressForm.formProps}
                  onSubmit={submitAddress}
                >
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
              </>
            )
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};
