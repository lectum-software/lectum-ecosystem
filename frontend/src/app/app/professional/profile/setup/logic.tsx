"use client";

import { ArrowLeft, ClipboardCheck, LockKeyhole, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const ProfessionalProfileSetupLogic = () => {
  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/professional/billing/plans"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos planos
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-8 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
            <ClipboardCheck className="h-10 w-10" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Configuração do perfil
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
            Perfil profissional protegido até a validação completa
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            No plano gratuito, esta etapa vem logo depois da escolha do plano, sem consulta de CRP
            pela API. A edição completa do perfil profissional continua vinculada à TASK-18.
          </p>

          <InlineAlert className="mt-7 text-left" title="Dependência bloqueada" variant="warning">
            A configuração final não será simulada: é preciso concluir o armazenamento privado de
            CRP antes de liberar edição e publicação profissional.
          </InlineAlert>

          <div className="mt-7 grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-left text-sm text-muted">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Campos sensíveis como CRP, status de documento e publicação permanecem protegidos.
              </span>
            </div>
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Use o perfil básico apenas para consultar sessão, assinatura e verificação de
                WhatsApp.
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <Button asChild className="h-12 rounded-full">
              <Link href="/app/profile">Abrir perfil básico</Link>
            </Button>
            <Button asChild className="h-12 rounded-full" variant="outline">
              <Link href="/app/professional/billing/plans">Voltar aos planos</Link>
            </Button>
          </div>
        </div>
      </section>
    </PrivateTemplate>
  );
};
