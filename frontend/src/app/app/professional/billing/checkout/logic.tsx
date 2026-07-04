"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { CreditCard, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const mercadoPagoEnv = process.env.NEXT_PUBLIC_MERCADO_PAGO_ENV?.trim().toLowerCase();
const sandboxPayerEmail = process.env.NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL?.trim();

const resolveMercadoPagoPayerEmail = (authenticatedEmail: string) => {
  if (mercadoPagoEnv === "sandbox" && sandboxPayerEmail) {
    return sandboxPayerEmail;
  }

  return authenticatedEmail;
};

if (publicKey) {
  initMercadoPago(publicKey, {
    locale: "pt-BR",
    advancedFraudPrevention: true,
  });
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPrice = (priceCents: number) => currencyFormatter.format(priceCents / 100);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível carregar o checkout agora.";

const isCurrentPeriodValid = (currentPeriodEnd?: string | null) => {
  if (!currentPeriodEnd) return true;

  const periodEnd = new Date(currentPeriodEnd);

  return !Number.isNaN(periodEnd.getTime()) && periodEnd > new Date();
};

const isActiveProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "ativa" &&
  subscription.plan?.slug === "profissional" &&
  isCurrentPeriodValid(subscription.current_period_end);

const isPendingProfessional = (subscription?: ProfessionalSubscription | null) =>
  subscription?.status === "inativa" &&
  subscription.plan?.slug === "profissional" &&
  Boolean(subscription.gateway_subscription_id);

const CREDIT_CARD_PAYMENT_TYPE = "credit_card";
const AUTO_SYNC_INTERVAL_MS = 3000;
const AUTO_SYNC_MAX_ATTEMPTS = 20;

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
  </aside>
);

export const ProfessionalBillingCheckoutLogic = () => {
  const router = useRouter();
  const userEmail = useAppSelector((state) => state.user?.email || "");
  const payerEmail = resolveMercadoPagoPayerEmail(userEmail);
  const [checkoutResult, setCheckoutResult] = useState<BillingCheckoutResponse | null>(null);
  const billingCallbacks = useMemo(
    () => ({
      checkout: {
        onSuccess: (data: BillingCheckoutResponse) => {
          setCheckoutResult(data);
        },
      },
    }),
    [],
  );
  const billing = usePsychologistBilling({ callbacks: billingCallbacks });
  const checkoutMutateAsync = billing.checkout.mutateAsync;
  const syncMutateAsync = billing.sync.mutateAsync;
  const currentRefetch = billing.current.refetch;
  const checkoutMutateAsyncRef = useRef(checkoutMutateAsync);
  const syncMutateAsyncRef = useRef(syncMutateAsync);
  const currentRefetchRef = useRef(currentRefetch);
  const autoSyncInFlightRef = useRef(false);

  useEffect(() => {
    checkoutMutateAsyncRef.current = checkoutMutateAsync;
  }, [checkoutMutateAsync]);

  useEffect(() => {
    syncMutateAsyncRef.current = syncMutateAsync;
    currentRefetchRef.current = currentRefetch;
  }, [currentRefetch, syncMutateAsync]);

  const isCurrentSubscriptionLoading = billing.current.isLoading;
  const isLoading = billing.plans.isLoading || isCurrentSubscriptionLoading;
  const hasError = billing.plans.isError || billing.current.isError;
  const professionalPlan = billing.plans.data?.plans.find((plan) => plan.slug === "profissional");
  const current = billing.current.data?.current ?? null;
  const activeProfessional = isActiveProfessional(current);
  const pendingProfessional =
    Boolean(checkoutResult?.pending_confirmation) || isPendingProfessional(current);
  const amount = professionalPlan ? professionalPlan.price_cents / 100 : 0;
  const canRenderCardPayment = Boolean(publicKey && amount > 0 && payerEmail);
  const cardPaymentKey = `${payerEmail || "anonymous"}-${amount}`;

  useEffect(() => {
    if (isCurrentSubscriptionLoading || !activeProfessional) return;

    router.replace(PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress);
  }, [activeProfessional, isCurrentSubscriptionLoading, router]);

  const initialization = useMemo(
    () => ({
      amount,
      payer: payerEmail ? { email: payerEmail } : undefined,
    }),
    [amount, payerEmail],
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

      try {
        await checkoutMutateAsyncRef.current({
          card_token: token,
          payment_type_id: CREDIT_CARD_PAYMENT_TYPE,
        });
      } catch {
        // handleReq já exibe o erro real da API; impedir rejeição não tratada no Brick.
      }
    },
    [],
  );

  const handleBrickReady = useCallback(() => {
    // Callback obrigatório do Brick; mantém a renderização real sem efeitos paralelos.
  }, []);

  const handleBrickError = useCallback((error: unknown) => {
    console.error("[Mercado Pago CardPayment]", error);
    toast.error("Não foi possível carregar o formulário de cartão.");
  }, []);

  const handleSyncStatus = useCallback(async () => {
    try {
      await syncMutateAsyncRef.current();
      await currentRefetchRef.current();
      toast.success("Status da assinatura atualizado");
    } catch {
      // handleReq já exibe o erro real da API.
    }
  }, []);

  useEffect(() => {
    if (!pendingProfessional || activeProfessional) return;

    let attempts = 0;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const syncPendingSubscription = async () => {
      if (cancelled || autoSyncInFlightRef.current) return;

      autoSyncInFlightRef.current = true;

      try {
        await syncMutateAsyncRef.current();
        await currentRefetchRef.current();
      } catch {
        // A UI mantém a confirmação pendente e o botão manual continua disponível.
      } finally {
        attempts += 1;
        autoSyncInFlightRef.current = false;

        if (attempts >= AUTO_SYNC_MAX_ATTEMPTS && interval) {
          clearInterval(interval);
        }
      }
    };

    const timeout = setTimeout(syncPendingSubscription, 1000);
    interval = setInterval(syncPendingSubscription, AUTO_SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [activeProfessional, pendingProfessional]);

  if (!isCurrentSubscriptionLoading && activeProfessional) {
    return (
      <PrivateTemplate showHeader={false}>
        <section className="mx-auto grid min-h-[55vh] w-full max-w-[430px] place-items-center">
          <LoadingState label="Redirecionando para endereço" />
        </section>
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-5xl">
        <div className="grid justify-items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[var(--lectum-card-radius)] bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <CreditCard className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Finalizar assinatura</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Pagamento do Plano Profissional
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted">
              Informe um cartão de crédito para ativar sua assinatura
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
              <div className="grid gap-5">
                {!publicKey ? (
                  <InlineAlert title="Public key do Mercado Pago ausente" variant="error">
                    Configure `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` no frontend para carregar o Card
                    Payment Brick real. Sem essa chave, a Lectum não coleta cartão nem simula
                    cobrança.
                  </InlineAlert>
                ) : null}

                {publicKey && amount > 0 && !payerEmail ? (
                  <InlineAlert title="E-mail do pagador ausente" variant="error">
                    Recarregue a sessão antes de abrir o formulário de cartão. O Mercado Pago
                    precisa do e-mail autenticado para tokenizar o pagamento.
                  </InlineAlert>
                ) : null}

                {canRenderCardPayment ? (
                  <div
                    className={cn(
                      "rounded-3xl border border-border bg-surface-muted p-3 md:p-4",
                      billing.checkout.isPending && "pointer-events-none opacity-70",
                    )}
                  >
                    <div className="mb-4 rounded-2xl bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
                      <h2 className="text-xl font-bold text-foreground">Cartão de crédito</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Aceitamos apenas cartão de crédito para manter sua assinatura mensal ativa.
                      </p>
                    </div>
                    <CardPayment
                      customization={customization}
                      id="lectum-card-payment-brick"
                      initialization={initialization}
                      key={cardPaymentKey}
                      locale="pt-BR"
                      onError={handleBrickError}
                      onReady={handleBrickReady}
                      onSubmit={handleSubmit}
                    />
                  </div>
                ) : null}

                {pendingProfessional ? (
                  <Button
                    className="h-12 rounded-full"
                    disabled={billing.sync.isPending}
                    onClick={handleSyncStatus}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", billing.sync.isPending && "animate-spin")}
                      aria-hidden
                    />
                    {billing.sync.isPending ? "Atualizando status..." : "Atualizar status"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
