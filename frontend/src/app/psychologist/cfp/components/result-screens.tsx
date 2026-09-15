"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileQuestion,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { CfpSearchResponse } from "@/api/generator/types";
import { formatCpf } from "@/components/controllers/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  cfpErrorTitle,
  nextStepHref,
  type ResolvedApiError,
  shouldShowCfpSupportGuidance,
  supportLinkProps,
} from "../modules/support";
import { CfpHero, PageFrame, PremiumPanel, SupportGuidance } from "./cfp-layout";
import { ResultCard } from "./result-card";

export { ResultCard, ResultField } from "./result-card";

export const LoadingScreen = () => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Estamos verificando suas informações pelo serviço automático. A consulta pode levar até um minuto."
        title="Consultando seus dados"
      />
      <div className="mx-auto mt-8 grid max-w-md justify-items-center gap-4 rounded-[24px] border border-border bg-surface-muted px-5 py-6 text-center">
        <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
          <Loader2 className="absolute h-16 w-16 animate-spin" aria-hidden="true" />
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-muted">Consulta automática segura</p>
      </div>
    </PremiumPanel>
  </PageFrame>
);

export const NotFoundScreen = ({ onRetry }: { onRetry: () => void }) => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Não encontramos um registro ativo vinculado ao CPF informado. Confira os dados e tente novamente."
        eyebrow="Validação pendente"
        icon={FileQuestion}
        title="Registro não encontrado"
        variant="warning"
      />

      <InlineAlert className="mt-7" title="Antes de seguir" variant="warning">
        A assinatura continua ativa. Você pode tentar outro CPF ou falar com o suporte para análise
        manual se o cadastro estiver correto.
      </InlineAlert>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Button className="h-14 rounded-full text-base" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Button asChild className="h-14 rounded-full text-base" variant="outline">
          <a {...supportLinkProps}>Falar com suporte</a>
        </Button>
      </div>
    </PremiumPanel>
  </PageFrame>
);

export const AlreadyVerifiedScreen = ({
  cpf,
  manualApproved,
}: {
  cpf?: string | null;
  manualApproved: boolean;
}) => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description={
          manualApproved
            ? "Seu CRP foi aprovado pela equipe Lectum."
            : cpf
              ? `O CPF ${formatCpf(cpf)} já possui confirmação profissional pela verificação automática.`
              : "Seu cadastro profissional já foi confirmado pela verificação automática."
        }
        eyebrow="Validação concluída"
        icon={ShieldCheck}
        title="Registro já confirmado"
        variant="success"
      />

      <div className="mt-8 rounded-[24px] border border-success/20 bg-success/10 px-5 py-5 text-center text-success">
        <CheckCircle2 className="mx-auto h-8 w-8" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">
          Próximo passo: configurar seu perfil profissional para aparecer na Lectum.
        </p>
      </div>

      <Button asChild className="mt-7 h-14 w-full rounded-full text-base">
        <Link href={nextStepHref}>
          Configurar perfil
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </PremiumPanel>
  </PageFrame>
);

export const ResultsScreen = ({
  result,
  selectedKey,
  onSelect,
  onConfirm,
  onRetry,
  isConfirming,
  apiError,
}: {
  result: CfpSearchResponse;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onConfirm: () => void;
  onRetry: () => void;
  isConfirming: boolean;
  apiError: ResolvedApiError | null;
}) => {
  const selected = result.results.find((item) => item.key === selectedKey) || null;

  return (
    <PageFrame>
      <PremiumPanel>
        <CfpHero
          description="Encontramos o registro abaixo no Conselho Federal de Psicologia. Confirme se os dados pertencem a você para ativar a validação profissional."
          title="Confirme seu registro"
        />

        <div className="mt-8 grid gap-4">
          {result.results.map((item) => (
            <ResultCard
              key={item.key}
              result={item}
              disabled={isConfirming}
              selected={item.key === selectedKey}
              onSelect={() => onSelect(item.key)}
            />
          ))}
        </div>

        {selected && !selected.active ? (
          <InlineAlert className="mt-5" title="Registro não ativo" variant="warning">
            Este registro foi retornado pela consulta automática, mas não está ativo para aprovação.
            Procure o suporte para análise manual.
          </InlineAlert>
        ) : null}

        {apiError ? (
          <InlineAlert className="mt-5" title={cfpErrorTitle} variant="error">
            <div className="grid gap-3">
              <p>{apiError.message}</p>
              {shouldShowCfpSupportGuidance(apiError) ? <SupportGuidance /> : null}
            </div>
          </InlineAlert>
        ) : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button
            className="h-14 rounded-full text-base"
            disabled={!selected?.active || isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isConfirming ? "Confirmando" : "Sim, sou eu"}
            {!isConfirming ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </Button>
          <Button
            className="h-14 rounded-full text-base"
            disabled={isConfirming}
            onClick={onRetry}
            type="button"
            variant="outline"
          >
            Tentar outro CPF
          </Button>
        </div>
      </PremiumPanel>
    </PageFrame>
  );
};

export const SessionMissingScreen = () => (
  <PageFrame>
    <PremiumPanel className="md:max-w-3xl md:justify-self-center">
      <CfpHero
        description="Entre novamente para validar seu cadastro profissional com segurança."
        title="Sessão necessária"
        variant="warning"
      />
      <Button asChild className="mt-7 h-14 w-full rounded-full text-base">
        <Link href="/auth/login?role=psicologo">Ir para login</Link>
      </Button>
    </PremiumPanel>
  </PageFrame>
);
