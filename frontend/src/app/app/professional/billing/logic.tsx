"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  BillingPaymentHistoryItem,
  BillingPaymentMethod,
  ProfessionalSubscription,
} from "@/api/generator/types/billing";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
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

const COURTESY_CARD_HREF = "/app/profissional/assinatura/pagamento?intent=courtesy-renewal";

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

const formatPaymentDate = (value?: string | null) => {
  if (!value) return "Data indisponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
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
    return "Cortesia administrativa com os benefícios profissionais liberados, sem cobrança recorrente vinculada.";
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

const paymentHistoryTone: Record<string, string> = {
  cancelado: "border-warning/30 bg-warning/10 text-warning",
  pago: "border-success/30 bg-success/10 text-success",
  pendente: "border-warning/30 bg-warning/10 text-warning",
  processado: "border-primary/25 bg-primary-soft text-primary",
  recusado: "border-danger/30 bg-danger/10 text-danger",
};

const PaymentHistoryCard = ({ items }: { items: BillingPaymentHistoryItem[] }) => (
  <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <ReceiptText className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-extrabold text-foreground">Histórico de pagamentos</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Cobranças confirmadas.</p>
      </div>
    </div>

    {items.length > 0 ? (
      <ol className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li className="flex items-center gap-3 py-4 first:pt-0 last:pb-0" key={item.id}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-foreground">
                {item.title || "Assinatura mensal"}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {formatPaymentDate(item.occurred_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {item.amount_cents ? (
                <p className="text-sm font-extrabold text-foreground">
                  {formatPrice(item.amount_cents)}
                </p>
              ) : null}
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[0.68rem] font-black uppercase tracking-[0.08em]",
                  paymentHistoryTone[item.status] ?? paymentHistoryTone.processado,
                )}
              >
                {item.status_label || "Processado"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <div className="mt-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
        <p className="text-sm font-extrabold text-foreground">Nenhum pagamento registrado ainda</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Quando cobranças forem confirmadas, elas aparecerão aqui.
        </p>
      </div>
    )}
  </article>
);

export const ProfessionalBillingLogic = () => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const billing = usePsychologistBilling({
    callbacks: {
      cancelSubscription: {
        onSuccess: () => {
          setShowCancelConfirm(false);
          toast.success("Assinatura cancelada com sucesso");
        },
      },
    },
  });
  const subscriptionQuery = billing.subscription;
  const subscription =
    subscriptionQuery.data?.subscription ?? subscriptionQuery.data?.current ?? null;
  const paymentMethod = subscriptionQuery.data?.payment_method ?? null;
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
      subscription?.source === "mercadopago" &&
      subscription?.gateway === "mercadopago" &&
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
  const canManageCard = Boolean(hasGatewayBilling && subscription?.status !== "cancelada");
  const canCancelSubscription = Boolean(hasGatewayBilling && subscription?.status === "ativa");
  const priceTitle = isCourtesy ? "Valor da cortesia" : "Valor recorrente";
  const periodTitle = isCourtesy ? "Expiração da cortesia" : "Próxima renovação";
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
    : "Alterar";

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

        {!subscriptionQuery.isLoading && !subscriptionQuery.isError && !subscription ? (
          <EmptyState
            action={
              <Button asChild className="h-11 rounded-full">
                <Link href="/app/profissional/assinatura/planos">
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
                    label={isCourtesy ? "Cortesia ativa" : undefined}
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

            {!isCourtesy ? (
              <aside className="grid gap-4">
                <PaymentHistoryCard items={paymentHistory} />

                {canCancelSubscription ? (
                  !showCancelConfirm ? (
                    <div className="flex justify-center py-2">
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted/75 transition hover:text-danger"
                        onClick={() => setShowCancelConfirm(true)}
                        type="button"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Cancelar assinatura
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-4 shadow-[var(--lectum-shadow-soft)]">
                      <div className="grid gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-foreground">
                            Cancelar assinatura agora?
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            Todos os benefícios do Plano Profissional serão desativados após a
                            confirmação.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            className="h-10 rounded-full text-xs font-extrabold"
                            disabled={billing.cancelSubscription.isPending}
                            onClick={() => setShowCancelConfirm(false)}
                            type="button"
                            variant="outline"
                          >
                            Manter
                          </Button>
                          <Button
                            className="h-10 rounded-full text-xs font-extrabold"
                            disabled={billing.cancelSubscription.isPending}
                            onClick={() => billing.cancelSubscription.mutate()}
                            type="button"
                            variant="destructive"
                          >
                            {billing.cancelSubscription.isPending ? "Cancelando..." : "Confirmar"}
                          </Button>
                        </div>
                      </div>

                      {billing.cancelSubscription.isError ? (
                        <div className="mt-3">
                          <InlineAlert title="Não foi possível cancelar" variant="error">
                            {getErrorMessage(billing.cancelSubscription.error)}
                          </InlineAlert>
                        </div>
                      ) : null}
                    </div>
                  )
                ) : null}

                {!canManageCard ? (
                  <InlineAlert title="Alteração de cartão indisponível" variant="warning">
                    A troca de cartão exige uma assinatura profissional ativa com método de
                    pagamento cadastrado. Assinaturas gratuitas ou de cortesia não possuem cartão
                    para alterar.
                  </InlineAlert>
                ) : null}

                {subscription.status === "inadimplente" ? (
                  <InlineAlert title="Regularize seu pagamento" variant="error">
                    Identificamos pendência na cobrança. Atualize o cartão ou regularize o pagamento
                    para manter os benefícios do plano.
                  </InlineAlert>
                ) : null}

                {subscription.status === "inativa" && subscription.gateway_subscription_id ? (
                  <InlineAlert title="Aguardando confirmação" variant="info">
                    A assinatura já foi enviada para confirmação e será ativada quando o pagamento
                    retornar com sucesso.
                  </InlineAlert>
                ) : null}

                {subscription.status === "cancelada" ? (
                  <InlineAlert title="Assinatura cancelada" variant="warning">
                    Escolha um novo plano para retomar os recursos profissionais da Lectum.
                  </InlineAlert>
                ) : null}

                {!subscription.gateway_subscription_id && isPaidPlan ? (
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
