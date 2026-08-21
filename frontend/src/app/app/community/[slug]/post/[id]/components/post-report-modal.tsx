"use client";

import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { type PostReportForm, usePostReportForm } from "../use-form";

export const PostReportModal = ({
  apiError,
  disabled,
  onClose,
  onSubmit,
  open,
  subject,
  title,
}: {
  apiError?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (values: PostReportForm) => Promise<void> | void;
  open: boolean;
  subject: string;
  title: string;
}) => {
  const form = usePostReportForm();
  const { Form: ReportForm, formProps, hook } = form;
  const resetReportForm = hook.reset;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    resetReportForm({ description: "", reason: "spam" });
  }, [open, resetReportForm]);

  if (!open) return null;

  return (
    <div
      aria-labelledby="post-report-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] grid place-items-center bg-foreground/55 px-4 py-6 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="w-full max-w-[430px] rounded-[28px] border border-media-foreground/70 bg-surface p-5 shadow-lectum-soft dark:border-border dark:bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-black tracking-[0.12em] text-muted uppercase">
              Moderação Lectum
            </p>
            <h2
              className="text-xl font-black tracking-[-0.03em] text-foreground"
              id="post-report-title"
            >
              {title}
            </h2>
            <p className="line-clamp-2 text-sm leading-5 text-muted">{subject}</p>
          </div>
          <button
            aria-label="Fechar denúncia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted transition hover:bg-surface-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <ReportForm
          className="mt-5 grid gap-3"
          fields={formProps.fields}
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
            <InlineAlert title="Não foi possível enviar" variant="error">
              {apiError}
            </InlineAlert>
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
    </div>
  );
};
