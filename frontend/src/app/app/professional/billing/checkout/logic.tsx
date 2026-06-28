"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type {
  BillingCheckoutResponse,
  ProfessionalSubscription,
  SubscriptionPlan,
} from "@/api/generator/types/billing";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { PSYCHOLOGIST_ONBOARDING_PATHS } from "@/utils/psychologist-onboarding";

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPrice = (priceCents: number) => currencyFormatter.format(priceCents / 100);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível carregar o checkout agora.";

const isActiveProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "ativa" && subscription.plan?.slug === "profissional";

const isPendingProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "inativa" &&
  subscription.plan?.slug === "profissional" &&
  Boolean(subscription.gateway_subscription_id);

const CREDIT_CARD_PAYMENT_TYPE = "credit_card";

type CardPaymentFormData = {
  token?: string;
};

type CardPaymentAdditionalData = {
  paymentTypeId?: string;
};

const SummaryCard = ({ plan }: { plan: SubscriptionPlan }) => (
  <aside className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
    <div className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <CreditCard className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Plano Profissional
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">{plan.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Assinatura mensal com perfil verificado, prioridade na busca, avaliações, analytics e
          destaque nas comunidades.
        </p>
      </div>
    </div>

    <div className="mt-6 rounded-2xl bg-surface-muted p-4">
      <p className="text-sm font-semibold text-muted">Valor recorrente</p>
      <div className="mt-2 flex items-end gap-2">
        <strong className="text-3xl font-bold leading-none text-foreground">
          {formatPrice(plan.price_cents)}
        </strong>
        <span className="pb-1 text-sm font-semibold text-muted">/mês</span>
      </div>
    </div>

    <div className="mt-5 grid gap-3 text-sm text-muted">
      <div className="flex gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Cartão de crédito tokenizado pelo Mercado Pago. PAN e CVV não passam pela Lectum.
        </span>
      </div>
      <div className="flex gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>A ativação só acontece após webhook confirmado do gateway.</span>
      </div>
    </div>
  </aside>
);

export const ProfessionalBillingCheckoutLogic = () => {
  const router = useRouter();
  const userEmail = useAppSelector((state) => state.user?.email || "");
  const [checkoutResult, setCheckoutResult] = useState<BillingCheckoutResponse | null>(null);
  const billing = usePsychologistBilling({
    callbacks: {
      checkout: {
        onSuccess: (data) => {
          setCheckoutResult(data);
          toast.success("Pagamento enviado para confirmação segura");
        },
      },
    },
  });

  useEffect(() => {
    if (!publicKey) return;

    initMercadoPago(publicKey, {
      locale: "pt-BR",
      advancedFraudPrevention: true,
    });
  }, []);

  const isLoading = billing.plans.isLoading || billing.current.isLoading;
  const hasError = billing.plans.isError || billing.current.isError;
  const professionalPlan = billing.plans.data?.plans.find((plan) => plan.slug === "profissional");
  const current = billing.current.data?.current ?? null;
  const activeProfessional = isActiveProfessional(current);
  const pendingProfessional =
    Boolean(checkoutResult?.pending_confirmation) || isPendingProfessional(current);
  const amount = professionalPlan ? professionalPlan.price_cents / 100 : 0;

  const initialization = useMemo(
    () => ({
      amount,
      payer: userEmail ? { email: userEmail } : undefined,
    }),
    [amount, userEmail],
  );

  const customization = useMemo(
    () => ({
      paymentMethods: {
        minInstallments: 1,
        maxInstallments: 1,
        types: {
          included: ["credit_card" as const],
        },
      },
      visual: {
        hideFormTitle: true,
        style: {
          theme: "default",
        },
      },
    }),
    [],
  );

  const handleSubmit = useCallback(
    async (formData: CardPaymentFormData, additionalData?: CardPaymentAdditionalData) => {
      const token = formData.token;
      const paymentTypeId = additionalData?.paymentTypeId;

      if (!token) {
        toast.error("Não foi possível tokenizar o cartão. Tente novamente.");
        return;
      }

      if (paymentTypeId && paymentTypeId !== CREDIT_CARD_PAYMENT_TYPE) {
        toast.error("Use um cartão de crédito para assinar o Plano Profissional.");
        return;
      }

      await billing.checkout.mutateAsync({
        card_token: token,
        payment_type_id: CREDIT_CARD_PAYMENT_TYPE,
        return_url: `${window.location.origin}${PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress}`,
      });
    },
    [billing.checkout],
  );

  const handleBrickError = useCallback((error: unknown) => {
    console.error("[Mercado Pago CardPayment]", error);
    toast.error("Não foi possível carregar o formulário de cartão.");
  }, []);

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-5xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href={PSYCHOLOGIST_ONBOARDING_PATHS.plans}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para planos
        </Link>

        <div className="grid justify-items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[var(--lectum-card-radius)] bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <CreditCard className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Finalizar assinatura</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Pagamento seguro do Plano Profissional
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted">
              Informe um cartão de crédito no ambiente seguro do Mercado Pago. A Lectum recebe
              somente o token temporário e aguarda a confirmação real para ativar sua assinatura.
            </p>
          </div>
        </div>

        {isLoading ? <LoadingState label="Carregando checkout" /> : null}

        {hasError ? (
          <InlineAlert variant="error" title="Não foi possível carregar o checkout">
            {getErrorMessage(billing.plans.error || billing.current.error)}
          </InlineAlert>
        ) : null}

        {!isLoading && !hasError && !professionalPlan ? (
          <EmptyState
            description="O plano profissional não foi encontrado no backend. Cadastre o plano real antes de continuar."
            icon={CreditCard}
            title="Plano indisponível"
          />
        ) : null}

        {!isLoading && !hasError && professionalPlan ? (
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <SummaryCard plan={professionalPlan} />

            <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] md:p-6">
              {activeProfessional ? (
                <div className="grid gap-5 text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-8 w-8" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Assinatura ativa</h2>
                    <p className="mt-2 text-base leading-7 text-muted">
                      Seu Plano Profissional já está ativo. Continue para informar o endereço de
                      faturamento e finalizar o onboarding profissional.
                    </p>
                  </div>
                  <Button asChild className="h-12 rounded-full">
                    <Link href={PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress}>
                      Continuar para endereço
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-5">
                  {pendingProfessional ? (
                    <InlineAlert title="Pagamento enviado para confirmação" variant="success">
                      A assinatura foi criada no Mercado Pago e será ativada automaticamente após o
                      webhook confirmado. Se a confirmação já tiver ocorrido, atualize o status.
                    </InlineAlert>
                  ) : null}

                  {!publicKey ? (
                    <InlineAlert title="Public key do Mercado Pago ausente" variant="error">
                      Configure `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` no frontend para carregar o
                      Card Payment Brick real. Sem essa chave, a Lectum não coleta cartão nem simula
                      cobrança.
                    </InlineAlert>
                  ) : null}

                  {publicKey && amount > 0 ? (
                    <div
                      className={cn(
                        "rounded-3xl border border-border bg-surface-muted p-3 md:p-4",
                        billing.checkout.isPending && "pointer-events-none opacity-70",
                      )}
                    >
                      <div className="mb-4 rounded-2xl bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
                        <h2 className="text-xl font-bold text-foreground">Cartão de crédito</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Aceitamos apenas cartão de crédito para manter sua assinatura mensal
                          ativa.
                        </p>
                      </div>
                      <CardPayment
                        customization={customization}
                        id="lectum-card-payment-brick"
                        initialization={initialization}
                        locale="pt-BR"
                        onError={handleBrickError}
                        onSubmit={handleSubmit}
                      />
                    </div>
                  ) : null}

                  {billing.checkout.isPending ? (
                    <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Enviando token ao backend...
                    </div>
                  ) : null}

                  {pendingProfessional ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        className="h-12 rounded-full"
                        onClick={() => billing.current.refetch()}
                        type="button"
                        variant="outline"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        Atualizar status
                      </Button>
                      <Button
                        className="h-12 rounded-full"
                        onClick={() => router.push(PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress)}
                        type="button"
                      >
                        Ir para endereço
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
