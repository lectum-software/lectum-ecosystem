"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import type { BillingPaymentMethod, ProfessionalSubscription } from "@/api/generator/types/billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { ProfessionalBillingSubscriptionView } from "./subscription/logic";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatPrice = (priceCents?: number | null) => {
  if (!priceCents) return "R$ 0,00";

  return currencyFormatter.format(priceCents / 100);
};

const formatDate = (value?: string | null) => {
  if (!value) return "Aguardando confirmação";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível carregar sua assinatura agora.";

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
  if (subscription?.plan?.slug === "profissional") {
    return "Perfil verificado, prioridade na busca, avaliações, analytics e destaque nas comunidades.";
  }

  if (subscription?.plan?.slug === "gratuito") {
    return "Perfil gratuito para participar da comunidade e manter sua presença inicial na Lectum.";
  }

  return "Informações da assinatura profissional vinculada ao seu perfil.";
};

const PaymentMethodSummary = ({
  paymentMethod,
}: {
  paymentMethod?: BillingPaymentMethod | null;
}) => {
  if (!paymentMethod?.last4) {
    return (
      <div>
        <p className="text-sm font-bold text-foreground">Cartão não cadastrado</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Atualize o método de pagamento pelo ambiente seguro do Mercado Pago.
        </p>
      </div>
    );
  }

  const brand = paymentMethod.brand ? paymentMethod.brand.toUpperCase() : "Cartão";
  const expiration =
    paymentMethod.exp_month && paymentMethod.exp_year
      ? ` · vence ${String(paymentMethod.exp_month).padStart(2, "0")}/${String(paymentMethod.exp_year).slice(-2)}`
      : "";

  return (
    <div>
      <p className="text-sm font-bold text-foreground">
        {brand} final {paymentMethod.last4}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted">
        Cartão de crédito tokenizado pelo Mercado Pago{expiration}.
      </p>
    </div>
  );
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const value = status || "inativa";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold",
        statusTone[value] || statusTone.inativa,
      )}
    >
      {statusLabel[value] || "Pendente"}
    </span>
  );
};

export const ProfessionalBillingLogic = () => {
  const billing = usePsychologistBilling();
  const subscriptionQuery = billing.subscription;
  const subscription =
    subscriptionQuery.data?.subscription ?? subscriptionQuery.data?.current ?? null;
  const paymentMethod = subscriptionQuery.data?.payment_method ?? null;
  const planName = subscription?.plan?.name || "Plano não encontrado";
  const isPaidPlan = subscription?.plan?.slug === "profissional";
  const isFreePlan = subscription?.plan?.slug === "gratuito";
  const canManageCard = Boolean(
    isPaidPlan && subscription?.status !== "cancelada" && subscription?.gateway_subscription_id,
  );
  const priceLabel = useMemo(
    () => `${formatPrice(subscription?.plan?.price_cents)} / mês`,
    [subscription?.plan?.price_cents],
  );

  if (
    !subscriptionQuery.isLoading &&
    !subscriptionQuery.isError &&
    subscription?.status === "ativa" &&
    isFreePlan
  ) {
    return (
      <ProfessionalBillingSubscriptionView
        error={subscriptionQuery.error}
        isError={subscriptionQuery.isError}
        isLoading={subscriptionQuery.isLoading}
        subscription={subscription}
      />
    );
  }

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-4xl">
        <AppPageHeader
          backHref="/app/profile"
          backLabel="Voltar ao perfil"
          title="Minha Assinatura"
        />

        {subscriptionQuery.isLoading ? <LoadingState label="Carregando sua assinatura" /> : null}

        {subscriptionQuery.isError ? (
          <InlineAlert title="Não foi possível carregar sua assinatura" variant="error">
            {getErrorMessage(subscriptionQuery.error)}
          </InlineAlert>
        ) : null}

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && !subscription ? (
          <EmptyState
            action={
              <Button asChild className="h-11 rounded-full">
                <Link href="/app/professional/billing/plans">
                  Escolher plano
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
            description="Nenhuma assinatura real foi encontrada para o seu perfil. Escolha um plano para continuar."
            icon={CreditCard}
            title="Assinatura não encontrada"
          />
        ) : null}

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && subscription ? (
          <div className="grid gap-5 md:grid-cols-[1fr_0.85fr] md:items-start">
            <article className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <div className="border-border border-b bg-gradient-to-br from-primary-soft via-surface to-surface px-5 py-6 md:px-7 md:py-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
                    <ShieldCheck className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <StatusBadge status={subscription.status} />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-primary">
                  Plano atual
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
                      <p className="text-sm font-bold text-muted">Valor recorrente</p>
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
                      <p className="text-sm font-bold text-muted">Próxima renovação</p>
                      <p className="mt-1 text-sm font-extrabold text-foreground">
                        {formatDate(subscription.current_period_end)}
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
                      <PaymentMethodSummary paymentMethod={paymentMethod} />
                    </div>
                    <Button
                      asChild={canManageCard}
                      className="h-10 shrink-0 rounded-full px-4 text-xs font-extrabold"
                      disabled={!canManageCard}
                      variant="outline"
                    >
                      {canManageCard ? (
                        <Link href="/app/professional/billing/card">Alterar</Link>
                      ) : (
                        <span>Alterar</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </article>

            <aside className="grid gap-4">
              <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">Cobrança protegida</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      A Lectum guarda somente dados de exibição do cartão. Número completo e CVV não
                      passam pelo nosso backend.
                    </p>
                  </div>
                </div>
              </div>

              {!canManageCard ? (
                <InlineAlert title="Alteração de cartão indisponível" variant="warning">
                  A troca de cartão exige uma assinatura profissional vinculada ao Mercado Pago.
                  Assinaturas gratuitas ou de cortesia não possuem cartão para alterar.
                </InlineAlert>
              ) : null}

              <div className="grid gap-3">
                <Button asChild className="h-12 rounded-full">
                  <Link
                    href={
                      canManageCard
                        ? "/app/professional/billing/card"
                        : "/app/professional/billing/plans"
                    }
                  >
                    {canManageCard ? "Alterar cartão" : "Ver planos"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  className="h-12 rounded-full"
                  disabled={subscriptionQuery.isFetching}
                  onClick={() => subscriptionQuery.refetch()}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", subscriptionQuery.isFetching && "animate-spin")}
                    aria-hidden="true"
                  />
                  Atualizar status
                </Button>
              </div>

              {subscription.status === "inadimplente" ? (
                <InlineAlert title="Regularize seu pagamento" variant="error">
                  Identificamos pendência na cobrança. Atualize o cartão ou regularize o pagamento
                  para manter os benefícios do plano.
                </InlineAlert>
              ) : null}

              {subscription.status === "inativa" && subscription.gateway_subscription_id ? (
                <InlineAlert title="Aguardando confirmação" variant="info">
                  A assinatura já foi enviada ao Mercado Pago e será ativada quando o webhook
                  confirmado retornar com sucesso.
                </InlineAlert>
              ) : null}

              {subscription.status === "cancelada" ? (
                <InlineAlert title="Assinatura cancelada" variant="warning">
                  Escolha um novo plano para retomar os recursos profissionais da Lectum.
                </InlineAlert>
              ) : null}

              {!subscription.gateway_subscription_id && isPaidPlan ? (
                <InlineAlert title="Gateway não vinculado" variant="warning">
                  <span className="inline-flex items-start gap-2">
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                    Esta assinatura ainda não possui referência real do Mercado Pago para troca de
                    cartão.
                  </span>
                </InlineAlert>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
