"use client";

import { ArrowLeft, CreditCard, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const ProfessionalBillingCheckoutLogic = () => {
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/professional/billing/plans"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para planos
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-8 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
            <CreditCard className="h-10 w-10" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Pagamento da assinatura
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
            Checkout real ainda bloqueado
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            O fluxo pago deve passar por Mercado Pago antes de liberar telefone, endereço, CRP e
            configuração do perfil. Como as credenciais reais da TASK-32 ainda não estão
            configuradas, a Lectum não simula cobrança nem ativa assinatura.
          </p>

          <InlineAlert className="mt-7 text-left" title="Pendência externa" variant="warning">
            Configure access token, public key e segredo de webhook do Mercado Pago para retomar o
            pagamento real. Até lá, use o plano gratuito para seguir sem cobrança.
          </InlineAlert>

          <div className="mt-7 grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-left text-sm text-muted">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Cartão, CVV e aprovação não são coletados fora do gateway real.</span>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <Button asChild className="h-12 rounded-full">
              <Link href="/app/professional/billing/plans">Escolher plano gratuito</Link>
            </Button>
            <Button asChild className="h-12 rounded-full" variant="outline">
              <Link href="/app/profile">Ir para meu perfil</Link>
            </Button>
          </div>
        </div>
      </section>
    </PrivateTemplate>
  );
};
