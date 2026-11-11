"use client";

import { AlertTriangle, Loader2, Pause, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAdminPriceActions,
  useAdminPriceOperations,
  useAdminPriceVersions,
} from "@/api/callers/settings/subscription-prices";
import { resolveApiError } from "@/api/handle";
import type { AdminSubscriptionPlanSettings } from "@/api/req/settings";
import type { AdminPriceOperation, AdminPriceResult } from "@/api/req/settings/subscription-prices";
import { useAdminAuth } from "@/providers/admin-auth";
import { formatOfferMoney } from "../modules/offer-presentation";
import {
  getPriceManagementContext,
  type LoadedPriceRequest,
  type PendingPriceRequest,
  priceOperationIsTerminal,
  priceOperationLabel,
  priceRequestStorageKey,
  readPreservedPriceRequest,
  scopedPriceRequestState,
  toPriceCreationInput,
} from "../modules/price-management";
import { type PriceConfirmation, PriceConfirmDialog } from "./price-confirm-dialog";
import { PriceCreateCard } from "./price-create-card";
import { PriceHistory } from "./price-history";

export const PriceManagement = ({ settings }: { settings: AdminSubscriptionPlanSettings }) => {
  const { admin } = useAdminAuth();
  const versions = useAdminPriceVersions(true);
  const operations = useAdminPriceOperations(true);
  const actions = useAdminPriceActions();
  const [confirmation, setConfirmation] = useState<PriceConfirmation | null>(null);
  const [loadedRequest, setLoadedRequest] = useState<LoadedPriceRequest | null>(null);
  const pendingRef = useRef<{ storageKey: string; pending: PendingPriceRequest | null } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const context = getPriceManagementContext(settings);
  const storageKey = priceRequestStorageKey(admin?.id, settings.plan.id, context.mode);
  const { pending, ready: storageReady } = scopedPriceRequestState(storageKey, loadedRequest);
  const { offer, revision, publishingReady } = context;
  const historyError = versions.isError || operations.isError;
  const allVersions = versions.data?.pages.flatMap((page) => page.items) ?? [];
  const allOperations = operations.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (!storageKey) return;
    // Hydrate browser-only external storage after the first client paint, as in the Admin shell.
    // A changed actor/scope is already blocked by the derived loaded-key match above.
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      if (!active) return;
      let state: { pending: PendingPriceRequest | null; ready: boolean };
      try {
        state = readPreservedPriceRequest(window.sessionStorage.getItem(storageKey));
      } catch {
        state = { pending: null, ready: false };
      }
      pendingRef.current = { storageKey, pending: state.pending };
      setLoadedRequest({ storageKey, ...state });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [storageKey]);
  const preserve = (value: PendingPriceRequest | null) => {
    if (!storageKey) throw new Error("PRICE_REQUEST_STORAGE_UNAVAILABLE");
    if (value) window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(storageKey);
    pendingRef.current = { storageKey, pending: value };
    // A response for the previous actor may preserve its own request, never replace current UI state.
    setLoadedRequest((current) =>
      current?.storageKey === storageKey ? { storageKey, pending: value, ready: true } : current,
    );
  };
  const reportResult = (result: AdminPriceResult, request?: PendingPriceRequest) => {
    if (request) {
      if (priceOperationIsTerminal(result.operation)) preserve(null);
      else preserve({ ...request, operation_id: result.operation.id });
    }
    setNotice(
      result.operation.status === "completed"
        ? "Versão registrada. A oferta não foi alterada; vincular e publicar são ações separadas."
        : `${priceOperationLabel(result.operation.status)}. Confira a solicitação no histórico; não crie outra para substituir uma resposta pendente.`,
    );
  };
  const create = async (amountCents: number) => {
    if (
      pending ||
      (pendingRef.current?.storageKey === storageKey && pendingRef.current.pending) ||
      actions.busy ||
      !storageReady
    )
      return;
    const request = { amount_cents: amountCents, request_key: window.crypto.randomUUID() };
    try {
      // Preserve before the first POST. A timeout never rotates this key or changes its amount.
      preserve(request);
    } catch {
      setLoadedRequest((current) =>
        current?.storageKey === storageKey ? { ...current, ready: false } : current,
      );
      toast.error(
        "Não foi possível preservar a solicitação neste navegador. Habilite o armazenamento e recarregue antes de continuar.",
      );
      return;
    }
    try {
      reportResult(await actions.create.mutateAsync(toPriceCreationInput(request)), request);
    } catch (cause) {
      setNotice(
        "Não foi possível confirmar o resultado. A solicitação foi preservada; use a recuperação abaixo, sem criar outra versão.",
      );
      toast.error(resolveApiError(cause));
    }
  };
  const recoverPending = async () => {
    if (!pending || !storageReady || actions.busy) return;
    try {
      const result = pending.operation_id
        ? await actions.resume.mutateAsync(pending.operation_id)
        : await actions.create.mutateAsync(toPriceCreationInput(pending));
      reportResult(result, pending);
    } catch (cause) {
      toast.error(resolveApiError(cause));
    }
  };
  const resume = async (operation: AdminPriceOperation) => {
    try {
      reportResult(
        await actions.resume.mutateAsync(operation.id),
        pending?.operation_id === operation.id ? pending : undefined,
      );
    } catch (cause) {
      toast.error(resolveApiError(cause));
    }
  };
  const confirm = async () => {
    if (!confirmation) return;
    try {
      if (confirmation.kind === "link") {
        await actions.link.mutateAsync({
          price_version_id: confirmation.version.id,
          expected_revision: confirmation.revision,
          confirm_new_adhesions_only: true,
        });
        setNotice(
          "Versão vinculada. Novas adesões permanecem pausadas até uma publicação explícita.",
        );
      } else {
        await actions.toggle.mutateAsync({
          enabled: true,
          expected_revision: confirmation.revision,
          confirm_publish: true,
        });
        setNotice(
          "Oferta publicada para novas adesões. Os contratos existentes foram preservados.",
        );
      }
      setConfirmation(null);
    } catch (cause) {
      // A stale revision is never replaced/retried inside an already confirmed dialog.
      setConfirmation(null);
      toast.error(resolveApiError(cause));
      setNotice(
        "Não foi possível confirmar a alteração. Atualize o resumo e revise o estado atual antes de outra ação.",
      );
    }
  };
  const pause = async () => {
    try {
      await actions.toggle.mutateAsync({ enabled: false, expected_revision: revision });
      setNotice(
        "Novas adesões pausadas localmente. Assinaturas, renovações e benefícios existentes não foram alterados.",
      );
    } catch (cause) {
      toast.error(resolveApiError(cause));
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <section className="min-w-0 rounded-card border border-border/80 bg-surface/95 p-5 shadow-admin-soft md:p-6">
        <h2 className="text-xl font-bold text-foreground">Controlar novas adesões</h2>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-primary">
          {context.mode === "test"
            ? "Catálogo de teste · sem valor real"
            : context.mode === "live"
              ? "Catálogo de produção"
              : "Escopo do catálogo indisponível"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          A pausa é local e não depende de uma consulta ao provedor. Publicar exige verificação
          operacional e a revisão atual da oferta. Esta tela não altera os controles globais de
          cobrança ou emissão fiscal.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border px-5 text-sm font-bold text-foreground disabled:opacity-50"
            disabled={actions.busy || !offer?.checkout_enabled}
            onClick={() => void pause()}
            type="button"
          >
            <Pause aria-hidden className="h-4 w-4" />
            Pausar novas adesões
          </button>
          <button
            className="min-h-12 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={actions.busy || Boolean(offer?.checkout_enabled) || !publishingReady}
            onClick={() =>
              context.amountCents !== null &&
              setConfirmation({
                kind: "publish",
                amountCents: context.amountCents,
                revision,
              })
            }
            type="button"
          >
            Revisar publicação
          </button>
        </div>
        {!publishingReady ? (
          <p className="mt-3 text-xs leading-5 text-warning">
            A publicação exige uma versão Stripe vinculada e os controles operacionais habilitados.
            Criar ou vincular um preço não habilita esses controles.
          </p>
        ) : null}
      </section>
      {notice ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-6 text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {pending ? (
        <section className="rounded-card border border-warning/25 bg-warning/10 p-5">
          <h2 className="font-bold text-foreground">
            Solicitação preservada · {formatOfferMoney(pending.amount_cents)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A resposta pode ter sido interrompida. Recupere a mesma operação; o valor e a
            identificação da solicitação não serão substituídos.
          </p>
          <button
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-bold text-primary disabled:opacity-50"
            disabled={actions.busy}
            onClick={() => void recoverPending()}
            type="button"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Recuperar solicitação preservada
          </button>
        </section>
      ) : null}
      {!storageReady ? (
        <p className="rounded-2xl border border-warning/25 p-4 text-sm leading-6 text-warning">
          Novas criações estão bloqueadas porque não foi possível confirmar a solicitação preservada
          neste navegador. Recarregue e consulte o histórico; se o aviso continuar, solicite uma
          revisão operacional. O histórico e a pausa da oferta continuam disponíveis.
        </p>
      ) : null}
      <PriceCreateCard
        disabled={
          actions.busy ||
          Boolean(pending) ||
          !storageReady ||
          historyError ||
          versions.isLoading ||
          operations.isLoading
        }
        onCreate={create}
      />
      {versions.isLoading || operations.isLoading ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Carregando histórico de versões...
        </p>
      ) : null}
      {historyError ? (
        <section className="rounded-card border border-warning/25 p-5">
          <p className="flex gap-2 text-sm leading-6 text-muted">
            <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-warning" />
            Não foi possível consultar o histórico. O resumo da oferta permanece disponível; nenhuma
            versão será criada automaticamente.
          </p>
          <button
            className="mt-3 min-h-11 rounded-control border border-border px-4 text-sm font-bold text-primary"
            onClick={() => {
              void versions.refetch();
              void operations.refetch();
            }}
            type="button"
          >
            Atualizar histórico
          </button>
        </section>
      ) : null}
      {!historyError && !versions.isLoading && !operations.isLoading ? (
        <PriceHistory
          busy={actions.busy}
          onLink={(version) => setConfirmation({ kind: "link", version, revision })}
          onResume={(operation) => void resume(operation)}
          operations={allOperations}
          operationsMore={
            operations.hasNextPage
              ? {
                  busy: operations.isFetchingNextPage,
                  onClick: () => void operations.fetchNextPage(),
                }
              : undefined
          }
          versions={allVersions}
          versionsMore={
            versions.hasNextPage
              ? { busy: versions.isFetchingNextPage, onClick: () => void versions.fetchNextPage() }
              : undefined
          }
        />
      ) : null}
      {confirmation ? (
        <PriceConfirmDialog
          busy={actions.busy}
          onClose={() => setConfirmation(null)}
          onConfirm={confirm}
          state={confirmation}
        />
      ) : null}
    </div>
  );
};
