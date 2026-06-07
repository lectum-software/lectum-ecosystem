"use client";

import { ArrowLeft, MapPin, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const ProfessionalBillingAddressLogic = () => {
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/professional/whatsapp/verify"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para telefone
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-8 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
            <MapPin className="h-10 w-10" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Endereço de faturamento
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
            Etapa reservada ao checkout real
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            No fluxo de assinatura, esta etapa vem depois do pagamento e da verificação de telefone.
            O formulário real de endereço pertence à TASK-32 junto com o checkout Mercado Pago e não
            deve ser preenchido antes de existir assinatura paga real.
          </p>

          <InlineAlert className="mt-7 text-left" title="Sem dados fictícios" variant="warning">
            Nenhum endereço de faturamento é salvo aqui enquanto o pagamento real estiver bloqueado.
          </InlineAlert>

          <div className="mt-7 grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-left text-sm text-muted">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Quando a TASK-32 for retomada, esta rota usará formulário Zod/React Hook Form e CEP
                da fundação TASK-02.
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <Button asChild className="h-12 rounded-full">
              <Link href="/psychologist/cfp">Continuar para verificação de CRP</Link>
            </Button>
            <Button asChild className="h-12 rounded-full" variant="outline">
              <Link href="/app/professional/billing/checkout">Ver pagamento</Link>
            </Button>
          </div>
        </div>
      </section>
    </PrivateTemplate>
  );
};
