"use client";

import { Loader2, X } from "lucide-react";
import { type RefObject, useEffect, useId, useRef } from "react";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";
import { type PostReportForm, usePostReportForm } from "../use-form";

export const PostReportModal = ({
  apiError,
  disabled,
  onClose,
  onSubmit,
  open,
  returnFocusRef,
  subject,
  title,
}: {
  apiError?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (values: PostReportForm) => Promise<void> | void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  subject: string;
  title: string;
}) => {
  const form = usePostReportForm();
  const { Form: ReportForm, formProps, hook } = form;
  const resetReportForm = hook.reset;
  const id = useId();
  const titleId = `${id}-post-report-title`;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    resetReportForm({ description: "", reason: "spam" });
  }, [open, resetReportForm]);

  useEffect(() => {
    if (!open || !apiError || !document.hasFocus()) return;
    const feedback = errorRef.current;
    const dialog = feedback?.closest("dialog");
    if (!feedback || !dialog?.open) return;
    const activeElement = document.activeElement;
    // Disabling submit can drop focus. Do not interrupt someone already editing a field.
    if (activeElement === document.body || activeElement === dialog) feedback.focus();
  }, [apiError, open]);

  return (
    <Modal
      initialFocusRef={closeButtonRef}
      labelledBy={titleId}
      onClose={onClose}
      open={open}
      returnFocusRef={returnFocusRef}
    >
      <div className="max-h-full w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-[28px] border border-media-foreground/70 bg-surface p-5 shadow-lectum-soft dark:border-border dark:bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-black tracking-[0.12em] text-muted uppercase">
              Moderação Lectum
            </p>
            <h2 className="text-xl font-black tracking-[-0.03em] text-foreground" id={titleId}>
              {title}
            </h2>
            <p className="line-clamp-2 text-sm leading-5 text-muted">{subject}</p>
          </div>
          <button
            aria-label="Fechar denúncia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted transition hover:bg-surface-muted hover:text-foreground"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <ReportForm
          className="mt-5 grid gap-3"
          fields={formProps.fields.map((field) => ({ ...field, id: `${id}-${field.name}` }))}
          hook={hook}
          onSubmit={hook.handleSubmit(async (values) => {
            try {
              await onSubmit(values);
            } catch {
              // A mutation exibe a mensagem no modal sem fechar o fluxo.
            }
          })}
        >
          {apiError ? (
            <div
              className="rounded-[var(--lectum-card-radius)] focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
              id={`${id}-report-error`}
              ref={errorRef}
              tabIndex={-1}
            >
              <InlineAlert title="Não foi possível enviar" variant="error">
                {apiError}
              </InlineAlert>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-10 rounded-full px-4"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-full bg-primary px-5 font-black hover:bg-primary-hover"
              disabled={disabled}
              type="submit"
            >
              {disabled ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Enviar denúncia
            </Button>
          </div>
        </ReportForm>
      </div>
    </Modal>
  );
};
