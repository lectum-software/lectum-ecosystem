"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAdminCommunityStatusUpdate } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityIdentity, AdminCommunityStatusInput } from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { cn } from "@/lib/utils";

import {
  COMMUNITY_DEACTIVATE_CONFIRMATION,
  COMMUNITY_REACTIVATE_CONFIRMATION,
  type CommunityStatusFormValues,
  type CommunityTab,
  cardClass,
  communityStatusFormSchema,
  communityTabs,
  formatDate,
} from "../modules/detail-support";

import { StatusBadge } from "./content-shared";

export type CommunityStatusDialogState = {
  active: boolean;
  cta: string;
  description: string;
  expectedConfirmation: string;
  title: string;
};

export const CommunityStatusDialog = ({
  community,
  id,
  onClose,
  state,
}: {
  community: AdminCommunityIdentity;
  id: string;
  onClose: () => void;
  state: CommunityStatusDialogState;
}) => {
  const mutation = useAdminCommunityStatusUpdate(id);
  const form = useForm<CommunityStatusFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(communityStatusFormSchema(state.expectedConfirmation)),
  });
  const dialogRef = useAdminDialogLifecycle(onClose, {
    closeEnabled: !mutation.isPending,
  });

  const onSubmit = async (values: CommunityStatusFormValues) => {
    const input: AdminCommunityStatusInput = {
      active: state.active,
      confirmation: values.confirmation.trim().toUpperCase(),
      reason: values.reason.trim(),
    };

    try {
      await mutation.mutateAsync(input);
      toast.success(state.active ? "Comunidade reativada." : "Comunidade desativada.");
      form.reset();
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      ref={dialogRef}
      role="presentation"
    >
      <FormProvider {...form}>
        <form
          aria-modal="true"
          className="w-full max-w-xl rounded-[28px] border border-border bg-surface p-5 shadow-xl"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Controle de disponibilidade
              </p>
              <h3 className="mt-1 text-xl font-black text-foreground">{state.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{state.description}</p>
            </div>
            <button
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted"
              disabled={mutation.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
            <p className="text-foreground">{community.name}</p>
            <p className="mt-1">
              Esta acao altera a disponibilidade publica da comunidade e fica registrada na aba
              Atividades.
            </p>
            <p className="mt-2 text-xs">
              Digite{" "}
              <span className="font-black text-foreground">{state.expectedConfirmation}</span> para
              confirmar.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <TextareaController<CommunityStatusFormValues>
              label="Motivo interno obrigatorio"
              name="reason"
              required
              rows={3}
            />
            <InputController<CommunityStatusFormValues>
              label="Confirmacao forte"
              name="confirmation"
              placeholder={state.expectedConfirmation}
              required
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
              disabled={mutation.isPending}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 text-xs font-black text-primary-foreground disabled:opacity-70",
                state.active ? "bg-primary" : "bg-danger",
              )}
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {state.cta}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export const CommunityStatusControl = ({
  community,
  id,
}: {
  community: AdminCommunityIdentity;
  id: string;
}) => {
  const [dialogState, setDialogState] = useState<CommunityStatusDialogState | null>(null);
  const nextState: CommunityStatusDialogState = community.active
    ? {
        active: false,
        cta: "Desativar comunidade",
        description:
          "A comunidade deixa de aparecer publicamente mas continua sendo exibida no painel administrativo para auditoria e reativação.",
        expectedConfirmation: COMMUNITY_DEACTIVATE_CONFIRMATION,
        title: "Desativar comunidade",
      }
    : {
        active: true,
        cta: "Reativar comunidade",
        description:
          "A comunidade volta a ficar disponivel no produto para pacientes e psicologos, preservando conteudos e seguidores existentes.",
        expectedConfirmation: COMMUNITY_REACTIVATE_CONFIRMATION,
        title: "Reativar comunidade",
      };

  return (
    <>
      <section className={cn(cardClass, "p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                community.active ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger",
              )}
            >
              {community.active ? (
                <CheckCircle2 aria-hidden className="h-5 w-5" />
              ) : (
                <AlertTriangle aria-hidden className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted">Zona de risco</p>
              <h2 className="mt-1 text-lg font-black text-foreground">
                Disponibilidade da comunidade
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Desativar comunidade sem apagar conteúdo, regras, seguidores ou histórico
                administrativo.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
                <StatusBadge tone={community.active ? "green" : "muted"}>
                  {community.active ? "Ativa" : "Inativa"}
                </StatusBadge>
                {community.deactivated_at ? (
                  <span>Desativada em {formatDate(community.deactivated_at)}</span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-black text-primary-foreground shadow-sm transition disabled:opacity-70 lg:shrink-0",
              community.active ? "bg-danger hover:bg-danger" : "bg-primary hover:bg-primary/90",
            )}
            onClick={() => setDialogState(nextState)}
            type="button"
          >
            {community.active ? (
              <AlertTriangle aria-hidden className="h-4 w-4" />
            ) : (
              <CheckCircle2 aria-hidden className="h-4 w-4" />
            )}
            {community.active ? "Desativar comunidade" : "Reativar comunidade"}
          </button>
        </div>
      </section>

      {dialogState ? (
        <CommunityStatusDialog
          community={community}
          id={id}
          onClose={() => setDialogState(null)}
          state={dialogState}
        />
      ) : null}
    </>
  );
};

export const CommunityTabs = ({
  activeTab,
  pathname,
}: {
  activeTab: CommunityTab;
  pathname: string;
}) => (
  <nav
    aria-label="Abas da comunidade"
    className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3"
  >
    <div className="flex min-w-max gap-1 py-1">
      {communityTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
              active ? "text-primary" : "text-foreground hover:text-primary",
            )}
            href={tab.id === "geral" ? pathname : `${pathname}?tab=${tab.id}`}
            key={tab.id}
          >
            <span>{tab.label}</span>
            {active ? (
              <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
            ) : null}
          </Link>
        );
      })}
    </div>
  </nav>
);
