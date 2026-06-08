"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Gift,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatDate = (value?: string | null) => {
  if (!value) return "Sem data definida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Não foi possível carregar sua assinatura agora.";
};

export const ProfessionalBillingSubscriptionLogic = () => {
  const { current } = usePsychologistBilling();
  const subscription = current.data?.current || null;
  const isCourtesy =
    subscription?.source === "admin_grant" &&
    subscription.status === "ativa" &&
    subscription.plan?.slug === "profissional";
  const planName = subscription?.plan?.name || "Plano não encontrado";
  const expirationLabel = formatDate(subscription?.current_period_end);

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/profile"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao perfil
        </Link>

        {current.isLoading ? <LoadingState label="Carregando sua assinatura" /> : null}

        {current.isError ? (
          <InlineAlert title="Não foi possível carregar sua assinatura" variant="error">
            {getErrorMessage(current.error)}
          </InlineAlert>
        ) : null}

        {!current.isLoading && !current.isError ? (
          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-8 shadow-[var(--lectum-shadow-soft)]">
            <div className="grid justify-items-center text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
                {isCourtesy ? (
                  <Gift className="h-10 w-10" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="h-10 w-10" aria-hidden="true" />
                )}
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Minha assinatura
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
                {isCourtesy ? "Plano Profissional de cortesia" : planName}
              </h1>
              <p className="mt-3 text-base leading-7 text-muted">
                {isCourtesy
                  ? "Você está com todos os benefícios de um psicólogo assinante liberados durante o período da cortesia."
                  : "Veja o plano ativo no seu perfil profissional."}
              </p>
            </div>

            <div className="mt-7 grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-foreground">Plano atual</p>
                  <p className="mt-1 text-sm text-muted">{planName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-foreground">Expiração da cortesia</p>
                  <p className="mt-1 text-sm text-muted">{expirationLabel}</p>
                </div>
              </div>
            </div>

            {isCourtesy ? (
              <>
                <InlineAlert className="mt-6 text-left" title="Próximo passo" variant="warning">
                  Para continuar como assinante após a cortesia, cadastre os dados do cartão no
                  checkout real. A cobrança só deve ser ativada pelo fluxo Mercado Pago da TASK-32.
                </InlineAlert>

                <Button asChild className="mt-6 h-12 w-full rounded-full">
                  <Link href="/app/professional/billing/checkout?intent=courtesy-renewal">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Inserir dados do cartão
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild className="mt-6 h-12 w-full rounded-full" variant="outline">
                <Link href="/app/professional/billing/plans">Ver planos disponíveis</Link>
              </Button>
            )}

            <div className="mt-6 flex gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
              {current.isFetching ? (
                <Loader2
                  className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary"
                  aria-hidden="true"
                />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              )}
              <span>
                A Lectum não coleta cartão fora do gateway real. Se o checkout ainda estiver
                bloqueado, a tela de pagamento mostrará a pendência externa sem simular cobrança.
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
