"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { ArrowRight, CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { BillingPaymentMethod, ProfessionalSubscription } from "@/api/generator/types/billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
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

const CREDIT_CARD_PAYMENT_TYPE = "credit_card";

type CardPaymentFormData = {
  token?: string;
  payment_method_id?: string;
};

type CardPaymentAdditionalData = {
  lastFourDigits?: string;
  paymentTypeId?: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPrice = (priceCents?: number | null) => {
  if (!priceCents) return "R$ 0,00";

  return currencyFormatter.format(priceCents / 100);
};

const getErrorMessage = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível carregar a gestão do cartão agora.");

const canUpdateCard = (subscription?: ProfessionalSubscription | null) =>
  subscription?.plan?.slug === "profissional" && Boolean(subscription.gateway_subscription_id);

const PaymentMethodPreview = ({
  paymentMethod,
}: {
  paymentMethod?: BillingPaymentMethod | null;
}) => {
  const last4 = paymentMethod?.last4 ? `•••• ${paymentMethod.last4}` : "•••• ••••";
  const brand = paymentMethod?.brand ? paymentMethod.brand.toUpperCase() : "Cartão seguro";

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-primary via-primary to-primary p-5 text-primary-foreground shadow-lectum-soft">
      <div
        aria-hidden
        className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-media-foreground/15 blur-xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-media-foreground/10 blur-2xl"
      />
      <div className="relative z-10 flex min-h-[154px] flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/75">
              Cartão atual
            </p>
            <p className="mt-2 text-lg font-extrabold">{brand}</p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-media-foreground/15 backdrop-blur">
            <CreditCard className="h-6 w-6" aria-hidden="true" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-[0.18em]">{last4}</p>
          <p className="mt-2 text-xs font-semibold text-primary-foreground/70">
            Tokenizado com segurança
          </p>
        </div>
      </div>
    </div>
  );
};

export const ProfessionalBillingCardLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userEmail = useAppSelector((state) => state.user?.email || "");
  const payerEmail = resolveMercadoPagoPayerEmail(userEmail);
  const billing = usePsychologistBilling({
    callbacks: {
      paymentMethod: {
        onSuccess: () => {
          toast.success("Cartão atualizado com sucesso");
          router.replace("/app/profissional/assinatura/cartao?status=success", { scroll: true });
        },
      },
    },
  });
  const paymentMethodMutateAsyncRef = useRef(billing.paymentMethod.mutateAsync);

  useEffect(() => {
    paymentMethodMutateAsyncRef.current = billing.paymentMethod.mutateAsync;
  }, [billing.paymentMethod.mutateAsync]);

  useEffect(() => {
    if (!isMercadoPagoPublicConfigurationValid || !mercadoPagoPublicKey) return;

    initMercadoPago(mercadoPagoPublicKey, {
      locale: "pt-BR",
      advancedFraudPrevention: true,
    });
  }, []);

  const isSuccess = searchParams.get("status") === "success";
  const subscriptionQuery = billing.subscription;
  const subscription =
    subscriptionQuery.data?.subscription ?? subscriptionQuery.data?.current ?? null;
  const paymentMethod = subscriptionQuery.data?.payment_method ?? null;
  const canSubmit = canUpdateCard(subscription);
  const amount = subscription?.plan?.price_cents ? subscription.plan.price_cents / 100 : 0;

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
          formSubmit: "Alterar cartão",
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
        toast.error("Não foi possível validar os dados do cartão. Tente novamente.");
        return;
      }

      if (paymentTypeId && paymentTypeId !== CREDIT_CARD_PAYMENT_TYPE) {
        toast.error("Use um cartão de crédito para atualizar sua assinatura.");
        return;
      }

      try {
        await paymentMethodMutateAsyncRef.current({
          card_token: token,
          payment_type_id: CREDIT_CARD_PAYMENT_TYPE,
          brand: formData.payment_method_id || null,
          last4: additionalData?.lastFourDigits || null,
        });
      } catch {
        // handleReq já exibe o erro público sanitizado; impedir rejeição não tratada no Brick.
      }
    },
    [],
  );

  const handleBrickError = useCallback(() => {
    toast.error("Não foi possível carregar o formulário de cartão.");
  }, []);

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-5xl">
        <AppPageHeader
          backHref="/app/profissional/assinatura"
          backLabel="Voltar"
          title="Alterar cartão"
        />

        {subscriptionQuery.isLoading ? <LoadingState label="Carregando sua assinatura" /> : null}

        {subscriptionQuery.isError ? (
          <InlineAlert title="Não foi possível carregar a assinatura" variant="error">
            {getErrorMessage(subscriptionQuery.error)}
          </InlineAlert>
        ) : null}

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && !subscription ? (
          <EmptyState
            action={
              <Button asChild className="h-11 rounded-full">
                <Link href="/app/profissional/assinatura/planos">
                  Ver planos
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Nenhuma assinatura foi encontrada para permitir a troca do cartão."
            icon={CreditCard}
            title="Assinatura não encontrada"
          />
        ) : null}

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && subscription ? (
          <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-start">
            <aside className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Método de pagamento
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-foreground">
                  Cartão da assinatura
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Plano {subscription.plan?.name || "Profissional"} ·{" "}
                  {formatPrice(subscription.plan?.price_cents)} / mês
                </p>
              </div>

              <PaymentMethodPreview paymentMethod={paymentMethod} />
            </aside>

            <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] md:p-6">
              {isSuccess ? (
                <div className="grid justify-items-center gap-5 py-8 text-center md:py-12">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">
                      Cartão alterado com sucesso
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-muted md:text-base md:leading-7">
                      O novo cartão de crédito já está vinculado à sua assinatura.
                    </p>
                  </div>
                  <div className="grid w-full gap-3 sm:max-w-sm sm:grid-cols-2">
                    <Button asChild className="h-12 rounded-full">
                      <Link href="/app/profissional/assinatura">Concluir</Link>
                    </Button>
                    <Button
                      className="h-12 rounded-full"
                      onClick={() => router.replace("/app/profissional/assinatura/cartao")}
                      type="button"
                      variant="outline"
                    >
                      Trocar novamente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  <div className="rounded-[var(--lectum-card-radius)] bg-surface-muted p-4">
                    <div className="flex gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                        <CreditCard className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-xl font-extrabold text-foreground">
                          Novo cartão de crédito
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Insira um novo cartão de crédito para manter a assinatura do Plano
                          Profissional.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!canSubmit ? (
                    <EmptyState
                      action={
                        <Button asChild className="h-11 rounded-full">
                          <Link href="/app/profissional/assinatura/planos">Ver planos</Link>
                        </Button>
                      }
                      description="A troca de cartão exige uma assinatura profissional ativa com método de pagamento cadastrado."
                      icon={CreditCard}
                      title="Alteração indisponível"
                    />
                  ) : null}

                  {!isMercadoPagoPublicConfigurationValid ? (
                    <InlineAlert title="Formulário de cartão indisponível" variant="error">
                      Não foi possível carregar o formulário seguro de cartão. Tente novamente mais
                      tarde.
                    </InlineAlert>
                  ) : null}

                  {isMercadoPagoPublicConfigurationValid && canSubmit && amount > 0 ? (
                    <div
                      className={cn(
                        "rounded-3xl border border-border bg-surface-muted p-3 md:p-4",
                        billing.paymentMethod.isPending && "pointer-events-none opacity-70",
                      )}
                    >
                      <CardPayment
                        customization={customization}
                        id="lectum-card-update-brick"
                        initialization={initialization}
                        locale="pt-BR"
                        onError={handleBrickError}
                        onSubmit={handleSubmit}
                      />
                    </div>
                  ) : null}

                  {billing.paymentMethod.isError ? (
                    <InlineAlert title="Não foi possível alterar o cartão" variant="error">
                      {getErrorMessage(billing.paymentMethod.error)}
                    </InlineAlert>
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
