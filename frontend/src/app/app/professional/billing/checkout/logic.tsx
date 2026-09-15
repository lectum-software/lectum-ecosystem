"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { ArrowLeft, CheckCircle2, CreditCard, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  BillingCheckoutResponse,
  ProfessionalSubscription,
} from "@/api/generator/types/billing";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  isMercadoPagoPublicConfigurationValid,
  mercadoPagoPublicKey,
  resolveMercadoPagoPayerEmail,
} from "@/utils/mercado-pago";
import {
  getPsychologistRegistrationRequirementPath,
  isAdministrativeCourtesySubscription,
  PSYCHOLOGIST_ONBOARDING_PATHS,
} from "@/utils/psychologist-onboarding";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";
import { SummaryCard } from "./summary-card";

if (isMercadoPagoPublicConfigurationValid && mercadoPagoPublicKey) {
  initMercadoPago(mercadoPagoPublicKey, {
    locale: "pt-BR",
    advancedFraudPrevention: true,
  });
}

const getErrorMessage = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível carregar o checkout agora.");

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
const CARD_PAYMENT_LOAD_TIMEOUT_MS = 10_000;
const PAYMENT_SUCCESS_REDIRECT_DELAY_MS = 1200;
const APPROVED_GATEWAY_STATUSES = new Set(["authorized", "approved", "accredited"]);

type CardPaymentFormData = {
  token?: string;
  payment_method_id?: string;
};

type CardPaymentAdditionalData = {
  lastFourDigits?: string;
  paymentTypeId?: string;
};

const isApprovedGatewayStatus = (status?: string | null) =>
  APPROVED_GATEWAY_STATUSES.has(String(status || "").toLowerCase());

const PaymentSuccessBadge = () => (
  <span
    className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-extrabold text-success"
    role="status"
  >
    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
    Pagamento bem-sucedido
  </span>
);

export const ProfessionalBillingCheckoutLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCourtesyRenewal = searchParams.get("intent") === "courtesy-renewal";
  const user = useAppSelector((state) => state.user);
  const userEmail = user?.email || "";
  const payerEmail = resolveMercadoPagoPayerEmail(userEmail);
  const [checkoutResult, setCheckoutResult] = useState<BillingCheckoutResponse | null>(null);
  const billingCallbacks = useMemo(
    () => ({
      checkout: {
        onSuccess: (data: BillingCheckoutResponse) => {
          setCheckoutResult(data);
          if (isCourtesyRenewal) {
            toast.success("Cartão cadastrado para cobrança futura");
            router.replace(
              normalizeSafeInternalRedirect(data.next_path, "/app/profissional/assinatura") ||
                "/app/profissional/assinatura",
            );
          }
        },
      },
    }),
    [isCourtesyRenewal, router],
  );
  const billing = usePsychologistBilling({ callbacks: billingCallbacks });
  const checkoutMutateAsync = billing.checkout.mutateAsync;
  const syncMutateAsync = billing.sync.mutateAsync;
  const currentRefetch = billing.current.refetch;
  const checkoutMutateAsyncRef = useRef(checkoutMutateAsync);
  const syncMutateAsyncRef = useRef(syncMutateAsync);
  const currentRefetchRef = useRef(currentRefetch);
  const autoSyncInFlightRef = useRef(false);
  const [cardPaymentStatus, setCardPaymentStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [cardPaymentRetryIndex, setCardPaymentRetryIndex] = useState(0);

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
  const activeCourtesy = isAdministrativeCourtesySubscription(current);
  const courtesyRedirectPath = user
    ? (getPsychologistRegistrationRequirementPath(user) ?? "/app/profissional/assinatura")
    : null;
  const shouldBypassActiveRedirect = isCourtesyRenewal && activeCourtesy;
  const pendingProfessional =
    Boolean(checkoutResult?.pending_confirmation) || isPendingProfessional(current);
  const showPaymentSuccessBadge = Boolean(
    !isCourtesyRenewal &&
      checkoutResult &&
      (activeProfessional || isApprovedGatewayStatus(checkoutResult.gateway_status)),
  );
  const amount = professionalPlan ? professionalPlan.price_cents / 100 : 0;
  const canRenderCardPayment = Boolean(
    isMercadoPagoPublicConfigurationValid && amount > 0 && payerEmail,
  );
  const cardPaymentKey = `${payerEmail || "anonymous"}-${amount}-${
    isCourtesyRenewal ? "courtesy" : "checkout"
  }`;
  const cardPaymentInstanceKey = `${cardPaymentKey}-${cardPaymentRetryIndex}`;

  useEffect(() => {
    if (isCurrentSubscriptionLoading || !activeProfessional || shouldBypassActiveRedirect) return;

    if (activeCourtesy) {
      if (courtesyRedirectPath) {
        router.replace(courtesyRedirectPath);
      }
      return;
    }

    if (showPaymentSuccessBadge) {
      const redirectTimeout = window.setTimeout(() => {
        router.replace(PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress);
      }, PAYMENT_SUCCESS_REDIRECT_DELAY_MS);

      return () => {
        window.clearTimeout(redirectTimeout);
      };
    }

    router.replace(PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress);
  }, [
    activeCourtesy,
    activeProfessional,
    courtesyRedirectPath,
    isCurrentSubscriptionLoading,
    router,
    shouldBypassActiveRedirect,
    showPaymentSuccessBadge,
  ]);

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
        texts: {
          formSubmit: isCourtesyRenewal ? "Cadastrar cartão" : "Pagar",
        },
      },
    }),
    [isCourtesyRenewal],
  );

  const handleSubmit = useCallback(
    async (formData: CardPaymentFormData, additionalData?: CardPaymentAdditionalData) => {
      const token = formData.token;
      const paymentTypeId = additionalData?.paymentTypeId;
      const brand = formData.payment_method_id || null;
      const last4 = additionalData?.lastFourDigits || null;

      if (!token) {
        toast.error("Não foi possível validar os dados do cartão. Tente novamente.");
        return;
      }

      if (paymentTypeId && paymentTypeId !== CREDIT_CARD_PAYMENT_TYPE) {
        toast.error(
          isCourtesyRenewal
            ? "Use um cartão de crédito para cadastrar a cobrança futura."
            : "Use um cartão de crédito para assinar o Plano Profissional.",
        );
        return;
      }

      try {
        await checkoutMutateAsyncRef.current({
          card_token: token,
          brand,
          ...(isCourtesyRenewal ? { intent: "courtesy_renewal" as const } : {}),
          last4,
          payment_type_id: CREDIT_CARD_PAYMENT_TYPE,
        });
      } catch {
        // handleReq já exibe o erro público sanitizado; impedir rejeição não tratada no Brick.
      }
    },
    [isCourtesyRenewal],
  );

  const handleBrickReady = useCallback(() => {
    setCardPaymentStatus("ready");
  }, []);

  const handleBrickError = useCallback(() => {
    setCardPaymentStatus("error");
    toast.error("Não foi possível carregar o formulário de cartão.");
  }, []);

  const handleRetryCardPayment = useCallback(() => {
    setCardPaymentStatus("loading");
    setCardPaymentRetryIndex((current) => current + 1);
  }, []);

  const handleSyncStatus = useCallback(async () => {
    try {
      await syncMutateAsyncRef.current();
      await currentRefetchRef.current();
      toast.success("Status da assinatura atualizado");
    } catch {
      // handleReq já exibe o erro público sanitizado.
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

  useEffect(() => {
    if (!canRenderCardPayment || cardPaymentStatus !== "loading") return;

    const timeout = setTimeout(() => {
      setCardPaymentStatus((currentStatus) =>
        currentStatus === "ready" ? currentStatus : "error",
      );
    }, CARD_PAYMENT_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [canRenderCardPayment, cardPaymentStatus]);

  if (!isCurrentSubscriptionLoading && activeProfessional && !shouldBypassActiveRedirect) {
    return (
      <PrivateTemplate showHeader={false}>
        <section className="mx-auto grid min-h-[55vh] w-full max-w-[430px] place-items-center">
          {showPaymentSuccessBadge ? (
            <div className="grid justify-items-center gap-5 text-center">
              <PaymentSuccessBadge />
              <LoadingState label="Redirecionando para endereço" />
            </div>
          ) : (
            <LoadingState
              label={
                activeCourtesy
                  ? "Redirecionando para sua próxima etapa"
                  : "Redirecionando para endereço"
              }
            />
          )}
        </section>
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-5xl">
        <Button
          asChild
          className="h-11 w-11 justify-self-start rounded-full bg-primary-soft p-0 text-primary shadow-[var(--lectum-shadow-soft)] hover:bg-primary-soft/80"
          variant="ghost"
        >
          <Link aria-label="Voltar para Minha Assinatura" href="/app/profissional/assinatura">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </Button>

        <div className="grid justify-items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[var(--lectum-card-radius)] bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <CreditCard className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              {isCourtesyRenewal ? "Cobrança futura" : "Finalizar assinatura"}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {isCourtesyRenewal
                ? "Adicionar cartão de cobrança"
                : "Pagamento do Plano Profissional"}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted">
              {isCourtesyRenewal
                ? "Informe um cartão de crédito para preparar a cobrança quando sua cortesia chegar ao fim."
                : "Informe um cartão de crédito para ativar sua assinatura"}
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
            description="Nenhum plano profissional ativo está disponível no momento. Tente novamente mais tarde."
            icon={CreditCard}
            title="Plano indisponível"
          />
        ) : null}

        {!isLoading && !hasError && professionalPlan ? (
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <SummaryCard
              isCourtesyRenewal={isCourtesyRenewal}
              plan={professionalPlan}
              renewalDate={current?.current_period_end}
            />

            <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] md:p-6">
              <div className="grid gap-5">
                {!isMercadoPagoPublicConfigurationValid ? (
                  <InlineAlert title="Formulário de cartão indisponível" variant="error">
                    Não foi possível carregar o formulário seguro de cartão. Tente novamente mais
                    tarde.
                  </InlineAlert>
                ) : null}

                {isMercadoPagoPublicConfigurationValid && amount > 0 && !payerEmail ? (
                  <InlineAlert title="E-mail do pagador ausente" variant="error">
                    Recarregue a sessão antes de abrir o formulário de cartão. O e-mail da sua conta
                    é necessário para iniciar o pagamento.
                  </InlineAlert>
                ) : null}

                {showPaymentSuccessBadge ? (
                  <div className="flex justify-center rounded-3xl border border-success/20 bg-success/5 p-4">
                    <PaymentSuccessBadge />
                  </div>
                ) : null}

                {!showPaymentSuccessBadge && canRenderCardPayment ? (
                  <div
                    className={cn(
                      "rounded-3xl border border-border bg-surface-muted p-3 md:p-4",
                      billing.checkout.isPending && "pointer-events-none opacity-70",
                    )}
                  >
                    <div className="mb-4 rounded-2xl bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
                      <h2 className="text-xl font-bold text-foreground">Cartão de crédito</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {isCourtesyRenewal
                          ? "Seu cartão será usado apenas para a cobrança futura ao fim da cortesia."
                          : "Adicione um cartão de crédito para ativar sua assinatura."}
                      </p>
                    </div>
                    {cardPaymentStatus === "error" ? (
                      <InlineAlert
                        className="bg-surface"
                        title="Campos do cartão não carregaram"
                        variant="error"
                      >
                        <div className="grid gap-3">
                          <p>Recarregue o formulário seguro para informar o cartão de crédito.</p>
                          <Button
                            className="h-10 w-fit rounded-full"
                            onClick={handleRetryCardPayment}
                            type="button"
                            variant="outline"
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      </InlineAlert>
                    ) : (
                      <div
                        className={cn(
                          "relative",
                          cardPaymentStatus === "loading" && "min-h-[220px]",
                        )}
                      >
                        {cardPaymentStatus === "loading" ? (
                          <LoadingState
                            className="absolute inset-0 rounded-2xl bg-surface px-4 py-8"
                            label="Carregando campos seguros do cartão"
                          />
                        ) : null}
                        <div className={cn(cardPaymentStatus === "loading" && "opacity-0")}>
                          <CardPayment
                            customization={customization}
                            id="lectum-card-payment-brick"
                            initialization={initialization}
                            key={cardPaymentInstanceKey}
                            locale="pt-BR"
                            onError={handleBrickError}
                            onReady={handleBrickReady}
                            onSubmit={handleSubmit}
                          />
                        </div>
                      </div>
                    )}
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
