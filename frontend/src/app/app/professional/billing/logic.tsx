"use client";

import { AlertTriangle, BadgeCheck, CalendarClock, CreditCard } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { BillingPaymentMethod, ProfessionalSubscription } from "@/api/generator/types/billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { billingMaintenanceSubscription } from "@/utils/billing-management";
import { stripeInactiveBillingCopy } from "@/utils/stripe-billing";
import { formatDate, formatPrice } from "./components/billing-format";
import { CancelSubscriptionAction } from "./components/cancel-subscription";
import { PaymentHistoryCard } from "./components/payment-history-card";
import { StripeRecoveryAction } from "./components/stripe-recovery-action";
import { ProfessionalBillingSubscriptionView } from "./subscription/logic";

const COURTESY_CARD_HREF = "/app/profissional/assinatura/pagamento?intent=courtesy-renewal";

const isFutureDate = (value?: string | null) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() > Date.now();
};

const formatCardBrand = (brand?: string | null) => {
  if (!brand) return "Cartão";

  const normalized = brand.trim().toLowerCase();
  if (!normalized) return "Cartão";

  const knownBrands: Record<string, string> = {
    amex: "Amex",
    elo: "Elo",
    hipercard: "Hipercard",
    mastercard: "Mastercard",
    visa: "Visa",
  };

  return knownBrands[normalized] ?? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const getErrorMessage = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível carregar sua assinatura agora.");

const statusLabel: Record<string, string> = {
  ativa: "Ativo",
  inativa: "Pendente",
  inadimplente: "Pagamento pendente",
  cancelada: "Cancelado",
};

const statusTone: Record<string, string> = {
  ativa: "border-success/30 bg-success/10 text-success",
  inativa: "border-warning/30 bg-warning/10 text-warning",
  inadimplente: "border-danger/30 bg-danger/10 text-danger",
  cancelada: "border-border bg-surface-muted text-muted",
};

const getPlanDescription = (subscription?: ProfessionalSubscription | null) => {
  if (
    subscription?.source === "admin_grant" &&
    subscription?.status === "ativa" &&
    subscription?.plan?.slug === "profissional"
  ) {
    return "Cortesia administrativa com os benefícios profissionais liberados durante o período informado.";
  }

  if (subscription?.plan?.slug === "profissional") {
    return "Perfil verificado, prioridade na busca, avaliações, analytics e destaque nas comunidades.";
  }

  if (subscription?.plan?.slug === "gratuito") {
    return "Perfil gratuito para participar da comunidade e manter sua presença inicial na Lectum.";
  }

  return "Informações da assinatura profissional vinculada ao seu perfil.";
};

const PaymentMethodSummary = ({
  isCourtesy,
  paymentMethod,
}: {
  isCourtesy?: boolean;
  paymentMethod?: BillingPaymentMethod | null;
}) => {
  if (isCourtesy) {
    if (paymentMethod) {
      const brand = formatCardBrand(paymentMethod.brand);
      const cardDescription = paymentMethod.last4
        ? `${brand} final ${paymentMethod.last4}`
        : "Cartão cadastrado para cobrança futura.";

      return (
        <div>
          <p className="text-sm font-bold text-foreground">Cartão de cobrança cadastrado</p>
          <p className="mt-1 text-sm leading-6 text-muted">{cardDescription}</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm font-bold text-foreground">Adicionar cartão de cobrança</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Cadastre um cartão para a cobrança quando a cortesia chegar ao fim.
        </p>
      </div>
    );
  }

  if (!paymentMethod?.last4) {
    return (
      <div>
        <p className="text-sm font-bold text-foreground">Método de pagamento</p>
        <p className="mt-1 text-sm leading-6 text-muted">Cartão não cadastrado</p>
      </div>
    );
  }

  const brand = formatCardBrand(paymentMethod.brand);

  return (
    <div>
      <p className="text-sm font-bold text-foreground">Método de pagamento</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        {brand} final {paymentMethod.last4}
      </p>
    </div>
  );
};

const StatusBadge = ({ label, status }: { label?: string; status?: string | null }) => {
  const value = status || "inativa";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold",
        statusTone[value] || statusTone.inativa,
      )}
    >
      {label || statusLabel[value] || "Pendente"}
    </span>
  );
};

export const ProfessionalBillingLogic = () => {
  const billing = usePsychologistBilling({
    callbacks: {
      cancelSubscription: {
        onSuccess: () => {
          toast.success("Renovação da assinatura cancelada");
        },
      },
    },
  });
  const subscriptionQuery = billing.subscription;
  const subscription =
    subscriptionQuery.data?.subscription ?? subscriptionQuery.data?.current ?? null;
  const inactiveCopy = stripeInactiveBillingCopy(subscription);
  const paymentMethod = subscriptionQuery.data?.payment_method ?? null;
  const maintenance = billingMaintenanceSubscription(subscriptionQuery.data);
  const paymentHistory = subscriptionQuery.data?.payment_history ?? [];
  const isPaidPlan = subscription?.plan?.slug === "profissional";
  const isFreePlan = subscription?.plan?.slug === "gratuito";
  const isCourtesy = Boolean(
    subscription?.source === "admin_grant" &&
      subscription?.status === "ativa" &&
      subscription?.plan?.slug === "profissional",
  );
  const hasGatewayBilling = Boolean(
    isPaidPlan &&
      (subscription?.source === "mercadopago" || subscription?.source === "stripe") &&
      subscription.gateway === subscription.source &&
      subscription?.gateway_subscription_id,
  );
  const visiblePaymentMethod = isCourtesy
    ? paymentMethod
    : hasGatewayBilling
      ? paymentMethod
      : null;
  const planName = isCourtesy
    ? "Plano Profissional de Cortesia"
    : subscription?.plan?.name || "Plano não encontrado";
  const canManageCard = Boolean(maintenance);
  const canCancelSubscription = Boolean(maintenance);
  const scheduled = Boolean(isCourtesy && maintenance);
  const isCanceledWithBenefits = Boolean(
    subscription?.status === "cancelada" &&
      subscription.current_period_end &&
      isFutureDate(subscription.current_period_end),
  );
  const priceTitle = isCourtesy ? "Valor da cortesia" : "Valor recorrente";
  const billingGraceEndsAt = subscription?.billing_grace_ends_at ?? null;
  const billingDowngradedAt = subscription?.billing_downgraded_at ?? null;
  const isBillingDunningGrace = Boolean(
    subscription?.status === "inadimplente" &&
      billingGraceEndsAt &&
      !billingDowngradedAt &&
      isFutureDate(billingGraceEndsAt),
  );
  const periodTitle = isBillingDunningGrace
    ? "Regularizar até"
    : isCourtesy
      ? "Expiração da cortesia"
      : subscription?.status === "cancelada"
        ? "Término do Plano Profissional"
        : "Próxima renovação";
  const periodDate = isBillingDunningGrace ? billingGraceEndsAt : subscription?.current_period_end;
  const priceLabel = useMemo(
    () => (isCourtesy ? "Sem cobrança" : `${formatPrice(subscription?.plan?.price_cents)} / mês`),
    [isCourtesy, subscription?.plan?.price_cents],
  );
  const paymentActionHref = canManageCard
    ? "/app/profissional/assinatura/cartao"
    : isCourtesy
      ? COURTESY_CARD_HREF
      : null;
  const paymentActionLabel = isCourtesy
    ? visiblePaymentMethod
      ? "Alterar"
      : "Adicionar"
    : isBillingDunningGrace
      ? "Regularizar cartão"
      : "Alterar";

  if (!subscriptionQuery.isLoading && !subscriptionQuery.isError && (!subscription || isFreePlan)) {
    return (
      <ProfessionalBillingSubscriptionView
        error={subscriptionQuery.error}
        isError={subscriptionQuery.isError}
        isLoading={subscriptionQuery.isLoading}
        subscription={subscription}
        paymentHistory={
          paymentHistory.length ? (
            <PaymentHistoryCard
              items={paymentHistory}
              fiscalRequirements={subscriptionQuery.data?.fiscal_requirements}
              canReviewAddress={billing.current.data?.billing_address_editable === true}
            />
          ) : null
        }
      />
    );
  }

  return (
    <PrivateTemplate
      desktopSidebarDefaultCollapsed
      showHeader={false}
      showMobileNavigation={false}
      showNavigation
    >
      <section
        className={cn(
          "mx-auto grid w-full max-w-[430px] gap-5",
          isCourtesy ? "md:max-w-3xl" : "md:max-w-4xl",
        )}
      >
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar ao perfil"
          title="Minha Assinatura"
        />

        {subscriptionQuery.isLoading ? <LoadingState label="Carregando sua assinatura" /> : null}

        {subscriptionQuery.isError ? (
          <InlineAlert title="Não foi possível carregar sua assinatura" variant="error">
            {getErrorMessage(subscriptionQuery.error)}
          </InlineAlert>
        ) : null}

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && subscription ? (
          <div
            className={cn(
              "grid gap-5 md:items-start",
              isCourtesy ? "md:grid-cols-1" : "md:grid-cols-[1fr_0.85fr]",
            )}
          >
            <article className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <div className="border-border border-b bg-gradient-to-br from-primary-soft via-surface to-surface px-5 py-6 md:px-7 md:py-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
                    <VerifiedBadgeIcon className="h-8 w-8" aria-hidden="true" />
                  </span>
                  <StatusBadge
                    label={
                      isCanceledWithBenefits
                        ? "Ativa, sem renovação"
                        : isCourtesy
                          ? "Cortesia ativa"
                          : inactiveCopy?.label
                    }
                    status={subscription.status}
                  />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  {isCourtesy ? "Plano de cortesia" : "Plano atual"}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-foreground md:text-3xl">
                  {planName}
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted md:text-base md:leading-7">
                  {getPlanDescription(subscription)}
                </p>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-2 md:p-7">
                <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                      <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-muted">{priceTitle}</p>
                      <p className="mt-1 text-xl font-extrabold text-foreground">{priceLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                      <CalendarClock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-muted">{periodTitle}</p>
                      <p className="mt-1 text-sm font-extrabold text-foreground">
                        {formatDate(periodDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 md:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                        <CreditCard className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <PaymentMethodSummary
                        isCourtesy={isCourtesy}
                        paymentMethod={visiblePaymentMethod}
                      />
                    </div>
                    <Button
                      asChild={Boolean(paymentActionHref)}
                      className="h-10 shrink-0 rounded-full px-4 text-xs font-extrabold"
                      disabled={!paymentActionHref}
                      variant="outline"
                    >
                      {paymentActionHref ? (
                        <Link href={paymentActionHref}>{paymentActionLabel}</Link>
                      ) : (
                        <span>{paymentActionLabel}</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </article>

            {!isCourtesy || paymentHistory.length > 0 || maintenance ? (
              <aside className="grid gap-4">
                <PaymentHistoryCard
                  items={paymentHistory}
                  fiscalRequirements={subscriptionQuery.data?.fiscal_requirements}
                  canReviewAddress={billing.current.data?.billing_address_editable === true}
                />

                {maintenance?.gateway === "stripe" ? <StripeRecoveryAction /> : null}

                {scheduled ? (
                  <InlineAlert title="Cobrança futura cadastrada">
                    A mensalidade de {formatPrice(maintenance?.plan?.price_cents)} será cobrada após
                    a cortesia, a partir de {formatDate(subscription.current_period_end)}. Você pode
                    alterar o cartão ou cancelar essa cobrança sem perder a cortesia atual.
                  </InlineAlert>
                ) : null}

                {canCancelSubscription ? (
                  <CancelSubscriptionAction
                    benefits={subscription}
                    scheduled={scheduled}
                    pending={billing.cancelSubscription.isPending}
                    error={billing.cancelSubscription.error}
                    onConfirm={() => billing.cancelSubscription.mutate()}
                  />
                ) : null}

                {!canManageCard && subscription.status !== "cancelada" ? (
                  <InlineAlert title="Alteração de cartão indisponível" variant="warning">
                    A troca de cartão exige uma assinatura profissional ativa com método de
                    pagamento cadastrado. Assinaturas gratuitas ou de cortesia não possuem cartão
                    para alterar.
                  </InlineAlert>
                ) : null}

                {subscription.status === "inadimplente" ? (
                  <InlineAlert title="Regularize seu pagamento" variant="error">
                    <div className="grid gap-3">
                      <p>
                        {isBillingDunningGrace
                          ? `Você mantém os benefícios do Plano Profissional até ${formatDate(
                              billingGraceEndsAt,
                            )}. Atualize o cartão para evitar o downgrade para o Gratuito.`
                          : "Identificamos pendência na cobrança. Atualize o cartão ou regularize o pagamento para retomar os benefícios do plano."}
                      </p>
                      {canManageCard ? (
                        <Button asChild className="h-10 w-full rounded-full text-xs font-extrabold">
                          <Link href="/app/profissional/assinatura/cartao">Regularizar cartão</Link>
                        </Button>
                      ) : null}
                    </div>
                  </InlineAlert>
                ) : null}

                {subscription.status === "inativa" && subscription.gateway_subscription_id ? (
                  <InlineAlert
                    title={inactiveCopy?.title ?? "Aguardando confirmação"}
                    variant="info"
                  >
                    {inactiveCopy?.message ??
                      "A assinatura já foi enviada para confirmação e será ativada quando o pagamento retornar com sucesso."}
                  </InlineAlert>
                ) : null}

                {subscription.status === "cancelada" ? (
                  <InlineAlert title="Renovação cancelada" variant="info">
                    {isCanceledWithBenefits
                      ? `Seu plano Profissional permanece ativo até ${formatDate(subscription.current_period_end)}. A renovação foi cancelada e não haverá nova cobrança desta assinatura.`
                      : "O período contratado terminou. Escolha um novo plano para retomar os recursos profissionais."}
                  </InlineAlert>
                ) : null}

                {!subscription.gateway_subscription_id && !maintenance && isPaidPlan ? (
                  <InlineAlert title="Pagamento não vinculado" variant="warning">
                    <span className="inline-flex items-start gap-2">
                      <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                      Esta assinatura ainda não possui referência de pagamento para troca de cartão.
                    </span>
                  </InlineAlert>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
