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
import type { CfpResult, CfpSearchResponse } from "@/api/generator/types";
import { formatCpf } from "@/components/controllers/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  formatCfpRegistrationDate,
  nextStepHref,
  type ResolvedApiError,
  supportLinkProps,
} from "../modules/support";
import { CfpHero, PageFrame, PremiumPanel } from "./cfp-layout";

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

export const ResultField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-[18px] border border-border bg-surface-muted px-4 py-4">
    <p className="text-xs font-bold uppercase tracking-wide text-subtle">{label}</p>
    <div className="mt-2 text-base font-semibold text-foreground">{value}</div>
  </div>
);

export const ResultCard = ({
  result,
  selected,
  onSelect,
}: {
  result: CfpResult;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    aria-pressed={selected}
    className={cn(
      "w-full rounded-[24px] border bg-surface p-5 text-left shadow-[var(--lectum-shadow-soft)] transition md:p-6",
      selected ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/40",
    )}
    onClick={onSelect}
    type="button"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-subtle">Nome encontrado</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          {result.nome || "Nome não informado"}
        </h2>
      </div>
      {selected ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <ResultField label="Regional" value={result.nome_regional || "Não informado"} />
      <ResultField label="Registro" value={result.registro || "Não informado"} />
      <ResultField
        label="Situação"
        value={
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              result.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
            {result.situacao || "Não informada"}
          </span>
        }
      />
      <ResultField
        label="Data de inscrição"
        value={formatCfpRegistrationDate(result.data_inscricao)}
      />
    </div>

    <p className="mt-5 border-border border-t pt-5 text-sm leading-6 text-muted">
      Dados retornados pela verificação automática.
    </p>
  </button>
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
          <InlineAlert className="mt-5" title="Não foi possível confirmar" variant="error">
            {apiError.message}
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
