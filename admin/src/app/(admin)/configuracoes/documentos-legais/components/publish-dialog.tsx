"use client";

import { Loader2, X } from "lucide-react";
import type { AdminLegalDocument } from "@/api/req/legal/types";
import { CheckboxGroupController } from "@/components/controllers";
import { Form } from "@/hooks/form";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { type LegalReviewForm, legalKindLabel } from "../modules/legal-policy";
import { useLegalReviewForm } from "../use-form";
import { legalButtonClass, legalPrimaryButtonClass } from "./common";

export const LegalPublishDialog = ({
  document,
  busy,
  blocked,
  onClose,
  onPublish,
}: {
  document: AdminLegalDocument;
  busy: boolean;
  blocked: string | null;
  onClose: () => void;
  onPublish: (values: LegalReviewForm) => Promise<void>;
}) => {
  const form = useLegalReviewForm();
  const dialogRef = useAdminDialogLifecycle(onClose, { closeEnabled: !busy });
  const confirmed = form.watch("confirmations").includes("reviewed");

  return (
    <div
      aria-describedby="legal-publish-description"
      aria-labelledby="legal-publish-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-card border border-border bg-surface p-5 shadow-admin-soft sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground" id="legal-publish-title">
            Publicar {legalKindLabel(document.kind)} · versão {document.version}?
          </h2>
          <button
            aria-label="Fechar confirmação"
            className={legalButtonClass}
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted" id="legal-publish-description">
          A publicação disponibiliza este texto aos usuários como nova versão. O conteúdo publicado
          fica imutável: correções exigirão duplicar e publicar outra versão. Este passo não cria
          aceites em nome dos usuários.
        </p>
        <p className="mt-3 rounded-2xl bg-warning/10 p-4 text-sm font-semibold leading-6 text-foreground">
          Não publique uma minuta sem aprovação jurídica. Ao continuar, você declara que esta versão
          foi efetivamente revisada e aprovada.
        </p>
        <Form className="mt-5 space-y-4" form={form} onSubmit={onPublish}>
          <CheckboxGroupController<LegalReviewForm>
            disabled={busy}
            label="Revisão jurídica obrigatória"
            name="confirmations"
            options={[
              {
                value: "reviewed",
                label:
                  "Confirmo que esta versão foi revisada e aprovada pelo jurídico, com os dados e marcadores preenchidos.",
              },
            ]}
            required
          />
          {blocked ? (
            <p className="text-sm text-danger" role="alert">
              {blocked}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className={legalButtonClass} disabled={busy} onClick={onClose} type="button">
              Cancelar
            </button>
            <button
              className={legalPrimaryButtonClass}
              disabled={busy || !confirmed || Boolean(blocked)}
              type="submit"
            >
              {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Publicando..." : "Confirmar e publicar versão"}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
};
